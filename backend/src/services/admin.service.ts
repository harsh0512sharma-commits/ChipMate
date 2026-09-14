import { getDb, flushReplicationQueue } from '../db';
import { recalculateUserLifetimeStats } from './stats.service';
import { isMasterAdmin } from './auth.service';

export interface AdminOverview {
  totalUsers: number;
  totalGames: number;
  activeGames: number;
  finalizedGames: number;
  totalTurnover: number;
  totalChips: number;
  totalTransactions: number;
  totalLoans: number;
  totalSettlements: number;
}

export interface AdminPlayerSummary {
  id: string;
  phone_number: string | null;
  email: string;
  display_name: string;
  friend_code: string;
  avatar_url: string | null;
  created_at: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
  net_winnings: number;
  total_buyins: number;
  total_game_winnings: number;
  total_game_losses: number;
  biggest_win: number;
  biggest_loss: number;
  current_streak: number;
  best_winning_streak: number;
  worst_losing_streak: number;
  teen_patti_games: number;
  teen_patti_net: number;
  poker_games: number;
  poker_net: number;
  friends_count: number;
  games_hosted_count: number;
}

export function getAdminOverview(): AdminOverview {
  const db = getDb();

  const totalUsersRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE id NOT LIKE 'guest_%'").get() as { count: number };
  const totalGamesRow = db.prepare("SELECT COUNT(*) as count FROM games").get() as { count: number };
  const activeGamesRow = db.prepare("SELECT COUNT(*) as count FROM games WHERE status IN ('WAITING', 'IN_PROGRESS', 'SETTLING')").get() as { count: number };
  const finalizedGamesRow = db.prepare("SELECT COUNT(*) as count FROM games WHERE status = 'FINALIZED'").get() as { count: number };
  const turnoverRow = db.prepare("SELECT COALESCE(SUM(total_buyin_amount), 0) as turnover, COALESCE(SUM(total_buyin_chips), 0) as chips FROM game_players").get() as { turnover: number; chips: number };
  const txRow = db.prepare("SELECT COUNT(*) as count FROM transactions").get() as { count: number };
  const loansRow = db.prepare("SELECT COUNT(*) as count FROM loans").get() as { count: number };
  const settlementsRow = db.prepare("SELECT COUNT(*) as count FROM settlements").get() as { count: number };

  return {
    totalUsers: totalUsersRow?.count || 0,
    totalGames: totalGamesRow?.count || 0,
    activeGames: activeGamesRow?.count || 0,
    finalizedGames: finalizedGamesRow?.count || 0,
    totalTurnover: turnoverRow?.turnover || 0,
    totalChips: turnoverRow?.chips || 0,
    totalTransactions: txRow?.count || 0,
    totalLoans: loansRow?.count || 0,
    totalSettlements: settlementsRow?.count || 0,
  };
}

export function getAdminAllPlayers(): AdminPlayerSummary[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT 
      u.id,
      u.phone_number,
      u.email,
      u.display_name,
      u.friend_code,
      u.avatar_url,
      u.created_at,
      COALESCE(s.games_played, 0) as games_played,
      COALESCE(s.games_won, 0) as games_won,
      COALESCE(s.games_lost, 0) as games_lost,
      COALESCE(s.win_rate, 0.0) as win_rate,
      COALESCE(s.net_winnings, 0.0) as net_winnings,
      COALESCE(s.total_buyins, 0.0) as total_buyins,
      COALESCE(s.total_game_winnings, 0.0) as total_game_winnings,
      COALESCE(s.total_game_losses, 0.0) as total_game_losses,
      COALESCE(s.biggest_win, 0.0) as biggest_win,
      COALESCE(s.biggest_loss, 0.0) as biggest_loss,
      COALESCE(s.current_streak, 0) as current_streak,
      COALESCE(s.best_winning_streak, 0) as best_winning_streak,
      COALESCE(s.worst_losing_streak, 0) as worst_losing_streak,
      COALESCE(s.teen_patti_games, 0) as teen_patti_games,
      COALESCE(s.teen_patti_net, 0.0) as teen_patti_net,
      COALESCE(s.poker_games, 0) as poker_games,
      COALESCE(s.poker_net, 0.0) as poker_net,
      (SELECT COUNT(*) FROM friendships WHERE (user_id = u.id OR friend_id = u.id) AND status = 'ACCEPTED') as friends_count,
      (SELECT COUNT(*) FROM games WHERE host_user_id = u.id) as games_hosted_count
    FROM users u
    LEFT JOIN player_lifetime_stats s ON u.id = s.user_id
    WHERE u.id NOT LIKE 'guest_%'
    ORDER BY s.net_winnings DESC, u.created_at DESC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    phone_number: r.phone_number,
    email: r.email,
    display_name: r.display_name,
    friend_code: r.friend_code,
    avatar_url: r.avatar_url,
    created_at: r.created_at,
    games_played: Number(r.games_played),
    games_won: Number(r.games_won),
    games_lost: Number(r.games_lost),
    win_rate: Number(r.win_rate),
    net_winnings: Number(r.net_winnings),
    total_buyins: Number(r.total_buyins),
    total_game_winnings: Number(r.total_game_winnings),
    total_game_losses: Number(r.total_game_losses),
    biggest_win: Number(r.biggest_win),
    biggest_loss: Number(r.biggest_loss),
    current_streak: Number(r.current_streak),
    best_winning_streak: Number(r.best_winning_streak),
    worst_losing_streak: Number(r.worst_losing_streak),
    teen_patti_games: Number(r.teen_patti_games),
    teen_patti_net: Number(r.teen_patti_net),
    poker_games: Number(r.poker_games),
    poker_net: Number(r.poker_net),
    friends_count: Number(r.friends_count),
    games_hosted_count: Number(r.games_hosted_count),
  }));
}

export function getAdminPlayerDetails(userId: string) {
  const db = getDb();

  const user = db.prepare(`
    SELECT id, phone_number, email, display_name, friend_code, avatar_url, created_at, updated_at
    FROM users
    WHERE id = ?
  `).get(userId) as any;

  if (!user) {
    throw new Error('User not found');
  }

  // Recalculate lifetime stats for highest accuracy
  let stats: any;
  try {
    stats = recalculateUserLifetimeStats(userId);
  } catch (_) {
    stats = db.prepare('SELECT * FROM player_lifetime_stats WHERE user_id = ?').get(userId);
  }

  // All games participated
  const games = db.prepare(`
    SELECT 
      gp.id as player_id,
      gp.role,
      gp.current_chips,
      gp.total_buyin_amount,
      gp.total_buyin_chips,
      COALESCE(pgr.final_chips, gp.current_chips) as final_chips,
      gp.joined_at,
      g.id as game_id,
      g.join_code as game_code,
      g.name as game_title,
      g.game_type,
      g.chip_value,
      g.status as game_status,
      g.created_at as game_created_at,
      g.finalized_at as game_finalized_at,
      pgr.net_winnings_money as net_profit_loss,
      pgr.net_chips as result_net_chips,
      pgr.is_winner,
      u_host.display_name as host_name,
      u_host.phone_number as host_phone
    FROM game_players gp
    JOIN games g ON gp.game_id = g.id
    LEFT JOIN users u_host ON g.host_user_id = u_host.id
    LEFT JOIN player_game_results pgr ON pgr.game_id = g.id AND pgr.user_id = gp.user_id
    WHERE gp.user_id = ?
    ORDER BY g.created_at DESC
  `).all(userId) as any[];

  // Friends list
  const friends = db.prepare(`
    SELECT 
      f.id as friendship_id,
      f.created_at as became_friends_at,
      u.id as friend_user_id,
      u.display_name,
      u.phone_number,
      u.friend_code
    FROM friendships f
    JOIN users u ON (u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END)
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'ACCEPTED'
  `).all(userId, userId, userId) as any[];

  return {
    user,
    stats,
    games,
    friends,
  };
}

export function getAdminAllGames() {
  const db = getDb();

  const games = db.prepare(`
    SELECT 
      g.id,
      g.join_code as code,
      g.name as title,
      g.game_type,
      g.chip_value,
      g.total_chips as default_starting_chips,
      g.status,
      g.created_at,
      g.finalized_at,
      g.host_user_id,
      u.display_name as host_name,
      u.phone_number as host_phone,
      u.email as host_email,
      (SELECT COUNT(*) FROM game_players WHERE game_id = g.id) as player_count,
      (SELECT COALESCE(SUM(total_buyin_amount), 0) FROM game_players WHERE game_id = g.id) as total_pot_amount,
      (SELECT COALESCE(SUM(total_buyin_chips), 0) FROM game_players WHERE game_id = g.id) as total_pot_chips
    FROM games g
    LEFT JOIN users u ON g.host_user_id = u.id
    ORDER BY g.created_at DESC
  `).all() as any[];

  return games;
}

export function adminDeleteGame(gameId: string): { success: boolean; message: string } {
  const db = getDb();
  const game = db.prepare('SELECT * FROM games WHERE id = ?').get(gameId) as any;
  if (!game) {
    throw new Error('Game table not found');
  }

  // Collect real users who participated in this game to recalculate their lifetime stats
  const participatingUserRows = db.prepare(`
    SELECT DISTINCT user_id 
    FROM game_players 
    WHERE game_id = ? AND is_guest = 0 AND user_id NOT LIKE 'guest_%'
  `).all(gameId) as { user_id: string }[];

  const guestRows = db.prepare(`
    SELECT user_id 
    FROM game_players 
    WHERE game_id = ? AND (is_guest = 1 OR user_id LIKE 'guest_%')
  `).all(gameId) as { user_id: string }[];

  db.transaction(() => {
    // 1. Delete settlement details
    db.prepare('DELETE FROM settlement_items WHERE game_id = ?').run(gameId);
    db.prepare('DELETE FROM settlements WHERE game_id = ?').run(gameId);
    // 2. Delete loans
    db.prepare('DELETE FROM loans WHERE game_id = ?').run(gameId);
    // 3. Delete transactions
    db.prepare('DELETE FROM transactions WHERE game_id = ?').run(gameId);
    // 4. Delete player game results
    db.prepare('DELETE FROM player_game_results WHERE game_id = ?').run(gameId);
    // 5. Delete game players
    db.prepare('DELETE FROM game_players WHERE game_id = ?').run(gameId);
    // 6. Delete synthetic guest users from users table
    for (const g of guestRows) {
      if (g.user_id && g.user_id.startsWith('guest_')) {
        db.prepare("DELETE FROM users WHERE id = ?").run(g.user_id);
      }
    }
    // 7. Delete the game record itself
    db.prepare('DELETE FROM games WHERE id = ?').run(gameId);
  })();

  // Recalculate lifetime stats for all affected players
  for (const row of participatingUserRows) {
    if (row.user_id) {
      try {
        recalculateUserLifetimeStats(row.user_id);
      } catch (err: any) {
        console.warn(`[adminDeleteGame] Error recalculating stats for ${row.user_id}:`, err.message);
      }
    }
  }

  flushReplicationQueue().catch(err => {
    console.warn('[adminDeleteGame] Cloud replication flush error:', err.message);
  });

  return { success: true, message: `Game ${game.join_code || game.id} (${game.name || 'Table'}) deleted successfully` };
}

export function adminResetAllGames(): { success: boolean; message: string; deletedGamesCount: number } {
  const db = getDb();

  const countRow = db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number };
  const deletedGamesCount = countRow?.count || 0;
  const now = new Date().toISOString();

  db.transaction(() => {
    // 1. Delete all game child records
    db.prepare('DELETE FROM settlement_items').run();
    db.prepare('DELETE FROM settlements').run();
    db.prepare('DELETE FROM loans').run();
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM player_game_results').run();
    db.prepare('DELETE FROM game_players').run();
    // 2. Delete synthetic guest users
    db.prepare("DELETE FROM users WHERE id LIKE 'guest_%'").run();
    // 3. Delete all games
    db.prepare('DELETE FROM games').run();

    // 4. Reset all lifetime stats to pure zeros
    db.prepare(`
      UPDATE player_lifetime_stats SET
        games_played = 0,
        games_won = 0,
        games_lost = 0,
        win_rate = 0.0,
        net_winnings = 0.0,
        total_buyins = 0.0,
        total_game_winnings = 0.0,
        total_game_losses = 0.0,
        biggest_win = 0.0,
        biggest_loss = 0.0,
        avg_profit_per_game = 0.0,
        current_streak = 0,
        best_winning_streak = 0,
        worst_losing_streak = 0,
        total_chips_won = 0,
        total_chips_lost = 0,
        net_chips = 0,
        avg_chips_per_game = 0.0,
        teen_patti_games = 0,
        teen_patti_net = 0.0,
        teen_patti_wins = 0,
        poker_games = 0,
        poker_net = 0.0,
        poker_wins = 0,
        updated_at = ?
    `).run(now);
  })();

  flushReplicationQueue().catch(err => {
    console.warn('[adminResetAllGames] Cloud replication flush error:', err.message);
  });

  return {
    success: true,
    deletedGamesCount,
    message: `Master reset complete. ${deletedGamesCount} games purged and lifetime stats cleanly reset.`,
  };
}

export function adminDeletePlayer(userId: string): { success: boolean; message: string } {
  const db = getDb();
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!targetUser) {
    throw new Error('User not found');
  }

  if (isMasterAdmin(targetUser)) {
    throw new Error('Master Admin account (7319123393) cannot be deleted.');
  }

  // 1. Find all games hosted by this user and delete them completely
  const hostedGames = db.prepare('SELECT id FROM games WHERE host_user_id = ?').all(userId) as { id: string }[];
  for (const g of hostedGames) {
    try {
      adminDeleteGame(g.id);
    } catch (_) {}
  }

  db.transaction(() => {
    // 2. Clean up loans involving this user
    db.prepare(`
      DELETE FROM loans 
      WHERE lender_id IN (SELECT id FROM game_players WHERE user_id = ?)
         OR borrower_id IN (SELECT id FROM game_players WHERE user_id = ?)
    `).run(userId, userId);

    // 3. Clean up settlement items involving this user
    db.prepare(`
      DELETE FROM settlement_items 
      WHERE from_player_id IN (SELECT id FROM game_players WHERE user_id = ?)
         OR to_player_id IN (SELECT id FROM game_players WHERE user_id = ?)
    `).run(userId, userId);

    // 4. Clean up transactions where user was actor or from/to player
    db.prepare(`
      DELETE FROM transactions 
      WHERE actor_user_id = ?
         OR from_player_id IN (SELECT id FROM game_players WHERE user_id = ?)
         OR to_player_id IN (SELECT id FROM game_players WHERE user_id = ?)
    `).run(userId, userId, userId);

    // 5. Clean up player game results
    db.prepare('DELETE FROM player_game_results WHERE user_id = ?').run(userId);

    // 6. Clean up game players
    db.prepare('DELETE FROM game_players WHERE user_id = ?').run(userId);

    // 7. Clean up friendships
    db.prepare('DELETE FROM friendships WHERE user_id = ? OR friend_id = ?').run(userId, userId);

    // 8. Clean up lifetime stats
    db.prepare('DELETE FROM player_lifetime_stats WHERE user_id = ?').run(userId);

    // 9. Clean up pending registrations & OTPs
    if (targetUser.phone_number) {
      db.prepare('DELETE FROM pending_registrations WHERE phone_number = ?').run(targetUser.phone_number);
    }
    if (targetUser.email) {
      db.prepare('DELETE FROM pending_registrations WHERE email = ?').run(targetUser.email);
      db.prepare('DELETE FROM otp_codes WHERE email = ?').run(targetUser.email);
    }

    // 10. Finally delete from users table
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  })();

  flushReplicationQueue().catch(err => {
    console.warn('[adminDeletePlayer] Cloud replication flush error:', err.message);
  });

  return {
    success: true,
    message: `Player "${targetUser.display_name}" (${targetUser.phone_number || targetUser.friend_code}) permanently deleted.`,
  };
}

export interface AdminGuestSummary {
  id: string;
  name: string;
  created_by: string | null;
  created_at: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  net_winnings: number;
  win_rate: number;
  total_buyins: number;
  biggest_win: number;
  biggest_loss: number;
}

export function getAdminAllGuests(): AdminGuestSummary[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT g.id, g.name, g.created_by, g.created_at,
      COALESCE(s.games_played, 0) as games_played,
      COALESCE(s.games_won, 0) as games_won,
      COALESCE(s.games_lost, 0) as games_lost,
      COALESCE(s.net_winnings, 0) as net_winnings,
      COALESCE(s.win_rate, 0) as win_rate,
      COALESCE(s.total_buyins, 0) as total_buyins,
      COALESCE(s.biggest_win, 0) as biggest_win,
      COALESCE(s.biggest_loss, 0) as biggest_loss
    FROM saved_guests g
    LEFT JOIN player_lifetime_stats s ON g.id = s.user_id
    ORDER BY games_played DESC, g.name ASC
  `).all() as any[];

  return rows.map(r => ({
    id: r.id,
    name: r.name,
    created_by: r.created_by,
    created_at: r.created_at,
    games_played: Number(r.games_played) || 0,
    games_won: Number(r.games_won) || 0,
    games_lost: Number(r.games_lost) || 0,
    net_winnings: Number(r.net_winnings) || 0,
    win_rate: Number(r.win_rate) || 0,
    total_buyins: Number(r.total_buyins) || 0,
    biggest_win: Number(r.biggest_win) || 0,
    biggest_loss: Number(r.biggest_loss) || 0
  }));
}

export function adminDeleteGuest(guestId: string): { success: boolean; message: string } {
  const db = getDb();
  const guest = db.prepare('SELECT * FROM saved_guests WHERE id = ?').get(guestId) as any;
  if (!guest) {
    throw new Error('Guest not found');
  }

  db.transaction(() => {
    // 1. Clean up loans involving this guest
    db.prepare(`
      DELETE FROM loans 
      WHERE lender_id IN (SELECT id FROM game_players WHERE user_id = ?)
         OR borrower_id IN (SELECT id FROM game_players WHERE user_id = ?)
    `).run(guestId, guestId);

    // 2. Clean up settlement items involving this guest
    db.prepare(`
      DELETE FROM settlement_items 
      WHERE from_player_id IN (SELECT id FROM game_players WHERE user_id = ?)
         OR to_player_id IN (SELECT id FROM game_players WHERE user_id = ?)
    `).run(guestId, guestId);

    // 3. Clean up transactions where guest was from/to player
    db.prepare(`
      DELETE FROM transactions 
      WHERE from_player_id IN (SELECT id FROM game_players WHERE user_id = ?)
         OR to_player_id IN (SELECT id FROM game_players WHERE user_id = ?)
    `).run(guestId, guestId);

    // 4. Clean up player game results
    db.prepare('DELETE FROM player_game_results WHERE user_id = ?').run(guestId);

    // 5. Clean up game players
    db.prepare('DELETE FROM game_players WHERE user_id = ?').run(guestId);

    // 6. Clean up lifetime stats
    db.prepare('DELETE FROM player_lifetime_stats WHERE user_id = ?').run(guestId);

    // 7. Delete from saved_guests table
    db.prepare('DELETE FROM saved_guests WHERE id = ?').run(guestId);

    // 8. Delete from users table
    db.prepare('DELETE FROM users WHERE id = ?').run(guestId);
  })();

  flushReplicationQueue().catch(err => {
    console.warn('[adminDeleteGuest] Cloud replication flush error:', err.message);
  });

  return {
    success: true,
    message: `Guest "${guest.name}" permanently deleted.`
  };
}

