import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as authService from '../services/auth.service';

export async function signupRequestOtp(req: Request, res: Response): Promise<void> {
  try {
    const { phoneNumber, email, password } = req.body;
    if (!phoneNumber || !email || !password) {
      res.status(400).json({ success: false, error: 'Phone number, email, and password are all mandatory.' });
      return;
    }

    const result = await authService.signupRequestOtp({ phoneNumber, email, password });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to process sign-up' });
  }
}

export function signupVerifyOtp(req: Request, res: Response): void {
  try {
    const { email, code, displayName } = req.body;
    if (!email || !code) {
      res.status(400).json({ success: false, error: 'Email and verification code are required.' });
      return;
    }

    const result = authService.signupVerifyOtp({ email, code, displayName });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Verification failed' });
  }
}

export function loginWithPassword(req: Request, res: Response): void {
  try {
    const { phoneNumber, username, password } = req.body;
    const identifier = phoneNumber || username;
    if (!identifier || !password) {
      res.status(400).json({ success: false, error: 'Mobile number and password are required.' });
      return;
    }

    const result = authService.loginWithPassword(identifier, password);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Login failed' });
  }
}

export async function requestOtp(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email is required' });
      return;
    }

    const result = await authService.requestOtp(email);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to send OTP' });
  }
}

export function verifyOtp(req: Request, res: Response): void {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ success: false, error: 'Email and verification code are required' });
      return;
    }

    const result = authService.verifyOtp(email, code);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Verification failed' });
  }
}

export function updateProfile(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const { displayName, avatarUrl } = req.body;

    const user = authService.updateUserProfile(userId, displayName, avatarUrl);
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message || 'Failed to update profile' });
  }
}

export function getMe(req: AuthenticatedRequest, res: Response): void {
  try {
    const userId = req.user!.userId;
    const user = authService.getUserById(userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }
    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
}

export function lookupUser(req: Request, res: Response): void {
  try {
    const code = req.query.code as string;
    if (!code) {
      res.status(400).json({ success: false, error: 'Friend code query parameter required' });
      return;
    }

    const user = authService.getUserByFriendCode(code);
    if (!user) {
      res.status(404).json({ success: false, error: 'No user found with that friend code' });
      return;
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.display_name,
        friendCode: user.friend_code,
        avatarUrl: user.avatar_url
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lookup failed' });
  }
}
