import { randomUUID as uuidv4 } from 'crypto';
import { getDb } from '../db';
import { getUserByFriendCode, UserRecord } from './auth.service';

export interface FriendRequestDto {
  id: string;
  userId: string;
  friendId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED';
  requesterId: string;
  createdAt: string;
  friend: {
    id: string;
    displayName: string;
    friendCode: string;
    avatarUrl?: string | null;
  };
}

export function sendFriendRequest(requesterId: string, targetFriendCode: string): { success: boolean; status: string; friendshipId: string } {
  const targetUser = getUserByFriendCode(targetFriendCode);
  if (!targetUser) {
    throw new Error('No user found with that mobile number');
  }

  if (targetUser.id === requesterId) {
    throw new Error('You cannot add yourself as a friend');
  }

  const db = getDb();

  // Check if friendship or request already exists in either direction
  const existing = db.prepare(`
    SELECT * FROM friendships 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(requesterId, targetUser.id, targetUser.id, requesterId) as any;

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      throw new Error('You are already friends with this user');
    }
    if (existing.status === 'PENDING') {
      if (existing.requester_id === requesterId) {
        throw new Error('Friend request already sent');
      } else {
        // Automatically accept if the other user already sent a request
        const now = new Date().toISOString();
        db.prepare(`UPDATE friendships SET status = 'ACCEPTED', updated_at = ? WHERE id = ?`).run(now, existing.id);
        return { success: true, status: 'ACCEPTED', friendshipId: existing.id };
      }
    }
    if (existing.status === 'BLOCKED') {
      throw new Error('Unable to send friend request');
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO friendships (id, user_id, friend_id, status, requester_id, created_at, updated_at)
    VALUES (?, ?, ?, 'PENDING', ?, ?, ?)
  `).run(id, requesterId, targetUser.id, requesterId, now, now);

  return { success: true, status: 'PENDING', friendshipId: id };
}

export function respondToFriendRequest(userId: string, friendshipId: string, action: 'ACCEPT' | 'DECLINE' | 'BLOCK'): { success: boolean } {
  const db = getDb();
  const friendship = db.prepare('SELECT * FROM friendships WHERE id = ?').get(friendshipId) as any;

  if (!friendship) {
    throw new Error('Friend request not found');
  }

  // Must be recipient of request to accept/decline
  if (action === 'ACCEPT' || action === 'DECLINE') {
    if (friendship.requester_id === userId) {
      throw new Error('Cannot respond to your own sent request');
    }
    if (friendship.user_id !== userId && friendship.friend_id !== userId) {
      throw new Error('Not authorized to respond to this request');
    }
  }

  const now = new Date().toISOString();
  const newStatus = action === 'ACCEPT' ? 'ACCEPTED' : action === 'DECLINE' ? 'DECLINED' : 'BLOCKED';

  db.prepare(`
    UPDATE friendships SET status = ?, updated_at = ? WHERE id = ?
  `).run(newStatus, now, friendshipId);

  return { success: true };
}

export function removeFriend(userId: string, targetUserId: string): { success: boolean } {
  const db = getDb();
  db.prepare(`
    DELETE FROM friendships 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).run(userId, targetUserId, targetUserId, userId);

  return { success: true };
}

export function getFriendsList(userId: string) {
  const db = getDb();
  const rows = db.prepare(`
    SELECT f.id as friendship_id, f.status, f.created_at as friendship_created_at,
      u.id, u.display_name, u.friend_code, u.phone_number, u.avatar_url,
      s.net_winnings, s.games_played, s.win_rate
    FROM friendships f
    JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
    LEFT JOIN player_lifetime_stats s ON s.user_id = u.id
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'ACCEPTED'
    ORDER BY u.display_name ASC
  `).all(userId, userId, userId) as any[];

  return rows.map(r => ({
    friendshipId: r.friendship_id,
    id: r.id,
    displayName: r.display_name,
    friendCode: r.phone_number || r.friend_code,
    phoneNumber: r.phone_number,
    avatarUrl: r.avatar_url,
    netWinnings: r.net_winnings || 0,
    gamesPlayed: r.games_played || 0,
    winRate: r.win_rate || 0
  }));
}

export function getPendingRequests(userId: string) {
  const db = getDb();

  // Requests received by this user
  const received = db.prepare(`
    SELECT f.id, f.created_at, u.id as user_id, u.display_name, COALESCE(u.phone_number, u.friend_code) as friend_code, u.phone_number, u.avatar_url
    FROM friendships f
    JOIN users u ON f.requester_id = u.id
    WHERE f.status = 'PENDING' AND f.requester_id != ? AND (f.user_id = ? OR f.friend_id = ?)
  `).all(userId, userId, userId) as any[];

  // Requests sent by this user
  const sent = db.prepare(`
    SELECT f.id, f.created_at, u.id as user_id, u.display_name, COALESCE(u.phone_number, u.friend_code) as friend_code, u.phone_number, u.avatar_url
    FROM friendships f
    JOIN users u ON (CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END) = u.id
    WHERE f.status = 'PENDING' AND f.requester_id = ?
  `).all(userId, userId) as any[];

  return { received, sent };
}

export function getFriendshipStatusBetween(userId: string, otherUserId: string): 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'FRIENDS' | 'BLOCKED' {
  if (userId === otherUserId) return 'NONE';

  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM friendships 
    WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
  `).get(userId, otherUserId, otherUserId, userId) as any;

  if (!row) return 'NONE';
  if (row.status === 'ACCEPTED') return 'FRIENDS';
  if (row.status === 'BLOCKED') return 'BLOCKED';
  if (row.status === 'PENDING') {
    return row.requester_id === userId ? 'PENDING_SENT' : 'PENDING_RECEIVED';
  }
  return 'NONE';
}
