import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as tableService from '../services/table.service';
import { broadcastTableUpdate } from '../socket';

export function createTable(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const { name, gameType, totalChips, chipValue, initialFriendUserIds } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Table name is required' });
      return;
    }
    if (!gameType || !['TEEN_PATTI', 'POKER'].includes(gameType)) {
      res.status(400).json({ success: false, error: 'Valid game type (TEEN_PATTI or POKER) is required' });
      return;
    }

    const result = tableService.createTable({
      hostUserId,
      name,
      gameType,
      totalChips: totalChips ? parseInt(totalChips, 10) : 100,
      chipValue: chipValue ? parseFloat(chipValue) : 10,
      initialFriendUserIds: Array.isArray(initialFriendUserIds) ? initialFriendUserIds : undefined
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to create table' });
  }
}

export function updateSettings(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { name, gameType, totalChips, chipValue } = req.body;

    const table = tableService.updateTableSettings({
      tableId,
      hostUserId,
      name,
      gameType,
      totalChips: totalChips ? parseInt(totalChips, 10) : undefined,
      chipValue: chipValue ? parseFloat(chipValue) : undefined
    });

    broadcastTableUpdate(tableId, 'SETTINGS_UPDATED', table);
    res.json({ success: true, table });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update settings' });
  }
}

export function joinTable(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const { code } = req.body;
    if (!code) {
      res.status(400).json({ success: false, error: 'Table join code is required' });
      return;
    }

    const result = tableService.joinTableByCode(userId, code);
    broadcastTableUpdate(result.table.id, 'PLAYER_JOINED', { playerId: result.playerId, userId });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to join table' });
  }
}

export function addPlayer(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { friendCode } = req.body;

    if (!friendCode) {
      res.status(400).json({ success: false, error: 'Player friend code is required' });
      return;
    }

    const result = tableService.addPlayerToTable(hostUserId, tableId, friendCode);
    broadcastTableUpdate(tableId, 'PLAYER_ADDED', result);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to add player' });
  }
}

export function seatFriend(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const { friendUserId } = req.body;

    if (!friendUserId) {
      res.status(400).json({ success: false, error: 'friendUserId is required' });
      return;
    }

    const result = tableService.addFriendToTable(hostUserId, tableId, friendUserId);
    broadcastTableUpdate(tableId, 'PLAYER_SEATED', result);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to seat friend' });
  }
}

export function removePlayer(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;
    const playerId = req.params.playerId as string;

    const result = tableService.removePlayerFromTable(hostUserId, tableId, playerId);
    broadcastTableUpdate(tableId, 'PLAYER_REMOVED', { playerId });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to remove player' });
  }
}

export function startTable(req: AuthenticatedRequest, res: Response): void {
  try {
    const hostUserId = req.user!.userId;
    const tableId = req.params.tableId as string;

    const table = tableService.startTableGame(hostUserId, tableId);
    broadcastTableUpdate(tableId, 'GAME_STARTED', table);
    res.json({ success: true, table });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to start game' });
  }
}

export function getTable(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const tableId = req.params.tableId as string;

    const details = tableService.getTableDetails(tableId, userId);
    if (!details) {
      res.status(404).json({ success: false, error: 'Table not found' });
      return;
    }

    res.json({ success: true, ...details });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch table' });
  }
}

export function getActiveTables(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const tables = tableService.getActiveUserTables(userId);
    res.json({ success: true, tables });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch active tables' });
  }
}

export function getTableHistory(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const history = tableService.getUserCompletedTables(userId);
    res.json({ success: true, history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch game history' });
  }
}
