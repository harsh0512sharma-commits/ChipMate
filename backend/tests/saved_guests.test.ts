import { getDb, closeDb } from '../src/db';
import * as authService from '../src/services/auth.service';
import * as tableService from '../src/services/table.service';
import * as ledgerService from '../src/services/ledger.service';
import * as settlementService from '../src/services/settlement.service';
import * as statsService from '../src/services/stats.service';
import * as adminService from '../src/services/admin.service';

describe('Persistent Saved Guests & Guest Leaderboard Test Suite', () => {
  let db: any;
  let hostUser: any;
  let adminUser: any;

  beforeAll(() => {
    closeDb();
    db = getDb(':memory:');

    const now = new Date().toISOString();
    const future = new Date(Date.now() + 1000000).toISOString();

    // Create host user
    db.prepare("INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at) VALUES (?, ?, '123456', ?, 0, ?)")
      .run('otp_host', 'host@chipmate.test', future, now);
    const verifiedHost = authService.verifyOtp('host@chipmate.test', '123456').user;
    authService.updateUserProfile(verifiedHost.id, 'Host User');
    hostUser = authService.getUserById(verifiedHost.id)!;

    // Create Master Admin user (phone 7319123393)
    db.prepare("INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at) VALUES (?, ?, '123456', ?, 0, ?)")
      .run('otp_admin', 'admin@chipmate.test', future, now);
    const verifiedAdmin = authService.verifyOtp('admin@chipmate.test', '123456').user;
    db.prepare("UPDATE users SET phone_number = '7319123393' WHERE id = ?").run(verifiedAdmin.id);
    adminUser = authService.getUserById(verifiedAdmin.id)!;
  });

  afterAll(() => {
    closeDb();
  });

  test('1. Seating a new guest by name creates persistent saved_guests record', () => {
    const { table } = tableService.createTable({
      hostUserId: hostUser.id,
      name: 'Game 1',
      gameType: 'POKER',
      totalChips: 100,
      chipValue: 10
    });

    const result = tableService.seatGuestPlayer(hostUser.id, table.id, { guestName: 'Rohan' });
    expect(result.success).toBe(true);
    expect(result.displayName).toBe('Rohan');
    expect(result.guestId).toBeDefined();

    const guests = tableService.getSavedGuests();
    const rohan = guests.find(g => g.name === 'Rohan');
    expect(rohan).toBeDefined();
    expect(rohan?.id).toBe(result.guestId);
  });

  test('2. Seating the same guest name in next game reuses the existing persistent ID', () => {
    const activeGame = tableService.getUserActiveGame(hostUser.id) as any;
    tableService.deleteTable(hostUser.id, activeGame.id);

    const { table: table2 } = tableService.createTable({
      hostUserId: hostUser.id,
      name: 'Game 2',
      gameType: 'POKER',
      totalChips: 100,
      chipValue: 10
    });

    const result2 = tableService.seatGuestPlayer(hostUser.id, table2.id, { guestName: 'Rohan' });
    const guests = tableService.getSavedGuests();
    const rohanList = guests.filter(g => g.name === 'Rohan');

    // Should only have 1 persistent Rohan in saved_guests
    expect(rohanList.length).toBe(1);
    expect(result2.guestId).toBe(rohanList[0].id);
  });

  test('3. Seating guest by guestId directly seats them with 1 click', () => {
    const activeGame = tableService.getUserActiveGame(hostUser.id) as any;
    const guests = tableService.getSavedGuests();
    const rohan = guests.find(g => g.name === 'Rohan');

    // Create a second guest "Amit"
    const amitResult = tableService.seatGuestPlayer(hostUser.id, activeGame.id, { guestName: 'Amit' });
    expect(amitResult.success).toBe(true);

    tableService.deleteTable(hostUser.id, activeGame.id);

    const { table: table3 } = tableService.createTable({
      hostUserId: hostUser.id,
      name: 'Game 3',
      gameType: 'TEEN_PATTI',
      totalChips: 100,
      chipValue: 10
    });

    // Seat Rohan by guestId directly
    const directResult = tableService.seatGuestPlayer(hostUser.id, table3.id, { guestId: rohan!.id });
    expect(directResult.success).toBe(true);
    expect(directResult.displayName).toBe('Rohan');
    expect(directResult.guestId).toBe(rohan!.id);
  });

  test('4. Finalizing game calculates guest lifetime stats and ranks in guest leaderboard', () => {
    const activeGame = tableService.getUserActiveGame(hostUser.id) as any;
    const details = tableService.getTableDetails(activeGame.id, hostUser.id);

    const hostP = details!.players.find(p => p.role === 'HOST')!;
    const rohanP = details!.players.find(p => p.display_name === 'Rohan' || p.guest_name === 'Rohan')!;

    // Initial buyin: 50 chips each
    ledgerService.recordBuyIn({
      gameId: activeGame.id,
      hostUserId: hostUser.id,
      playerId: hostP.id,
      chipAmount: 50
    });

    ledgerService.recordBuyIn({
      gameId: activeGame.id,
      hostUserId: hostUser.id,
      playerId: rohanP.id,
      chipAmount: 50
    });

    // Rohan wins 80 chips (final: Rohan 80 chips = +30 chips / +₹300; Host 20 chips = -30 chips / -₹300)
    settlementService.submitFinalChipCounts(hostUser.id, activeGame.id, [
      { playerId: rohanP.id, finalChips: 80 },
      { playerId: hostP.id, finalChips: 20 }
    ]);

    settlementService.finalizeGame(hostUser.id, activeGame.id);

    // Verify Guest Leaderboard
    const guestLeaderboard = statsService.getGuestLeaderboard('NET_WINNINGS');
    expect(guestLeaderboard.length).toBeGreaterThanOrEqual(1);

    const rohanRank = guestLeaderboard.find(g => g.name === 'Rohan');
    expect(rohanRank).toBeDefined();
    expect(rohanRank?.gamesPlayed).toBe(1);
    expect(rohanRank?.netWinnings).toBe(300);
    expect(rohanRank?.winRate).toBe(100);
  });

  test('5. Master Admin can view all saved guests and delete a guest', () => {
    const adminGuests = adminService.getAdminAllGuests();
    expect(adminGuests.length).toBeGreaterThanOrEqual(2); // Rohan and Amit

    const rohan = adminGuests.find(g => g.name === 'Rohan')!;
    expect(rohan.net_winnings).toBe(300);

    const amit = adminGuests.find(g => g.name === 'Amit')!;
    const deleteRes = adminService.adminDeleteGuest(amit.id);
    expect(deleteRes.success).toBe(true);

    const afterGuests = adminService.getAdminAllGuests();
    expect(afterGuests.some(g => g.name === 'Amit')).toBe(false);
  });
});
