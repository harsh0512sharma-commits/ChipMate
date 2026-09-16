import crypto, { randomUUID as uuidv4 } from 'crypto';
import jwt from 'jsonwebtoken';
import { getDb } from '../db';
import { config } from '../config';
import { sendOtpEmail } from './email.service';
import { recalculateUserLifetimeStats } from './stats.service';

export const MASTER_ADMIN_PHONE = '7319123393';

export function isMasterAdmin(user?: { phone_number?: string | null } | null): boolean {
  if (!user || !user.phone_number) return false;
  const cleanPhone = user.phone_number.replace(/\D/g, '').slice(-10);
  return cleanPhone === MASTER_ADMIN_PHONE;
}

export interface UserRecord {
  id: string;
  phone_number?: string | null;
  email: string;
  password_hash?: string | null;
  display_name: string;
  friend_code: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
  isMasterAdmin?: boolean;
}

export function generateFriendCode(displayName?: string): string {
  const db = getDb();
  const cleanName = (displayName || 'PLAYER')
    .replace(/[^a-zA-Z]/g, '')
    .toUpperCase()
    .slice(0, 5)
    .padEnd(4, 'P');

  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude 0, 1, I, O to avoid confusion

  for (let attempt = 0; attempt < 50; attempt++) {
    let suffix = '';
    for (let i = 0; i < 4; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const candidate = `${cleanName}${suffix}`;
    const existing = db.prepare('SELECT id FROM users WHERE friend_code = ?').get(candidate);
    if (!existing) {
      return candidate;
    }
  }

  // Fallback UUID-based unique code
  return 'CM' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (_) {
    return false;
  }
}

export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (digits.length !== 10) {
    throw new Error('Please enter a valid 10-digit mobile number');
  }
  return digits;
}

export async function signupRequestOtp(params: {
  displayName: string;
  phoneNumber: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; message: string; devOtp?: string }> {
  if (!params.displayName || !params.displayName.trim()) {
    throw new Error('Full name is required.');
  }
  const cleanName = params.displayName.trim();
  if (cleanName.length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }

  const normalizedPhone = normalizePhoneNumber(params.phoneNumber);
  const normalizedEmail = params.email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Invalid email address format');
  }
  if (!params.password || params.password.length < 6) {
    throw new Error('Password must be at least 6 characters');
  }

  const db = getDb();

  // Check if phone number is already registered
  const existingPhone = db.prepare('SELECT id FROM users WHERE phone_number = ?').get(normalizedPhone);
  if (existingPhone) {
    throw new Error('An account with this mobile number is already registered. Only 1 account per mobile number is permitted. Please sign in.');
  }

  // Check if email is already registered
  const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existingEmail) {
    throw new Error('An account with this email is already registered. Please sign in.');
  }

  const now = new Date();
  // Rate limiting check: 30s cooldown
  const recentPending = db.prepare(`
    SELECT created_at FROM pending_registrations
    WHERE (email = ? OR phone_number = ?) AND datetime(created_at) > datetime(?, '-30 seconds')
    ORDER BY created_at DESC LIMIT 1
  `).get(normalizedEmail, normalizedPhone, now.toISOString()) as any;

  if (recentPending) {
    throw new Error('Please wait 30 seconds before requesting another code');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(now.getTime() + config.otpExpiryMinutes * 60 * 1000).toISOString();
  const passwordHash = hashPassword(params.password);
  const pendingId = uuidv4();

  // Invalidate any previous pending registrations for this email/phone
  db.prepare('UPDATE pending_registrations SET consumed = 1 WHERE email = ? OR phone_number = ?').run(normalizedEmail, normalizedPhone);

  db.prepare(`
    INSERT INTO pending_registrations (id, phone_number, email, password_hash, code, display_name, expires_at, consumed, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(pendingId, normalizedPhone, normalizedEmail, passwordHash, code, cleanName, expiresAt, now.toISOString());

  const emailResult = await sendOtpEmail({
    email: normalizedEmail,
    code,
    displayName: cleanName
  });

  return {
    success: true,
    message: 'Verification code sent to your email',
    devOtp: emailResult.devOtp
  };
}

export function signupVerifyOtp(params: {
  email: string;
  code: string;
  displayName?: string;
}): { token: string; user: UserRecord } {
  const normalizedEmail = params.email.trim().toLowerCase();
  const db = getDb();
  const now = new Date().toISOString();

  const pending = db.prepare(`
    SELECT * FROM pending_registrations
    WHERE email = ? AND code = ? AND consumed = 0 AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(normalizedEmail, params.code.trim(), now) as any;

  if (!pending) {
    throw new Error('Invalid or expired verification code');
  }

  // Consume registration
  db.prepare('UPDATE pending_registrations SET consumed = 1 WHERE id = ?').run(pending.id);

  // Check if user already exists
  let user = db.prepare('SELECT id FROM users WHERE phone_number = ? OR email = ?').get(pending.phone_number, pending.email) as UserRecord | undefined;
  if (user) {
    throw new Error('An account with this mobile number or email is already registered. Only 1 account per mobile number is permitted. Please sign in.');
  }

  const userId = uuidv4();
  const candidateName = params.displayName?.trim();
  const displayName = (candidateName && candidateName !== pending.phone_number ? candidateName : null)
    || pending.display_name?.trim()
    || candidateName
    || ('Player ' + pending.phone_number.slice(-4));
  const friendCode = pending.phone_number || generateFriendCode(displayName);
  const createdAt = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, phone_number, email, password_hash, display_name, friend_code, avatar_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?)
  `).run(userId, pending.phone_number, pending.email, pending.password_hash, displayName, friendCode, createdAt, createdAt);

  // Initialize lifetime stats
  db.prepare(`
    INSERT INTO player_lifetime_stats (user_id, updated_at)
    VALUES (?, ?)
  `).run(userId, createdAt);

  user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord;

  const token = jwt.sign(
    { userId: user.id, email: user.email, phoneNumber: user.phone_number, friendCode: user.friend_code },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  const fullUser = getUserById(user.id) || user;
  return { token, user: fullUser };
}

export function loginWithPassword(identifier: string, password: string): { token: string; user: UserRecord } {
  const trimmed = identifier.trim();
  if (!trimmed || !password) {
    throw new Error('Mobile number and password are required');
  }

  const db = getDb();
  let user: UserRecord | undefined;

  // Check if identifier can be normalized as 10-digit phone
  try {
    const phone = normalizePhoneNumber(trimmed);
    user = db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phone) as UserRecord | undefined;
  } catch (_) {
    // If not a 10-digit phone, check email
  }

  if (!user && trimmed.includes('@')) {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(trimmed.toLowerCase()) as UserRecord | undefined;
  }

  if (!user) {
    throw new Error('Invalid mobile number or password');
  }

  if (!user.password_hash) {
    throw new Error('Account was created via OTP. Please sign in with OTP verification.');
  }

  const matches = verifyPassword(password, user.password_hash);
  if (!matches) {
    throw new Error('Invalid mobile number or password');
  }

  if (user.phone_number && user.friend_code !== user.phone_number) {
    db.prepare('UPDATE users SET friend_code = ? WHERE id = ?').run(user.phone_number, user.id);
    user.friend_code = user.phone_number;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, phoneNumber: user.phone_number, friendCode: user.friend_code },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  const fullUser = getUserById(user.id) || user;
  return { token, user: fullUser };
}

export async function requestOtp(email: string): Promise<{ success: boolean; message: string; devOtp?: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw new Error('Invalid email address format');
  }

  const db = getDb();
  const now = new Date();

  // Rate limiting: prevent spamming OTP within 30 seconds
  const recentOtp = db.prepare(`
    SELECT created_at FROM otp_codes 
    WHERE email = ? AND datetime(created_at) > datetime(?, '-30 seconds')
    ORDER BY created_at DESC LIMIT 1
  `).get(normalizedEmail, now.toISOString()) as { created_at: string } | undefined;

  if (recentOtp) {
    throw new Error('Please wait 30 seconds before requesting another code');
  }

  // Generate 6-digit OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(now.getTime() + config.otpExpiryMinutes * 60 * 1000).toISOString();

  // Store in database
  const otpId = uuidv4();
  db.prepare(`
    INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(otpId, normalizedEmail, code, expiresAt, now.toISOString());

  // Check if existing user for personalization
  const existingUser = db.prepare('SELECT display_name FROM users WHERE email = ?').get(normalizedEmail) as { display_name: string } | undefined;

  const emailResult = await sendOtpEmail({
    email: normalizedEmail,
    code,
    displayName: existingUser?.display_name
  });

  return {
    success: true,
    message: 'Verification code sent to your email',
    devOtp: emailResult.devOtp
  };
}

export function verifyOtp(email: string, code: string): { token: string; user: UserRecord; isNewUser: boolean } {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const now = new Date().toISOString();

  // Look for valid matching OTP
  const otpRecord = db.prepare(`
    SELECT * FROM otp_codes
    WHERE email = ? AND code = ? AND consumed = 0 AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(normalizedEmail, code.trim(), now) as { id: string } | undefined;

  if (!otpRecord) {
    throw new Error('Invalid or expired verification code');
  }

  // Mark consumed
  db.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').run(otpRecord.id);

  // Check if user exists
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail) as UserRecord | undefined;
  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    const userId = uuidv4();
    const defaultName = normalizedEmail.split('@')[0];
    const friendCode = generateFriendCode(defaultName);
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, display_name, friend_code, avatar_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, NULL, ?, ?)
    `).run(userId, normalizedEmail, defaultName, friendCode, createdAt, createdAt);

    // Initialize lifetime stats row
    db.prepare(`
      INSERT INTO player_lifetime_stats (user_id, updated_at)
      VALUES (?, ?)
    `).run(userId, createdAt);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, friendCode: user.friend_code },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  const fullUser = getUserById(user.id) || user;
  return { token, user: fullUser, isNewUser };
}

export function updateUserProfile(userId: string, displayName?: string, avatarUrl?: string): UserRecord {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord | undefined;
  if (!user) {
    throw new Error('User not found');
  }

  const finalName = displayName !== undefined ? displayName.trim() : user.display_name;
  if (!finalName || finalName.length < 2) {
    throw new Error('Display name must be at least 2 characters');
  }

  const finalAvatar = avatarUrl !== undefined ? (avatarUrl || null) : (user.avatar_url || null);

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE users SET display_name = ?, avatar_url = ?, updated_at = ?
    WHERE id = ?
  `).run(finalName, finalAvatar, now, userId);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord;
}

export function getUserById(userId: string): (UserRecord & { stats?: any; isMasterAdmin?: boolean }) | null {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRecord | undefined;
  if (!user) return null;

  let stats: any;
  try {
    stats = recalculateUserLifetimeStats(userId);
  } catch (_) {
    stats = db.prepare('SELECT * FROM player_lifetime_stats WHERE user_id = ?').get(userId);
  }
  return {
    ...user,
    stats,
    isMasterAdmin: isMasterAdmin(user),
  };
}

export function getUserByFriendCode(friendCode: string): UserRecord | null {
  const db = getDb();
  const trimmed = friendCode.trim();
  const user = db.prepare(`
    SELECT id, email, phone_number, display_name, friend_code, avatar_url, created_at 
    FROM users 
    WHERE phone_number = ? OR UPPER(friend_code) = ?
  `).get(trimmed, trimmed.toUpperCase()) as UserRecord | undefined;
  return user || null;
}

export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [username, domain] = parts;
  if (username.length <= 2) {
    return `${username[0]}*@${domain}`;
  }
  const visibleStart = username.slice(0, 2);
  const visibleEnd = username.slice(-1);
  const maskedLength = Math.max(username.length - 3, 3);
  return `${visibleStart}${'*'.repeat(maskedLength)}${visibleEnd}@${domain}`;
}

export function findUserByIdentifier(identifier: string): UserRecord | undefined {
  const trimmed = identifier.trim();
  if (!trimmed) return undefined;
  const db = getDb();

  // Try phone normalization first
  try {
    const phone = normalizePhoneNumber(trimmed);
    const userByPhone = db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phone) as UserRecord | undefined;
    if (userByPhone) return userByPhone;
  } catch (_) {}

  // Try email
  if (trimmed.includes('@')) {
    const userByEmail = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(trimmed) as UserRecord | undefined;
    if (userByEmail) return userByEmail;
  }

  // Fallback direct matches
  return db.prepare('SELECT * FROM users WHERE phone_number = ? OR LOWER(email) = LOWER(?)').get(trimmed, trimmed) as UserRecord | undefined;
}

export async function resetPasswordRequestOtp(identifier: string): Promise<{ success: boolean; maskedEmail: string; email: string; message: string; devOtp?: string }> {
  const trimmed = identifier.trim();
  if (!trimmed) {
    throw new Error('Please enter your mobile number or email address.');
  }

  const user = findUserByIdentifier(trimmed);
  if (!user) {
    throw new Error('No account found with this mobile number or email address.');
  }

  const db = getDb();
  const now = new Date();

  // Rate limiting check: 30s cooldown
  const recentOtp = db.prepare(`
    SELECT created_at FROM otp_codes 
    WHERE email = ? AND datetime(created_at) > datetime(?, '-30 seconds')
    ORDER BY created_at DESC LIMIT 1
  `).get(user.email, now.toISOString()) as { created_at: string } | undefined;

  if (recentOtp) {
    throw new Error('Please wait 30 seconds before requesting another code.');
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(now.getTime() + config.otpExpiryMinutes * 60 * 1000).toISOString();
  const otpId = uuidv4();

  // Invalidate previous unconsumed OTPs for this email
  db.prepare('UPDATE otp_codes SET consumed = 1 WHERE email = ?').run(user.email);

  // Store new OTP
  db.prepare(`
    INSERT INTO otp_codes (id, email, code, expires_at, consumed, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(otpId, user.email, code, expiresAt, now.toISOString());

  const emailResult = await sendOtpEmail({
    email: user.email,
    code,
    displayName: user.display_name,
    purpose: 'PASSWORD_RESET'
  });

  const masked = maskEmail(user.email);

  return {
    success: true,
    email: user.email,
    maskedEmail: masked,
    message: `Verification code sent to ${masked}`,
    devOtp: emailResult.devOtp
  };
}

export function resetPasswordConfirm(params: {
  identifier: string;
  code: string;
  newPassword: string;
}): { success: boolean; message: string; token: string; user: UserRecord } {
  const { identifier, code, newPassword } = params;

  if (!identifier || !identifier.trim()) {
    throw new Error('Mobile number or email is required.');
  }
  if (!code || !code.trim()) {
    throw new Error('Verification code is required.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw new Error('New password must be at least 6 characters long.');
  }

  const user = findUserByIdentifier(identifier);
  if (!user) {
    throw new Error('User not found.');
  }

  const db = getDb();
  const now = new Date().toISOString();

  // Verify OTP
  const otpRecord = db.prepare(`
    SELECT * FROM otp_codes
    WHERE email = ? AND code = ? AND consumed = 0 AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(user.email, code.trim(), now) as { id: string } | undefined;

  if (!otpRecord) {
    throw new Error('Invalid or expired verification code.');
  }

  // Consume OTP
  db.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').run(otpRecord.id);

  // Hash new password
  const newPasswordHash = hashPassword(newPassword);
  const updatedAt = new Date().toISOString();

  // Update password in database (automatically replicated to Turso via wrapDatabaseWithReplication)
  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newPasswordHash, updatedAt, user.id);

  const updatedUser = getUserById(user.id) || user;

  // Generate new JWT
  const token = jwt.sign(
    { userId: updatedUser.id, email: updatedUser.email, phoneNumber: updatedUser.phone_number, friendCode: updatedUser.friend_code },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  return {
    success: true,
    message: 'Password reset successfully! You are now logged in.',
    token,
    user: updatedUser
  };
}

