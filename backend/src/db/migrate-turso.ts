import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || 'libsql://chipmate-harsh0512sharma-commits.aws-ap-south-1.turso.io';
const authToken = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxMzc2MjYsImlkIjoiMDFhMDkwZTktNTMwMS03NzcwLWFhNzktMjU3ZjM3ODA0ZWIwIiwia2lkIjoiSUtQNWFaODZ0VTd5Mkw0WTVMcW8xWTJ0Zm45NVN1OVVlS2ZZS0NWN21qOCIsInJpZCI6IjZkOTk3MDAxLTFkZGEtNDAzZi04ZTUwLTVkZTY4NjE1N2FjZiJ9.coN1bepjNJCGJRwUI1NAJy7ZDNkv_ffFbEIkAUwKb8CNhk_7cuwKllj4UczNSMIoVbVfuNf_XPKy-vO2CYZ_Cg';

const client = createClient({ url, authToken });

const statements = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone_number TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    friend_code TEXT UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pending_registrations (
    id TEXT PRIMARY KEY,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS otp_codes (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    consumed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    status TEXT NOT NULL,
    requester_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, friend_id)
  )`,
  `CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    game_type TEXT NOT NULL,
    host_user_id TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL,
    total_chips INTEGER NOT NULL DEFAULT 100,
    chip_value REAL NOT NULL DEFAULT 10,
    bank_chips INTEGER NOT NULL DEFAULT 100,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    started_at TEXT,
    ended_at TEXT,
    finalized_at TEXT,
    FOREIGN KEY (host_user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS game_players (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'PLAYER',
    current_chips INTEGER NOT NULL DEFAULT 0,
    total_buyin_amount REAL NOT NULL DEFAULT 0,
    total_buyin_chips INTEGER NOT NULL DEFAULT 0,
    joined_at TEXT NOT NULL,
    left_at TEXT,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(game_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    type TEXT NOT NULL,
    actor_user_id TEXT NOT NULL,
    from_player_id TEXT,
    to_player_id TEXT,
    chip_amount INTEGER NOT NULL,
    chip_value REAL NOT NULL,
    money_value REAL NOT NULL,
    idempotency_key TEXT,
    reversal_of TEXT,
    metadata TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS loans (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    lender_id TEXT NOT NULL,
    borrower_id TEXT NOT NULL,
    original_chip_amount INTEGER NOT NULL,
    remaining_chip_amount INTEGER NOT NULL,
    chip_value REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (lender_id) REFERENCES game_players(id),
    FOREIGN KEY (borrower_id) REFERENCES game_players(id)
  )`,
  `CREATE TABLE IF NOT EXISTS settlements (
    id TEXT PRIMARY KEY,
    game_id TEXT UNIQUE NOT NULL,
    total_pot_money REAL NOT NULL,
    total_pot_chips INTEGER NOT NULL,
    reconciled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS settlement_items (
    id TEXT PRIMARY KEY,
    settlement_id TEXT NOT NULL,
    game_id TEXT NOT NULL,
    from_player_id TEXT NOT NULL,
    to_player_id TEXT NOT NULL,
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNPAID',
    paid_amount REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (from_player_id) REFERENCES game_players(id),
    FOREIGN KEY (to_player_id) REFERENCES game_players(id)
  )`,
  `CREATE TABLE IF NOT EXISTS player_game_results (
    id TEXT PRIMARY KEY,
    game_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    final_chips INTEGER NOT NULL,
    buyin_money REAL NOT NULL,
    final_chip_money REAL NOT NULL,
    net_loans_money REAL NOT NULL,
    net_winnings_money REAL NOT NULL,
    net_chips INTEGER NOT NULL,
    is_winner INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS player_lifetime_stats (
    user_id TEXT PRIMARY KEY,
    games_played INTEGER NOT NULL DEFAULT 0,
    games_won INTEGER NOT NULL DEFAULT 0,
    games_lost INTEGER NOT NULL DEFAULT 0,
    win_rate REAL NOT NULL DEFAULT 0,
    net_winnings REAL NOT NULL DEFAULT 0,
    total_buyins REAL NOT NULL DEFAULT 0,
    total_game_winnings REAL NOT NULL DEFAULT 0,
    total_game_losses REAL NOT NULL DEFAULT 0,
    biggest_win REAL NOT NULL DEFAULT 0,
    biggest_loss REAL NOT NULL DEFAULT 0,
    avg_profit_per_game REAL NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_winning_streak INTEGER NOT NULL DEFAULT 0,
    worst_losing_streak INTEGER NOT NULL DEFAULT 0,
    total_chips_won INTEGER NOT NULL DEFAULT 0,
    total_chips_lost INTEGER NOT NULL DEFAULT 0,
    net_chips INTEGER NOT NULL DEFAULT 0,
    avg_chips_per_game REAL NOT NULL DEFAULT 0,
    teen_patti_games INTEGER NOT NULL DEFAULT 0,
    teen_patti_net REAL NOT NULL DEFAULT 0,
    teen_patti_wins INTEGER NOT NULL DEFAULT 0,
    poker_games INTEGER NOT NULL DEFAULT 0,
    poker_net REAL NOT NULL DEFAULT 0,
    poker_wins INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)`,
  `CREATE INDEX IF NOT EXISTS idx_users_friend_code ON users(friend_code)`,
  `CREATE INDEX IF NOT EXISTS idx_games_join_code ON games(join_code)`,
  `CREATE INDEX IF NOT EXISTS idx_transactions_game_id ON transactions(game_id)`,
  `CREATE INDEX IF NOT EXISTS idx_loans_game_id ON loans(game_id)`,
  `CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id, status)`
];

async function main() {
  console.log('Connecting to Turso Cloud:', url);
  for (const sql of statements) {
    await client.execute(sql);
  }
  // Safe column additions
  try { await client.execute("ALTER TABLE pending_registrations ADD COLUMN display_name TEXT"); } catch (_) {}
  try { await client.execute("ALTER TABLE game_players ADD COLUMN is_guest INTEGER DEFAULT 0"); } catch (_) {}
  try { await client.execute("ALTER TABLE game_players ADD COLUMN guest_name TEXT"); } catch (_) {}
  console.log('✅ ALL CHIPMATE TABLES CREATED IN TURSO CLOUD!');
  const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables in Turso:', res.rows.map(r => r.name));
}

main().catch(console.error);
