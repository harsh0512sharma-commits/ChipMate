import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  jwtSecret: process.env.JWT_SECRET || 'chipmate-dev-secret-key-2026',
  nodeEnv: process.env.NODE_ENV || 'development',
  brevoApiKey: process.env.BREVO_API_KEY || '',
  senderEmail: process.env.SENDER_EMAIL || 'otp@chipmate.app',
  senderName: process.env.SENDER_NAME || 'ChipMate',
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../../data/chipmate.db'),
  tursoDatabaseUrl: process.env.TURSO_DATABASE_URL || 'libsql://chipmate-harsh0512sharma-commits.aws-ap-south-1.turso.io',
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODkxMzc2MjYsImlkIjoiMDFhMDkwZTktNTMwMS03NzcwLWFhNzktMjU3ZjM3ODA0ZWIwIiwia2lkIjoiSUtQNWFaODZ0VTd5Mkw0WTVMcW8xWTJ0Zm45NVN1OVVlS2ZZS0NWN21qOCIsInJpZCI6IjZkOTk3MDAxLTFkZGEtNDAzZi04ZTUwLTVkZTY4NjE1N2FjZiJ9.coN1bepjNJCGJRwUI1NAJy7ZDNkv_ffFbEIkAUwKb8CNhk_7cuwKllj4UczNSMIoVbVfuNf_XPKy-vO2CYZ_Cg',
  otpExpiryMinutes: 10,
  defaultChipCount: 100,
  defaultChipValue: 10
};
