import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as statsService from '../services/stats.service';
import { getUserById } from '../services/auth.service';

export function getLeaderboard(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const sortBy = (req.query.sortBy as any) || 'NET_WINNINGS';

    const leaderboard = statsService.getFriendLeaderboard(userId, sortBy);
    res.json({ success: true, leaderboard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch leaderboard' });
  }
}

export function getGuestLeaderboard(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const sortBy = (req.query.sortBy as any) || 'NET_WINNINGS';
    const leaderboard = statsService.getGuestLeaderboard(userId, sortBy);
    res.json({ success: true, leaderboard });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch guest leaderboard' });
  }
}

export function getHeadToHead(req: AuthenticatedRequest, res: Response): void {
  try {
    const userIdA = req.user!.userId;
    const userIdB = req.params.otherUserId as string;

    if (!userIdB) {
      res.status(400).json({ success: false, error: 'Target user ID is required' });
      return;
    }

    const h2h = statsService.getHeadToHeadStats(userIdA, userIdB);
    res.json({ success: true, ...h2h });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to fetch head-to-head statistics' });
  }
}

export function getInsights(req: AuthenticatedRequest, res: Response): void {
  try {
    const gameId = req.params.gameId as string;
    const insights = statsService.getGameInsights(gameId);
    if (!insights) {
      res.status(404).json({ success: false, error: 'Insights not available for this game' });
      return;
    }
    res.json({ success: true, insights });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch game insights' });
  }
}

export function getUserStats(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = (req.params.userId as string) || req.user!.userId;
    const user = getUserById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch user statistics' });
  }
}
