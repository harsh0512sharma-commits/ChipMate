import { getDb, closeDb } from '../src/db';
import * as authService from '../src/services/auth.service';
import * as tableService from '../src/services/table.service';
import * as ledgerService from '../src/services/ledger.service';
import * as settlementService from '../src/services/settlement.service';

describe('ChipMate Authoritative Zero-Sum Accounting Engine & Invariants', () => {
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

  // TEST CASE 1
  test('Test Case 1 — Simple Game (A: -50, B: +50, C: +25, D: -25, Total: 0)', () => {
    const [hostA, playerB, playerC, playerD] = setupPlayers(4);
    const chipValue = 5;

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Teen Patti Night',
      gameType: 'TEEN_PATTI',
      totalChips: 100,
      chipValue
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);
    const { playerId: dId } = tableService.joinTableByCode(playerD.id, table.join_code);

    // Each buys 20 chips = ₹100
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: cId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: dId, chipAmount: 20 });

    // Host submits final chip counts: A=10, B=30, C=25, D=15 (Total = 80 chips)
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 10,
      [bId]: 30,
      [cId]: 25,
      [dId]: 15
    });

    expect(preview.expectedTotalChips).toBe(80);
    expect(preview.isReconciled).toBe(true);

    const balA = preview.players.find(p => p.playerId === aId)!;
    const balB = preview.players.find(p => p.playerId === bId)!;
    const balC = preview.players.find(p => p.playerId === cId)!;
    const balD = preview.players.find(p => p.playerId === dId)!;

    // Expected: A = -50, B = +50, C = +25, D = -25
    expect(balA.netPosition).toBe(-50);
    expect(balB.netPosition).toBe(50);
    expect(balC.netPosition).toBe(25);
    expect(balD.netPosition).toBe(-25);

    // Zero-sum invariant: sum of all net positions must be exactly 0
    const sumNet = balA.netPosition + balB.netPosition + balC.netPosition + balD.netPosition;
    expect(sumNet).toBe(0);

    // Optimized settlements
    expect(preview.optimizedSettlements.length).toBe(2);
    const aPayment = preview.optimizedSettlements.find(s => s.fromPlayerId === aId)!;
    const dPayment = preview.optimizedSettlements.find(s => s.fromPlayerId === dId)!;

    expect(aPayment.toPlayerId).toBe(bId);
    expect(aPayment.amount).toBe(50);

    expect(dPayment.toPlayerId).toBe(cId);
    expect(dPayment.amount).toBe(25);

    // Total received = total paid
    const totalPaid = preview.optimizedSettlements.reduce((sum, s) => sum + s.amount, 0);
    expect(totalPaid).toBe(75);
  });

  // TEST CASE 2
  test('Test Case 2 — Loan/Shot (A buys 30, borrows 10 from B, finishes with 20 -> Net: -100)', () => {
    const [hostA, playerB] = setupPlayers(2);
    const chipValue = 5;

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Game with Shot',
      gameType: 'TEEN_PATTI',
      totalChips: 100,
      chipValue
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);

    // A buys 30 chips = ₹150, B buys 30 chips = ₹150
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 30 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 30 });

    // A borrows 10 chips from B (creates ₹50 debt)
    ledgerService.recordLend({
      gameId: table.id,
      hostUserId: hostA.id,
      lenderPlayerId: bId,
      borrowerPlayerId: aId,
      chipAmount: 10
    });

    // In-game: A holds 40 chips (30 + 10 loan) - NOT capped at 30!
    const playerARow = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(aId);
    expect(playerARow.current_chips).toBe(40);

    // Final chip counts: A finishes with 20 chips, B finishes with 40 chips (Total = 60 chips)
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 20,
      [bId]: 40
    });

    const balA = preview.players.find(p => p.playerId === aId)!;
    const balB = preview.players.find(p => p.playerId === bId)!;

    // A: Final chips = 20 * 5 = ₹100. Buyin = ₹150. Borrowed = ₹50. Net = 100 - 150 - 50 = -₹100.
    expect(balA.finalChips).toBe(20);
    expect(balA.finalChipsMoney).toBe(100);
    expect(balA.totalBuyinMoney).toBe(150);
    expect(balA.loanDebtOwed).toBe(50);
    expect(balA.netPosition).toBe(-100);

    // B: Final chips = 40 * 5 = ₹200. Buyin = ₹150. Lent = ₹50. Net = 200 - 150 + 50 = +₹100.
    expect(balB.finalChips).toBe(40);
    expect(balB.finalChipsMoney).toBe(200);
    expect(balB.totalBuyinMoney).toBe(150);
    expect(balB.loanCreditOwed).toBe(50);
    expect(balB.netPosition).toBe(100);

    // Zero-sum
    expect(balA.netPosition + balB.netPosition).toBe(0);

    // Settlement: A pays B ₹100
    expect(preview.optimizedSettlements.length).toBe(1);
    expect(preview.optimizedSettlements[0].fromPlayerId).toBe(aId);
    expect(preview.optimizedSettlements[0].toPlayerId).toBe(bId);
    expect(preview.optimizedSettlements[0].amount).toBe(100);
  });

  // TEST CASE 3
  test('Test Case 3 — Multiple Loans (A, B, C, D multi-party loans minimized cleanly)', () => {
    const [hostA, playerB, playerC, playerD] = setupPlayers(4);
    const chipValue = 5;

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Multi Loan Table',
      gameType: 'TEEN_PATTI',
      totalChips: 100,
      chipValue
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);
    const { playerId: dId } = tableService.joinTableByCode(playerD.id, table.join_code);

    // Each buys 25 chips = ₹125 (total 100 chips)
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 25 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 25 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: cId, chipAmount: 25 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: dId, chipAmount: 25 });

    // A borrows ₹50 from B (10 chips)
    ledgerService.recordLend({ gameId: table.id, hostUserId: hostA.id, lenderPlayerId: bId, borrowerPlayerId: aId, chipAmount: 10 });
    // A borrows ₹25 from C (5 chips)
    ledgerService.recordLend({ gameId: table.id, hostUserId: hostA.id, lenderPlayerId: cId, borrowerPlayerId: aId, chipAmount: 5 });
    // C borrows ₹100 from D (20 chips)
    ledgerService.recordLend({ gameId: table.id, hostUserId: hostA.id, lenderPlayerId: dId, borrowerPlayerId: cId, chipAmount: 20 });
    // D borrows ₹75 from A (15 chips)
    ledgerService.recordLend({ gameId: table.id, hostUserId: hostA.id, lenderPlayerId: aId, borrowerPlayerId: dId, chipAmount: 15 });

    // Everyone finishes with 25 chips (original count)
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 25,
      [bId]: 25,
      [cId]: 25,
      [dId]: 25
    });

    const balA = preview.players.find(p => p.playerId === aId)!;
    const balB = preview.players.find(p => p.playerId === bId)!;
    const balC = preview.players.find(p => p.playerId === cId)!;
    const balD = preview.players.find(p => p.playerId === dId)!;

    // A: borrowed 50 + 25 = 75, lent 75 -> net loan impact = 0 -> netPosition = 0
    expect(balA.netPosition).toBe(0);
    // B: lent 50 -> net loan impact = +50 -> netPosition = +50
    expect(balB.netPosition).toBe(50);
    // C: lent 25, borrowed 100 -> net loan impact = -75 -> netPosition = -75
    expect(balC.netPosition).toBe(-75);
    // D: lent 100, borrowed 75 -> net loan impact = +25 -> netPosition = +25
    expect(balD.netPosition).toBe(25);

    // Sum is 0
    expect(balA.netPosition + balB.netPosition + balC.netPosition + balD.netPosition).toBe(0);

    // Optimized settlement: C pays B ₹50, C pays D ₹25 (Only 2 payments instead of 4 individual loans)
    expect(preview.optimizedSettlements.length).toBe(2);
    const pay1 = preview.optimizedSettlements.find(s => s.toPlayerId === bId)!;
    const pay2 = preview.optimizedSettlements.find(s => s.toPlayerId === dId)!;

    expect(pay1.fromPlayerId).toBe(cId);
    expect(pay1.amount).toBe(50);

    expect(pay2.fromPlayerId).toBe(cId);
    expect(pay2.amount).toBe(25);
  });

  // TEST CASE 4
  test('Test Case 4 — Circular Debt (A owes B ₹100, B owes C ₹100, C owes A ₹100 -> 0 payments)', () => {
    const [hostA, playerB, playerC] = setupPlayers(3);
    const chipValue = 10;

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Circular Debt Game',
      gameType: 'TEEN_PATTI',
      totalChips: 60,
      chipValue
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);

    // Each buys 20 chips = ₹200
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: cId, chipAmount: 20 });

    // A borrows 10 chips (₹100) from B -> A owes B ₹100
    ledgerService.recordLend({ gameId: table.id, hostUserId: hostA.id, lenderPlayerId: bId, borrowerPlayerId: aId, chipAmount: 10 });
    // B borrows 10 chips (₹100) from C -> B owes C ₹100
    ledgerService.recordLend({ gameId: table.id, hostUserId: hostA.id, lenderPlayerId: cId, borrowerPlayerId: bId, chipAmount: 10 });
    // C borrows 10 chips (₹100) from A -> C owes A ₹100
    ledgerService.recordLend({ gameId: table.id, hostUserId: hostA.id, lenderPlayerId: aId, borrowerPlayerId: cId, chipAmount: 10 });

    // Each finishes with 20 chips
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 20,
      [bId]: 20,
      [cId]: 20
    });

    const balA = preview.players.find(p => p.playerId === aId)!;
    const balB = preview.players.find(p => p.playerId === bId)!;
    const balC = preview.players.find(p => p.playerId === cId)!;

    // All net positions must be exactly 0
    expect(balA.netPosition).toBe(0);
    expect(balB.netPosition).toBe(0);
    expect(balC.netPosition).toBe(0);

    // Optimization eliminates all circular debt: NO PAYMENTS REQUIRED
    expect(preview.optimizedSettlements.length).toBe(0);
  });

  // TEST CASE 5
  test('Test Case 5 — Buy-in + Final Chips (Buy-in: -₹250, Final Chips: +₹150 -> Net: -₹100)', () => {
    const [hostA, playerB] = setupPlayers(2);
    const chipValue = 5;

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Buyin Final Chips',
      gameType: 'POKER',
      totalChips: 100,
      chipValue
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);

    // A buys 50 chips = ₹250, B buys 50 chips = ₹250
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 50 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 50 });

    // A finishes with 30 chips = ₹150, B finishes with 70 chips = ₹350
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 30,
      [bId]: 70
    });

    const balA = preview.players.find(p => p.playerId === aId)!;
    const balB = preview.players.find(p => p.playerId === bId)!;

    expect(balA.totalBuyinMoney).toBe(250);
    expect(balA.finalChips).toBe(30);
    expect(balA.finalChipsMoney).toBe(150);
    expect(balA.netPosition).toBe(-100);

    expect(balB.totalBuyinMoney).toBe(250);
    expect(balB.finalChips).toBe(70);
    expect(balB.finalChipsMoney).toBe(350);
    expect(balB.netPosition).toBe(100);

    expect(balA.netPosition + balB.netPosition).toBe(0);

    expect(preview.optimizedSettlements.length).toBe(1);
    expect(preview.optimizedSettlements[0].fromPlayerId).toBe(aId);
    expect(preview.optimizedSettlements[0].toPlayerId).toBe(bId);
    expect(preview.optimizedSettlements[0].amount).toBe(100);
  });

  // VALIDATION TEST: CHIP COUNT MISMATCH
  test('Validation: Chip count mismatch throws clear error and blocks finalizing', () => {
    const [hostA, playerB, playerC, playerD] = setupPlayers(4);
    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Validation Table',
      gameType: 'TEEN_PATTI',
      totalChips: 100,
      chipValue: 5
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);
    const { playerId: dId } = tableService.joinTableByCode(playerD.id, table.join_code);

    // Each buys 25 chips -> expected = 100 chips
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 25 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 25 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: cId, chipAmount: 25 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: dId, chipAmount: 25 });

    // Host enters A=20, B=30, C=25, D=20 -> Total = 95 (mismatch: 95 entered vs 100 expected)
    expect(() => {
      settlementService.submitFinalChipCounts(hostA.id, table.id, {
        [aId]: 20,
        [bId]: 30,
        [cId]: 25,
        [dId]: 20
      });
    }).toThrow('Chip count mismatch: 95 chips entered, but 100 chips are expected.');

    // Table status must not have moved to SETTLING
    const game = db.prepare('SELECT status FROM games WHERE id = ?').get(table.id);
    expect(game.status).toBe('ACTIVE');
  });

  // INVARIANTS: ZERO CHIPS & UNCAPPED LOANS
  test('Invariant: Player can finish with 0 chips, or hold more chips than buy-in due to uncapped loans', () => {
    const [hostA, playerB] = setupPlayers(2);
    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Uncapped Loan Table',
      gameType: 'TEEN_PATTI',
      totalChips: 100,
      chipValue: 10
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);

    // Host buys 20 chips, B buys 80 chips
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 80 });

    // B lends 50 chips to A (A now has 20 + 50 = 70 chips, far exceeding A's buy-in of 20)
    ledgerService.recordLend({ gameId: table.id, hostUserId: hostA.id, lenderPlayerId: bId, borrowerPlayerId: aId, chipAmount: 50 });

    const pA = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(aId);
    expect(pA.current_chips).toBe(70);

    // Final: A loses everything (0 chips), B holds all 100 chips
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 0,
      [bId]: 100
    });

    const balA = preview.players.find(p => p.playerId === aId)!;
    const balB = preview.players.find(p => p.playerId === bId)!;

    // A: 0 chips (₹0) - Buyin (₹200) - Loan (₹500) = -₹700
    expect(balA.netPosition).toBe(-700);
    // B: 100 chips (₹1000) - Buyin (₹800) + Lent (₹500) = +₹700
    expect(balB.netPosition).toBe(700);

    expect(balA.netPosition + balB.netPosition).toBe(0);

    // Finalize game
    const finalizeRes = settlementService.finalizeGame(hostA.id, table.id);
    expect(finalizeRes.success).toBe(true);

    const finalizedGame = db.prepare('SELECT status FROM games WHERE id = ?').get(table.id);
    expect(finalizedGame.status).toBe('FINALIZED');
  });

  // INVARIANT: DETERMINISTIC & REPRODUCIBLE SETTLEMENT
  test('Invariant: Debt minimization is deterministic and reproducible', () => {
    const players: any[] = [
      { playerId: 'p1', userId: 'u1', displayName: 'Player 1', netPosition: -150 },
      { playerId: 'p2', userId: 'u2', displayName: 'Player 2', netPosition: -150 },
      { playerId: 'p3', userId: 'u3', displayName: 'Player 3', netPosition: 200 },
      { playerId: 'p4', userId: 'u4', displayName: 'Player 4', netPosition: 100 }
    ];

    const run1 = settlementService.optimizeDebts(players);
    const run2 = settlementService.optimizeDebts(players);

    expect(run1).toEqual(run2);
    expect(run1.length).toBe(3);

    const totalPaid = run1.reduce((sum, p) => sum + p.amount, 0);
    expect(totalPaid).toBe(300);
  });

  // INVARIANT: UNCAPPED SHOT / CREDIT LENDING IN HOME GAMES
  test('Invariant: Uncapped shot/credit lending allows lending beyond in-hand chips and expands pot value', () => {
    const [hostA, playerB, playerC] = setupPlayers(3);
    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Teen Patti Limited Chips Game',
      gameType: 'TEEN_PATTI',
      totalChips: 60,
      chipValue: 5
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);

    // 3 players buy in for 20 chips each @ ₹5 = ₹100 buyin each (60 total physical chips, ₹300 total buyin pot)
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: aId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: bId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: hostA.id, playerId: cId, chipAmount: 20 });

    // Host A lends 50 chips (credit shot) to Player B (even though Host A only has 20 chips)
    // Host A chips become 20 - 50 = -30
    // Player B chips become 20 + 50 = 70
    const { loanId } = ledgerService.recordLend({
      gameId: table.id,
      hostUserId: hostA.id,
      lenderPlayerId: aId,
      borrowerPlayerId: bId,
      chipAmount: 50
    });

    const pA = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(aId);
    const pB = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(bId);
    expect(pA.current_chips).toBe(-30);
    expect(pB.current_chips).toBe(70);

    // End of game: Host counts physical chips in hand:
    // Host A: 35 chips (₹175)
    // Player B: 5 chips (₹25)
    // Player C: 20 chips (₹100)
    // Total physical chips = 35 + 5 + 20 = 60 chips (100% matched)
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 35,
      [bId]: 5,
      [cId]: 20
    });

    expect(preview.isReconciled).toBe(true);
    expect(preview.totalAccountedChips).toBe(60);
    expect(preview.expectedTotalChips).toBe(60);

    // Pot value expanded to include active credit shots:
    // Total buyin pot = ₹300. Active loan = 50 * ₹5 = ₹250. Effective pot = ₹550.
    expect(preview.summary.totalPotMoney).toBe(550);
    expect(preview.summary.totalBuyinPotMoney).toBe(300);
    expect(preview.summary.totalActiveLoansMoney).toBe(250);

    const balA = preview.players.find(p => p.playerId === aId)!;
    const balB = preview.players.find(p => p.playerId === bId)!;
    const balC = preview.players.find(p => p.playerId === cId)!;

    // A: 35 chips (₹175) - Buyin (₹100) + Credit Lent (₹250) = +₹325
    expect(balA.netPosition).toBe(325);
    // B: 5 chips (₹25) - Buyin (₹100) - Loan Debt (₹250) = -₹325
    expect(balB.netPosition).toBe(-325);
    // C: 20 chips (₹100) - Buyin (₹100) = ₹0
    expect(balC.netPosition).toBe(0);

    // Zero-sum invariant strictly satisfied
    expect(balA.netPosition + balB.netPosition + balC.netPosition).toBe(0);

    // Finalize game
    const finalizeRes = settlementService.finalizeGame(hostA.id, table.id);
    expect(finalizeRes.success).toBe(true);
  });

  // TEST CASE: POKER CUSTOM DENOMINATION TABLE
  test('Poker Custom Denomination Table sets exact physical chip inventory and derived valuation', () => {
    const [hostA] = setupPlayers(1);
    const customDenominations: tableService.DenominationConfig[] = [
      { value: 5, count: 40, label: 'Red' },
      { value: 10, count: 30, label: 'Blue' },
      { value: 25, count: 20, label: 'Green' },
      { value: 50, count: 10, label: 'Purple' }
    ];

    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Texas Holdem Custom Denom',
      gameType: 'POKER',
      chipMode: 'DENOMINATION',
      denominations: customDenominations
    });

    // 40 + 30 + 20 + 10 = 100 chips
    expect(table.total_chips).toBe(100);
    expect(table.bank_chips).toBe(100);
    // Pot value: 40*5 + 30*10 + 20*25 + 10*50 = 200 + 300 + 500 + 500 = 1500
    // Avg chip value = 1500 / 100 = 15
    expect(table.chip_value).toBe(15);
    expect(table.chip_mode).toBe('DENOMINATION');

    const denoms = JSON.parse(table.denominations!);
    expect(denoms).toHaveLength(4);
    expect(denoms[0].value).toBe(5);
    expect(denoms[0].count).toBe(40);
  });

  // TEST CASE: ATOMIC MULTI-PLAYER BATCH BUY-IN
  test('Multi-player atomic batch buy-in assigns equal chips to all selected players simultaneously', () => {
    const [hostA, playerB, playerC, playerD] = setupPlayers(4);
    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Batch Buyin Table',
      gameType: 'POKER',
      totalChips: 100,
      chipValue: 10
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);
    const { playerId: cId } = tableService.joinTableByCode(playerC.id, table.join_code);
    const { playerId: dId } = tableService.joinTableByCode(playerD.id, table.join_code);

    // Batch buy-in for 4 players: 20 chips each = 80 chips total (Bank: 100 - 80 = 20 chips left)
    const result = ledgerService.recordBatchBuyIn({
      gameId: table.id,
      hostUserId: hostA.id,
      playerIds: [aId, bId, cId, dId],
      chipAmount: 20
    });

    expect(result.newBankChips).toBe(20);
    expect(result.transactions).toHaveLength(4);
    expect(result.updatedPlayers).toHaveLength(4);

    for (const p of result.updatedPlayers) {
      expect(p.currentChips).toBe(20);
      expect(p.totalBuyinChips).toBe(20);
      expect(p.totalBuyinAmount).toBe(200);
    }

    // Overdraft protection
    expect(() => {
      ledgerService.recordBatchBuyIn({
        gameId: table.id,
        hostUserId: hostA.id,
        playerIds: [aId, bId],
        chipAmount: 15 // 2 * 15 = 30 > 20 remaining
      });
    }).toThrow(/Bank vault only has 20 chips available/);
  });

  // TEST CASE: DENOMINATION-ADAPTIVE LENDING & EXACT ZERO-SUM SETTLEMENT
  test('Denomination-adaptive lending records exact valuation and reconciles strictly zero-sum', () => {
    const [hostA, playerB] = setupPlayers(2);
    const { table } = tableService.createTable({
      hostUserId: hostA.id,
      name: 'Denom Lending Table',
      gameType: 'POKER',
      chipMode: 'DENOMINATION',
      denominations: [
        { value: 10, count: 50 },
        { value: 25, count: 50 },
        { value: 50, count: 20 }
      ] // 120 total chips
    });

    const aId = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, hostA.id).id;
    const { playerId: bId } = tableService.joinTableByCode(playerB.id, table.join_code);

    // Batch buy-in: 30 chips each
    ledgerService.recordBatchBuyIn({
      gameId: table.id,
      hostUserId: hostA.id,
      playerIds: [aId, bId],
      chipAmount: 30
    });

    // Host lends specific chips to Player B: 2 chips of ₹25 + 1 chip of ₹50 = 3 chips, exact value ₹100
    const loanResult = ledgerService.recordLend({
      gameId: table.id,
      hostUserId: hostA.id,
      lenderPlayerId: aId,
      borrowerPlayerId: bId,
      chipAmount: 3,
      moneyValue: 100,
      denominationsBreakdown: [
        { denom: 25, count: 2 },
        { denom: 50, count: 1 }
      ]
    });

    expect(loanResult.loanId).toBeDefined();

    const loanRow = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanResult.loanId) as any;
    expect(loanRow.original_chip_amount).toBe(3);
    expect(loanRow.chip_value).toBeCloseTo(100 / 3, 2);

    // End game: Host finishes with 27 chips, Player B finishes with 33 chips
    const preview = settlementService.submitFinalChipCounts(hostA.id, table.id, {
      [aId]: 27,
      [bId]: 33
    });

    expect(preview.isReconciled).toBe(true);
    const balA = preview.players.find(p => p.playerId === aId)!;
    const balB = preview.players.find(p => p.playerId === bId)!;

    // A lent ₹100 debt -> Net loan impact +₹100
    // B borrowed ₹100 debt -> Net loan impact -₹100
    expect(balA.netLoanImpact).toBe(100);
    expect(balB.netLoanImpact).toBe(-100);
    expect(balA.netPosition + balB.netPosition).toBe(0);
  });
});
