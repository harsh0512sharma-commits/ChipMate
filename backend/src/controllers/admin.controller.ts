import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { getDb } from '../db';
import { isMasterAdmin } from '../services/auth.service';
import * as adminService from '../services/admin.service';

/**
 * Middleware: Strictly validates that the requesting user's mobile number is 7319123393.
 * Non-master users receive HTTP 403 Forbidden.
 */
export function requireMasterAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  const db = getDb();
  const user = db.prepare('SELECT phone_number FROM users WHERE id = ?').get(userId) as { phone_number?: string } | undefined;

  if (!user || !isMasterAdmin(user)) {
    res.status(403).json({ success: false, error: 'Access Denied: Master Admin authorization required.' });
    return;
  }

  next();
}

export function getOverview(req: AuthenticatedRequest, res: Response): void {
  try {
    const overview = adminService.getAdminOverview();
    res.json({ success: true, overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch overview' });
  }
}

export function getAllPlayers(req: AuthenticatedRequest, res: Response): void {
  try {
    const players = adminService.getAdminAllPlayers();
    res.json({ success: true, players, count: players.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch players' });
  }
}

export function getPlayerDetails(req: AuthenticatedRequest, res: Response): void {
  try {
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }

    const details = adminService.getAdminPlayerDetails(userId);
    res.json({ success: true, details });
  } catch (err: any) {
    res.status(err.message === 'User not found' ? 404 : 500).json({
      success: false,
      error: err.message || 'Failed to fetch player details',
    });
  }
}

export function getAllGames(req: AuthenticatedRequest, res: Response): void {
  try {
    const games = adminService.getAdminAllGames();
    res.json({ success: true, games, count: games.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch games' });
  }
}

export function deleteGame(req: AuthenticatedRequest, res: Response): void {
  try {
    const rawGameId = req.params.gameId;
    const gameId = Array.isArray(rawGameId) ? rawGameId[0] : rawGameId;
    if (!gameId) {
      res.status(400).json({ success: false, error: 'Game ID is required' });
      return;
    }

    const result = adminService.adminDeleteGame(gameId);
    res.json(result);
  } catch (err: any) {
    res.status(err.message === 'Game table not found' ? 404 : 500).json({
      success: false,
      error: err.message || 'Failed to delete game',
    });
  }
}

export function resetAllGames(req: AuthenticatedRequest, res: Response): void {
  try {
    const result = adminService.adminResetAllGames();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to reset games' });
  }
}

export function deletePlayer(req: AuthenticatedRequest, res: Response): void {
  try {
    const rawUserId = req.params.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
    if (!userId) {
      res.status(400).json({ success: false, error: 'User ID is required' });
      return;
    }

    const result = adminService.adminDeletePlayer(userId);
    res.json(result);
  } catch (err: any) {
    const status = err.message === 'User not found' ? 404 : err.message.includes('cannot be deleted') ? 400 : 500;
    res.status(status).json({
      success: false,
      error: err.message || 'Failed to delete player account',
    });
  }
}

export function getAllGuests(req: AuthenticatedRequest, res: Response): void {
  try {
    const guests = adminService.getAdminAllGuests();
    res.json({ success: true, guests, count: guests.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch guests' });
  }
}

export function deleteGuest(req: AuthenticatedRequest, res: Response): void {
  try {
    const rawGuestId = req.params.guestId;
    const guestId = Array.isArray(rawGuestId) ? rawGuestId[0] : rawGuestId;
    if (!guestId) {
      res.status(400).json({ success: false, error: 'Guest ID is required' });
      return;
    }

    const result = adminService.adminDeleteGuest(guestId);
    res.json(result);
  } catch (err: any) {
    const status = err.message === 'Guest not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: err.message || 'Failed to delete guest',
    });
  }
}
