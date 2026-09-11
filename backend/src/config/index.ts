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
  otpExpiryMinutes: 10,
  defaultChipCount: 100,
  defaultChipValue: 10
};
