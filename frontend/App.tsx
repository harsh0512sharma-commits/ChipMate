import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Home, Trophy, Users, User, ShieldCheck } from 'lucide-react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UpdateProvider } from './src/context/UpdateContext';
import { colors } from './src/theme/colors';
import { apiRequest } from './src/api/client';
import { InstallPromptModal } from './src/components/InstallPromptModal';
import { UpdatePromptModal } from './src/components/UpdatePromptModal';
import { SplashScreen } from './src/components/SplashScreen';

// Screens
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { VerifyOtpScreen } from './src/screens/auth/VerifyOtpScreen';
import { HomeScreen } from './src/screens/home/HomeScreen';
import { CreateTableScreen } from './src/screens/table/CreateTableScreen';
import { JoinTableScreen } from './src/screens/table/JoinTableScreen';
import { LiveTableScreen } from './src/screens/table/LiveTableScreen';
import { SettlementScreen } from './src/screens/settlement/SettlementScreen';
import { GameSummaryScreen } from './src/screens/settlement/GameSummaryScreen';
import { FriendsScreen } from './src/screens/friends/FriendsScreen';
import { HeadToHeadScreen } from './src/screens/friends/HeadToHeadScreen';
import { LeaderboardScreen } from './src/screens/leaderboard/LeaderboardScreen';
import { ProfileScreen } from './src/screens/profile/ProfileScreen';
import { MasterAdminScreen } from './src/screens/admin/MasterAdminScreen';
import { PublicLedgerScreen } from './src/screens/table/PublicLedgerScreen';

type ScreenType =
  | 'TAB_HOME'
  | 'TAB_LEADERBOARD'
  | 'TAB_FRIENDS'
  | 'TAB_PROFILE'
  | 'CREATE_TABLE'
  | 'JOIN_TABLE'
  | 'LIVE_TABLE'
  | 'SETTLEMENT'
  | 'GAME_SUMMARY'
  | 'HEAD_TO_HEAD'
  | 'MASTER_ADMIN';

function MainNavigator() {
  const { user, token, isLoading, refreshUser } = useAuth();

  // Auth screen state
  const [authStep, setAuthStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState<string | undefined>(undefined);
  const [authDevOtp, setAuthDevOtp] = useState<string | undefined>(undefined);
  const [authName, setAuthName] = useState<string | undefined>(undefined);

  // App screen state
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('TAB_HOME');
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [h2hUserId, setH2hUserId] = useState<string | null>(null);
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Check for public ledger link in URL (?ledger=<id> or ?public_ledger=<id>)
  const [publicLedgerTableId, setPublicLedgerTableId] = useState<string | null>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const ledgerId = searchParams.get('ledger') || searchParams.get('public_ledger') || searchParams.get('game_ledger');
        if (ledgerId) return ledgerId;
        if (window.location.hash) {
          const match = window.location.hash.match(/ledger[=/]([a-zA-Z0-9_-]+)/);
          if (match) return match[1];
        }
      } catch (_) {}
    }
    return null;
  });

  // Poll for incoming friend requests
  useEffect(() => {
    if (!token || !user) return;
    const checkRequests = async () => {
      try {
        const res = await apiRequest('/friends/requests');
        if (res.success && Array.isArray(res.received)) {
          setPendingRequestsCount(res.received.length);
        }
      } catch (_) {}
    };
    checkRequests();
    const interval = setInterval(checkRequests, 12000);
    return () => clearInterval(interval);
  }, [token, user]);

  // If a public ledger link was opened, display read-only public ledger immediately
  if (publicLedgerTableId) {
    return (
      <PublicLedgerScreen
        tableId={publicLedgerTableId}
        isLoggedIn={Boolean(token && user)}
        onBackToApp={() => {
          setPublicLedgerTableId(null);
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('ledger');
              url.searchParams.delete('public_ledger');
              url.searchParams.delete('game_ledger');
              window.history.replaceState({}, document.title, url.pathname + (url.search ? url.search : ''));
            } catch (_) {}
          }
        }}
      />
    );
  }

  if (!isSplashDone) {
    return (
      <SplashScreen
        isLoading={isLoading}
        onAnimationEnd={() => setIsSplashDone(true)}
      />
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  // Not authenticated
  if (!token || !user) {
    if (authStep === 'LOGIN') {
      return (
        <LoginScreen
          onOtpSent={(email, devOtp, phoneNumber, name) => {
            setAuthEmail(email);
            setAuthDevOtp(devOtp);
            setAuthPhone(phoneNumber);
            setAuthName(name);
            setAuthStep('OTP');
          }}
        />
      );
    }
    return (
      <VerifyOtpScreen
        email={authEmail}
        phoneNumber={authPhone}
        initialDevOtp={authDevOtp}
        initialName={authName}
        onBack={() => setAuthStep('LOGIN')}
      />
    );
  }

  // Handle screen navigation
  const openLiveTable = (tableId: string) => {
    setActiveTableId(tableId);
    setCurrentScreen('LIVE_TABLE');
  };

  const openSettlement = (tableId: string) => {
    setActiveTableId(tableId);
    setCurrentScreen('SETTLEMENT');
  };

  const openSummary = (tableId: string) => {
    setActiveTableId(tableId);
    setCurrentScreen('GAME_SUMMARY');
  };

  const openH2H = (otherUserId: string) => {
    setH2hUserId(otherUserId);
    setCurrentScreen('HEAD_TO_HEAD');
  };

  const isTabScreen =
    currentScreen === 'TAB_HOME' ||
    currentScreen === 'TAB_LEADERBOARD' ||
    currentScreen === 'TAB_FRIENDS' ||
    currentScreen === 'TAB_PROFILE';

  return (
    <View style={styles.rootWrapper}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <SafeAreaView style={styles.appContainer}>
        {/* Screen Body */}
        <View style={styles.screenBody}>
          {currentScreen === 'TAB_HOME' && (
            <HomeScreen
              onOpenLiveTable={openLiveTable}
              onCreateTable={() => setCurrentScreen('CREATE_TABLE')}
              onOpenJoinTable={() => setCurrentScreen('JOIN_TABLE')}
              onOpenLeaderboard={() => setCurrentScreen('TAB_LEADERBOARD')}
              onOpenGameHistory={() => setCurrentScreen('TAB_PROFILE')}
              onOpenSummary={openSummary}
            />
          )}

          {currentScreen === 'TAB_LEADERBOARD' && <LeaderboardScreen />}

          {currentScreen === 'TAB_FRIENDS' && (
            <FriendsScreen
              onOpenHeadToHead={openH2H}
              onRequestsUpdated={setPendingRequestsCount}
            />
          )}

          {currentScreen === 'TAB_PROFILE' && (
            <ProfileScreen
              onOpenSummary={openSummary}
              onOpenMasterAdmin={() => setCurrentScreen('MASTER_ADMIN')}
            />
          )}

          {currentScreen === 'MASTER_ADMIN' && (
            <MasterAdminScreen
              onBack={() => setCurrentScreen('TAB_PROFILE')}
              onOpenSummary={openSummary}
            />
          )}

          {currentScreen === 'CREATE_TABLE' && (
            <CreateTableScreen
              onBack={() => setCurrentScreen('TAB_HOME')}
              onTableCreated={tableId => openLiveTable(tableId)}
            />
          )}

          {currentScreen === 'JOIN_TABLE' && (
            <JoinTableScreen
              onBack={() => setCurrentScreen('TAB_HOME')}
              onTableJoined={tableId => openLiveTable(tableId)}
            />
          )}

          {currentScreen === 'LIVE_TABLE' && activeTableId && (
            <LiveTableScreen
              tableId={activeTableId}
              onBack={() => setCurrentScreen('TAB_HOME')}
              onProceedToSettlement={tableId => openSettlement(tableId)}
            />
          )}

          {currentScreen === 'SETTLEMENT' && activeTableId && (
            <SettlementScreen
              tableId={activeTableId}
              onBack={() => setCurrentScreen('LIVE_TABLE')}
              onGameFinalized={tableId => {
                refreshUser();
                openSummary(tableId);
              }}
            />
          )}

          {currentScreen === 'GAME_SUMMARY' && activeTableId && (
            <GameSummaryScreen
              gameId={activeTableId}
              onGoHome={() => setCurrentScreen('TAB_HOME')}
              onGoLeaderboard={() => setCurrentScreen('TAB_LEADERBOARD')}
            />
          )}

          {currentScreen === 'HEAD_TO_HEAD' && h2hUserId && (
            <HeadToHeadScreen
              otherUserId={h2hUserId}
              onBack={() => setCurrentScreen('TAB_FRIENDS')}
            />
          )}
        </View>

        {/* Bottom Tab Bar (Visible on primary views) */}
        {isTabScreen && (
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentScreen('TAB_HOME')}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrapper, currentScreen === 'TAB_HOME' && styles.tabIconWrapperActive]}>
                <Home
                  size={20}
                  color={currentScreen === 'TAB_HOME' ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.tabItemText,
                  currentScreen === 'TAB_HOME' && styles.tabItemTextActive
                ]}
              >
                Home
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentScreen('TAB_LEADERBOARD')}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrapper, currentScreen === 'TAB_LEADERBOARD' && styles.tabIconWrapperActive]}>
                <Trophy
                  size={20}
                  color={currentScreen === 'TAB_LEADERBOARD' ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.tabItemText,
                  currentScreen === 'TAB_LEADERBOARD' && styles.tabItemTextActive
                ]}
              >
                Rankings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentScreen('TAB_FRIENDS')}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrapper, currentScreen === 'TAB_FRIENDS' && styles.tabIconWrapperActive]}>
                <Users
                  size={20}
                  color={currentScreen === 'TAB_FRIENDS' ? colors.primary : colors.textSecondary}
                />
                {pendingRequestsCount > 0 && (
                  <View style={styles.tabBadge}>
                    <Text style={styles.tabBadgeText}>
                      {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabItemText,
                  currentScreen === 'TAB_FRIENDS' && styles.tabItemTextActive
                ]}
              >
                Friends
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => setCurrentScreen('TAB_PROFILE')}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrapper, currentScreen === 'TAB_PROFILE' && styles.tabIconWrapperActive]}>
                <User
                  size={20}
                  color={currentScreen === 'TAB_PROFILE' ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.tabItemText,
                  currentScreen === 'TAB_PROFILE' && styles.tabItemTextActive
                ]}
              >
                Profile
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UpdateProvider>
        <MainNavigator />
        <InstallPromptModal />
        <UpdatePromptModal />
      </UpdateProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  rootWrapper: {
    flex: 1,
    backgroundColor: '#07090D', // Ambient backdrop for web centering
    alignItems: 'center',
    justifyContent: 'center'
  },
  appContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: colors.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 20
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  },
  screenBody: {
    flex: 1
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  tabIconWrapper: {
    width: 38,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center'
  },
  tabIconWrapperActive: {
    backgroundColor: colors.primaryLight
  },
  tabItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2
  },
  tabItemTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  tabBadge: {
    position: 'absolute',
    top: -3,
    right: 2,
    backgroundColor: colors.dangerText,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.card
  },
  tabBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '900'
  }
});
