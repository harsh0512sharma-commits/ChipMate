import { getDb, closeDb } from '../src/db';
import { config } from '../src/config';
import * as authService from '../src/services/auth.service';
import * as friendService from '../src/services/friend.service';
import * as tableService from '../src/services/table.service';

describe('Auth & Frictionless Seating Test Suite', () => {
  let db: any;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    config.nodeEnv = 'test';
    db = getDb(':memory:');
  });

  afterAll(() => {
    closeDb();
  });

  describe('Sign-Up & Mobile Login Engine', () => {
    const testPhone = '9876543210';
    const testEmail = 'player.one@chipmate.test';
    const testPassword = 'SecretPassword123!';
    let devOtp: string;

    test('validates 10-digit mobile number, email, and password length', async () => {
      // Invalid phone length
      await expect(authService.signupRequestOtp({
        displayName: 'Test Player',
        phoneNumber: '123',
        email: testEmail,
        password: testPassword
      })).rejects.toThrow('10-digit mobile number');

      // Invalid email
      await expect(authService.signupRequestOtp({
        displayName: 'Test Player',
        phoneNumber: testPhone,
        email: 'invalid-email',
        password: testPassword
      })).rejects.toThrow('Invalid email address');

      // Short password
      await expect(authService.signupRequestOtp({
        displayName: 'Test Player',
        phoneNumber: testPhone,
        email: testEmail,
        password: '123'
      })).rejects.toThrow('at least 6 characters');
    });

    test('generates OTP for valid sign-up details', async () => {
      const res = await authService.signupRequestOtp({
        displayName: 'Player One',
        phoneNumber: testPhone,
        email: testEmail,
        password: testPassword
      });

      expect(res.success).toBe(true);
      expect(res.devOtp).toBeDefined();
      expect(res.devOtp?.length).toBe(6);
      devOtp = res.devOtp!;
    });

    test('verifies OTP and creates user with phone as username', () => {
      // Invalid OTP fails
      expect(() => {
        authService.signupVerifyOtp({
          email: testEmail,
          code: '000000'
        });
      }).toThrow('Invalid or expired verification code');

      // Valid OTP succeeds
      const result = authService.signupVerifyOtp({
        email: testEmail,
        code: devOtp,
        displayName: 'Player One'
      });

      expect(result.token).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.phone_number).toBe(testPhone);
      expect(result.user.email).toBe(testEmail);
      expect(result.user.display_name).toBe('Player One');
    });

    test('prevents duplicate phone or email registration', async () => {
      await expect(authService.signupRequestOtp({
        displayName: 'Duplicate Tester',
        phoneNumber: testPhone,
        email: 'another@email.com',
        password: 'anotherPassword'
      })).rejects.toThrow('already registered');

      await expect(authService.signupRequestOtp({
        displayName: 'Duplicate Tester',
        phoneNumber: '9123456780',
        email: testEmail,
        password: 'anotherPassword'
      })).rejects.toThrow('already registered');
    });

    test('logs in with 10-digit mobile number and password', () => {
      // Wrong password
      expect(() => {
        authService.loginWithPassword(testPhone, 'WrongPassword!');
      }).toThrow('Invalid mobile number or password');

      // Wrong phone
      expect(() => {
        authService.loginWithPassword('9999999999', testPassword);
      }).toThrow('Invalid mobile number or password');

      // Correct phone + password
      const loginRes = authService.loginWithPassword(testPhone, testPassword);
      expect(loginRes.token).toBeDefined();
      expect(loginRes.user.phone_number).toBe(testPhone);
    });

    describe('Password Reset Engine', () => {
      let resetDevOtp: string;
      const newPassword = 'NewSuperSecret2026!';

      test('rejects reset password request for non-existent mobile or email', async () => {
        await expect(authService.resetPasswordRequestOtp('9000000000')).rejects.toThrow('No account found');
        await expect(authService.resetPasswordRequestOtp('nonexistent@email.com')).rejects.toThrow('No account found');
      });

      test('generates reset OTP for registered mobile number and masks email', async () => {
        const res = await authService.resetPasswordRequestOtp(testPhone);
        expect(res.success).toBe(true);
        expect(res.maskedEmail).toBeDefined();
        expect(res.maskedEmail).toContain('@chipmate.test');
        expect(res.devOtp).toBeDefined();
        resetDevOtp = res.devOtp!;
      });

      test('rejects reset confirm with invalid OTP code or short password', () => {
        expect(() => {
          authService.resetPasswordConfirm({
            identifier: testPhone,
            code: '000000',
            newPassword: 'short'
          });
        }).toThrow('New password must be at least 6 characters long');

        expect(() => {
          authService.resetPasswordConfirm({
            identifier: testPhone,
            code: '000000',
            newPassword
          });
        }).toThrow('Invalid or expired verification code');
      });

      test('confirms password reset with valid OTP and authenticates user', () => {
        const res = authService.resetPasswordConfirm({
          identifier: testPhone,
          code: resetDevOtp,
          newPassword
        });

        expect(res.success).toBe(true);
        expect(res.token).toBeDefined();
        expect(res.user.phone_number).toBe(testPhone);

        // Verify old password no longer works
        expect(() => {
          authService.loginWithPassword(testPhone, testPassword);
        }).toThrow('Invalid mobile number or password');

        // Verify new password works
        const loginRes = authService.loginWithPassword(testPhone, newPassword);
        expect(loginRes.token).toBeDefined();
        expect(loginRes.user.phone_number).toBe(testPhone);
      });
    });
  });

  describe('Frictionless Friend Seating Engine', () => {
    let hostUser: authService.UserRecord;
    let friendUser: authService.UserRecord;
    let tableId: string;

    beforeAll(async () => {
      // Register Host
      const hostReq = await authService.signupRequestOtp({
        displayName: 'Host User',
        phoneNumber: '9811111111',
        email: 'host@chipmate.test',
        password: 'password123'
      });
      hostUser = authService.signupVerifyOtp({
        email: 'host@chipmate.test',
        code: hostReq.devOtp!,
        displayName: 'Host User'
      }).user;

      // Register Friend
      const friendReq = await authService.signupRequestOtp({
        displayName: 'Friend User',
        phoneNumber: '9822222222',
        email: 'friend@chipmate.test',
        password: 'password123'
      });
      friendUser = authService.signupVerifyOtp({
        email: 'friend@chipmate.test',
        code: friendReq.devOtp!,
        displayName: 'Friend User'
      }).user;

      // Establish friendship
      const reqRes = friendService.sendFriendRequest(hostUser.id, friendUser.friend_code);
      friendService.respondToFriendRequest(friendUser.id, reqRes.friendshipId, 'ACCEPT');
    });

    test('host creates a table and friend is NOT in table initially', () => {
      const created = tableService.createTable({
        hostUserId: hostUser.id,
        name: 'Friday Poker Night',
        gameType: 'POKER',
        totalChips: 100,
        chipValue: 10
      });

      tableId = created.table.id;
      expect(created.table.bank_chips).toBe(100);

      // Friend does not see it in active tables
      const friendTablesBefore = tableService.getActiveUserTables(friendUser.id);
      expect(friendTablesBefore.some(t => t.id === tableId)).toBe(false);
    });

    test('host seats friend with 1 tap (no code needed by friend)', () => {
      const seated = tableService.addFriendToTable(hostUser.id, tableId, friendUser.id);
      expect(seated.success).toBe(true);
      expect(seated.displayName).toBe('Friend User');

      // Table now immediately appears in friend\'s active tables without entering any code!
      const friendTablesAfter = tableService.getActiveUserTables(friendUser.id);
      expect(friendTablesAfter.some(t => t.id === tableId)).toBe(true);
    });

    test('host can also create table with initial friends seated simultaneously', () => {
      tableService.deleteTable(hostUser.id, tableId);
      const multi = tableService.createTable({
        hostUserId: hostUser.id,
        name: 'Instant Seated Table',
        gameType: 'TEEN_PATTI',
        totalChips: 100,
        chipValue: 20,
        initialFriendUserIds: [friendUser.id]
      });

      expect(multi.seatedFriendsCount).toBe(1);

      const friendTables = tableService.getActiveUserTables(friendUser.id);
      expect(friendTables.some(t => t.id === multi.table.id)).toBe(true);
    });
  });
});
