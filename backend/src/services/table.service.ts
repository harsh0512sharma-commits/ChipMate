import { randomUUID as uuidv4 } from 'crypto';
import { getDb } from '../db';
import { getFriendshipStatusBetween } from './friend.service';
import { getUserByFriendCode } from './auth.service';

export interface GameTableRecord {
  id: string;
  name: string;
  game_type: 'TEEN_PATTI' | 'POKER';
  host_user_id: string;
  join_code: string;
  total_chips: number;
  chip_value: number;
  bank_chips: number;
  status: 'WAITING' | 'ACTIVE' | 'SETTLING' | 'FINALIZED' | 'ARCHIVED';
  created_at: string;
  started_at?: string | null;
  ended_at?: string | null;
  finalized_at?: string | null;
}

export function generateJoinCode(): string {
  const db = getDb();
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // 32 characters, no 0/O, 1/I
  for (let attempt = 0; attempt < 50; attempt++) {
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = db.prepare("SELECT id FROM games WHERE join_code = ? AND status != 'ARCHIVED'").get(code);
    if (!existing) {
      return code;
    }
  }
  return 'T' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function createTable(params: {
  hostUserId: string;
  name: string;
  gameType: 'TEEN_PATTI' | 'POKER';
  totalChips?: number;
  chipValue?: number;
  initialFriendUserIds?: string[];
}): { table: GameTableRecord; hostPlayerId: string; seatedFriendsCount: number } {
  const db = getDb();
  const id = uuidv4();
  const hostPlayerId = uuidv4();
  const joinCode = generateJoinCode();
  const totalChips = params.totalChips && params.totalChips > 0 ? params.totalChips : 100;
  const chipValue = params.chipValue && params.chipValue > 0 ? params.chipValue : 10;
  const now = new Date().toISOString();

  let seatedFriendsCount = 0;

  const insertGame = db.transaction(() => {
    db.prepare(`
      INSERT INTO games (id, name, game_type, host_user_id, join_code, total_chips, chip_value, bank_chips, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'WAITING', ?)
    `).run(id, params.name.trim(), params.gameType, params.hostUserId, joinCode, totalChips, chipValue, totalChips, now);

    db.prepare(`
      INSERT INTO game_players (id, game_id, user_id, role, current_chips, total_buyin_amount, total_buyin_chips, joined_at)
      VALUES (?, ?, ?, 'HOST', 0, 0, 0, ?)
    `).run(hostPlayerId, id, params.hostUserId, now);

    if (params.initialFriendUserIds && params.initialFriendUserIds.length > 0) {
      for (const friendId of params.initialFriendUserIds) {
        if (friendId === params.hostUserId) continue;
        const friendship = db.prepare(`
          SELECT id FROM friendships 
          WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 'ACCEPTED'
        `).get(params.hostUserId, friendId, friendId, params.hostUserId);
        if (friendship) {
          const fPlayerId = uuidv4();
          db.prepare(`
            INSERT INTO game_players (id, game_id, user_id, role, current_chips, total_buyin_amount, total_buyin_chips, joined_at)
            VALUES (?, ?, ?, 'PLAYER', 0, 0, 0, ?)
          `).run(fPlayerId, id, friendId, now);
          seatedFriendsCount++;
        }
      }
    }
  });

  insertGame();

  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as GameTableRecord;
  return { table, hostPlayerId, seatedFriendsCount };
}

export function updateTableSettings(params: {
  tableId: string;
  hostUserId: string;
  name?: string;
  gameType?: 'TEEN_PATTI' | 'POKER';
  totalChips?: number;
  chipValue?: number;
}): GameTableRecord {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(params.tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.host_user_id !== params.hostUserId) throw new Error('Only the host can modify table settings');
  if (table.status !== 'WAITING') {
    throw new Error('Table settings cannot be modified once the game is started');
  }

  // Check if any transaction has already occurred
  const txCount = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE game_id = ?').get(params.tableId) as { cnt: number };
  if (txCount.cnt > 0) {
    throw new Error('Cannot change settings after transactions have begun');
  }

  const newTotalChips = params.totalChips && params.totalChips > 0 ? params.totalChips : table.total_chips;
  const newChipValue = params.chipValue && params.chipValue > 0 ? params.chipValue : table.chip_value;
  const newName = params.name ? params.name.trim() : table.name;
  const newGameType = params.gameType || table.game_type;

  db.prepare(`
    UPDATE games 
    SET name = ?, game_type = ?, total_chips = ?, chip_value = ?, bank_chips = ?
    WHERE id = ?
  `).run(newName, newGameType, newTotalChips, newChipValue, newTotalChips, params.tableId);

  return db.prepare('SELECT * FROM games WHERE id = ?').get(params.tableId) as GameTableRecord;
}

export function joinTableByCode(userId: string, code: string): { table: GameTableRecord; playerId: string } {
  const normalizedCode = code.trim().toUpperCase();
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE UPPER(join_code) = ?').get(normalizedCode) as GameTableRecord | undefined;

  if (!table) throw new Error('Table not found. Please verify the code.');
  if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
    throw new Error('This game has already finished and is read-only');
  }

  // Check if user already in table
  const existingPlayer = db.prepare('SELECT * FROM game_players WHERE game_id = ? AND user_id = ?').get(table.id, userId) as any;
  if (existingPlayer) {
    return { table, playerId: existingPlayer.id };
  }

  const playerId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO game_players (id, game_id, user_id, role, current_chips, total_buyin_amount, total_buyin_chips, joined_at)
    VALUES (?, ?, ?, 'PLAYER', 0, 0, 0, ?)
  `).run(playerId, table.id, userId, now);

  return { table, playerId };
}

export function addPlayerToTable(hostUserId: string, tableId: string, targetFriendCode: string): { success: boolean; playerId: string; displayName: string } {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.host_user_id !== hostUserId) throw new Error('Only the host can add players');
  if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
    throw new Error('Cannot add players to a finalized table');
  }

  const targetUser = getUserByFriendCode(targetFriendCode);
  if (!targetUser) throw new Error('Player not found with that friend code');

  const existing = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(tableId, targetUser.id) as any;
  if (existing) throw new Error('Player is already in this table');

  const playerId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO game_players (id, game_id, user_id, role, current_chips, total_buyin_amount, total_buyin_chips, joined_at)
    VALUES (?, ?, ?, 'PLAYER', 0, 0, 0, ?)
  `).run(playerId, tableId, targetUser.id, now);

  return { success: true, playerId, displayName: targetUser.display_name };
}

export function addFriendToTable(hostUserId: string, tableId: string, friendUserId: string): { success: boolean; playerId: string; displayName: string } {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.host_user_id !== hostUserId) throw new Error('Only the host can add friends to the table');
  if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
    throw new Error('Cannot add players to a finalized table');
  }

  // Verify friendship
  const friendship = db.prepare(`
    SELECT id FROM friendships 
    WHERE ((user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)) AND status = 'ACCEPTED'
  `).get(hostUserId, friendUserId, friendUserId, hostUserId);

  if (!friendship) {
    throw new Error('User is not in your friends list');
  }

  const friendUser = db.prepare('SELECT id, display_name FROM users WHERE id = ?').get(friendUserId) as any;
  if (!friendUser) {
    throw new Error('Friend user record not found');
  }

  const existing = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(tableId, friendUserId) as any;
  if (existing) {
    throw new Error('Friend is already seated at this table');
  }

  const playerId = uuidv4();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO game_players (id, game_id, user_id, role, current_chips, total_buyin_amount, total_buyin_chips, joined_at)
    VALUES (?, ?, ?, 'PLAYER', 0, 0, 0, ?)
  `).run(playerId, tableId, friendUserId, now);

  return { success: true, playerId, displayName: friendUser.display_name };
}

export function removePlayerFromTable(hostUserId: string, tableId: string, playerId: string): { success: boolean } {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.host_user_id !== hostUserId) throw new Error('Only the host can remove players');
  if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
    throw new Error('Cannot modify a finalized table');
  }

  const player = db.prepare('SELECT * FROM game_players WHERE id = ? AND game_id = ?').get(playerId, tableId) as any;
  if (!player) throw new Error('Player not found in this table');
  if (player.role === 'HOST') throw new Error('Host cannot be removed from the table');
  if (player.current_chips > 0) throw new Error('Cannot remove player with active chips. Return chips first.');
  if (player.total_buyin_chips > 0) throw new Error('Cannot remove player who has already bought chips.');

  // Check active loans
  const loanCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM loans 
    WHERE game_id = ? AND (lender_id = ? OR borrower_id = ?) AND status != 'SETTLED'
  `).get(tableId, playerId, playerId) as { cnt: number };

  if (loanCount.cnt > 0) throw new Error('Cannot remove player with unsettled loans');

  db.prepare('DELETE FROM game_players WHERE id = ?').run(playerId);
  return { success: true };
}

export function startTableGame(hostUserId: string, tableId: string): GameTableRecord {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.host_user_id !== hostUserId) throw new Error('Only the host can start the game');

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE games SET status = 'ACTIVE', started_at = ? WHERE id = ?
  `).run(now, tableId);

  return db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord;
}

export function getTableDetails(tableId: string, requestingUserId: string) {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) return null;

  // Fetch host user details
  const hostUser = db.prepare('SELECT id, display_name, friend_code, phone_number, email FROM users WHERE id = ?').get(table.host_user_id) as any;
  if (hostUser && hostUser.phone_number) {
    hostUser.friend_code = hostUser.phone_number;
  }

  // Fetch players
  const players = db.prepare(`
    SELECT gp.id, gp.user_id, gp.role, gp.current_chips, gp.total_buyin_amount, gp.total_buyin_chips, gp.joined_at,
      u.display_name, u.friend_code, u.phone_number, u.avatar_url
    FROM game_players gp
    JOIN users u ON gp.user_id = u.id
    WHERE gp.game_id = ?
    ORDER BY CASE WHEN gp.role = 'HOST' THEN 0 ELSE 1 END, gp.joined_at ASC
  `).all(tableId) as any[];

  // Augment each player with friendship status relative to requestingUserId
  const playersWithFriendship = players.map(p => {
    let friendshipStatus: 'SELF' | 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'NONE' = 'NONE';
    if (p.user_id === requestingUserId) {
      friendshipStatus = 'SELF';
    } else {
      const status = getFriendshipStatusBetween(requestingUserId, p.user_id);
      friendshipStatus = status as any;
    }
    return {
      ...p,
      friend_code: p.phone_number || p.friend_code,
      friendshipStatus,
      moneyEquivalent: p.current_chips * table.chip_value
    };
  });

  // Calculate chip reconciliation
  const sumPlayerChips = players.reduce((acc, p) => acc + p.current_chips, 0);
  const totalAccountedChips = sumPlayerChips + table.bank_chips;
  const isReconciled = totalAccountedChips === table.total_chips;
  const discrepancy = table.total_chips - totalAccountedChips;

  // Fetch active loans
  const loans = db.prepare(`
    SELECT l.id, l.original_chip_amount, l.remaining_chip_amount, l.chip_value, l.status, l.created_at,
      lender.id as lender_player_id, u_lender.display_name as lender_name,
      borrower.id as borrower_player_id, u_borrower.display_name as borrower_name
    FROM loans l
    JOIN game_players lender ON l.lender_id = lender.id
    JOIN users u_lender ON lender.user_id = u_lender.id
    JOIN game_players borrower ON l.borrower_id = borrower.id
    JOIN users u_borrower ON borrower.user_id = u_borrower.id
    WHERE l.game_id = ? AND l.status != 'SETTLED'
    ORDER BY l.created_at DESC
  `).all(tableId) as any[];

  // Fetch recent transactions (last 30)
  const transactions = db.prepare(`
    SELECT t.id, t.type, t.chip_amount, t.chip_value, t.money_value, t.reversal_of, t.metadata, t.created_at,
      u_actor.display_name as actor_name,
      t.from_player_id,
      t.to_player_id
    FROM transactions t
    JOIN users u_actor ON t.actor_user_id = u_actor.id
    WHERE t.game_id = ?
    ORDER BY t.created_at DESC
    LIMIT 30
  `).all(tableId) as any[];

  return {
    table: {
      ...table,
      totalMoneyValue: table.total_chips * table.chip_value
    },
    host: hostUser,
    isHost: table.host_user_id === requestingUserId,
    players: playersWithFriendship,
    reconciliation: {
      totalChips: table.total_chips,
      playerChips: sumPlayerChips,
      bankChips: table.bank_chips,
      totalAccounted: totalAccountedChips,
      isReconciled,
      discrepancy
    },
    activeLoans: loans.map(l => ({
      ...l,
      moneyEquivalent: l.remaining_chip_amount * l.chip_value
    })),
    recentTransactions: transactions
  };
}

export function getActiveUserTables(userId: string) {
  const db = getDb();
  return db.prepare(`
    SELECT g.*, gp.role as player_role, gp.current_chips as my_chips,
      (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.user_id = ? AND g.status IN ('WAITING', 'ACTIVE', 'SETTLING')
    ORDER BY g.created_at DESC
  `).all(userId) as any[];
}

export function getUserCompletedTables(userId: string) {
  const db = getDb();
  return db.prepare(`
    SELECT g.*, gp.role as player_role, r.net_winnings_money, r.is_winner,
      (SELECT display_name FROM users WHERE id = g.host_user_id) as host_name
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    LEFT JOIN player_game_results r ON (r.game_id = g.id AND r.user_id = ?)
    WHERE gp.user_id = ? AND g.status IN ('FINALIZED', 'ARCHIVED')
    ORDER BY g.finalized_at DESC
    LIMIT 50
  `).all(userId, userId) as any[];
}
