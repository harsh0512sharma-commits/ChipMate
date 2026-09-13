const Database = require('better-sqlite3');
const { createClient } = require('@libsql/client');
require('dotenv').config({ path: 'e:/ALL PROJECTS/CHIPMATE/backend/.env' });

async function purgeAllTestGames() {
  console.log('--- PURGING TEST GAMES FROM LOCAL SQLITE ---');
  const db = new Database('e:/ALL PROJECTS/CHIPMATE/backend/data/chipmate.db');
  db.pragma('foreign_keys = OFF');

  db.transaction(() => {
    // 1. Delete all game related records
    const si = db.prepare('DELETE FROM settlement_items').run();
    console.log(`Deleted ${si.changes} settlement_items`);

    const s = db.prepare('DELETE FROM settlements').run();
    console.log(`Deleted ${s.changes} settlements`);

    const l = db.prepare('DELETE FROM loans').run();
    console.log(`Deleted ${l.changes} loans`);

    const t = db.prepare('DELETE FROM transactions').run();
    console.log(`Deleted ${t.changes} transactions`);

    const pgr = db.prepare('DELETE FROM player_game_results').run();
    console.log(`Deleted ${pgr.changes} player_game_results`);

    const gp = db.prepare('DELETE FROM game_players').run();
    console.log(`Deleted ${gp.changes} game_players`);

    const g = db.prepare('DELETE FROM games').run();
    console.log(`Deleted ${g.changes} games`);

    // 2. Delete test guest users
    const gu = db.prepare("DELETE FROM users WHERE id LIKE 'guest_%' OR email LIKE '%@chipmate.guest'").run();
    console.log(`Deleted ${gu.changes} guest users`);

    // 3. Reset all registered players' lifetime stats to 0
    const now = new Date().toISOString();
    const statsReset = db.prepare(`
      UPDATE player_lifetime_stats SET
        games_played = 0,
        games_won = 0,
        games_lost = 0,
        win_rate = 0,
        net_winnings = 0,
        total_buyins = 0,
        total_game_winnings = 0,
        total_game_losses = 0,
        biggest_win = 0,
        biggest_loss = 0,
        avg_profit_per_game = 0,
        current_streak = 0,
        best_winning_streak = 0,
        worst_losing_streak = 0,
        total_chips_won = 0,
        total_chips_lost = 0,
        net_chips = 0,
        avg_chips_per_game = 0,
        teen_patti_games = 0,
        teen_patti_net = 0,
        teen_patti_wins = 0,
        poker_games = 0,
        poker_net = 0,
        poker_wins = 0,
        updated_at = ?
    `).run(now);
    console.log(`Reset lifetime stats for ${statsReset.changes} users`);
  })();
  db.pragma('foreign_keys = ON');

  console.log('\n--- PURGING TEST GAMES FROM TURSO CLOUD ---');
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  await client.execute('PRAGMA foreign_keys = OFF');
  await client.execute('DELETE FROM settlement_items');
  await client.execute('DELETE FROM settlements');
  await client.execute('DELETE FROM loans');
  await client.execute('DELETE FROM transactions');
  await client.execute('DELETE FROM player_game_results');
  await client.execute('DELETE FROM game_players');
  await client.execute('DELETE FROM games');
  await client.execute("DELETE FROM users WHERE id LIKE 'guest_%' OR email LIKE '%@chipmate.guest'");
  
  const now = new Date().toISOString();
  await client.execute({
    sql: `UPDATE player_lifetime_stats SET
      games_played = 0, games_won = 0, games_lost = 0, win_rate = 0, net_winnings = 0,
      total_buyins = 0, total_game_winnings = 0, total_game_losses = 0, biggest_win = 0,
      biggest_loss = 0, avg_profit_per_game = 0, current_streak = 0, best_winning_streak = 0,
      worst_losing_streak = 0, total_chips_won = 0, total_chips_lost = 0, net_chips = 0,
      avg_chips_per_game = 0, teen_patti_games = 0, teen_patti_net = 0, teen_patti_wins = 0,
      poker_games = 0, poker_net = 0, poker_wins = 0, updated_at = ?`,
    args: [now]
  });
  await client.execute('PRAGMA foreign_keys = ON');

  console.log('✅ Turso Cloud successfully purged and reset!');

  console.log('\n--- VERIFICATION ---');
  const remainingGamesLocal = db.prepare('SELECT count(*) as cnt FROM games').get();
  console.log('Local remaining games:', remainingGamesLocal.cnt);

  const cloudGamesRes = await client.execute('SELECT count(*) as cnt FROM games');
  console.log('Cloud remaining games:', cloudGamesRes.rows[0].cnt);

  const localUsers = db.prepare('SELECT count(*) as cnt FROM users').get();
  console.log('Local registered users remaining:', localUsers.cnt);
}

purgeAllTestGames().catch(console.error);
