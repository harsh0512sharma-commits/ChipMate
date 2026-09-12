import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import * as authCtrl from '../controllers/auth.controller';
import * as friendCtrl from '../controllers/friend.controller';
import * as tableCtrl from '../controllers/table.controller';
import * as ledgerCtrl from '../controllers/ledger.controller';
import * as settleCtrl from '../controllers/settlement.controller';
import * as statsCtrl from '../controllers/stats.controller';

const router = Router();

// Auth routes (public)
router.post('/auth/signup-request-otp', authCtrl.signupRequestOtp);
router.post('/auth/signup-verify-otp', authCtrl.signupVerifyOtp);
router.post('/auth/login', authCtrl.loginWithPassword);
router.post('/auth/request-otp', authCtrl.requestOtp);
router.post('/auth/verify-otp', authCtrl.verifyOtp);

// User & Profile (protected)
router.get('/auth/me', requireAuth, authCtrl.getMe);
router.put('/auth/profile', requireAuth, authCtrl.updateProfile);
router.get('/users/lookup', requireAuth, authCtrl.lookupUser);

// Friends routes
router.get('/friends', requireAuth, friendCtrl.getFriends);
router.get('/friends/requests', requireAuth, friendCtrl.getRequests);
router.post('/friends/request', requireAuth, friendCtrl.sendRequest);
router.post('/friends/respond', requireAuth, friendCtrl.respondRequest);
router.delete('/friends/:targetUserId', requireAuth, friendCtrl.deleteFriend);

// Tables routes
router.post('/tables', requireAuth, tableCtrl.createTable);
router.put('/tables/:tableId/settings', requireAuth, tableCtrl.updateSettings);
router.post('/tables/join', requireAuth, tableCtrl.joinTable);
router.post('/tables/:tableId/players', requireAuth, tableCtrl.addPlayer);
router.post('/tables/:tableId/seat-friend', requireAuth, tableCtrl.seatFriend);
router.post('/tables/:tableId/seat-guest', requireAuth, tableCtrl.seatGuest);
router.delete('/tables/:tableId/players/:playerId', requireAuth, tableCtrl.removePlayer);
router.post('/tables/:tableId/start', requireAuth, tableCtrl.startTable);
router.get('/tables/active', requireAuth, tableCtrl.getActiveTables);
router.get('/tables/history', requireAuth, tableCtrl.getTableHistory);
router.get('/tables/:tableId', requireAuth, tableCtrl.getTable);
router.get('/tables/:tableId/transactions', requireAuth, tableCtrl.getTableTransactions);
router.delete('/tables/:tableId', requireAuth, tableCtrl.deleteTable);
router.post('/tables/:tableId/leave', requireAuth, tableCtrl.leaveTable);

// Ledger & Transaction routes (Host actions)
router.post('/tables/:tableId/buy-in', requireAuth, ledgerCtrl.buyIn);
router.post('/tables/:tableId/lend', requireAuth, ledgerCtrl.lendChips);
router.post('/tables/:tableId/return', requireAuth, ledgerCtrl.returnChips);
router.post('/tables/:tableId/transfer', requireAuth, ledgerCtrl.transferChips);
router.post('/tables/:tableId/undo', requireAuth, ledgerCtrl.undo);
router.post('/tables/:tableId/correction', requireAuth, ledgerCtrl.correct);

// Settlement routes
router.post('/tables/:tableId/settle/chips', requireAuth, settleCtrl.submitFinalChips);
router.post('/tables/:tableId/settle/proceed', requireAuth, settleCtrl.proceedToSettle);
router.get('/tables/:tableId/settle', requireAuth, settleCtrl.getSettlement);
router.post('/tables/:tableId/settle/finalize', requireAuth, settleCtrl.finalizeTable);
router.post('/tables/:tableId/settle/payment-status', requireAuth, settleCtrl.updatePaymentStatus);

// Stats & Leaderboard routes
router.get('/stats/leaderboard', requireAuth, statsCtrl.getLeaderboard);
router.get('/stats/head-to-head/:otherUserId', requireAuth, statsCtrl.getHeadToHead);
router.get('/stats/game-insights/:gameId', requireAuth, statsCtrl.getInsights);
router.get('/stats/user', requireAuth, statsCtrl.getUserStats);
router.get('/stats/user/:userId', requireAuth, statsCtrl.getUserStats);

export default router;
