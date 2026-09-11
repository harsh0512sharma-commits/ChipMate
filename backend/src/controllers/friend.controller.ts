import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as friendService from '../services/friend.service';

export function getFriends(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const friends = friendService.getFriendsList(userId);
    res.json({ success: true, friends });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch friends' });
  }
}

export function getRequests(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const requests = friendService.getPendingRequests(userId);
    res.json({ success: true, ...requests });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch friend requests' });
  }
}

export function sendRequest(req: AuthenticatedRequest, res: Response): void {
  try {
    const requesterId = req.user!.userId;
    const { friendCode } = req.body;
    if (!friendCode) {
      res.status(400).json({ success: false, error: 'Friend code is required' });
      return;
    }

    const result = friendService.sendFriendRequest(requesterId, friendCode);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to send friend request' });
  }
}

export function respondRequest(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const { friendshipId, action } = req.body; // 'ACCEPT' | 'DECLINE' | 'BLOCK'
    if (!friendshipId || !action) {
      res.status(400).json({ success: false, error: 'friendshipId and action are required' });
      return;
    }

    const result = friendService.respondToFriendRequest(userId, friendshipId, action);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to respond to request' });
  }
}

export function deleteFriend(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const targetUserId = req.params.targetUserId as string;
    if (!targetUserId) {
      res.status(400).json({ success: false, error: 'Target user ID is required' });
      return;
    }

    const result = friendService.removeFriend(userId, targetUserId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to remove friend' });
  }
}
