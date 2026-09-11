import { getDb } from '../db';
import { SettlementPlayerBalance } from './settlement.service';

export interface PlayerLifetimeStatsRecord {
  user_id: string;
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
  avg_profit_per_game: number;
  current_streak: number;
  best_winning_streak: number;
  worst_losing_streak: number;
  total_chips_won: number;
  total_chips_lost: number;
  net_chips: number;
  avg_chips_per_game: number;
  teen_patti_games: number;
  teen_patti_net: number;
  teen_patti_wins: number;
  poker_games: number;
  poker_net: number;
  poker_wins: number;
  updated_at: string;
}

export function updateLifetimeStatsForFinalizedGame(
  gameId: string,
  players: SettlementPlayerBalance[],
  gameType: 'TEEN_PATTI' | 'POKER'
) {
  const db = getDb();

  for (const p of players) {
    if (!p.userId || p.userId.startsWith('guest_')) {
      continue;
    }
    // Recompute complete lifetime stats from all finalized games for this user to guarantee mathematical purity
    recalculateUserLifetimeStats(p.userId);
  }
}

export function recalculateUserLifetimeStats(userId: string): PlayerLifetimeStatsRecord {
  const db = getDb();

  // Fetch all finalized results for this user ordered chronologically
  const results = db.prepare(`
    SELECT r.*, g.game_type, g.finalized_at
    FROM player_game_results r
    JOIN games g ON r.game_id = g.id
    WHERE r.user_id = ? AND g.status = 'FINALIZED'
    ORDER BY g.finalized_at ASC, g.created_at ASC
  `).all(userId) as any[];

  let gamesPlayed = results.length;
  let gamesWon = 0;
  let gamesLost = 0;
  let netWinnings = 0;
  let totalBuyins = 0;
  let totalGameWinnings = 0;
  let totalGameLosses = 0;
  let biggestWin = 0;
  let biggestLoss = 0;
  let currentStreak = 0;
  let bestWinningStreak = 0;
  let worstLosingStreak = 0;

  let totalChipsWon = 0;
  let totalChipsLost = 0;
  let netChips = 0;

  let teenPattiGames = 0;
  let teenPattiNet = 0;
  let teenPattiWins = 0;

  let pokerGames = 0;
  let pokerNet = 0;
  let pokerWins = 0;

  let tempWinStreak = 0;
  let tempLossStreak = 0;

  for (const r of results) {
    const net = r.net_winnings_money;
    const chips = r.net_chips;
    const isTeenPatti = r.game_type === 'TEEN_PATTI';

    netWinnings += net;
    totalBuyins += r.buyin_money;
    netChips += chips;

    if (chips > 0) totalChipsWon += chips;
    if (chips < 0) totalChipsLost += Math.abs(chips);

    if (isTeenPatti) {
      teenPattiGames++;
      teenPattiNet += net;
    } else {
      pokerGames++;
      pokerNet += net;
    }

    if (net > 0) {
      gamesWon++;
      totalGameWinnings += net;
      if (net > biggestWin) biggestWin = net;
      if (isTeenPatti) teenPattiWins++; else pokerWins++;

      tempWinStreak++;
      tempLossStreak = 0;
      if (tempWinStreak > bestWinningStreak) bestWinningStreak = tempWinStreak;
      currentStreak = tempWinStreak;
    } else if (net < 0) {
      gamesLost++;
      const absLoss = Math.abs(net);
      totalGameLosses += absLoss;
      if (absLoss > biggestLoss) biggestLoss = absLoss;

      tempLossStreak++;
      tempWinStreak = 0;
      if (tempLossStreak > worstLosingStreak) worstLosingStreak = tempLossStreak;
      currentStreak = -tempLossStreak;
    } else {
      // Draw (net 0)
      tempWinStreak = 0;
      tempLossStreak = 0;
      currentStreak = 0;
    }
  }

  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 1000) / 10 : 0;
  const avgProfitPerGame = gamesPlayed > 0 ? Math.round((netWinnings / gamesPlayed) * 100) / 100 : 0;
  const avgChipsPerGame = gamesPlayed > 0 ? Math.round((netChips / gamesPlayed) * 10) / 10 : 0;
  const now = new Date().toISOString();

  // Upsert into player_lifetime_stats
  db.prepare(`
    INSERT INTO player_lifetime_stats (
      user_id, games_played, games_won, games_lost, win_rate, net_winnings, total_buyins,
      total_game_winnings, total_game_losses, biggest_win, biggest_loss, avg_profit_per_game,
      current_streak, best_winning_streak, worst_losing_streak, total_chips_won, total_chips_lost,
      net_chips, avg_chips_per_game, teen_patti_games, teen_patti_net, teen_patti_wins,
      poker_games, poker_net, poker_wins, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      games_played = excluded.games_played,
      games_won = excluded.games_won,
      games_lost = excluded.games_lost,
      win_rate = excluded.win_rate,
      net_winnings = excluded.net_winnings,
      total_buyins = excluded.total_buyins,
      total_game_winnings = excluded.total_game_winnings,
      total_game_losses = excluded.total_game_losses,
      biggest_win = excluded.biggest_win,
      biggest_loss = excluded.biggest_loss,
      avg_profit_per_game = excluded.avg_profit_per_game,
      current_streak = excluded.current_streak,
      best_winning_streak = excluded.best_winning_streak,
      worst_losing_streak = excluded.worst_losing_streak,
      total_chips_won = excluded.total_chips_won,
      total_chips_lost = excluded.total_chips_lost,
      net_chips = excluded.net_chips,
      avg_chips_per_game = excluded.avg_chips_per_game,
      teen_patti_games = excluded.teen_patti_games,
      teen_patti_net = excluded.teen_patti_net,
      teen_patti_wins = excluded.teen_patti_wins,
      poker_games = excluded.poker_games,
      poker_net = excluded.poker_net,
      poker_wins = excluded.poker_wins,
      updated_at = excluded.updated_at
  `).run(
    userId, gamesPlayed, gamesWon, gamesLost, winRate, netWinnings, totalBuyins,
    totalGameWinnings, totalGameLosses, biggestWin, biggestLoss, avgProfitPerGame,
    currentStreak, bestWinningStreak, worstLosingStreak, totalChipsWon, totalChipsLost,
    netChips, avgChipsPerGame, teenPattiGames, teenPattiNet, teenPattiWins,
    pokerGames, pokerNet, pokerWins, now
  );

  return db.prepare('SELECT * FROM player_lifetime_stats WHERE user_id = ?').get(userId) as PlayerLifetimeStatsRecord;
}

export function getFriendLeaderboard(userId: string, sortBy: 'NET_WINNINGS' | 'WIN_RATE' | 'GAMES_PLAYED' | 'BIGGEST_WIN' = 'NET_WINNINGS') {
  const db = getDb();

  // Get user and all accepted friends
  const friendRows = db.prepare(`
    SELECT DISTINCT CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END as friend_user_id
    FROM friendships f
    WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'ACCEPTED'
  `).all(userId, userId, userId) as { friend_user_id: string }[];

  const userIds = [userId, ...friendRows.map(r => r.friend_user_id)];
  const placeholders = userIds.map(() => '?').join(',');

  let orderClause = 's.net_winnings DESC';
  if (sortBy === 'WIN_RATE') orderClause = 's.win_rate DESC, s.games_played DESC';
  if (sortBy === 'GAMES_PLAYED') orderClause = 's.games_played DESC, s.net_winnings DESC';
  if (sortBy === 'BIGGEST_WIN') orderClause = 's.biggest_win DESC';

  const rows = db.prepare(`
    SELECT u.id, u.display_name, u.friend_code, u.phone_number, u.avatar_url,
      COALESCE(s.games_played, 0) as games_played,
      COALESCE(s.games_won, 0) as games_won,
      COALESCE(s.win_rate, 0) as win_rate,
      COALESCE(s.net_winnings, 0) as net_winnings,
      COALESCE(s.net_chips, 0) as net_chips,
      COALESCE(s.biggest_win, 0) as biggest_win,
      COALESCE(s.current_streak, 0) as current_streak
    FROM users u
    LEFT JOIN player_lifetime_stats s ON u.id = s.user_id
    WHERE u.id IN (${placeholders})
    ORDER BY ${orderClause}
  `).all(...userIds) as any[];

  return rows.map((r, idx) => ({
    rank: idx + 1,
    id: r.id,
    isSelf: r.id === userId,
    displayName: r.display_name,
    friendCode: r.phone_number || r.friend_code,
    phoneNumber: r.phone_number,
    avatarUrl: r.avatar_url,
    gamesPlayed: r.games_played,
    gamesWon: r.games_won,
    winRate: r.win_rate,
    netWinnings: r.net_winnings,
    netChips: r.net_chips,
    biggestWin: r.biggest_win,
    currentStreak: r.current_streak
  }));
}

export function getHeadToHeadStats(userIdA: string, userIdB: string) {
  const db = getDb();

  const userA = db.prepare('SELECT id, display_name, friend_code FROM users WHERE id = ?').get(userIdA) as any;
  const userB = db.prepare('SELECT id, display_name, friend_code FROM users WHERE id = ?').get(userIdB) as any;

  if (!userA || !userB) throw new Error('User not found');

  // Find all finalized games where BOTH played
  const commonGames = db.prepare(`
    SELECT g.id, g.name, g.game_type, g.chip_value, g.finalized_at,
      ra.net_winnings_money as net_a, ra.is_winner as is_winner_a,
      rb.net_winnings_money as net_b, rb.is_winner as is_winner_b
    FROM games g
    JOIN player_game_results ra ON (g.id = ra.game_id AND ra.user_id = ?)
    JOIN player_game_results rb ON (g.id = rb.game_id AND rb.user_id = ?)
    WHERE g.status = 'FINALIZED'
    ORDER BY g.finalized_at DESC
  `).all(userIdA, userIdB) as any[];

  let gamesCount = commonGames.length;
  let winsA = 0;
  let winsB = 0;
  let totalNetA = 0;
  let totalNetB = 0;
  let biggestWinA = 0;
  let biggestWinB = 0;

  for (const cg of commonGames) {
    totalNetA += cg.net_a;
    totalNetB += cg.net_b;

    if (cg.net_a > cg.net_b) {
      winsA++;
      const margin = cg.net_a - cg.net_b;
      if (margin > biggestWinA) biggestWinA = margin;
    } else if (cg.net_b > cg.net_a) {
      winsB++;
      const margin = cg.net_b - cg.net_a;
      if (margin > biggestWinB) biggestWinB = margin;
    }
  }

  return {
    userA: { id: userA.id, displayName: userA.display_name, friendCode: userA.friend_code },
    userB: { id: userB.id, displayName: userB.display_name, friendCode: userB.friend_code },
    gamesPlayedTogether: gamesCount,
    winsA,
    winsB,
    netA: totalNetA,
    netB: totalNetB,
    biggestWinA,
    biggestWinB,
    recentGames: commonGames.slice(0, 5).map(g => ({
      gameId: g.id,
      name: g.name,
      gameType: g.game_type,
      date: g.finalized_at,
      netA: g.net_a,
      netB: g.net_b,
      winner: g.net_a > g.net_b ? 'A' : (g.net_b > g.net_a ? 'B' : 'TIE')
    }))
  };
}

export function getGameInsights(gameId: string) {
  const db = getDb();
  const results = db.prepare(`
    SELECT r.*, u.display_name, u.friend_code
    FROM player_game_results r
    JOIN users u ON r.user_id = u.id
    WHERE r.game_id = ?
    ORDER BY r.net_winnings_money DESC
  `).all(gameId) as any[];

  if (results.length === 0) return null;

  const winner = results[0];
  const loser = results[results.length - 1];

  // Find player who borrowed most chips
  const maxBorrower = db.prepare(`
    SELECT borrower_id, SUM(original_chip_amount) as total_borrowed, u.display_name
    FROM loans l
    JOIN game_players gp ON l.borrower_id = gp.id
    JOIN users u ON gp.user_id = u.id
    WHERE l.game_id = ?
    GROUP BY borrower_id
    ORDER BY total_borrowed DESC
    LIMIT 1
  `).get(gameId) as any;

  return {
    gameId,
    winner: {
      displayName: winner.display_name,
      netWinnings: winner.net_winnings_money,
      finalChips: winner.final_chips
    },
    loser: {
      displayName: loser.display_name,
      netLoss: Math.abs(loser.net_winnings_money),
      finalChips: loser.final_chips
    },
    mostBorrowed: maxBorrower ? {
      displayName: maxBorrower.display_name,
      chipsBorrowed: maxBorrower.total_borrowed
    } : null
  };
}
