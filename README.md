# ChipMate ♠️♦️

### Real-Time Home Game Chip Ledger, Settlement & Player Statistics Mobile Application

ChipMate is a production-grade, authoritative mobile application specifically built for private home Poker and Teen Patti games. It provides an authoritative real-time physical chip ledger, an independent financial obligation ledger, debt-minimizing settlement, multiplayer synchronization, friend management, and comprehensive lifetime statistics derived strictly from finalized games.

> [!NOTE]
> ChipMate is strictly a ledger and accounting tool for physical chip games among friends. It is **NOT** a casino, betting platform, gambling marketplace, wallet, or money-transfer application.

---

## 🌟 Core Features & Architectural Highlights

### 1. Two Logically Separate Ledgers
- **Physical Chip Ledger**:
  - Authoritative equation: $\sum(\text{Player Chips}) + \text{Bank Chips} = \text{Total Chips}$
  - Default is **100 Chips**, but the total chips quantity is **fully configurable** (e.g. 50, 100, 150, 200, or custom).
  - Chip rupee rate is configurable (e.g. ₹1, ₹2, ₹5, ₹10 default, ₹20, ₹50, or custom).
  - The bank is a special chip holder. Boundary checks prevent overdrafts or negative chip counts.
- **Obligation / Loan Ledger**:
  - Strictly distinguishes **Lending** (creates debt obligation: *"Amit owes Rahul 8 chips"*) from **Normal Transfers** (moves physical chips with zero debt).
  - Supports partial loan repayments and full settlements with live debt tracking.
  - Guarantees loans are never double-counted as win/losses.

### 2. Live Game Screen (The Heart of the App)
- **100/100 Physical Chip Status Card**: Live reconciliation banner displaying "All chips accounted for ✓" or alerting immediately if there is a discrepancy.
- **Player Cards**: Prominent, oversized chip numbers, rupee equivalent, buy-in contributions, active loan debts.
- **Add Friend Directly from the Table**: Every table player card features a direct friendship status button (`✓ Friends`, `⏳ Pending`, or `[+ Add Friend]`) so friends can be added without leaving the game.
- **Host Quick Actions**: Bottom sheets for frictionless one-tap entries during live games:
  - `BUY CHIPS` (Initial buy-in & Re-buy tracking with automatic rupee calculation)
  - `🤝 LEND` (Creates debt obligation)
  - `↩ RETURN` (Partial or full loan repayment)
  - `↔ TRANSFER` (Normal chip movement without debt)
  - `Correction` (Audited chip adjustment)
  - `Undo` (Safe reversal transaction preserving audit history)
- **Table Code & QR Code**: Easy-to-read 5-character join code (e.g. `A7K92`) and instant QR code sharing.

### 3. Settlement Engine & Debt Minimization
- Computes each participant's true net financial position:
  $$\text{Net} = (\text{Final Chips} \times \text{Chip Value}) - \text{Total Buy-Ins} + \text{Net Loan Balance}$$
- **Debt Minimization Algorithm**: Uses a greedy flow-matching algorithm to reduce peer-to-peer settlement payments to the absolute mathematical minimum (e.g. turning 8 confusing multi-way debts into 2 clean direct payments).
- **Payment Status Tracking**: Track payments as `UNPAID`, `PARTIALLY PAID`, or `PAID`.

### 4. Game Finalization & Lifetime Statistics
- **Immutable Historical Locking**: Once finalized, a game becomes read-only and locks all transactions.
- **Financial Statistics**: Net ₹, games played, wins, losses, win rate, avg profit/game, biggest win, biggest loss, winning/losing streaks, current streak.
- **Chip Statistics**: Separately tracks Net Chips, Won Chips, and Lost Chips (preventing distortion across games with different chip values).
- **Game Type Separation**: Independent tracking for Teen Patti vs Poker.
- **Friend Leaderboard**: Filtered to accepted friends with tabs for Net Winnings, Win Rate, Games Played, and Biggest Win.
- **Head-to-Head**: Comprehensive rivalry breakdown between any two friends (games together, win record, net margin, and recent 5 games).
- **Post-Game Insights**: Automatic highlights: Champion, Toughest Beat, and Most Borrowed Chips.

### 5. Email OTP Authentication & Brevo Integration
- Secure passwordless authentication via 6-digit email OTP.
- **Brevo Integration Ready**: Pluggable transactional email service via `BREVO_API_KEY` and `SENDER_EMAIL`.
- **Zero-Friction Dev Mode**: When no Brevo API key is configured or during development, OTP codes are logged cleanly in the server console and returned in the dev response for instant testing.

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js (v18+)
- npm or pnpm

### 1. Start the Backend Server
```bash
cd backend
npm install
npm run dev
```
The server will start on `http://localhost:4000`.

### 2. Start the Frontend Application
```bash
cd frontend
npm install
npm run web      # Run in browser
# OR
npm run android  # Run on Android simulator or device
npm run ios      # Run on iOS simulator (macOS)
```
On physical phones, scan the Expo QR code using the **Expo Go** app on Android or iOS.

---

## 🧪 Automated Testing Suite

ChipMate includes an extensive automated test suite covering 25+ critical accounting, loan, settlement, and reconciliation scenarios:

```bash
cd backend
npm test
```

### Verified Test Cases:
1. Total chips always reconcile ($\sum \text{Player Chips} + \text{Bank} = \text{Total Chips}$).
2. Initial buy-in updates player chips, bank chips, and financial contribution.
3. Re-buy increases buy-in tracking and flags as `RE_BUY`.
4. Bank depletion prevents buying more chips than bank inventory.
5. Lending moves physical chips and creates debt in loan ledger.
6. Partial loan repayment updates remaining debt without settling.
7. Complete loan repayment settles loan completely.
8. Normal transfer moves chips without creating loan debt.
9. Undo creates an auditable reversal transaction without deleting history.
10. Correction adjusts chip counts safely with audit record.
11. Multiple loans between multiple players resolve accurately in settlement.
12. Settlement debt minimization produces optimal minimal payments.
13. Game finalization locks game, records results, and updates lifetime stats.
14. Finalized game prevents further modifications.
15. Non-host cannot perform host-only operations.
16. Duplicate transaction prevented by idempotency key.
17. Head-to-Head calculations between two players across multiple games.
18. Configurable total chips (e.g. 200 chips instead of 100) reconciles properly.
19. Friend Leaderboard ranks friends by selected criteria.
20. Chip Mismatch Detection triggers if discrepancy exists.
21. Cannot return more chips than remaining loan debt.
22. Cannot transfer more chips than current balance.
23. Games with different player counts (5+ players) reconcile and calculate stats properly.
24. Different chip values across games correctly calculate monetary net.
25. Game Insights extracts winner, biggest loser, and top borrower accurately.

---

## 📁 Project Architecture

```
CHIPMATE/
├── backend/
│   ├── src/
│   │   ├── config/              # App config & environment variables
│   │   ├── db/                  # SQLite schema, indices, WAL mode
│   │   ├── services/
│   │   │   ├── auth.service.ts       # OTP, friend codes, JWT sessions
│   │   │   ├── email.service.ts      # Brevo transactional API & dev logger
│   │   │   ├── table.service.ts      # Tables, join codes, roles & details
│   │   │   ├── ledger.service.ts     # Physical & obligation ledgers, undo, corrections
│   │   │   ├── settlement.service.ts # Net PnL, debt minimization, finalization
│   │   │   ├── stats.service.ts      # Lifetime stats, leaderboards, head-to-head
│   │   │   └── friend.service.ts     # Friends, requests, table-participant status
│   │   ├── controllers/         # REST API route handlers
│   │   ├── socket/              # Real-time WebSocket room manager
│   │   ├── middleware/          # Auth guards & error handling
│   │   ├── app.ts               # Express application factory
│   │   └── server.ts            # Server entrypoint with Socket.io
│   ├── tests/                   # 25+ automated accounting unit tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/                 # REST & Socket.io clients
│   │   ├── context/             # AuthContext (state & session management)
│   │   ├── theme/               # Modern light-theme colors & styles
│   │   ├── components/          # Header, ChipCard, PlayerCard, ActionSheet, QRCodeModal
│   │   └── screens/
│   │       ├── auth/            # LoginScreen, VerifyOtpScreen
│   │       ├── home/            # HomeScreen (Active game, Quick Join, Stats)
│   │       ├── table/           # CreateTableScreen, JoinTableScreen, LiveTableScreen
│   │       ├── settlement/      # SettlementScreen, GameSummaryScreen
│   │       ├── friends/         # FriendsScreen, HeadToHeadScreen
│   │       ├── leaderboard/     # LeaderboardScreen
│   │       └── profile/         # ProfileScreen
│   ├── App.tsx                  # Main app navigation & view orchestrator
│   ├── app.json                 # Expo mobile configuration
│   └── package.json
└── README.md
```

---

## 🔒 Security & Data Integrity
- Authoritative server calculation: Clients never determine chip balances or settlement values.
- Atomic SQLite transactions with Write-Ahead Logging (WAL) and foreign keys.
- Network idempotency keys on all mutations to eliminate duplicate transactions.
- Zero secrets in source code; environment-driven configuration.
