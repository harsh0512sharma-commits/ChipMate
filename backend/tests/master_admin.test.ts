import request from 'supertest';
import { getDb, closeDb } from '../src/db';
import { config } from '../src/config';
import { createApp } from '../src/app';
import * as authService from '../src/services/auth.service';
import * as tableService from '../src/services/table.service';
import * as ledgerService from '../src/services/ledger.service';
import * as settleService from '../src/services/settlement.service';

describe('Master Admin (7319123393) & Single Account Enforcement Suite', () => {
  let app: any;
  let db: any;
  let adminToken: string;
  let adminUser: any;
  let regularToken: string;
  let regularUser: any;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    config.nodeEnv = 'test';
    db = getDb(':memory:');
    app = createApp();

    // 1. Create Regular User
    const regReq = await authService.signupRequestOtp({
      displayName: 'Regular Player',
      phoneNumber: '9876543210',
      email: 'reg@chipmate.test',
      password: 'Password123!',
    });
    const regRes = authService.signupVerifyOtp({
      email: 'reg@chipmate.test',
      code: regReq.devOtp!,
      displayName: 'Regular Player',
    });
    regularToken = regRes.token;
    regularUser = regRes.user;

    // 2. Create Master Admin User (7319123393)
    const adminReq = await authService.signupRequestOtp({
      displayName: 'Master Admin Harsh',
      phoneNumber: '7319123393',
      email: 'admin@chipmate.test',
      password: 'AdminPassword123!',
    });
    const adminRes = authService.signupVerifyOtp({
      email: 'admin@chipmate.test',
      code: adminReq.devOtp!,
      displayName: 'Master Admin Harsh',
    });
    adminToken = adminRes.token;
    adminUser = adminRes.user;
  });

  afterAll(() => {
    closeDb();
  });

  test('getUserById identifies Master Admin for 7319123393 only', () => {
    const adminFetched = authService.getUserById(adminUser.id);
    expect(adminFetched?.isMasterAdmin).toBe(true);

    const regularFetched = authService.getUserById(regularUser.id);
    expect(regularFetched?.isMasterAdmin).toBe(false);
  });

  test('enforces strict single account limit per phone number', async () => {
    // Attempting to register another account with 7319123393 must fail
    await expect(authService.signupRequestOtp({
      displayName: 'Duplicate Admin',
      phoneNumber: '7319123393',
      email: 'other_email@chipmate.test',
      password: 'Password123!',
    })).rejects.toThrow('Only 1 account per mobile number is permitted');

    // Attempting to register another account with 9876543210 must fail
    await expect(authService.signupRequestOtp({
      displayName: 'Duplicate Regular',
      phoneNumber: '9876543210',
      email: 'yet_another@chipmate.test',
      password: 'Password123!',
    })).rejects.toThrow('Only 1 account per mobile number is permitted');
  });

  test('blocks non-admin users with 403 Forbidden on admin endpoints', async () => {
    const endpoints = [
      { method: 'get', url: '/api/admin/overview' },
      { method: 'get', url: '/api/admin/users' },
      { method: 'get', url: `/api/admin/users/${regularUser.id}` },
      { method: 'get', url: '/api/admin/games' },
      { method: 'delete', url: '/api/admin/games/some-game-id' },
      { method: 'post', url: '/api/admin/reset-games' },
    ];

    for (const ep of endpoints) {
      const res = await (request(app) as any)[ep.method](ep.url)
        .set('Authorization', `Bearer ${regularToken}`);
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toMatch(/Master Admin/i);
    }
  });

  test('unauthenticated requests receive 401 Unauthorized', async () => {
    const res = await request(app).get('/api/admin/overview');
    expect(res.status).toBe(401);
  });

  test('master admin can view platform overview, all players, and player details', async () => {
    // Overview
    const overviewRes = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.success).toBe(true);
    expect(overviewRes.body.overview.totalUsers).toBe(2);

    // All Players
    const playersRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(playersRes.status).toBe(200);
    expect(playersRes.body.success).toBe(true);
    expect(playersRes.body.players.length).toBe(2);
    expect(playersRes.body.players.some((p: any) => p.phone_number === '7319123393')).toBe(true);

    // Player Details
    const detailsRes = await request(app)
      .get(`/api/admin/users/${regularUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detailsRes.status).toBe(200);
    expect(detailsRes.body.success).toBe(true);
    expect(detailsRes.body.details.user.id).toBe(regularUser.id);
  });

  test('master admin can view all games and delete any game (even finalized)', async () => {
    // 1. Regular user creates a game
    const created = tableService.createTable({
      hostUserId: regularUser.id,
      name: 'Admin Deletion Test Table',
      gameType: 'TEEN_PATTI',
      chipValue: 10,
      totalChips: 100
    });

    const gameId = created.table.id;
    const hostPlayerId = created.hostPlayerId;

    // 2. Add buyin
    ledgerService.recordBuyIn({
      gameId,
      hostUserId: regularUser.id,
      playerId: hostPlayerId,
      chipAmount: 50
    });

    // 3. Finalize game
    settleService.submitFinalChipCounts(regularUser.id, gameId, [{ playerId: hostPlayerId, finalChips: 50 }]);
    settleService.proceedToSettlement(regularUser.id, gameId);
    settleService.finalizeGame(regularUser.id, gameId);

    // Regular user cannot delete finalized game
    expect(() => {
      tableService.deleteTable(regularUser.id, gameId);
    }).toThrow(/Finalized games cannot be deleted/);

    // Master Admin can see it in all games
    const gamesRes = await request(app)
      .get('/api/admin/games')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(gamesRes.status).toBe(200);
    expect(gamesRes.body.games.some((g: any) => g.id === gameId)).toBe(true);

    // Master Admin CAN delete it!
    const delRes = await request(app)
      .delete(`/api/admin/games/${gameId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Verify game is gone
    const gamesResAfter = await request(app)
      .get('/api/admin/games')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(gamesResAfter.body.games.some((g: any) => g.id === gameId)).toBe(false);

    // Verify stats were cleanly recalculated
    const statsAfter = authService.getUserById(regularUser.id)?.stats;
    expect(statsAfter.games_played).toBe(0);
  });

  test('master admin can reset all games across the platform', async () => {
    // Create a new game
    const created = tableService.createTable({
      hostUserId: regularUser.id,
      name: 'Reset Test Table',
      gameType: 'POKER',
      chipValue: 20,
      totalChips: 100
    });
    expect(tableService.getTableDetails(created.table.id, regularUser.id)).toBeDefined();

    // Call reset
    const resetRes = await request(app)
      .post('/api/admin/reset-games')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);
    expect(resetRes.body.deletedGamesCount).toBeGreaterThanOrEqual(1);

    // Verify 0 games remain
    const gamesRes = await request(app)
      .get('/api/admin/games')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(gamesRes.body.games.length).toBe(0);
  });
});
