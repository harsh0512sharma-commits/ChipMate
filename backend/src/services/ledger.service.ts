import { randomUUID as uuidv4 } from 'crypto';
import { getDb } from '../db';
import { GameTableRecord } from './table.service';

export interface TransactionRecord {
  id: string;
  game_id: string;
  type: 'BUY_IN' | 'RE_BUY' | 'LEND' | 'RETURN' | 'TRANSFER' | 'CORRECTION' | 'REVERSAL';
  actor_user_id: string;
  from_player_id: string | null;
  to_player_id: string | null;
  chip_amount: number;
  chip_value: number;
  money_value: number;
  idempotency_key?: string | null;
  reversal_of?: string | null;
  metadata?: string | null;
  created_at: string;
}

export function recordBuyIn(params: {
  gameId: string;
  hostUserId: string;
  playerId: string;
  chipAmount: number;
  moneyValue?: number;
  denominationsBreakdown?: Array<{ denom: number; count: number }>;
  isRebuy?: boolean;
  idempotencyKey?: string;
}): { transaction: TransactionRecord; newBankChips: number; newPlayerChips: number } {
  const db = getDb();

  if (params.chipAmount <= 0) {
    throw new Error('Chip amount must be greater than 0');
  }

  // Check idempotency
  if (params.idempotencyKey) {
    const existingTx = db.prepare('SELECT * FROM transactions WHERE idempotency_key = ?').get(params.idempotencyKey) as TransactionRecord | undefined;
    if (existingTx) {
      const table = db.prepare('SELECT bank_chips FROM games WHERE id = ?').get(params.gameId) as any;
      const player = db.prepare('SELECT current_chips FROM game_players WHERE id = ?').get(params.playerId) as any;
      return { transaction: existingTx, newBankChips: table.bank_chips, newPlayerChips: player.current_chips };
    }
  }

  const run = db.transaction(() => {
    const table = db.prepare('SELECT * FROM games WHERE id = ?').get(params.gameId) as GameTableRecord | undefined;
    if (!table) throw new Error('Game table not found');
    if (table.host_user_id !== params.hostUserId) throw new Error('Only the host can record buy-ins');
    if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
      throw new Error('Cannot add buy-ins to a finalized game');
    }

    const player = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(params.playerId, params.gameId) as any;
    if (!player) throw new Error('Player not found in this game');

    let totalChipsToDeduct = params.chipAmount;
    let actualMoneyValue = (params.moneyValue !== undefined && params.moneyValue > 0)
      ? params.moneyValue
      : (params.chipAmount * table.chip_value);
    let updatedBank = table.bank_chips;

    // VALUE mode or Denomination inventory handling
    if (table.chip_mode === 'VALUE') {
      const money = (params.moneyValue !== undefined && params.moneyValue > 0)
        ? params.moneyValue
        : params.chipAmount;
      if (money > table.bank_chips) {
        throw new Error(`Buy-in amount (₹${money}) exceeds bank vault balance of ₹${table.bank_chips}.`);
      }
      totalChipsToDeduct = money;
      actualMoneyValue = money;
      updatedBank = table.bank_chips - money;
      db.prepare('UPDATE games SET bank_chips = ? WHERE id = ?').run(updatedBank, table.id);
    } else if (params.denominationsBreakdown && params.denominationsBreakdown.length > 0) {
      const breakdownChips = params.denominationsBreakdown.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
      const breakdownMoney = params.denominationsBreakdown.reduce((sum, d) => sum + ((Number(d.count) || 0) * (Number(d.denom) || 0)), 0);
      if (breakdownChips > 0) {
        totalChipsToDeduct = breakdownChips;
        actualMoneyValue = (params.moneyValue !== undefined && params.moneyValue > 0) ? params.moneyValue : breakdownMoney;
      }

      if (table.denominations) {
        let denoms: any[] = [];
        try { denoms = JSON.parse(table.denominations); } catch (_) {}
        if (Array.isArray(denoms) && denoms.length > 0 && typeof denoms[0] === 'object') {
          for (const item of params.denominationsBreakdown) {
            const count = Number(item.count) || 0;
            if (count <= 0) continue;
            const bankItem = denoms.find(d => Number(d.value) === Number(item.denom));
            if (!bankItem || (Number(bankItem.count) || 0) < count) {
              throw new Error(`Bank vault only has ${bankItem ? bankItem.count : 0} chips of ₹${item.denom}, but ${count} requested.`);
            }
            bankItem.count = (Number(bankItem.count) || 0) - count;
          }
          updatedBank = denoms.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
          db.prepare('UPDATE games SET bank_chips = ?, denominations = ? WHERE id = ?').run(updatedBank, JSON.stringify(denoms), table.id);
        } else {
          if (table.bank_chips < totalChipsToDeduct) {
            throw new Error(`Bank only has ${table.bank_chips} chips available.`);
          }
          updatedBank = table.bank_chips - totalChipsToDeduct;
          db.prepare('UPDATE games SET bank_chips = ? WHERE id = ?').run(updatedBank, table.id);
        }
      } else {
        if (table.bank_chips < totalChipsToDeduct) {
          throw new Error(`Bank only has ${table.bank_chips} chips available.`);
        }
        updatedBank = table.bank_chips - totalChipsToDeduct;
        db.prepare('UPDATE games SET bank_chips = ? WHERE id = ?').run(updatedBank, table.id);
      }
    } else {
      if (table.bank_chips < totalChipsToDeduct) {
        throw new Error(`Bank only has ${table.bank_chips} chips available.`);
      }
      updatedBank = table.bank_chips - totalChipsToDeduct;
      db.prepare('UPDATE games SET bank_chips = ? WHERE id = ?').run(updatedBank, table.id);
    }

    const type = params.isRebuy ? 'RE_BUY' : (player.total_buyin_chips > 0 ? 'RE_BUY' : 'BUY_IN');
    const txId = uuidv4();
    const now = new Date().toISOString();

    // 2. Add chips & money to player
    const updatedPlayerChips = player.current_chips + totalChipsToDeduct;
    const updatedTotalBuyinChips = player.total_buyin_chips + totalChipsToDeduct;
    const updatedTotalBuyinAmount = player.total_buyin_amount + actualMoneyValue;

    db.prepare(`
      UPDATE game_players 
      SET current_chips = ?, total_buyin_chips = ?, total_buyin_amount = ?
      WHERE id = ?
    `).run(updatedPlayerChips, updatedTotalBuyinChips, updatedTotalBuyinAmount, player.id);

    // 3. Record transaction
    const metadata = params.denominationsBreakdown ? JSON.stringify({ breakdown: params.denominationsBreakdown }) : null;
    const effectiveChipVal = totalChipsToDeduct > 0 ? (actualMoneyValue / totalChipsToDeduct) : table.chip_value;

    db.prepare(`
      INSERT INTO transactions (id, game_id, type, actor_user_id, from_player_id, to_player_id, chip_amount, chip_value, money_value, idempotency_key, metadata, created_at)
      VALUES (?, ?, ?, ?, 'BANK', ?, ?, ?, ?, ?, ?, ?)
    `).run(txId, table.id, type, params.hostUserId, player.id, totalChipsToDeduct, effectiveChipVal, actualMoneyValue, params.idempotencyKey || null, metadata, now);

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId) as TransactionRecord;
    return { transaction: tx, newBankChips: updatedBank, newPlayerChips: updatedPlayerChips };
  });

  return run();
}

export function recordBatchBuyIn(params: {
  gameId: string;
  hostUserId: string;
  playerIds: string[];
  chipAmount: number;
  moneyValue?: number;
  isRebuy?: boolean;
  denominationsBreakdown?: Array<{ denom: number; count: number }>;
  idempotencyKey?: string;
}): {
  transactions: TransactionRecord[];
  newBankChips: number;
  updatedPlayers: Array<{
    playerId: string;
    currentChips: number;
    totalBuyinChips: number;
    totalBuyinAmount: number;
  }>;
} {
  const db = getDb();

  if (!params.playerIds || params.playerIds.length === 0) {
    throw new Error('At least one player must be selected for buy-in');
  }
  if (params.chipAmount <= 0) {
    throw new Error('Chip amount must be greater than 0');
  }

  const run = db.transaction(() => {
    const table = db.prepare('SELECT * FROM games WHERE id = ?').get(params.gameId) as GameTableRecord | undefined;
    if (!table) throw new Error('Game table not found');
    if (table.host_user_id !== params.hostUserId) throw new Error('Only the host can record buy-ins');
    if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
      throw new Error('Cannot add buy-ins to a finalized game');
    }

    let perPlayerChips = params.chipAmount;
    let perPlayerMoney = (params.moneyValue !== undefined && params.moneyValue > 0)
      ? params.moneyValue
      : (params.chipAmount * table.chip_value);
    let totalChipsRequired = perPlayerChips * params.playerIds.length;
    let newBankChips = table.bank_chips;

    // VALUE mode or Denomination inventory handling for batch
    if (table.chip_mode === 'VALUE') {
      const money = (params.moneyValue !== undefined && params.moneyValue > 0)
        ? params.moneyValue
        : params.chipAmount;
      perPlayerChips = money;
      perPlayerMoney = money;
      totalChipsRequired = money * params.playerIds.length;
      if (totalChipsRequired > table.bank_chips) {
        throw new Error(`Total buy-in (₹${totalChipsRequired}) exceeds bank vault balance of ₹${table.bank_chips}.`);
      }
      newBankChips = table.bank_chips - totalChipsRequired;
      db.prepare('UPDATE games SET bank_chips = ? WHERE id = ?').run(newBankChips, table.id);
    } else if (params.denominationsBreakdown && params.denominationsBreakdown.length > 0) {
      const bundleChips = params.denominationsBreakdown.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
      const bundleMoney = params.denominationsBreakdown.reduce((sum, d) => sum + ((Number(d.count) || 0) * (Number(d.denom) || 0)), 0);
      if (bundleChips > 0) {
        perPlayerChips = bundleChips;
        totalChipsRequired = perPlayerChips * params.playerIds.length;
        perPlayerMoney = (params.moneyValue !== undefined && params.moneyValue > 0) ? params.moneyValue : bundleMoney;
      }

      if (table.denominations) {
        let denoms: any[] = [];
        try { denoms = JSON.parse(table.denominations); } catch (_) {}
        if (Array.isArray(denoms) && denoms.length > 0 && typeof denoms[0] === 'object') {
          for (const item of params.denominationsBreakdown) {
            const perPlayerCount = Number(item.count) || 0;
            if (perPlayerCount <= 0) continue;
            const totalNeeded = perPlayerCount * params.playerIds.length;
            const bankItem = denoms.find(d => Number(d.value) === Number(item.denom));
            if (!bankItem || (Number(bankItem.count) || 0) < totalNeeded) {
              throw new Error(`Bank vault only has ${bankItem ? bankItem.count : 0} chips of ₹${item.denom}, but ${totalNeeded} needed for ${params.playerIds.length} players.`);
            }
            bankItem.count = (Number(bankItem.count) || 0) - totalNeeded;
          }
          newBankChips = denoms.reduce((sum, d) => sum + (Number(d.count) || 0), 0);
          db.prepare('UPDATE games SET bank_chips = ?, denominations = ? WHERE id = ?').run(newBankChips, JSON.stringify(denoms), table.id);
        } else {
          if (table.bank_chips < totalChipsRequired) {
            throw new Error(`Bank vault only has ${table.bank_chips} chips available, but ${totalChipsRequired} chips are needed.`);
          }
          newBankChips = table.bank_chips - totalChipsRequired;
          db.prepare('UPDATE games SET bank_chips = ? WHERE id = ?').run(newBankChips, table.id);
        }
      } else {
        if (table.bank_chips < totalChipsRequired) {
          throw new Error(`Bank vault only has ${table.bank_chips} chips available, but ${totalChipsRequired} chips are needed.`);
        }
        newBankChips = table.bank_chips - totalChipsRequired;
        db.prepare('UPDATE games SET bank_chips = ? WHERE id = ?').run(newBankChips, table.id);
      }
    } else {
      if (table.bank_chips < totalChipsRequired) {
        throw new Error(`Bank vault only has ${table.bank_chips} chips available, but ${totalChipsRequired} chips are needed for ${params.playerIds.length} players.`);
      }
      newBankChips = table.bank_chips - totalChipsRequired;
      db.prepare('UPDATE games SET bank_chips = ? WHERE id = ?').run(newBankChips, table.id);
    }

    const now = new Date().toISOString();
    const transactions: TransactionRecord[] = [];
    const updatedPlayers: Array<{
      playerId: string;
      currentChips: number;
      totalBuyinChips: number;
      totalBuyinAmount: number;
    }> = [];

    for (let i = 0; i < params.playerIds.length; i++) {
      const pid = params.playerIds[i];
      const player = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(pid, table.id) as any;
      if (!player) {
        throw new Error(`Player ${pid} not found in this game`);
      }

      const txId = uuidv4();
      const type = params.isRebuy ? 'RE_BUY' : (player.total_buyin_chips > 0 ? 'RE_BUY' : 'BUY_IN');
      const updatedPlayerChips = player.current_chips + perPlayerChips;
      const updatedTotalBuyinChips = player.total_buyin_chips + perPlayerChips;
      const updatedTotalBuyinAmount = player.total_buyin_amount + perPlayerMoney;

      db.prepare(`
        UPDATE game_players 
        SET current_chips = ?, total_buyin_chips = ?, total_buyin_amount = ?
        WHERE id = ?
      `).run(updatedPlayerChips, updatedTotalBuyinChips, updatedTotalBuyinAmount, player.id);

      const metadata = params.denominationsBreakdown ? JSON.stringify({ breakdown: params.denominationsBreakdown }) : null;

      db.prepare(`
        INSERT INTO transactions (id, game_id, type, actor_user_id, from_player_id, to_player_id, chip_amount, chip_value, money_value, idempotency_key, metadata, created_at)
        VALUES (?, ?, ?, ?, 'BANK', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        txId,
        table.id,
        type,
        params.hostUserId,
        player.id,
        perPlayerChips,
        perPlayerChips > 0 ? (perPlayerMoney / perPlayerChips) : table.chip_value,
        perPlayerMoney,
        params.idempotencyKey ? `${params.idempotencyKey}_${i}` : null,
        metadata,
        now
      );

      const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId) as TransactionRecord;
      transactions.push(tx);
      updatedPlayers.push({
        playerId: player.id,
        currentChips: updatedPlayerChips,
        totalBuyinChips: updatedTotalBuyinChips,
        totalBuyinAmount: updatedTotalBuyinAmount
      });
    }

    return { transactions, newBankChips, updatedPlayers };
  });

  return run();
}

export function recordLend(params: {
  gameId: string;
  hostUserId: string;
  lenderPlayerId: string;
  borrowerPlayerId: string;
  chipAmount: number;
  moneyValue?: number;
  denominationsBreakdown?: Array<{ denom: number; count: number }>;
  idempotencyKey?: string;
}): { transaction: TransactionRecord; loanId: string } {
  const db = getDb();

  if (params.chipAmount <= 0) {
    throw new Error('Lend chip amount must be greater than 0');
  }
  if (params.lenderPlayerId === params.borrowerPlayerId) {
    throw new Error('Lender and borrower cannot be the same player');
  }

  // Check idempotency
  if (params.idempotencyKey) {
    const existingTx = db.prepare('SELECT * FROM transactions WHERE idempotency_key = ?').get(params.idempotencyKey) as TransactionRecord | undefined;
    if (existingTx && existingTx.metadata) {
      const meta = JSON.parse(existingTx.metadata);
      return { transaction: existingTx, loanId: meta.loanId };
    }
  }

  const run = db.transaction(() => {
    const table = db.prepare('SELECT * FROM games WHERE id = ?').get(params.gameId) as GameTableRecord | undefined;
    if (!table) throw new Error('Game table not found');
    if (table.host_user_id !== params.hostUserId) throw new Error('Only the host can record loans');
    if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
      throw new Error('Cannot record loans on a finalized game');
    }

    const lender = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(params.lenderPlayerId, params.gameId) as any;
    const borrower = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(params.borrowerPlayerId, params.gameId) as any;

    if (!lender || !borrower) throw new Error('Lender or borrower not found in this game');
    if (lender.id === borrower.id) throw new Error('Lender and borrower cannot be the same');

    // Uncapped shots/loans: In home games with limited physical chips, players can lend on credit beyond their in-hand chips.
    const isValueMode = table.chip_mode === 'VALUE';
    const moneyValue = (params.moneyValue !== undefined && params.moneyValue > 0)
      ? params.moneyValue
      : (isValueMode ? params.chipAmount : (params.chipAmount * table.chip_value));
    const chipAmountToMove = isValueMode ? moneyValue : params.chipAmount;
    const loanChipValue = isValueMode ? 1.0 : (chipAmountToMove > 0 ? (moneyValue / chipAmountToMove) : table.chip_value);

    const loanId = uuidv4();
    const txId = uuidv4();
    const now = new Date().toISOString();

    // 1. Move physical chips: Lender -X, Borrower +X
    db.prepare('UPDATE game_players SET current_chips = current_chips - ? WHERE id = ?').run(chipAmountToMove, lender.id);
    db.prepare('UPDATE game_players SET current_chips = current_chips + ? WHERE id = ?').run(chipAmountToMove, borrower.id);

    // 2. Create obligation loan record with loanChipValue
    db.prepare(`
      INSERT INTO loans (id, game_id, lender_id, borrower_id, original_chip_amount, remaining_chip_amount, chip_value, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(loanId, table.id, lender.id, borrower.id, chipAmountToMove, chipAmountToMove, loanChipValue, now, now);

    // 3. Record transaction with loanId and optional breakdown in metadata
    const metadata = JSON.stringify({
      loanId,
      breakdown: params.denominationsBreakdown || undefined
    });
    db.prepare(`
      INSERT INTO transactions (id, game_id, type, actor_user_id, from_player_id, to_player_id, chip_amount, chip_value, money_value, idempotency_key, metadata, created_at)
      VALUES (?, ?, 'LEND', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(txId, table.id, params.hostUserId, lender.id, borrower.id, chipAmountToMove, loanChipValue, moneyValue, params.idempotencyKey || null, metadata, now);

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId) as TransactionRecord;
    return { transaction: tx, loanId };
  });

  return run();
}

export function recordLoanRepayment(params: {
  gameId: string;
  hostUserId: string;
  loanId: string;
  chipAmount: number;
  idempotencyKey?: string;
}): { transaction: TransactionRecord; remainingLoanChips: number; isSettled: boolean } {
  const db = getDb();

  if (params.chipAmount <= 0) {
    throw new Error('Repayment chip amount must be greater than 0');
  }

  // Check idempotency
  if (params.idempotencyKey) {
    const existingTx = db.prepare('SELECT * FROM transactions WHERE idempotency_key = ?').get(params.idempotencyKey) as TransactionRecord | undefined;
    if (existingTx) {
      const loan = db.prepare('SELECT remaining_chip_amount, status FROM loans WHERE id = ?').get(params.loanId) as any;
      return { transaction: existingTx, remainingLoanChips: loan.remaining_chip_amount, isSettled: loan.status === 'SETTLED' };
    }
  }

  const run = db.transaction(() => {
    const table = db.prepare('SELECT * FROM games WHERE id = ?').get(params.gameId) as GameTableRecord | undefined;
    if (!table) throw new Error('Game table not found');
    if (table.host_user_id !== params.hostUserId) throw new Error('Only the host can record repayments');
    if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
      throw new Error('Cannot record repayments on a finalized game');
    }

    const loan = db.prepare('SELECT * FROM loans WHERE id = ? AND game_id = ?').get(params.loanId, params.gameId) as any;
    if (!loan) throw new Error('Loan not found');
    if (loan.status === 'SETTLED') throw new Error('This loan has already been fully settled');

    if (params.chipAmount > loan.remaining_chip_amount) {
      throw new Error(`Cannot return ${params.chipAmount} chips. Remaining loan balance is ${loan.remaining_chip_amount} chips.`);
    }

    const borrower = db.prepare('SELECT * FROM game_players WHERE id = ?').get(loan.borrower_id) as any;
    const lender = db.prepare('SELECT * FROM game_players WHERE id = ?').get(loan.lender_id) as any;

    if (!borrower || !lender) throw new Error('Borrower or lender no longer in game');

    if (borrower.current_chips < params.chipAmount) {
      throw new Error(`Borrower only holds ${borrower.current_chips} physical chips. Cannot return ${params.chipAmount} chips.`);
    }

    const moneyValue = params.chipAmount * loan.chip_value;
    const remaining = loan.remaining_chip_amount - params.chipAmount;
    const isSettled = remaining === 0;
    const newStatus = isSettled ? 'SETTLED' : 'PARTIALLY_REPAID';
    const now = new Date().toISOString();
    const txId = uuidv4();

    // 1. Move physical chips: Borrower -Y, Lender +Y
    db.prepare('UPDATE game_players SET current_chips = current_chips - ? WHERE id = ?').run(params.chipAmount, borrower.id);
    db.prepare('UPDATE game_players SET current_chips = current_chips + ? WHERE id = ?').run(params.chipAmount, lender.id);

    // 2. Update loan remaining amount and status
    db.prepare(`
      UPDATE loans SET remaining_chip_amount = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(remaining, newStatus, now, loan.id);

    // 3. Record transaction
    const metadata = JSON.stringify({ loanId: loan.id, repaidChips: params.chipAmount, remainingLoanChips: remaining });
    db.prepare(`
      INSERT INTO transactions (id, game_id, type, actor_user_id, from_player_id, to_player_id, chip_amount, chip_value, money_value, idempotency_key, metadata, created_at)
      VALUES (?, ?, 'RETURN', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(txId, table.id, params.hostUserId, borrower.id, lender.id, params.chipAmount, loan.chip_value, moneyValue, params.idempotencyKey || null, metadata, now);

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId) as TransactionRecord;
    return { transaction: tx, remainingLoanChips: remaining, isSettled };
  });

  return run();
}

export function recordTransfer(params: {
  gameId: string;
  hostUserId: string;
  fromPlayerId: string;
  toPlayerId: string;
  chipAmount: number;
  idempotencyKey?: string;
}): { transaction: TransactionRecord } {
  const db = getDb();

  if (params.chipAmount <= 0) {
    throw new Error('Transfer chip amount must be greater than 0');
  }
  if (params.fromPlayerId === params.toPlayerId) {
    throw new Error('Sender and recipient cannot be the same player');
  }

  // Check idempotency
  if (params.idempotencyKey) {
    const existingTx = db.prepare('SELECT * FROM transactions WHERE idempotency_key = ?').get(params.idempotencyKey) as TransactionRecord | undefined;
    if (existingTx) return { transaction: existingTx };
  }

  const run = db.transaction(() => {
    const table = db.prepare('SELECT * FROM games WHERE id = ?').get(params.gameId) as GameTableRecord | undefined;
    if (!table) throw new Error('Game table not found');
    if (table.host_user_id !== params.hostUserId) throw new Error('Only the host can record transfers');
    if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
      throw new Error('Cannot record transfers on a finalized game');
    }

    const sender = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(params.fromPlayerId, params.gameId) as any;
    const receiver = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(params.toPlayerId, params.gameId) as any;

    if (!sender || !receiver) throw new Error('Sender or recipient not found in this game');

    if (sender.current_chips < params.chipAmount) {
      throw new Error(`Sender only has ${sender.current_chips} chips available to transfer.`);
    }

    const moneyValue = params.chipAmount * table.chip_value;
    const txId = uuidv4();
    const now = new Date().toISOString();

    // Move physical chips (NO loan created)
    db.prepare('UPDATE game_players SET current_chips = current_chips - ? WHERE id = ?').run(params.chipAmount, sender.id);
    db.prepare('UPDATE game_players SET current_chips = current_chips + ? WHERE id = ?').run(params.chipAmount, receiver.id);

    db.prepare(`
      INSERT INTO transactions (id, game_id, type, actor_user_id, from_player_id, to_player_id, chip_amount, chip_value, money_value, idempotency_key, created_at)
      VALUES (?, ?, 'TRANSFER', ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(txId, table.id, params.hostUserId, sender.id, receiver.id, params.chipAmount, table.chip_value, moneyValue, params.idempotencyKey || null, now);

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId) as TransactionRecord;
    return { transaction: tx };
  });

  return run();
}

export function undoTransaction(params: {
  gameId: string;
  hostUserId: string;
  transactionId: string;
}): { reversalTransaction: TransactionRecord } {
  const db = getDb();

  const run = db.transaction(() => {
    const table = db.prepare('SELECT * FROM games WHERE id = ?').get(params.gameId) as GameTableRecord | undefined;
    if (!table) throw new Error('Game table not found');
    if (table.host_user_id !== params.hostUserId) throw new Error('Only the host can undo transactions');
    if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
      throw new Error('Cannot undo transactions on a finalized game');
    }

    const originalTx = db.prepare('SELECT * FROM transactions WHERE id = ? AND game_id = ?').get(params.transactionId, params.gameId) as TransactionRecord | undefined;
    if (!originalTx) throw new Error('Transaction not found');

    if (originalTx.type === 'REVERSAL') {
      throw new Error('Cannot reverse a reversal transaction');
    }

    // Check if already reversed
    const alreadyReversed = db.prepare('SELECT id FROM transactions WHERE reversal_of = ?').get(originalTx.id);
    if (alreadyReversed) {
      throw new Error('This transaction has already been undone');
    }

    const reversalId = uuidv4();
    const now = new Date().toISOString();

    // Reverse based on type
    if (originalTx.type === 'BUY_IN' || originalTx.type === 'RE_BUY') {
      const player = db.prepare('SELECT * FROM game_players WHERE id = ?').get(originalTx.to_player_id) as any;
      if (!player) throw new Error('Player not found');
      if (player.current_chips < originalTx.chip_amount) {
        throw new Error(`Cannot undo buy-in: player only has ${player.current_chips} chips, need ${originalTx.chip_amount} to return to bank.`);
      }

      // Return chips to bank
      db.prepare('UPDATE games SET bank_chips = bank_chips + ? WHERE id = ?').run(originalTx.chip_amount, table.id);
      // Deduct chips and buyin amount from player
      db.prepare(`
        UPDATE game_players 
        SET current_chips = current_chips - ?,
            total_buyin_chips = total_buyin_chips - ?,
            total_buyin_amount = total_buyin_amount - ?
        WHERE id = ?
      `).run(originalTx.chip_amount, originalTx.chip_amount, originalTx.money_value, player.id);

    } else if (originalTx.type === 'LEND') {
      const meta = originalTx.metadata ? JSON.parse(originalTx.metadata) : {};
      const loanId = meta.loanId;
      if (loanId) {
        const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId) as any;
        if (loan && loan.remaining_chip_amount !== loan.original_chip_amount) {
          throw new Error('Cannot undo loan: partial or full repayments have already been recorded on this loan.');
        }
        // Delete loan record or set status to REVERSED
        db.prepare('DELETE FROM loans WHERE id = ?').run(loanId);
      }

      // Reverse physical chips: borrower -chips, lender +chips
      const borrower = db.prepare('SELECT * FROM game_players WHERE id = ?').get(originalTx.to_player_id) as any;
      if (borrower.current_chips < originalTx.chip_amount) {
        throw new Error(`Cannot undo lend: borrower only has ${borrower.current_chips} chips remaining.`);
      }
      db.prepare('UPDATE game_players SET current_chips = current_chips - ? WHERE id = ?').run(originalTx.chip_amount, originalTx.to_player_id);
      db.prepare('UPDATE game_players SET current_chips = current_chips + ? WHERE id = ?').run(originalTx.chip_amount, originalTx.from_player_id);

    } else if (originalTx.type === 'RETURN') {
      const meta = originalTx.metadata ? JSON.parse(originalTx.metadata) : {};
      const loanId = meta.loanId;
      if (loanId) {
        const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId) as any;
        if (loan) {
          const restoredRemaining = loan.remaining_chip_amount + originalTx.chip_amount;
          const restoredStatus = restoredRemaining === loan.original_chip_amount ? 'ACTIVE' : 'PARTIALLY_REPAID';
          db.prepare('UPDATE loans SET remaining_chip_amount = ?, status = ?, updated_at = ? WHERE id = ?')
            .run(restoredRemaining, restoredStatus, now, loanId);
        }
      }

      // Reverse physical chips: lender -chips, borrower +chips
      const lender = db.prepare('SELECT * FROM game_players WHERE id = ?').get(originalTx.to_player_id) as any;
      if (lender.current_chips < originalTx.chip_amount) {
        throw new Error(`Cannot undo return: lender only has ${lender.current_chips} chips.`);
      }
      db.prepare('UPDATE game_players SET current_chips = current_chips - ? WHERE id = ?').run(originalTx.chip_amount, originalTx.to_player_id);
      db.prepare('UPDATE game_players SET current_chips = current_chips + ? WHERE id = ?').run(originalTx.chip_amount, originalTx.from_player_id);

    } else if (originalTx.type === 'TRANSFER') {
      // Reverse physical chips: to_player -chips, from_player +chips
      const receiver = db.prepare('SELECT * FROM game_players WHERE id = ?').get(originalTx.to_player_id) as any;
      if (receiver.current_chips < originalTx.chip_amount) {
        throw new Error(`Cannot undo transfer: recipient only has ${receiver.current_chips} chips.`);
      }
      db.prepare('UPDATE game_players SET current_chips = current_chips - ? WHERE id = ?').run(originalTx.chip_amount, originalTx.to_player_id);
      db.prepare('UPDATE game_players SET current_chips = current_chips + ? WHERE id = ?').run(originalTx.chip_amount, originalTx.from_player_id);
    }

    // Insert reversal transaction
    db.prepare(`
      INSERT INTO transactions (id, game_id, type, actor_user_id, from_player_id, to_player_id, chip_amount, chip_value, money_value, reversal_of, metadata, created_at)
      VALUES (?, ?, 'REVERSAL', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      reversalId,
      table.id,
      params.hostUserId,
      originalTx.to_player_id,
      originalTx.from_player_id,
      originalTx.chip_amount,
      originalTx.chip_value,
      originalTx.money_value,
      originalTx.id,
      JSON.stringify({ reversedType: originalTx.type, originalTxId: originalTx.id }),
      now
    );

    const revTx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(reversalId) as TransactionRecord;
    return { reversalTransaction: revTx };
  });

  return run();
}

export function recordCorrection(params: {
  gameId: string;
  hostUserId: string;
  playerId: string;
  newChipCount: number;
  reason?: string;
}): { transaction: TransactionRecord; discrepancyAdjustment: number } {
  const db = getDb();

  if (params.newChipCount < 0) {
    throw new Error('Chip count cannot be negative');
  }

  const run = db.transaction(() => {
    const table = db.prepare('SELECT * FROM games WHERE id = ?').get(params.gameId) as GameTableRecord | undefined;
    if (!table) throw new Error('Game table not found');
    if (table.host_user_id !== params.hostUserId) throw new Error('Only the host can record corrections');
    if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
      throw new Error('Cannot correct a finalized game');
    }

    const player = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(params.playerId, params.gameId) as any;
    if (!player) throw new Error('Player not found in this game');

    const previousChips = player.current_chips;
    const diff = params.newChipCount - previousChips;

    if (diff === 0) {
      throw new Error('New chip count is identical to existing chip count');
    }

    // If adding chips to player, ensure bank has them, or adjust bank
    if (diff > 0 && table.bank_chips < diff) {
      throw new Error(`Cannot add ${diff} chips: bank only has ${table.bank_chips} chips.`);
    }

    // Update player chip count and adjust bank to preserve total chips
    db.prepare('UPDATE game_players SET current_chips = ? WHERE id = ?').run(params.newChipCount, player.id);
    db.prepare('UPDATE games SET bank_chips = bank_chips - ? WHERE id = ?').run(diff, table.id);

    const txId = uuidv4();
    const now = new Date().toISOString();
    const metadata = JSON.stringify({
      previousChips,
      correctedChips: params.newChipCount,
      adjustment: diff,
      reason: params.reason || 'Host correction'
    });

    db.prepare(`
      INSERT INTO transactions (id, game_id, type, actor_user_id, from_player_id, to_player_id, chip_amount, chip_value, money_value, metadata, created_at)
      VALUES (?, ?, 'CORRECTION', ?, 'BANK', ?, ?, ?, ?, ?, ?)
    `).run(
      txId,
      table.id,
      params.hostUserId,
      player.id,
      Math.abs(diff),
      table.chip_value,
      Math.abs(diff) * table.chip_value,
      metadata,
      now
    );

    const tx = db.prepare('SELECT * FROM transactions WHERE id = ?').get(txId) as TransactionRecord;
    return { transaction: tx, discrepancyAdjustment: diff };
  });

  return run();
}
