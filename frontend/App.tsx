import React, { useState } from 'react';
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
import { colors } from './src/theme/colors';
import { InstallPromptModal } from './src/components/InstallPromptModal';
import { UpdatePromptModal } from './src/components/UpdatePromptModal';

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
  | 'HEAD_TO_HEAD';

function MainNavigator() {
  const { user, token, isLoading } = useAuth();

  // Auth screen state
  const [authStep, setAuthStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState<string | undefined>(undefined);
  const [authDevOtp, setAuthDevOtp] = useState<string | undefined>(undefined);

  // App screen state
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('TAB_HOME');
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [h2hUserId, setH2hUserId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary, fontWeight: '600' }}>
          Loading ChipMate...
        </Text>
      </View>
    );
  }

  // Not authenticated
  if (!token || !user) {
    if (authStep === 'LOGIN') {
      return (
        <LoginScreen
          onOtpSent={(email, devOtp, phoneNumber) => {
            setAuthEmail(email);
            setAuthDevOtp(devOtp);
            setAuthPhone(phoneNumber);
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
            />
          )}

          {currentScreen === 'TAB_LEADERBOARD' && <LeaderboardScreen />}

          {currentScreen === 'TAB_FRIENDS' && (
            <FriendsScreen onOpenHeadToHead={openH2H} />
          )}

          {currentScreen === 'TAB_PROFILE' && <ProfileScreen />}

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
              onGameFinalized={tableId => openSummary(tableId)}
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
      <MainNavigator />
      <InstallPromptModal />
      <UpdatePromptModal />
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
  }
});
