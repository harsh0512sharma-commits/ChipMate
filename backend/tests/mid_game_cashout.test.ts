import { getDb, closeDb } from '../src/db';
import * as authService from '../src/services/auth.service';
import * as tableService from '../src/services/table.service';
import * as ledgerService from '../src/services/ledger.service';
import * as settlementService from '../src/services/settlement.service';

describe('Mid-Game Player Cash-Out Feature Tests', () => {
  let db: any;

  beforeEach(() => {
    closeDb();
    db = getDb(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  function setupPlayers(count: number = 4) {
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 1000000).toISOString();
    const users: any[] = [];

    for (let i = 1; i <= count; i++) {
      const email = `player${i}@chipmate.test`;
      db.prepare("INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at) VALUES (?, ?, '123456', ?, 0, ?)")
        .run(`otp_${i}`, email, future, now);

      const verified = authService.verifyOtp(email, '123456').user;
      authService.updateUserProfile(verified.id, `Player ${String.fromCharCode(64 + i)}`);
      users.push(authService.getUserById(verified.id)!);
    }

    return users;
  }

  test('Test Case 1 — VALUE mode mid-game cash-out with profit and zero-sum final settlement', () => {
    const [hostA, playerB, playerC, playerD] = setupPlayers(4);

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Friday Poker Value Mode',
      gameType: 'POKER',
      totalChips: 5000,
      chipValue: 1,
      chipMode: 'VALUE'
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);
    const { playerId: dId } = tableService.joinTableByCode(playerD.id, table.join_code);

    // Each buys in ₹500 in VALUE mode (total buyin pot = ₹2000)
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 500, moneyValue: 500 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 500, moneyValue: 500 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: cId, chipAmount: 500, moneyValue: 500 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: dId, chipAmount: 500, moneyValue: 500 });

    // Bank vault money started at 5000, now 5000 - 2000 = 3000
    let currentTable = tableService.getTableDetails(table.id, hostA.id)!;
    expect(currentTable.table.bank_chips).toBe(3000);

    // Player B decides to cash out early with ₹800 (profit of ₹300)
    const cashOutResult = ledgerService.recordCashOut({
      gameId: table.id,
      actorUserId: playerB.id,
      playerId: bId,
      moneyValue: 800
    });

    expect(cashOutResult.cashedOutMoney).toBe(800);
    expect(cashOutResult.cashedOutNet).toBe(300); // 800 - 500 = +300

    // Check table details after cash out
    currentTable = tableService.getTableDetails(table.id, hostA.id)!;
    const pB = currentTable.players.find(p => p.id === bId)!;
    expect(pB.is_cashed_out).toBe(true);
    expect(pB.cashed_out_money).toBe(800);
    expect(pB.cashed_out_net).toBe(300);
    expect(pB.current_chips).toBe(0);

    // Bank vault should have received 800 returned money/chips (3000 + 800 = 3800)
    expect(currentTable.table.bank_chips).toBe(3800);

    // Now game continues and finishes. Active players remaining hold ₹400 each (400 + 400 + 400 + 800 = 2000)
    const activeChipCounts = [
      { playerId: aId, finalChips: 400, finalChipsMoney: 400 },
      { playerId: cId, finalChips: 400, finalChipsMoney: 400 },
      { playerId: dId, finalChips: 400, finalChipsMoney: 400 }
      // Notice: B is cashed out, host doesn't even have to provide B!
    ];

    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, activeChipCounts);

    // Verification:
    // B: 800 final - 500 buyin = +300
    // A: 400 final - 500 buyin = -100
    // C: 400 final - 500 buyin = -100
    // D: 400 final - 500 buyin = -100
    // Sum of net positions: +300 - 100 - 100 - 100 = 0 (Strict Zero Sum!)
    const pBPreview = preview.players.find(p => p.playerId === bId)!;
    expect(pBPreview.isCashedOut).toBe(true);
    expect(pBPreview.finalChipsMoney).toBe(800);
    expect(pBPreview.netPosition).toBe(300);

    const sumNets = preview.players.reduce((sum, p) => sum + p.netPosition, 0);
    expect(Math.round(sumNets)).toBe(0);

    // Optimized payments: A, C, D each pay B ₹100!
    expect(preview.optimizedSettlements.length).toBe(3);
    for (const payment of preview.optimizedSettlements) {
      expect(payment.toPlayerId).toBe(bId);
      expect(payment.amount).toBe(100);
    }

    // Finalize game
    const finalizeRes = settlementService.finalizeGame(hostA.id, table.id);
    expect(finalizeRes.success).toBe(true);
  });

  test('Test Case 2 — EQUAL mode mid-game cash-out with loss', () => {
    const [hostA, playerB, playerC] = setupPlayers(3);

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Teen Patti Equal Mode',
      gameType: 'TEEN_PATTI',
      totalChips: 300,
      chipValue: 10,
      chipMode: 'EQUAL'
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);

    // Each buys 50 chips = ₹500. Total chips in play = 150. Bank chips = 150.
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 50 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 50 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: cId, chipAmount: 50 });

    let t = tableService.getTableDetails(table.id, hostA.id)!;
    expect(t.table.bank_chips).toBe(150);

    // Player B loses 30 chips to Player A during hand play
    ledgerService.recordTransfer({
      gameId: table.id,
      hostUserId: hostA.id,
      fromPlayerId: bId,
      toPlayerId: aId,
      chipAmount: 30
    });

    // Player B now holds 20 chips and cashes out early with 20 chips (₹200). Net loss = -₹300.
    ledgerService.recordCashOut({
      gameId: table.id,
      actorUserId: hostA.id, // Host cashes out B on request
      playerId: bId,
      chipAmount: 20
    });

    t = tableService.getTableDetails(table.id, hostA.id)!;
    // Bank chips increases by 20 returned chips: 150 + 20 = 170
    expect(t.table.bank_chips).toBe(170);

    // Physical chip invariant: bank_chips (170) + active players chips (80 + 50 = 130) = 300
    const sumActiveChips = t.players.reduce((sum, p) => sum + p.current_chips, 0);
    expect(t.table.bank_chips + sumActiveChips).toBe(300);

    // Game ends:
    // A has 80 chips (₹800). C has 50 chips (₹500). B had 20 chips (₹200).
    // Total accounted chips = 80 + 50 + 20 = 150 chips (matches totalBuyinChips of 150).
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 80,
      [cId]: 50
    });

    const pB = preview.players.find(p => p.playerId === bId)!;
    expect(pB.netPosition).toBe(-300); // 200 - 500 = -300
    const pA = preview.players.find(p => p.playerId === aId)!;
    expect(pA.netPosition).toBe(300); // 800 - 500 = +300
    const pC = preview.players.find(p => p.playerId === cId)!;
    expect(pC.netPosition).toBe(0); // 500 - 500 = 0

    // B owes A ₹300
    expect(preview.optimizedSettlements.length).toBe(1);
    expect(preview.optimizedSettlements[0].fromPlayerId).toBe(bId);
    expect(preview.optimizedSettlements[0].toPlayerId).toBe(aId);
    expect(preview.optimizedSettlements[0].amount).toBe(300);

    const finalizeRes = settlementService.finalizeGame(hostA.id, table.id);
    expect(finalizeRes.success).toBe(true);
  });

  test('Test Case 3 — Mid-game cash-out with outstanding loan cleanly factored into debt optimization', () => {
    const [hostA, playerB, playerC] = setupPlayers(3);

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Cashout With Loan',
      gameType: 'POKER',
      totalChips: 500,
      chipValue: 10,
      chipMode: 'EQUAL'
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);

    // Each buys 50 chips = ₹500
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 50 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 50 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: cId, chipAmount: 50 });

    // Host A lends 10 chips (₹100) to Player B
    ledgerService.recordLend({
      gameId: table.id,
      hostUserId: hostA.id,
      lenderPlayerId: aId,
      borrowerPlayerId: bId,
      chipAmount: 10
    });

    // Player B now holds 60 chips. B cashes out with 70 chips (₹700)
    ledgerService.recordCashOut({
      gameId: table.id,
      actorUserId: playerB.id,
      playerId: bId,
      chipAmount: 70
    });

    // Active players finish: A has 40 chips (₹400), C has 40 chips (₹400).
    // Total chips accounted: 70 (B) + 40 (A) + 40 (C) = 150 chips (matches 150 buyin chips).
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 40,
      [cId]: 40
    });

    // Settlement calculations:
    // B: Gross = 700 - 500 = +200. Loan Debt = 100. Net Position = 200 - 100 = +100.
    // A: Gross = 400 - 500 = -100. Loan Credit = +100. Net Position = -100 + 100 = 0.
    // C: Gross = 400 - 500 = -100. Loan = 0. Net Position = -100.
    // Sum of net positions: +100 + 0 - 100 = 0!
    const pB = preview.players.find(p => p.playerId === bId)!;
    expect(pB.gameGrossPnl).toBe(200);
    expect(pB.loanDebtOwed).toBe(100);
    expect(pB.netPosition).toBe(100);

    const pA = preview.players.find(p => p.playerId === aId)!;
    expect(pA.loanCreditOwed).toBe(100);
    expect(pA.netPosition).toBe(0);

    const pC = preview.players.find(p => p.playerId === cId)!;
    expect(pC.netPosition).toBe(-100);

    // Optimized payment: C pays B ₹100 directly! (A's loan is completely settled seamlessly)
    expect(preview.optimizedSettlements.length).toBe(1);
    expect(preview.optimizedSettlements[0].fromPlayerId).toBe(cId);
    expect(preview.optimizedSettlements[0].toPlayerId).toBe(bId);
    expect(preview.optimizedSettlements[0].amount).toBe(100);

    const finalizeRes = settlementService.finalizeGame(hostA.id, table.id);
    expect(finalizeRes.success).toBe(true);
  });

  test('Test Case 4 — Undo Cash-Out restores player chips and restores bank vault', () => {
    const [hostA, playerB] = setupPlayers(2);

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Undo Cashout Game',
      gameType: 'POKER',
      totalChips: 100,
      chipValue: 10,
      chipMode: 'EQUAL'
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 30 });
    let t = tableService.getTableDetails(table.id, hostA.id)!;
    expect(t.table.bank_chips).toBe(70);

    // B cashes out 30 chips
    ledgerService.recordCashOut({
      gameId: table.id,
      actorUserId: playerB.id,
      playerId: bId,
      chipAmount: 30
    });

    t = tableService.getTableDetails(table.id, hostA.id)!;
    expect(t.table.bank_chips).toBe(100);
    let pB = t.players.find(p => p.id === bId)!;
    expect(pB.is_cashed_out).toBe(true);
    expect(pB.current_chips).toBe(0);

    // Host undoes cash out
    const undoRes = ledgerService.undoCashOut({
      gameId: table.id,
      actorUserId: hostA.id,
      playerId: bId
    });

    expect(undoRes.success).toBe(true);
    expect(undoRes.restoredChips).toBe(30);
    expect(undoRes.newBankChips).toBe(70);

    t = tableService.getTableDetails(table.id, hostA.id)!;
    expect(t.table.bank_chips).toBe(70);
    pB = t.players.find(p => p.id === bId)!;
    expect(pB.is_cashed_out).toBe(false);
    expect(pB.current_chips).toBe(30);
  });

  test('Test Case 5 — VALUE mode lender cashes out mid-game with active credit (buyin ₹500, lent ₹700, cashes out ₹300 -> net +₹500 profit)', () => {
    const [hostA, playerB, playerC] = setupPlayers(3);

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Lender Cashout Test',
      gameType: 'POKER',
      totalChips: 5000,
      chipValue: 1,
      chipMode: 'VALUE'
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);

    // Host A buys in for ₹500, B buys in for ₹500, C buys in for ₹500
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 500 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 500 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: cId, chipAmount: 500 });

    // Host A lends ₹700 to Player B (uncapped shot lending)
    ledgerService.recordLend({
      gameId: table.id,
      hostUserId: hostA.id,
      lenderPlayerId: aId,
      borrowerPlayerId: bId,
      chipAmount: 700,
      moneyValue: 700
    });

    // Check table details: Host A has lentMoney = 700, B has borrowedMoney = 700
    let currentTable = tableService.getTableDetails(table.id, hostA.id)!;
    const pA = currentTable.players.find(p => p.id === aId)!;
    expect(pA.loanCreditOwed).toBe(700);
    expect(pA.loanDebtOwed).toBe(0);

    // Host A rebought or won chips and now holds ₹300, and cashes out ₹300 mid-game
    const cashOutResult = ledgerService.recordCashOut({
      gameId: table.id,
      actorUserId: hostA.id,
      playerId: aId,
      moneyValue: 300
    });

    // Formula: Cashout (300) - BuyIn (500) - Debt (0) + Credit (700) = +500 Profit!
    expect(cashOutResult.cashedOutMoney).toBe(300);
    expect(cashOutResult.cashedOutNet).toBe(500);

    // Final settlement reconciliation
    // Player B finishes with 800, C finishes with 400.
    // Total: 300 (A cashed out) + 800 (B) + 400 (C) = 1500 (equal to 1500 total pot)
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, [
      { playerId: bId, finalChips: 800, finalChipsMoney: 800 },
      { playerId: cId, finalChips: 400, finalChipsMoney: 400 }
    ]);

    const previewA = preview.players.find(p => p.playerId === aId)!;
    expect(previewA.isCashedOut).toBe(true);
    expect(previewA.netPosition).toBe(500);

    const sumNets = preview.players.reduce((sum, p) => sum + p.netPosition, 0);
    expect(Math.round(sumNets)).toBe(0); // Zero-Sum invariant holds strictly!
  });
});
