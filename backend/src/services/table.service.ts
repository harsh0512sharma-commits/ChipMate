import { randomUUID as uuidv4 } from 'crypto';
import { getDb, flushReplicationQueue } from '../db';
import { getFriendshipStatusBetween } from './friend.service';
import { getUserByFriendCode } from './auth.service';
import { recalculateUserLifetimeStats } from './stats.service';

export interface GameTableRecord {
  id: string;
  name: string;
  game_type: 'TEEN_PATTI' | 'POKER';
  host_user_id: string;
  join_code: string;
  total_chips: number;
  chip_value: number;
  bank_chips: number;
  chip_mode?: 'EQUAL' | 'DENOMINATION';
  denominations?: string | null;
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

export function getUserActiveGame(userId: string, excludeGameId?: string): { id: string; name: string; status: string } | null {
  const db = getDb();
  let query = `
    SELECT g.id, g.name, g.status
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.user_id = ? AND gp.left_at IS NULL AND g.status IN ('WAITING', 'ACTIVE', 'SETTLING')
  `;
  const params: any[] = [userId];
  if (excludeGameId) {
    query += ` AND g.id != ?`;
    params.push(excludeGameId);
  }
  query += ` LIMIT 1`;
  const row = db.prepare(query).get(...params) as any;
  return row || null;
}

export interface DenominationConfig {
  value: number;
  count: number;
  label?: string;
  color?: string;
}

export function createTable(params: {
  hostUserId: string;
  name: string;
  gameType: 'TEEN_PATTI' | 'POKER';
  totalChips?: number;
  chipValue?: number;
  chipMode?: 'EQUAL' | 'DENOMINATION';
  denominations?: DenominationConfig[] | number[] | string;
  initialFriendUserIds?: string[];
  initialGuestIds?: string[];
}): { table: GameTableRecord; hostPlayerId: string; seatedFriendsCount: number; seatedGuestsCount: number } {
  const db = getDb();

  // Concurrency check: Ensure host is not already in an active game
  const hostActiveGame = getUserActiveGame(params.hostUserId);
  if (hostActiveGame) {
    throw new Error(`You are currently in an active game ("${hostActiveGame.name}"). Please finish, leave, or delete that game before creating a new table.`);
  }

  const id = uuidv4();
  const hostPlayerId = uuidv4();
  const joinCode = generateJoinCode();
  let totalChips = params.totalChips && params.totalChips > 0 ? params.totalChips : 100;
  let chipValue = params.chipValue && params.chipValue > 0 ? params.chipValue : 10;
  const chipMode = params.chipMode || 'EQUAL';

  let parsedDenoms: any = null;
  if (params.denominations) {
    if (typeof params.denominations === 'string') {
      try {
        parsedDenoms = JSON.parse(params.denominations);
      } catch (_) {
        parsedDenoms = params.denominations;
      }
    } else {
      parsedDenoms = params.denominations;
    }
  }

  // If custom denomination configs provided with count and value, derive physical chips & bank valuation
  if (chipMode === 'DENOMINATION' && Array.isArray(parsedDenoms) && parsedDenoms.length > 0) {
    const isObjectConfig = typeof parsedDenoms[0] === 'object' && parsedDenoms[0] !== null && 'value' in parsedDenoms[0] && 'count' in parsedDenoms[0];
    if (isObjectConfig) {
      parsedDenoms = parsedDenoms.map((d: any) => ({
        value: Number(d.value) || 0,
        count: Number(d.count) || 0,
        initial_count: Number(d.initial_count ?? d.count) || 0,
        label: d.label || '',
        color: d.color || '#3B82F6'
      }));
      const sumChips = parsedDenoms.reduce((sum: number, d: any) => sum + (Number(d.count) || 0), 0);
      const sumMoney = parsedDenoms.reduce((sum: number, d: any) => sum + ((Number(d.count) || 0) * (Number(d.value) || 0)), 0);
      if (sumChips > 0) {
        totalChips = sumChips;
        chipValue = Math.round((sumMoney / sumChips) * 100) / 100;
      }
    }
  }

  const denominationsJson = parsedDenoms
    ? JSON.stringify(parsedDenoms)
    : null;
  const now = new Date().toISOString();

  let seatedFriendsCount = 0;
  let seatedGuestsCount = 0;

  const insertGame = db.transaction(() => {
    db.prepare(`
      INSERT INTO games (id, name, game_type, host_user_id, join_code, total_chips, chip_value, bank_chips, chip_mode, denominations, status, created_at, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(id, params.name.trim(), params.gameType, params.hostUserId, joinCode, totalChips, chipValue, totalChips, chipMode, denominationsJson, now, now);

    db.prepare(`
      INSERT INTO game_players (id, game_id, user_id, role, current_chips, total_buyin_amount, total_buyin_chips, joined_at)
      VALUES (?, ?, ?, 'HOST', 0, 0, 0, ?)
    `).run(hostPlayerId, id, params.hostUserId, now);

    if (params.initialFriendUserIds && params.initialFriendUserIds.length > 0) {
      for (const friendId of params.initialFriendUserIds) {
        if (friendId === params.hostUserId) continue;

        // Skip friends who are already busy in another active game
        const friendActive = getUserActiveGame(friendId);
        if (friendActive) continue;

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

    seatedGuestsCount = 0;
    if (params.initialGuestIds && params.initialGuestIds.length > 0) {
      for (const guestId of params.initialGuestIds) {
        const guest = db.prepare('SELECT * FROM saved_guests WHERE id = ?').get(guestId) as any;
        if (guest) {
          const gPlayerId = uuidv4();
          db.prepare(`
            INSERT INTO game_players (id, game_id, user_id, role, current_chips, total_buyin_amount, total_buyin_chips, is_guest, guest_name, joined_at)
            VALUES (?, ?, ?, 'PLAYER', 0, 0, 0, 1, ?, ?)
          `).run(gPlayerId, id, guest.id, guest.name, now);
          seatedGuestsCount++;
        }
      }
    }
  });

  insertGame();

  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(id) as GameTableRecord;
  return { table, hostPlayerId, seatedFriendsCount, seatedGuestsCount };
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
    if (existingPlayer.left_at) {
      const now = new Date().toISOString();
      db.prepare('UPDATE game_players SET left_at = NULL, joined_at = ? WHERE id = ?').run(now, existingPlayer.id);
    }
    return { table, playerId: existingPlayer.id };
  }

  // Concurrency check: Ensure player is not already in another active table
  const activeOtherGame = getUserActiveGame(userId, table.id);
  if (activeOtherGame) {
    throw new Error(`You are already playing in an active game ("${activeOtherGame.name}"). Please finish or leave that game before joining another.`);
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

  const existing = db.prepare('SELECT id, left_at FROM game_players WHERE game_id = ? AND user_id = ?').get(tableId, targetUser.id) as any;
  if (existing) {
    if (!existing.left_at) {
      throw new Error('Player is already in this table');
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE game_players SET left_at = NULL, joined_at = ? WHERE id = ?').run(now, existing.id);
    return { success: true, playerId: existing.id, displayName: targetUser.display_name };
  }

  // Concurrency check: Ensure target player is not already playing in another active game
  const targetActiveGame = getUserActiveGame(targetUser.id, tableId);
  if (targetActiveGame) {
    throw new Error(`${targetUser.display_name} is already playing in another active game ("${targetActiveGame.name}"). They cannot be added until their game is finished.`);
  }

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

  const existing = db.prepare('SELECT id, left_at FROM game_players WHERE game_id = ? AND user_id = ?').get(tableId, friendUserId) as any;
  if (existing) {
    if (!existing.left_at) {
      throw new Error('Friend is already seated at this table');
    }
    const now = new Date().toISOString();
    db.prepare('UPDATE game_players SET left_at = NULL, joined_at = ? WHERE id = ?').run(now, existing.id);
    return { success: true, playerId: existing.id, displayName: friendUser.display_name };
  }

  // Concurrency check: Ensure friend is not already playing in another active game
  const friendActiveGame = getUserActiveGame(friendUserId, tableId);
  if (friendActiveGame) {
    throw new Error(`${friendUser.display_name} is already playing in another active game ("${friendActiveGame.name}"). They cannot be added until their game is finished.`);
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
  const isSettlingOrFinal = table.status === 'SETTLING' || table.status === 'FINALIZED' || table.status === 'ARCHIVED';
  const players = db.prepare(`
    SELECT gp.id, gp.user_id, gp.role, gp.current_chips, gp.total_buyin_amount, gp.total_buyin_chips, gp.final_chips_value, gp.final_denominations, gp.joined_at, gp.left_at,
      gp.is_guest, gp.guest_name,
      COALESCE(gp.guest_name, u.display_name) as display_name,
      u.friend_code, u.phone_number, u.avatar_url
    FROM game_players gp
    JOIN users u ON gp.user_id = u.id
    WHERE gp.game_id = ? ${isSettlingOrFinal ? '' : 'AND gp.left_at IS NULL'}
    ORDER BY CASE WHEN gp.role = 'HOST' THEN 0 ELSE 1 END, gp.joined_at ASC
  `).all(tableId) as any[];

  // Augment each player with friendship status relative to requestingUserId
  const playersWithFriendship = players.map(p => {
    const isGuest = Boolean(p.is_guest || (p.user_id && p.user_id.startsWith('guest_')));
    let friendshipStatus: 'SELF' | 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'NONE' = 'NONE';
    if (p.user_id === requestingUserId) {
      friendshipStatus = 'SELF';
    } else if (!isGuest) {
      const status = getFriendshipStatusBetween(requestingUserId, p.user_id);
      friendshipStatus = status as any;
    }
    return {
      ...p,
      is_guest: isGuest,
      friend_code: isGuest ? 'GUEST' : (p.phone_number || p.friend_code),
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
      lender.id as lender_player_id, COALESCE(lender.guest_name, u_lender.display_name) as lender_name,
      borrower.id as borrower_player_id, COALESCE(borrower.guest_name, u_borrower.display_name) as borrower_name
    FROM loans l
    JOIN game_players lender ON l.lender_id = lender.id
    JOIN users u_lender ON lender.user_id = u_lender.id
    JOIN game_players borrower ON l.borrower_id = borrower.id
    JOIN users u_borrower ON borrower.user_id = u_borrower.id
    WHERE l.game_id = ? AND l.status != 'SETTLED'
    ORDER BY l.created_at DESC
  `).all(tableId) as any[];

  // Fetch recent transactions (last 50) with From -> To human player names
  const transactions = db.prepare(`
    SELECT t.id, t.type, t.chip_amount, t.chip_value, t.money_value, t.reversal_of, t.metadata, t.created_at,
      u_actor.display_name as actor_name,
      t.from_player_id,
      t.to_player_id,
      CASE
        WHEN t.from_player_id = 'BANK' THEN 'Bank'
        WHEN gp_from.guest_name IS NOT NULL AND gp_from.guest_name != '' THEN gp_from.guest_name
        WHEN u_from.display_name IS NOT NULL AND u_from.display_name != '' THEN u_from.display_name
        WHEN (SELECT display_name FROM users WHERE id = gp_from.user_id) IS NOT NULL THEN (SELECT display_name FROM users WHERE id = gp_from.user_id)
        WHEN t.from_player_id = (SELECT id FROM game_players WHERE game_id = t.game_id AND role = 'HOST') THEN (SELECT display_name FROM users WHERE id = (SELECT host_user_id FROM games WHERE id = t.game_id))
        ELSE COALESCE(gp_from.guest_name, u_from.display_name, u_actor.display_name, 'Player')
      END as from_player_name,
      CASE
        WHEN t.to_player_id = 'BANK' THEN 'Bank'
        WHEN gp_to.guest_name IS NOT NULL AND gp_to.guest_name != '' THEN gp_to.guest_name
        WHEN u_to.display_name IS NOT NULL AND u_to.display_name != '' THEN u_to.display_name
        WHEN (SELECT display_name FROM users WHERE id = gp_to.user_id) IS NOT NULL THEN (SELECT display_name FROM users WHERE id = gp_to.user_id)
        WHEN t.from_player_id = 'BANK' AND t.type IN ('BUY_IN', 'RE_BUY') THEN COALESCE(
          (SELECT u.display_name FROM users u JOIN game_players gp ON gp.user_id = u.id WHERE gp.id = t.to_player_id),
          (SELECT u.display_name FROM users u WHERE u.id = (SELECT host_user_id FROM games WHERE id = t.game_id)),
          u_actor.display_name,
          'Player'
        )
        WHEN t.to_player_id = (SELECT id FROM game_players WHERE game_id = t.game_id AND role = 'HOST') THEN (SELECT display_name FROM users WHERE id = (SELECT host_user_id FROM games WHERE id = t.game_id))
        ELSE COALESCE(gp_to.guest_name, u_to.display_name, 'Player')
      END as to_player_name
    FROM transactions t
    JOIN users u_actor ON t.actor_user_id = u_actor.id
    LEFT JOIN game_players gp_from ON t.from_player_id = gp_from.id
    LEFT JOIN users u_from ON gp_from.user_id = u_from.id
    LEFT JOIN game_players gp_to ON t.to_player_id = gp_to.id
    LEFT JOIN users u_to ON gp_to.user_id = u_to.id
    WHERE t.game_id = ?
    ORDER BY t.created_at DESC
    LIMIT 50
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
      (SELECT COUNT(*) FROM game_players WHERE game_id = g.id AND left_at IS NULL) as player_count
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.user_id = ? AND gp.left_at IS NULL AND g.status IN ('WAITING', 'ACTIVE', 'SETTLING')
    ORDER BY g.created_at DESC
  `).all(userId) as any[];
}

export function getUserCompletedTables(userId: string) {
  const db = getDb();
  return db.prepare(`
    SELECT DISTINCT
      g.id, g.name, g.game_type, g.status, g.host_user_id, g.total_chips, g.chip_value,
      g.bank_chips, g.created_at, g.started_at, g.ended_at, g.finalized_at,
      COALESCE(r.net_winnings_money, 0) as net_winnings_money,
      COALESCE(r.is_winner, 0) as is_winner,
      COALESCE(gp.role, CASE WHEN g.host_user_id = ? THEN 'HOST' ELSE 'PLAYER' END) as player_role,
      (SELECT display_name FROM users WHERE id = g.host_user_id) as host_name
    FROM games g
    LEFT JOIN game_players gp ON (gp.game_id = g.id AND gp.user_id = ?)
    LEFT JOIN player_game_results r ON (r.game_id = g.id AND r.user_id = ?)
    WHERE (gp.user_id = ? OR r.user_id = ? OR g.host_user_id = ?)
      AND g.status IN ('FINALIZED', 'ARCHIVED')
    ORDER BY COALESCE(g.finalized_at, g.created_at) DESC
  `).all(userId, userId, userId, userId, userId, userId) as any[];
}

export interface SavedGuestRecord {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  games_played: number;
}

export function getSavedGuests(): SavedGuestRecord[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT g.id, g.name, g.created_by, g.created_at,
      (SELECT COUNT(DISTINCT gp.game_id) FROM game_players gp JOIN games gm ON gp.game_id = gm.id WHERE gp.user_id = g.id AND gm.status = 'FINALIZED') as games_played
    FROM saved_guests g
    ORDER BY games_played DESC, g.name ASC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    created_by: r.created_by,
    created_at: r.created_at,
    games_played: Number(r.games_played) || 0
  }));
}

export function seatGuestPlayer(
  hostUserId: string,
  tableId: string,
  payload: string | { guestId?: string; guestName?: string }
): {
  success: boolean;
  playerId: string;
  displayName: string;
  guestId: string;
} {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.host_user_id !== hostUserId) throw new Error('Only the host can seat guest players');
  if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
    throw new Error('Cannot seat players in a finalized game');
  }

  const guestIdArg = typeof payload === 'object' ? payload.guestId : undefined;
  const guestNameArg = typeof payload === 'object' ? payload.guestName : payload;

  let guestUserId = '';
  let cleanName = '';
  const now = new Date().toISOString();

  if (guestIdArg) {
    const saved = db.prepare('SELECT * FROM saved_guests WHERE id = ?').get(guestIdArg) as any;
    if (!saved) throw new Error('Saved guest not found');
    guestUserId = saved.id;
    cleanName = saved.name;
  } else if (guestNameArg) {
    cleanName = guestNameArg.trim();
    if (!cleanName || cleanName.length < 2) {
      throw new Error('Please enter a valid name for the guest (at least 2 characters)');
    }

    // Look up if a saved guest already exists with this name (case-insensitive)
    const existingGuest = db.prepare('SELECT * FROM saved_guests WHERE LOWER(name) = LOWER(?)').get(cleanName) as any;
    if (existingGuest) {
      guestUserId = existingGuest.id;
      cleanName = existingGuest.name;
    } else {
      // Create persistent guest
      guestUserId = 'guest_' + uuidv4();
      db.prepare(`
        INSERT INTO saved_guests (id, name, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(guestUserId, cleanName, hostUserId, now, now);
    }
  } else {
    throw new Error('Guest name or guest ID is required');
  }

  // Ensure guest exists in users table so foreign keys and joins succeed
  const dummyEmail = `${guestUserId}@chipmate.guest`;
  const dummyFriendCode = `GUEST_${cleanName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)}`;
  db.prepare(`
    INSERT INTO users (id, phone_number, email, display_name, friend_code, created_at, updated_at)
    VALUES (?, NULL, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name
  `).run(guestUserId, dummyEmail, cleanName, dummyFriendCode, now, now);

  // Check if guest is already seated at this table
  const alreadySeated = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(tableId, guestUserId) as any;
  if (alreadySeated) {
    throw new Error(`"${cleanName}" is already seated at this table`);
  }

  const playerId = uuidv4();
  db.prepare(`
    INSERT INTO game_players (id, game_id, user_id, role, current_chips, total_buyin_amount, total_buyin_chips, is_guest, guest_name, joined_at)
    VALUES (?, ?, ?, 'PLAYER', 0, 0, 0, 1, ?, ?)
  `).run(playerId, tableId, guestUserId, cleanName, now);

  return { success: true, playerId, displayName: cleanName, guestId: guestUserId };
}

export function getTableTransactions(tableId: string) {
  const db = getDb();
  const transactions = db.prepare(`
    SELECT t.id, t.type, t.chip_amount, t.chip_value, t.money_value, t.reversal_of, t.metadata, t.created_at,
      u_actor.display_name as actor_name,
      t.from_player_id,
      t.to_player_id,
      CASE
        WHEN t.from_player_id = 'BANK' THEN 'Bank'
        WHEN gp_from.guest_name IS NOT NULL AND gp_from.guest_name != '' THEN gp_from.guest_name
        WHEN u_from.display_name IS NOT NULL AND u_from.display_name != '' THEN u_from.display_name
        WHEN (SELECT display_name FROM users WHERE id = gp_from.user_id) IS NOT NULL THEN (SELECT display_name FROM users WHERE id = gp_from.user_id)
        WHEN t.from_player_id = (SELECT id FROM game_players WHERE game_id = t.game_id AND role = 'HOST') THEN (SELECT display_name FROM users WHERE id = (SELECT host_user_id FROM games WHERE id = t.game_id))
        ELSE COALESCE(gp_from.guest_name, u_from.display_name, u_actor.display_name, 'Player')
      END as from_player_name,
      CASE
        WHEN t.to_player_id = 'BANK' THEN 'Bank'
        WHEN gp_to.guest_name IS NOT NULL AND gp_to.guest_name != '' THEN gp_to.guest_name
        WHEN u_to.display_name IS NOT NULL AND u_to.display_name != '' THEN u_to.display_name
        WHEN (SELECT display_name FROM users WHERE id = gp_to.user_id) IS NOT NULL THEN (SELECT display_name FROM users WHERE id = gp_to.user_id)
        WHEN t.from_player_id = 'BANK' AND t.type IN ('BUY_IN', 'RE_BUY') THEN COALESCE(
          (SELECT u.display_name FROM users u JOIN game_players gp ON gp.user_id = u.id WHERE gp.id = t.to_player_id),
          (SELECT u.display_name FROM users u WHERE u.id = (SELECT host_user_id FROM games WHERE id = t.game_id)),
          u_actor.display_name,
          'Player'
        )
        WHEN t.to_player_id = (SELECT id FROM game_players WHERE game_id = t.game_id AND role = 'HOST') THEN (SELECT display_name FROM users WHERE id = (SELECT host_user_id FROM games WHERE id = t.game_id))
        ELSE COALESCE(gp_to.guest_name, u_to.display_name, 'Player')
      END as to_player_name
    FROM transactions t
    JOIN users u_actor ON t.actor_user_id = u_actor.id
    LEFT JOIN game_players gp_from ON t.from_player_id = gp_from.id
    LEFT JOIN users u_from ON gp_from.user_id = u_from.id
    LEFT JOIN game_players gp_to ON t.to_player_id = gp_to.id
    LEFT JOIN users u_to ON gp_to.user_id = u_to.id
    WHERE t.game_id = ?
    ORDER BY t.created_at ASC
  `).all(tableId) as any[];

  return transactions;
}

export function deleteTable(hostUserId: string, tableId: string, isAdmin: boolean = false): { success: boolean; tableId: string; message: string } {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.host_user_id !== hostUserId && !isAdmin) throw new Error('Only the table host or an administrator can delete the table');

  // Collect all players who participated in this game so we can recalculate their lifetime stats
  const participatingUserRows = db.prepare(`
    SELECT DISTINCT user_id 
    FROM game_players 
    WHERE game_id = ?
  `).all(tableId) as { user_id: string }[];

  db.transaction(() => {
    // 1. Delete settlement details
    db.prepare('DELETE FROM settlement_items WHERE game_id = ?').run(tableId);
    db.prepare('DELETE FROM settlements WHERE game_id = ?').run(tableId);
    // 2. Delete loans
    db.prepare('DELETE FROM loans WHERE game_id = ?').run(tableId);
    // 3. Delete transactions
    db.prepare('DELETE FROM transactions WHERE game_id = ?').run(tableId);
    // 4. Delete player game results if any
    db.prepare('DELETE FROM player_game_results WHERE game_id = ?').run(tableId);
    // 5. Delete game players
    db.prepare('DELETE FROM game_players WHERE game_id = ?').run(tableId);
    // 6. Delete game table
    db.prepare('DELETE FROM games WHERE id = ?').run(tableId);
  })();

  // Recalculate lifetime stats for all affected players (both registered users & saved guests)
  for (const row of participatingUserRows) {
    if (row.user_id) {
      try {
        recalculateUserLifetimeStats(row.user_id);
      } catch (err: any) {
        console.warn(`[deleteTable] Error recalculating stats for ${row.user_id}:`, err.message);
      }
    }
  }

  flushReplicationQueue().catch(err => {
    console.warn('[deleteTable] Cloud replication flush error:', err.message);
  });

  return { success: true, tableId, message: 'Table deleted successfully' };
}

export function leaveTable(userId: string, tableId: string): {
  success: boolean;
  tableDeleted: boolean;
  newHostUserId?: string;
  newHostName?: string;
  departingUserId: string;
  message: string;
} {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
    return {
      success: true,
      tableDeleted: false,
      departingUserId: userId,
      message: 'Table is finalized. You have exited the table.'
    };
  }

  const player = db.prepare('SELECT * FROM game_players WHERE game_id = ? AND user_id = ?').get(tableId, userId) as any;
  if (!player || player.left_at) {
    return {
      success: true,
      tableDeleted: false,
      departingUserId: userId,
      message: 'You have left the table.'
    };
  }

  // Check active loans
  const loanCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM loans 
    WHERE game_id = ? AND (lender_id = ? OR borrower_id = ?) AND status != 'SETTLED'
  `).get(tableId, player.id, player.id) as { cnt: number };

  if (loanCount.cnt > 0) {
    throw new Error('Cannot leave table with active loans. Please repay or settle loans first.');
  }

  const isHost = table.host_user_id === userId || player.role === 'HOST';

  // Return any remaining chips held by this player to the bank
  if (player.current_chips > 0) {
    const returnAmount = player.current_chips;
    const moneyVal = returnAmount * table.chip_value;
    const now = new Date().toISOString();
    const txId = uuidv4();

    db.prepare('UPDATE games SET bank_chips = bank_chips + ? WHERE id = ?').run(returnAmount, tableId);
    db.prepare(`
      INSERT INTO transactions (id, game_id, type, actor_user_id, from_player_id, to_player_id, chip_amount, chip_value, money_value, metadata, created_at)
      VALUES (?, ?, 'RETURN', ?, ?, 'BANK', ?, ?, ?, ?, ?)
    `).run(txId, tableId, userId, player.id, returnAmount, table.chip_value, moneyVal, JSON.stringify({ reason: 'Player left table' }), now);
  }

  if (isHost) {
    // Find remaining non-guest active players ordered by join time
    const remainingRegistered = db.prepare(`
      SELECT gp.*, u.display_name FROM game_players gp
      JOIN users u ON gp.user_id = u.id
      WHERE gp.game_id = ? AND gp.user_id != ? AND gp.is_guest = 0 AND gp.left_at IS NULL
      ORDER BY gp.joined_at ASC
    `).all(tableId, userId) as any[];

    if (remainingRegistered.length === 0) {
      // Host was the sole registered player -> delete the table completely!
      deleteTable(userId, tableId);
      return {
        success: true,
        tableDeleted: true,
        departingUserId: userId,
        message: 'You left the table and it was deleted because no other players remained.'
      };
    } else {
      // Promote the next registered player to Host!
      const newHost = remainingRegistered[0];
      const now = new Date().toISOString();
      db.transaction(() => {
        db.prepare('UPDATE games SET host_user_id = ? WHERE id = ?').run(newHost.user_id, tableId);
        db.prepare("UPDATE game_players SET role = 'HOST' WHERE id = ?").run(newHost.id);

        const hasTx = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE game_id = ? AND (from_player_id = ? OR to_player_id = ?)').get(tableId, player.id, player.id) as { cnt: number };
        if (hasTx && hasTx.cnt > 0) {
          db.prepare("UPDATE game_players SET role = 'PLAYER', current_chips = 0, left_at = ? WHERE id = ?").run(now, player.id);
        } else {
          db.prepare('DELETE FROM game_players WHERE id = ?').run(player.id);
        }
      })();

      return {
        success: true,
        tableDeleted: false,
        newHostUserId: newHost.user_id,
        newHostName: newHost.display_name,
        departingUserId: userId,
        message: `You left the table. Host permissions were transferred to ${newHost.display_name}.`
      };
    }
  } else {
    // Regular player leaves
    const now = new Date().toISOString();
    const hasTx = db.prepare('SELECT COUNT(*) as cnt FROM transactions WHERE game_id = ? AND (from_player_id = ? OR to_player_id = ?)').get(tableId, player.id, player.id) as { cnt: number };
    if (hasTx && hasTx.cnt > 0) {
      db.prepare("UPDATE game_players SET current_chips = 0, left_at = ? WHERE id = ?").run(now, player.id);
    } else {
      db.prepare('DELETE FROM game_players WHERE id = ?').run(player.id);
    }
    return {
      success: true,
      tableDeleted: false,
      departingUserId: userId,
      message: 'You left the table.'
    };
  }
}

