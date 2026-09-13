import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as ledgerService from '../services/ledger.service';
import { broadcastTableUpdate } from '../socket';

export function buyIn(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { playerId, chipAmount, moneyValue, denominationsBreakdown, isRebuy, idempotencyKey } = req.body;

    if (!playerId || !chipAmount) {
      res.status(400).json({ success: false, error: 'Player ID and chip amount are required' });
      return;
    }

    const result = ledgerService.recordBuyIn({
      gameId: tableId,
      hostUserId,
      playerId,
      chipAmount: parseInt(chipAmount, 10),
      moneyValue: moneyValue !== undefined ? parseFloat(moneyValue) : undefined,
      denominationsBreakdown,
      isRebuy: !!isRebuy,
      idempotencyKey
    });

    broadcastTableUpdate(tableId, isRebuy ? 'RE_BUY' : 'BUY_IN', result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to record buy-in' });
  }
}

export function batchBuyIn(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { playerIds, chipAmount, moneyValue, isRebuy, denominationsBreakdown, idempotencyKey } = req.body;

    if (!playerIds || !Array.isArray(playerIds) || playerIds.length === 0 || !chipAmount) {
      res.status(400).json({ success: false, error: 'Selected players list and chip amount are required' });
      return;
    }

    const result = ledgerService.recordBatchBuyIn({
      gameId: tableId,
      hostUserId,
      playerIds,
      chipAmount: parseInt(chipAmount, 10),
      moneyValue: moneyValue !== undefined ? parseFloat(moneyValue) : undefined,
      isRebuy: !!isRebuy,
      denominationsBreakdown,
      idempotencyKey
    });

    broadcastTableUpdate(tableId, 'BATCH_BUY_IN', result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to record batch buy-in' });
  }
}

export function lendChips(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { lenderPlayerId, borrowerPlayerId, chipAmount, moneyValue, denominationsBreakdown, idempotencyKey } = req.body;

    if (!lenderPlayerId || !borrowerPlayerId || !chipAmount) {
      res.status(400).json({ success: false, error: 'Lender ID, borrower ID, and chip amount are required' });
      return;
    }

    const result = ledgerService.recordLend({
      gameId: tableId,
      hostUserId,
      lenderPlayerId,
      borrowerPlayerId,
      chipAmount: parseInt(chipAmount, 10),
      moneyValue: moneyValue !== undefined ? parseFloat(moneyValue) : undefined,
      denominationsBreakdown,
      idempotencyKey
    });

    broadcastTableUpdate(tableId, 'LEND', result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to record loan' });
  }
}

export function returnChips(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { loanId, chipAmount, idempotencyKey } = req.body;

    if (!loanId || !chipAmount) {
      res.status(400).json({ success: false, error: 'Loan ID and chip amount are required' });
      return;
    }

    const result = ledgerService.recordLoanRepayment({
      gameId: tableId,
      hostUserId,
      loanId,
      chipAmount: parseInt(chipAmount, 10),
      idempotencyKey
    });

    broadcastTableUpdate(tableId, 'RETURN', result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to record repayment' });
  }
}

export function transferChips(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { fromPlayerId, toPlayerId, chipAmount, idempotencyKey } = req.body;

    if (!fromPlayerId || !toPlayerId || !chipAmount) {
      res.status(400).json({ success: false, error: 'Sender ID, receiver ID, and chip amount are required' });
      return;
    }

    const result = ledgerService.recordTransfer({
      gameId: tableId,
      hostUserId,
      fromPlayerId,
      toPlayerId,
      chipAmount: parseInt(chipAmount, 10),
      idempotencyKey
    });

    broadcastTableUpdate(tableId, 'TRANSFER', result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to record transfer' });
  }
}

export function undo(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { transactionId } = req.body;

    if (!transactionId) {
      res.status(400).json({ success: false, error: 'Transaction ID is required' });
      return;
    }

    const result = ledgerService.undoTransaction({
      gameId: tableId,
      hostUserId,
      transactionId
    });

    broadcastTableUpdate(tableId, 'UNDO', result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to undo transaction' });
  }
}

export function correct(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { playerId, newChipCount, reason } = req.body;

    if (!playerId || newChipCount === undefined) {
      res.status(400).json({ success: false, error: 'Player ID and new chip count are required' });
      return;
    }

    const result = ledgerService.recordCorrection({
      gameId: tableId,
      hostUserId,
      playerId,
      newChipCount: parseInt(newChipCount, 10),
      reason
    });

    broadcastTableUpdate(tableId, 'CORRECTION', result);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to correct transaction' });
  }
}
