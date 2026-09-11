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

export function getUserActiveGame(userId: string, excludeGameId?: string): { id: string; name: string; status: string } | null {
  const db = getDb();
  let query = `
    SELECT g.id, g.name, g.status
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    WHERE gp.user_id = ? AND g.status IN ('WAITING', 'ACTIVE', 'SETTLING')
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

export function createTable(params: {
  hostUserId: string;
  name: string;
  gameType: 'TEEN_PATTI' | 'POKER';
  totalChips?: number;
  chipValue?: number;
  initialFriendUserIds?: string[];
}): { table: GameTableRecord; hostPlayerId: string; seatedFriendsCount: number } {
  const db = getDb();

  // Concurrency check: Ensure host is not already in an active game
  const hostActiveGame = getUserActiveGame(params.hostUserId);
  if (hostActiveGame) {
    throw new Error(`You are currently in an active game ("${hostActiveGame.name}"). Please finish, leave, or delete that game before creating a new table.`);
  }

  const id = uuidv4();
  const hostPlayerId = uuidv4();
  const joinCode = generateJoinCode();
  const totalChips = params.totalChips && params.totalChips > 0 ? params.totalChips : 100;
  const chipValue = params.chipValue && params.chipValue > 0 ? params.chipValue : 10;
  const now = new Date().toISOString();

  let seatedFriendsCount = 0;

  const insertGame = db.transaction(() => {
    db.prepare(`
      INSERT INTO games (id, name, game_type, host_user_id, join_code, total_chips, chip_value, bank_chips, status, created_at, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
    `).run(id, params.name.trim(), params.gameType, params.hostUserId, joinCode, totalChips, chipValue, totalChips, now, now);

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

  const existing = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(tableId, targetUser.id) as any;
  if (existing) throw new Error('Player is already in this table');

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

  const existing = db.prepare('SELECT id FROM game_players WHERE game_id = ? AND user_id = ?').get(tableId, friendUserId) as any;
  if (existing) {
    throw new Error('Friend is already seated at this table');
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
  const players = db.prepare(`
    SELECT gp.id, gp.user_id, gp.role, gp.current_chips, gp.total_buyin_amount, gp.total_buyin_chips, gp.joined_at,
      gp.is_guest, gp.guest_name,
      COALESCE(gp.guest_name, u.display_name) as display_name,
      u.friend_code, u.phone_number, u.avatar_url
    FROM game_players gp
    JOIN users u ON gp.user_id = u.id
    WHERE gp.game_id = ?
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
        WHEN u_from.display_name IS NOT NULL THEN COALESCE(gp_from.guest_name, u_from.display_name)
        ELSE 'Unknown'
      END as from_player_name,
      CASE
        WHEN t.to_player_id = 'BANK' THEN 'Bank'
        WHEN u_to.display_name IS NOT NULL THEN COALESCE(gp_to.guest_name, u_to.display_name)
        ELSE 'Unknown'
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

export function seatGuestPlayer(hostUserId: string, tableId: string, guestName: string): {
  success: boolean;
  playerId: string;
  displayName: string;
} {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.host_user_id !== hostUserId) throw new Error('Only the host can seat guest players');
  if (table.status === 'FINALIZED' || table.status === 'ARCHIVED') {
    throw new Error('Cannot seat players in a finalized game');
  }

  const cleanName = guestName.trim();
  if (!cleanName || cleanName.length < 2) {
    throw new Error('Please enter a valid name for the guest (at least 2 characters)');
  }

  const guestUserId = 'guest_' + uuidv4();
  const playerId = uuidv4();
  const now = new Date().toISOString();
  const dummyEmail = `${guestUserId}@chipmate.guest`;
  const dummyFriendCode = `GUEST_${uuidv4().substring(0, 8).toUpperCase()}`;

  db.transaction(() => {
    // 1. Insert synthetic guest in users table so foreign keys and joins are 100% compliant
    db.prepare(`
      INSERT INTO users (id, phone_number, email, display_name, friend_code, created_at, updated_at)
      VALUES (?, NULL, ?, ?, ?, ?, ?)
    `).run(guestUserId, dummyEmail, cleanName, dummyFriendCode, now, now);

    // 2. Insert into game_players
    db.prepare(`
      INSERT INTO game_players (id, game_id, user_id, role, current_chips, total_buyin_amount, total_buyin_chips, is_guest, guest_name, joined_at)
      VALUES (?, ?, ?, 'PLAYER', 0, 0, 0, 1, ?, ?)
    `).run(playerId, tableId, guestUserId, cleanName, now);
  })();

  return { success: true, playerId, displayName: cleanName };
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
        WHEN u_from.display_name IS NOT NULL THEN COALESCE(gp_from.guest_name, u_from.display_name)
        ELSE 'Unknown'
      END as from_player_name,
      CASE
        WHEN t.to_player_id = 'BANK' THEN 'Bank'
        WHEN u_to.display_name IS NOT NULL THEN COALESCE(gp_to.guest_name, u_to.display_name)
        ELSE 'Unknown'
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

export function deleteTable(hostUserId: string, tableId: string): { success: boolean; tableId: string; message: string } {
  const db = getDb();
  const table = db.prepare('SELECT * FROM games WHERE id = ?').get(tableId) as GameTableRecord | undefined;
  if (!table) throw new Error('Table not found');
  if (table.host_user_id !== hostUserId) throw new Error('Only the table host can delete the table');
  if (table.status === 'FINALIZED') {
    throw new Error('Finalized games cannot be deleted as they are part of permanent lifetime stats');
  }

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
    // 5. Delete guest users created for this game
    const guestRows = db.prepare('SELECT user_id FROM game_players WHERE game_id = ? AND is_guest = 1').all(tableId) as any[];
    // 6. Delete players
    db.prepare('DELETE FROM game_players WHERE game_id = ?').run(tableId);
    for (const g of guestRows) {
      if (g.user_id && g.user_id.startsWith('guest_')) {
        db.prepare("DELETE FROM users WHERE id = ?").run(g.user_id);
      }
    }
    // 7. Delete game table
    db.prepare('DELETE FROM games WHERE id = ?').run(tableId);
  })();

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
    throw new Error('Cannot leave a finalized table');
  }

  const player = db.prepare('SELECT * FROM game_players WHERE game_id = ? AND user_id = ?').get(tableId, userId) as any;
  if (!player) throw new Error('You are not seated at this table');

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
    // Find remaining non-guest players ordered by join time
    const remainingRegistered = db.prepare(`
      SELECT gp.*, u.display_name FROM game_players gp
      JOIN users u ON gp.user_id = u.id
      WHERE gp.game_id = ? AND gp.user_id != ? AND gp.is_guest = 0
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
      db.transaction(() => {
        db.prepare('UPDATE games SET host_user_id = ? WHERE id = ?').run(newHost.user_id, tableId);
        db.prepare("UPDATE game_players SET role = 'HOST' WHERE id = ?").run(newHost.id);
        db.prepare('DELETE FROM game_players WHERE id = ?').run(player.id);
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
    db.prepare('DELETE FROM game_players WHERE id = ?').run(player.id);
    return {
      success: true,
      tableDeleted: false,
      departingUserId: userId,
      message: 'You left the table.'
    };
  }
}

