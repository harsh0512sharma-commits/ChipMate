import { randomUUID as uuidv4 } from 'crypto';
import { getDb } from '../db';
import { GameTableRecord } from './table.service';
import { updateLifetimeStatsForFinalizedGame } from './stats.service';

export interface SettlementPlayerBalance {
  playerId: string;
  userId: string;
  displayName: string;
  friendCode: string;
  finalChips: number;
  chipValue: number;
  finalChipsMoney: number;
  totalBuyinMoney: number;
  totalBuyinChips: number;
  gameGrossPnl: number; // finalChipsMoney - totalBuyinMoney
  loanDebtOwed: number; // money owed to other players for outstanding loans
  loanCreditOwed: number; // money owed to this player by other borrowers
  netLoanImpact: number; // loanCreditOwed - loanDebtOwed
  netPosition: number; // gameGrossPnl + netLoanImpact
}

export interface OptimizedPayment {
  id?: string;
  fromPlayerId: string;
  fromUserId: string;
  fromDisplayName: string;
  toPlayerId: string;
  toUserId: string;
  toDisplayName: string;
  amount: number;
  status?: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID';
  paidAmount?: number;
}

export interface SettlementReview {
  gameId: string;
  tableName: string;
  hostUserId: string;
  gameType: string;
  status: string;
  totalChips: number;
  chipValue: number;
  bankChips: number;
  totalAccountedChips: number;
  isReconciled: boolean;
  discrepancy: number;
  players: SettlementPlayerBalance[];
  outstandingLoans: any[];
  optimizedSettlements: OptimizedPayment[];
  summary: {
    totalPotMoney: number;
    biggestWinner?: { displayName: string; amount: number };
    biggestLoser?: { displayName: string; amount: number };
  };
}

export function calculateSettlementPreview(gameId: string): SettlementReview {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as GameTableRecord | undefined;
  if (!table) throw new Error('Game not found');

  const players = db.prepare(`
    SELECT gp.*, COALESCE(gp.guest_name, u.display_name) as display_name, u.friend_code
    FROM game_players gp
    JOIN users u ON gp.user_id = u.id
    WHERE gp.game_id = ?
  `).all(gameId) as any[];

  // Fetch all active/unsettled loans
  const loans = db.prepare(`
    SELECT l.*,
      lender.user_id as lender_user_id, COALESCE(lender.guest_name, u_lender.display_name) as lender_name,
      borrower.user_id as borrower_user_id, COALESCE(borrower.guest_name, u_borrower.display_name) as borrower_name
    FROM loans l
    JOIN game_players lender ON l.lender_id = lender.id
    JOIN users u_lender ON lender.user_id = u_lender.id
    JOIN game_players borrower ON l.borrower_id = borrower.id
    JOIN users u_borrower ON borrower.user_id = u_borrower.id
    WHERE l.game_id = ? AND l.remaining_chip_amount > 0 AND l.status != 'SETTLED'
  `).all(gameId) as any[];

  // Compute loan impacts per player
  const loanDebtMap = new Map<string, number>(); // playerId -> money owed as borrower
  const loanCreditMap = new Map<string, number>(); // playerId -> money owed to player as lender

  for (const l of loans) {
    const loanMoney = l.remaining_chip_amount * table.chip_value;
    loanDebtMap.set(l.borrower_id, (loanDebtMap.get(l.borrower_id) || 0) + loanMoney);
    loanCreditMap.set(l.lender_id, (loanCreditMap.get(l.lender_id) || 0) + loanMoney);
  }

  let totalPotMoney = 0;
  let sumPlayerChips = 0;

  const playerBalances: SettlementPlayerBalance[] = players.map(p => {
    const finalChips = p.current_chips;
    sumPlayerChips += finalChips;
    const finalChipsMoney = finalChips * table.chip_value;
    const totalBuyinMoney = p.total_buyin_amount;
    totalPotMoney += totalBuyinMoney;

    const gameGrossPnl = finalChipsMoney - totalBuyinMoney;
    const loanDebtOwed = loanDebtMap.get(p.id) || 0;
    const loanCreditOwed = loanCreditMap.get(p.id) || 0;
    const netLoanImpact = loanCreditOwed - loanDebtOwed;
    const netPosition = Math.round((gameGrossPnl + netLoanImpact) * 100) / 100;

    return {
      playerId: p.id,
      userId: p.user_id,
      displayName: p.display_name,
      friendCode: p.friend_code,
      finalChips,
      chipValue: table.chip_value,
      finalChipsMoney,
      totalBuyinMoney,
      totalBuyinChips: p.total_buyin_chips,
      gameGrossPnl,
      loanDebtOwed,
      loanCreditOwed,
      netLoanImpact,
      netPosition
    };
  });

  // Calculate settlement optimization (minimize peer payments)
  const optimizedSettlements = optimizeDebts(playerBalances);

  // Check reconciliation
  const totalAccounted = sumPlayerChips + table.bank_chips;
  const isReconciled = totalAccounted === table.total_chips;
  const discrepancy = table.total_chips - totalAccounted;

  // Identify biggest winner & loser
  let biggestWinner: { displayName: string; amount: number } | undefined;
  let biggestLoser: { displayName: string; amount: number } | undefined;

  for (const pb of playerBalances) {
    if (pb.netPosition > 0 && (!biggestWinner || pb.netPosition > biggestWinner.amount)) {
      biggestWinner = { displayName: pb.displayName, amount: pb.netPosition };
    }
    if (pb.netPosition < 0 && (!biggestLoser || pb.netPosition < biggestLoser.amount)) {
      biggestLoser = { displayName: pb.displayName, amount: pb.netPosition };
    }
  }

  return {
    gameId: table.id,
    tableName: table.name,
    hostUserId: table.host_user_id,
    gameType: table.game_type,
    status: table.status,
    totalChips: table.total_chips,
    chipValue: table.chip_value,
    bankChips: table.bank_chips,
    totalAccountedChips: totalAccounted,
    isReconciled,
    discrepancy,
    players: playerBalances,
    outstandingLoans: loans.map(l => ({
      ...l,
      moneyEquivalent: l.remaining_chip_amount * table.chip_value
    })),
    optimizedSettlements,
    summary: {
      totalPotMoney,
      biggestWinner,
      biggestLoser
    }
  };
}

export function optimizeDebts(players: SettlementPlayerBalance[]): OptimizedPayment[] {
  // Creditors: netPosition > 0
  // Debtors: netPosition < 0
  const creditors = players
    .filter(p => p.netPosition > 0.01)
    .map(p => ({ ...p, remaining: p.netPosition }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = players
    .filter(p => p.netPosition < -0.01)
    .map(p => ({ ...p, remaining: Math.abs(p.netPosition) }))
    .sort((a, b) => b.remaining - a.remaining);

  const payments: OptimizedPayment[] = [];

  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const settleAmount = Math.min(creditor.remaining, debtor.remaining);
    const roundedAmount = Math.round(settleAmount * 100) / 100;

    if (roundedAmount > 0) {
      payments.push({
        fromPlayerId: debtor.playerId,
        fromUserId: debtor.userId,
        fromDisplayName: debtor.displayName,
        toPlayerId: creditor.playerId,
        toUserId: creditor.userId,
        toDisplayName: creditor.displayName,
        amount: roundedAmount,
        status: 'UNPAID',
        paidAmount: 0
      });
    }

    creditor.remaining = Math.round((creditor.remaining - settleAmount) * 100) / 100;
    debtor.remaining = Math.round((debtor.remaining - settleAmount) * 100) / 100;

    if (creditor.remaining <= 0.01) {
      cIdx++;
    }
    if (debtor.remaining <= 0.01) {
      dIdx++;
    }
  }

  return payments;
}

export function proceedToSettlement(hostUserId: string, gameId: string): SettlementReview {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as GameTableRecord | undefined;
  if (!table) throw new Error('Game not found');
  if (table.host_user_id !== hostUserId) throw new Error('Only the host can initiate settlement');
  if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
    throw new Error('Game is already finalized');
  }

  const now = new Date().toISOString();
  db.prepare(`UPDATE games SET status = 'SETTLING', ended_at = ? WHERE id = ?`).run(now, gameId);

  return calculateSettlementPreview(gameId);
}

export function finalizeGame(hostUserId: string, gameId: string): { success: boolean; gameId: string } {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as GameTableRecord | undefined;
  if (!table) throw new Error('Game not found');
  if (table.host_user_id !== hostUserId) throw new Error('Only the host can finalize the game');
  if (table.status === 'FINALIZED') throw new Error('Game is already finalized');

  const preview = calculateSettlementPreview(gameId);

  const finalizeTx = db.transaction(() => {
    const now = new Date().toISOString();
    const settlementId = uuidv4();

    // 1. Create or replace settlement header
    db.prepare('DELETE FROM settlement_items WHERE game_id = ?').run(gameId);
    db.prepare('DELETE FROM settlements WHERE game_id = ?').run(gameId);

    db.prepare(`
      INSERT INTO settlements (id, game_id, total_pot_money, total_pot_chips, reconciled, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(settlementId, gameId, preview.summary.totalPotMoney, table.total_chips, preview.isReconciled ? 1 : 0, now);

    // 2. Insert settlement items
    for (const pay of preview.optimizedSettlements) {
      const itemId = uuidv4();
      db.prepare(`
        INSERT INTO settlement_items (id, settlement_id, game_id, from_player_id, to_player_id, amount, status, paid_amount, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'UNPAID', 0, ?, ?)
      `).run(itemId, settlementId, gameId, pay.fromPlayerId, pay.toPlayerId, pay.amount, now, now);
    }

    // 3. Insert player game results
    db.prepare('DELETE FROM player_game_results WHERE game_id = ?').run(gameId);

    for (const p of preview.players) {
      const resId = uuidv4();
      const isWinner = p.netPosition > 0 ? 1 : 0;
      const netChips = Math.round(p.finalChips - p.totalBuyinChips);

      db.prepare(`
        INSERT INTO player_game_results (id, game_id, user_id, final_chips, buyin_money, final_chip_money, net_loans_money, net_winnings_money, net_chips, is_winner, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        resId,
        gameId,
        p.userId,
        p.finalChips,
        p.totalBuyinMoney,
        p.finalChipsMoney,
        p.netLoanImpact,
        p.netPosition,
        netChips,
        isWinner,
        now
      );
    }

    // 4. Mark game as FINALIZED
    db.prepare(`
      UPDATE games SET status = 'FINALIZED', finalized_at = ? WHERE id = ?
    `).run(now, gameId);

    // 5. Update lifetime stats for all players
    updateLifetimeStatsForFinalizedGame(gameId, preview.players, table.game_type);
  });

  finalizeTx();

  return { success: true, gameId };
}

export function updateSettlementPaymentStatus(
  userId: string,
  itemId: string,
  status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID',
  paidAmount?: number
): { success: boolean } {
  const db = getDb();
  const item = db.prepare('SELECT * FROM settlement_items WHERE id = ?').get(itemId) as any;
  if (!item) throw new Error('Settlement item not found');

  const now = new Date().toISOString();
  const actualPaidAmount = status === 'PAID' ? item.amount : (paidAmount !== undefined ? paidAmount : item.paid_amount);

  db.prepare(`
    UPDATE settlement_items 
    SET status = ?, paid_amount = ?, updated_at = ?
    WHERE id = ?
  `).run(status, actualPaidAmount, now, itemId);

  return { success: true };
}

export function getSettlementDetails(gameId: string) {
  const db = getDb();
  const settlement = db.prepare('SELECT * FROM settlements WHERE game_id = ?').get(gameId) as any;
  if (!settlement) {
    // If not finalized yet, return preview
    return calculateSettlementPreview(gameId);
  }

  const items = db.prepare(`
    SELECT si.*, 
      from_gp.user_id as from_user_id, COALESCE(from_gp.guest_name, u_from.display_name) as from_display_name,
      to_gp.user_id as to_user_id, COALESCE(to_gp.guest_name, u_to.display_name) as to_display_name
    FROM settlement_items si
    JOIN game_players from_gp ON si.from_player_id = from_gp.id
    JOIN users u_from ON from_gp.user_id = u_from.id
    JOIN game_players to_gp ON si.to_player_id = to_gp.id
    JOIN users u_to ON to_gp.user_id = u_to.id
    WHERE si.game_id = ?
    ORDER BY si.amount DESC
  `).all(gameId) as any[];

  const preview = calculateSettlementPreview(gameId);

  return {
    ...preview,
    settlementId: settlement.id,
    optimizedSettlements: items.map(i => ({
      id: i.id,
      fromPlayerId: i.from_player_id,
      fromUserId: i.from_user_id,
      fromDisplayName: i.from_display_name,
      toPlayerId: i.to_player_id,
      toUserId: i.to_user_id,
      toDisplayName: i.to_display_name,
      amount: i.amount,
      status: i.status,
      paidAmount: i.paid_amount
    }))
  };
}
