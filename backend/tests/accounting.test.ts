import { getDb, closeDb } from '../src/db';
import * as authService from '../src/services/auth.service';
import * as tableService from '../src/services/table.service';
import * as ledgerService from '../src/services/ledger.service';
import * as settlementService from '../src/services/settlement.service';
import * as statsService from '../src/services/stats.service';

describe('ChipMate Authoritative Ledger & Accounting Engine Tests', () => {
  let db: any;
  let hostUser: any;
  let playerA: any;
  let playerB: any;
  let playerC: any;

  beforeEach(() => {
    // Fresh in-memory DB for each test run to ensure strict isolation
    closeDb();
    db = getDb(':memory:');
  });

  // Helper to setup users cleanly
  function setupTestUsers() {
    // Insert mock OTPs
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 1000000).toISOString();

    db.prepare("INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at) VALUES ('1', 'host@test.com', '123456', ?, 0, ?)").run(future, now);
    db.prepare("INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at) VALUES ('2', 'rahul@test.com', '123456', ?, 0, ?)").run(future, now);
    db.prepare("INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at) VALUES ('3', 'amit@test.com', '123456', ?, 0, ?)").run(future, now);
    db.prepare("INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at) VALUES ('4', 'harsh@test.com', '123456', ?, 0, ?)").run(future, now);

    const u1 = authService.verifyOtp('host@test.com', '123456').user;
    const u2 = authService.verifyOtp('rahul@test.com', '123456').user;
    const u3 = authService.verifyOtp('amit@test.com', '123456').user;
    const u4 = authService.verifyOtp('harsh@test.com', '123456').user;

    authService.updateUserProfile(u1.id, 'Host User');
    authService.updateUserProfile(u2.id, 'Rahul');
    authService.updateUserProfile(u3.id, 'Amit');
    authService.updateUserProfile(u4.id, 'Harsh');

    return {
      host: authService.getUserById(u1.id)!,
      rahul: authService.getUserById(u2.id)!,
      amit: authService.getUserById(u3.id)!,
      harsh: authService.getUserById(u4.id)!
    };
  }

  test('1. Total chips always reconcile (Bank + Players = Total Chips)', () => {
    const { host, rahul, amit } = setupTestUsers();
    const { table, hostPlayerId } = tableService.createTable({
      hostUserId: host.id,
      name: 'Friday Teen Patti',
      gameType: 'TEEN_PATTI',
      totalChips: 100,
      chipValue: 10
    });

    const { playerId: rahulPlayerId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: amitPlayerId } = tableService.joinTableByCode(amit.id, table.join_code);

    let details = tableService.getTableDetails(table.id, host.id)!;
    expect(details.reconciliation.totalChips).toBe(100);
    expect(details.reconciliation.bankChips).toBe(100);
    expect(details.reconciliation.playerChips).toBe(0);
    expect(details.reconciliation.isReconciled).toBe(true);

    // Buy-ins
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rahulPlayerId, chipAmount: 30 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: amitPlayerId, chipAmount: 20 });

    details = tableService.getTableDetails(table.id, host.id)!;
    expect(details.reconciliation.bankChips).toBe(50);
    expect(details.reconciliation.playerChips).toBe(50);
    expect(details.reconciliation.isReconciled).toBe(true);
    expect(details.reconciliation.discrepancy).toBe(0);
  });

  test('2. Initial Buy-in updates player chips, bank chips and financial contribution', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Poker Night', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rahulPlayerId } = tableService.joinTableByCode(rahul.id, table.join_code);

    const { transaction, newBankChips, newPlayerChips } = ledgerService.recordBuyIn({
      gameId: table.id,
      hostUserId: host.id,
      playerId: rahulPlayerId,
      chipAmount: 25
    });

    expect(transaction.type).toBe('BUY_IN');
    expect(transaction.chip_amount).toBe(25);
    expect(transaction.money_value).toBe(250); // 25 * 10
    expect(newBankChips).toBe(75);
    expect(newPlayerChips).toBe(25);

    const player = db.prepare('SELECT * FROM game_players WHERE id = ?').get(rahulPlayerId);
    expect(player.total_buyin_amount).toBe(250);
    expect(player.total_buyin_chips).toBe(25);
  });

  test('3. Re-buy increases buyin tracking and flags as RE_BUY', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rahulPlayerId } = tableService.joinTableByCode(rahul.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rahulPlayerId, chipAmount: 20 });
    const { transaction } = ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rahulPlayerId, chipAmount: 15, isRebuy: true });

    expect(transaction.type).toBe('RE_BUY');
    expect(transaction.chip_amount).toBe(15);
    expect(transaction.money_value).toBe(150);

    const player = db.prepare('SELECT * FROM game_players WHERE id = ?').get(rahulPlayerId);
    expect(player.current_chips).toBe(35);
    expect(player.total_buyin_amount).toBe(350);
  });

  test('4. Bank depletion prevents buying more chips than bank inventory', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rahulPlayerId } = tableService.joinTableByCode(rahul.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rahulPlayerId, chipAmount: 90 });

    // Attempting to buy 15 when only 10 remain in bank
    expect(() => {
      ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rahulPlayerId, chipAmount: 15 });
    }).toThrow(/Bank only has 10 chips available/);
  });

  test('5. Lending moves physical chips AND creates debt in loan ledger', () => {
    const { host, rahul, amit } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'TEEN_PATTI', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 20 });

    const { transaction, loanId } = ledgerService.recordLend({
      gameId: table.id,
      hostUserId: host.id,
      lenderPlayerId: rId,
      borrowerPlayerId: aId,
      chipAmount: 8
    });

    expect(transaction.type).toBe('LEND');
    expect(transaction.chip_amount).toBe(8);

    const r = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(rId);
    const a = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(aId);
    expect(r.current_chips).toBe(12); // 20 - 8
    expect(a.current_chips).toBe(8);  // 0 + 8

    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId);
    expect(loan.remaining_chip_amount).toBe(8);
    expect(loan.status).toBe('ACTIVE');
  });

  test('6. Partial loan repayment updates remaining debt without settling', () => {
    const { host, rahul, amit } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'TEEN_PATTI', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 20 });
    const { loanId } = ledgerService.recordLend({ gameId: table.id, hostUserId: host.id, lenderPlayerId: rId, borrowerPlayerId: aId, chipAmount: 8 });

    // Amit returns 3 chips
    const { transaction, remainingLoanChips, isSettled } = ledgerService.recordLoanRepayment({
      gameId: table.id,
      hostUserId: host.id,
      loanId,
      chipAmount: 3
    });

    expect(transaction.type).toBe('RETURN');
    expect(remainingLoanChips).toBe(5);
    expect(isSettled).toBe(false);

    const r = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(rId);
    const a = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(aId);
    expect(r.current_chips).toBe(15); // 12 + 3
    expect(a.current_chips).toBe(5);  // 8 - 3
  });

  test('7. Complete loan repayment settles loan completely', () => {
    const { host, rahul, amit } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'TEEN_PATTI', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 20 });
    const { loanId } = ledgerService.recordLend({ gameId: table.id, hostUserId: host.id, lenderPlayerId: rId, borrowerPlayerId: aId, chipAmount: 8 });

    const { remainingLoanChips, isSettled } = ledgerService.recordLoanRepayment({
      gameId: table.id,
      hostUserId: host.id,
      loanId,
      chipAmount: 8
    });

    expect(remainingLoanChips).toBe(0);
    expect(isSettled).toBe(true);

    const loan = db.prepare('SELECT status FROM loans WHERE id = ?').get(loanId);
    expect(loan.status).toBe('SETTLED');
  });

  test('8. Normal transfer moves chips WITHOUT creating loan debt', () => {
    const { host, rahul, amit } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'TEEN_PATTI', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 20 });

    const { transaction } = ledgerService.recordTransfer({
      gameId: table.id,
      hostUserId: host.id,
      fromPlayerId: rId,
      toPlayerId: aId,
      chipAmount: 5
    });

    expect(transaction.type).toBe('TRANSFER');
    const loans = db.prepare('SELECT COUNT(*) as cnt FROM loans WHERE game_id = ?').get(table.id);
    expect(loans.cnt).toBe(0); // No loan created
  });

  test('9. Undo creates an auditable reversal transaction without deleting history', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);

    const { transaction } = ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 20 });

    const { reversalTransaction } = ledgerService.undoTransaction({
      gameId: table.id,
      hostUserId: host.id,
      transactionId: transaction.id
    });

    expect(reversalTransaction.type).toBe('REVERSAL');
    expect(reversalTransaction.reversal_of).toBe(transaction.id);

    // Both transactions exist in DB
    const txCount = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE game_id = ?').get(table.id);
    expect(txCount.cnt).toBe(2);

    // Player chip balance restored to 0
    const player = db.prepare('SELECT current_chips, total_buyin_amount FROM game_players WHERE id = ?').get(rId);
    expect(player.current_chips).toBe(0);
    expect(player.total_buyin_amount).toBe(0);
  });

  test('10. Correction adjusts chip counts safely with audit record', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 20 });

    const { transaction, discrepancyAdjustment } = ledgerService.recordCorrection({
      gameId: table.id,
      hostUserId: host.id,
      playerId: rId,
      newChipCount: 22,
      reason: 'Recount at break'
    });

    expect(transaction.type).toBe('CORRECTION');
    expect(discrepancyAdjustment).toBe(2);

    const player = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(rId);
    expect(player.current_chips).toBe(22);

    // Total chips still reconcile
    const details = tableService.getTableDetails(table.id, host.id)!;
    expect(details.reconciliation.isReconciled).toBe(true);
  });

  test('11. Multiple loans between multiple players resolve accurately in settlement', () => {
    const { host, rahul, amit, harsh } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);
    const { playerId: hId } = tableService.joinTableByCode(harsh.id, table.join_code);

    // Rahul buys 40 chips (₹400), Harsh buys 30 chips (₹300), Amit buys 30 chips (₹300)
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 40 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: hId, chipAmount: 30 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: aId, chipAmount: 30 });

    // Rahul lends Amit 10 chips
    ledgerService.recordLend({ gameId: table.id, hostUserId: host.id, lenderPlayerId: rId, borrowerPlayerId: aId, chipAmount: 10 });
    // Harsh lends Rahul 5 chips
    ledgerService.recordLend({ gameId: table.id, hostUserId: host.id, lenderPlayerId: hId, borrowerPlayerId: rId, chipAmount: 5 });

    const preview = settlementService.calculateSettlementPreview(table.id);
    const rBal = preview.players.find(p => p.playerId === rId)!;
    const aBal = preview.players.find(p => p.playerId === aId)!;
    const hBal = preview.players.find(p => p.playerId === hId)!;

    // Rahul: lent 10 (gets ₹100), borrowed 5 (owes ₹50) -> netLoanImpact = +₹50
    expect(rBal.netLoanImpact).toBe(50);
    // Amit: borrowed 10 -> netLoanImpact = -₹100
    expect(aBal.netLoanImpact).toBe(-100);
    // Harsh: lent 5 -> netLoanImpact = +₹50
    expect(hBal.netLoanImpact).toBe(50);

    // Sum of net positions must equal 0
    const sumNet = rBal.netPosition + aBal.netPosition + hBal.netPosition;
    expect(sumNet).toBe(0);
  });

  test('12. Settlement debt minimization produces optimal minimal payments', () => {
    const players: any[] = [
      { playerId: '1', userId: 'u1', displayName: 'A', netPosition: -100 },
      { playerId: '2', userId: 'u2', displayName: 'B', netPosition: -50 },
      { playerId: '3', userId: 'u3', displayName: 'C', netPosition: 150 }
    ];

    const optimized = settlementService.optimizeDebts(players);
    expect(optimized.length).toBe(2);
    expect(optimized[0].fromDisplayName).toBe('A');
    expect(optimized[0].toDisplayName).toBe('C');
    expect(optimized[0].amount).toBe(100);

    expect(optimized[1].fromDisplayName).toBe('B');
    expect(optimized[1].toDisplayName).toBe('C');
    expect(optimized[1].amount).toBe(50);
  });

  test('13. Game finalization locks game, records results and updates lifetime stats', () => {
    const { host, rahul, amit } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Final Game', gameType: 'TEEN_PATTI', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);

    // Both buy 50 chips (₹500 each)
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 50 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: aId, chipAmount: 50 });

    // Rahul wins 20 chips from Amit (transfer)
    ledgerService.recordTransfer({ gameId: table.id, hostUserId: host.id, fromPlayerId: aId, toPlayerId: rId, chipAmount: 20 });
    // Rahul now has 70 chips (₹700, +₹200 net), Amit has 30 chips (₹300, -₹200 net)

    settlementService.proceedToSettlement(host.id, table.id);
    const finalizeRes = settlementService.finalizeGame(host.id, table.id);
    expect(finalizeRes.success).toBe(true);

    // Check game status
    const game = db.prepare('SELECT status FROM games WHERE id = ?').get(table.id);
    expect(game.status).toBe('FINALIZED');

    // Check stats updated for Rahul
    const rahulStats = authService.getUserById(rahul.id)!.stats;
    expect(rahulStats.games_played).toBe(1);
    expect(rahulStats.games_won).toBe(1);
    expect(rahulStats.net_winnings).toBe(200);
    expect(rahulStats.win_rate).toBe(100);
    expect(rahulStats.biggest_win).toBe(200);

    // Check stats updated for Amit
    const amitStats = authService.getUserById(amit.id)!.stats;
    expect(amitStats.games_played).toBe(1);
    expect(amitStats.games_lost).toBe(1);
    expect(amitStats.net_winnings).toBe(-200);
    expect(amitStats.biggest_loss).toBe(200);
  });

  test('14. Finalized game prevents further modifications', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 10 });

    settlementService.proceedToSettlement(host.id, table.id);
    settlementService.finalizeGame(host.id, table.id);

    expect(() => {
      ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 5 });
    }).toThrow(/Cannot add buy-ins to a finalized game/);
  });

  test('15. Non-host cannot perform host-only operations', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);

    expect(() => {
      ledgerService.recordBuyIn({ gameId: table.id, hostUserId: rahul.id, playerId: rId, chipAmount: 10 });
    }).toThrow(/Only the host can record buy-ins/);
  });

  test('16. Duplicate transaction prevented by idempotency key', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);

    const key = 'req-12345';
    const tx1 = ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 10, idempotencyKey: key });
    const tx2 = ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 10, idempotencyKey: key });

    expect(tx1.transaction.id).toBe(tx2.transaction.id);
    const txCount = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE game_id = ?').get(table.id);
    expect(txCount.cnt).toBe(1);
  });

  test('17. Head-to-Head calculations between two players across multiple games', () => {
    const { host, rahul, amit } = setupTestUsers();

    // Game 1: Rahul wins against Amit
    const { table: g1 } = tableService.createTable({ hostUserId: host.id, name: 'G1', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: r1 } = tableService.joinTableByCode(rahul.id, g1.join_code);
    const { playerId: a1 } = tableService.joinTableByCode(amit.id, g1.join_code);
    ledgerService.recordBuyIn({ gameId: g1.id, hostUserId: host.id, playerId: r1, chipAmount: 50 });
    ledgerService.recordBuyIn({ gameId: g1.id, hostUserId: host.id, playerId: a1, chipAmount: 50 });
    ledgerService.recordTransfer({ gameId: g1.id, hostUserId: host.id, fromPlayerId: a1, toPlayerId: r1, chipAmount: 10 });
    settlementService.proceedToSettlement(host.id, g1.id);
    settlementService.finalizeGame(host.id, g1.id);

    // Game 2: Amit wins against Rahul
    const { table: g2 } = tableService.createTable({ hostUserId: host.id, name: 'G2', gameType: 'POKER', totalChips: 100, chipValue: 20 });
    const { playerId: r2 } = tableService.joinTableByCode(rahul.id, g2.join_code);
    const { playerId: a2 } = tableService.joinTableByCode(amit.id, g2.join_code);
    ledgerService.recordBuyIn({ gameId: g2.id, hostUserId: host.id, playerId: r2, chipAmount: 50 });
    ledgerService.recordBuyIn({ gameId: g2.id, hostUserId: host.id, playerId: a2, chipAmount: 50 });
    ledgerService.recordTransfer({ gameId: g2.id, hostUserId: host.id, fromPlayerId: r2, toPlayerId: a2, chipAmount: 20 });
    settlementService.proceedToSettlement(host.id, g2.id);
    settlementService.finalizeGame(host.id, g2.id);

    const h2h = statsService.getHeadToHeadStats(rahul.id, amit.id);
    expect(h2h.gamesPlayedTogether).toBe(2);
    expect(h2h.winsA).toBe(1);
    expect(h2h.winsB).toBe(1);
    // G1: Rahul +100, Amit -100. G2: Rahul -400, Amit +400. Total Rahul = -300, Amit = +300
    expect(h2h.netA).toBe(-300);
    expect(h2h.netB).toBe(300);
  });

  test('18. Configurable total chips (e.g. 200 chips instead of 100) reconciles properly', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({
      hostUserId: host.id,
      name: 'High Roller Game',
      gameType: 'POKER',
      totalChips: 200,
      chipValue: 50
    });

    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 80 });

    const details = tableService.getTableDetails(table.id, host.id)!;
    expect(details.reconciliation.totalChips).toBe(200);
    expect(details.reconciliation.bankChips).toBe(120);
    expect(details.reconciliation.playerChips).toBe(80);
    expect(details.reconciliation.isReconciled).toBe(true);
    expect(details.table.totalMoneyValue).toBe(200 * 50); // ₹10,000
  });

  test('19. Friend Leaderboard ranks friends by selected criteria', () => {
    const { host, rahul, amit } = setupTestUsers();

    // Make host and rahul friends
    const req = db.prepare("INSERT INTO friendships VALUES ('f1', ?, ?, 'ACCEPTED', ?, 'now', 'now')").run(host.id, rahul.id, host.id);

    const leaderboard = statsService.getFriendLeaderboard(host.id, 'NET_WINNINGS');
    expect(leaderboard.length).toBe(2); // host and rahul
  });

  test('20. Chip Mismatch Detection triggers if discrepancy exists', () => {
    const { host, rahul } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 20 });

    // Artificially simulate a missing chip in bank
    db.prepare('UPDATE games SET bank_chips = 79 WHERE id = ?').run(table.id);

    const details = tableService.getTableDetails(table.id, host.id)!;
    expect(details.reconciliation.isReconciled).toBe(false);
    expect(details.reconciliation.discrepancy).toBe(1); // 100 - (79 + 20) = 1 chip unaccounted
  });

  test('21. Cannot return more chips than remaining loan debt', () => {
    const { host, rahul, amit } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 20 });
    const { loanId } = ledgerService.recordLend({ gameId: table.id, hostUserId: host.id, lenderPlayerId: rId, borrowerPlayerId: aId, chipAmount: 5 });

    expect(() => {
      ledgerService.recordLoanRepayment({ gameId: table.id, hostUserId: host.id, loanId, chipAmount: 6 });
    }).toThrow(/Cannot return 6 chips. Remaining loan balance is 5 chips/);
  });

  test('22. Cannot transfer more chips than current balance', () => {
    const { host, rahul, amit } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Game', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 10 });

    expect(() => {
      ledgerService.recordTransfer({ gameId: table.id, hostUserId: host.id, fromPlayerId: rId, toPlayerId: aId, chipAmount: 15 });
    }).toThrow(/Sender only has 10 chips available to transfer/);
  });

  test('23. Games with different player counts (5 players) reconcile and calculate stats properly', () => {
    const { host, rahul, amit, harsh } = setupTestUsers();
    // Add a 5th user
    const now = new Date().toISOString();
    const future = new Date(Date.now() + 1000000).toISOString();
    db.prepare("INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at) VALUES ('5', 'rohit@test.com', '123456', ?, 0, ?)").run(future, now);
    const rohit = authService.verifyOtp('rohit@test.com', '123456').user;
    authService.updateUserProfile(rohit.id, 'Rohit');

    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Big Game', gameType: 'TEEN_PATTI', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);
    const { playerId: hId } = tableService.joinTableByCode(harsh.id, table.join_code);
    const { playerId: rohitId } = tableService.joinTableByCode(rohit.id, table.join_code);

    // Each buys 20 chips
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: aId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: hId, chipAmount: 20 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rohitId, chipAmount: 20 });

    const details = tableService.getTableDetails(table.id, host.id)!;
    expect(details.reconciliation.playerChips).toBe(80);
    expect(details.reconciliation.bankChips).toBe(20);
    expect(details.reconciliation.isReconciled).toBe(true);
  });

  test('24. Different chip values across games (Game 1 ₹10, Game 2 ₹20) correctly calculate monetary net', () => {
    const { host, rahul } = setupTestUsers();

    // Game 1: ₹10/chip, Rahul buys 10 chips (₹100), ends with 40 chips (+30 chips = +₹300)
    const { table: g1 } = tableService.createTable({ hostUserId: host.id, name: 'Game 1', gameType: 'POKER', totalChips: 100, chipValue: 10 });
    const { playerId: r1 } = tableService.joinTableByCode(rahul.id, g1.join_code);
    ledgerService.recordBuyIn({ gameId: g1.id, hostUserId: host.id, playerId: r1, chipAmount: 10 });
    ledgerService.recordCorrection({ gameId: g1.id, hostUserId: host.id, playerId: r1, newChipCount: 40 });
    settlementService.proceedToSettlement(host.id, g1.id);
    settlementService.finalizeGame(host.id, g1.id);

    // Game 2: ₹20/chip, Rahul buys 10 chips (₹200), ends with 5 chips (-5 chips = -₹100)
    const { table: g2 } = tableService.createTable({ hostUserId: host.id, name: 'Game 2', gameType: 'POKER', totalChips: 100, chipValue: 20 });
    const { playerId: r2 } = tableService.joinTableByCode(rahul.id, g2.join_code);
    ledgerService.recordBuyIn({ gameId: g2.id, hostUserId: host.id, playerId: r2, chipAmount: 10 });
    ledgerService.recordCorrection({ gameId: g2.id, hostUserId: host.id, playerId: r2, newChipCount: 5 });
    settlementService.proceedToSettlement(host.id, g2.id);
    settlementService.finalizeGame(host.id, g2.id);

    const stats = statsService.recalculateUserLifetimeStats(rahul.id);
    // Net money: +300 - 100 = +₹200
    expect(stats.net_winnings).toBe(200);
    // Net chips: +30 - 5 = +25 chips
    expect(stats.net_chips).toBe(25);
    // Separately tracked!
  });

  test('25. Game Insights extracts winner, biggest loser, and top borrower accurately', () => {
    const { host, rahul, amit } = setupTestUsers();
    const { table } = tableService.createTable({ hostUserId: host.id, name: 'Insight Game', gameType: 'TEEN_PATTI', totalChips: 100, chipValue: 10 });
    const { playerId: rId } = tableService.joinTableByCode(rahul.id, table.join_code);
    const { playerId: aId } = tableService.joinTableByCode(amit.id, table.join_code);

    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: rId, chipAmount: 50 });
    ledgerService.recordBuyIn({ gameId: table.id, hostUserId: host.id, playerId: aId, chipAmount: 50 });
    ledgerService.recordLend({ gameId: table.id, hostUserId: host.id, lenderPlayerId: rId, borrowerPlayerId: aId, chipAmount: 15 });
    ledgerService.recordTransfer({ gameId: table.id, hostUserId: host.id, fromPlayerId: aId, toPlayerId: rId, chipAmount: 30 });

    settlementService.proceedToSettlement(host.id, table.id);
    settlementService.finalizeGame(host.id, table.id);

    const insights = statsService.getGameInsights(table.id);
    expect(insights).not.toBeNull();
    expect(insights!.winner.displayName).toBe('Rahul');
    expect(insights!.loser.displayName).toBe('Amit');
    expect(insights!.mostBorrowed?.displayName).toBe('Amit');
    expect(insights!.mostBorrowed?.chipsBorrowed).toBe(15);
  });
});
