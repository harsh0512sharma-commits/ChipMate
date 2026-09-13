import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as settlementService from '../services/settlement.service';
import { broadcastTableUpdate } from '../socket';

export function submitFinalChips(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const payload = req.body.finalPlayerCounts || req.body.finalChipCounts;

    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ success: false, error: 'Final chip counts are required' });
      return;
    }

    const review = settlementService.submitFinalChipCounts(hostUserId, tableId, payload);
    broadcastTableUpdate(tableId, 'SETTLING_STARTED', review);
    res.json({ success: true, ...review });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to submit final chip counts' });
  }
}

export function proceedToSettle(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;

    const review = settlementService.proceedToSettlement(hostUserId, tableId);
    broadcastTableUpdate(tableId, 'SETTLING_STARTED', review);
    res.json({ success: true, ...review });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to start settlement' });
  }
}

export function getSettlement(req: AuthenticatedRequest, res: Response): void {
  try {
    const tableId = req.params.tableId as string;
    const details = settlementService.getSettlementDetails(tableId);
    res.json({ success: true, ...details });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to get settlement' });
  }
}

export async function finalizeTable(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;

    const result = settlementService.finalizeGame(hostUserId, tableId);
    broadcastTableUpdate(tableId, 'GAME_FINALIZED', result);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to finalize game' });
  }
}

export function updatePaymentStatus(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const { itemId, status, paidAmount } = req.body;

    if (!itemId || !status) {
      res.status(400).json({ success: false, error: 'Item ID and status are required' });
      return;
    }

    const result = settlementService.updateSettlementPaymentStatus(
      userId,
      itemId,
      status,
      paidAmount !== undefined ? parseFloat(paidAmount) : undefined
    );

    const tableId = req.params.tableId as string;
    broadcastTableUpdate(tableId, 'PAYMENT_UPDATED', { itemId, status, paidAmount });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update payment status' });
  }
}
