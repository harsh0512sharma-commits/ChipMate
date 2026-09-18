import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
  useWindowDimensions,
  BackHandler
} from 'react-native';
import {
  Home,
  Trophy,
  Users,
  User,
  ShieldCheck,
  Menu,
  Sun,
  Moon,
  Sparkles,
  Play,
  Coins,
  History
} from 'lucide-react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { UpdateProvider, useUpdate } from './src/context/UpdateContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { colors } from './src/theme/colors';
import { apiRequest } from './src/api/client';
import { InstallPromptModal } from './src/components/InstallPromptModal';
import { UpdatePromptModal } from './src/components/UpdatePromptModal';
import { APP_BUILD_VERSION } from './src/version';
import { ErrorBoundary } from './src/components/common/ErrorBoundary';
import { SplashScreen } from './src/components/SplashScreen';
import { ChipMateLogo, ChipMateWordmark } from './src/components/ChipMateBrand';

// Screens
import { LandingScreen } from './src/screens/landing/LandingScreen';
import { LoginScreen } from './src/screens/auth/LoginScreen';
import { VerifyOtpScreen } from './src/screens/auth/VerifyOtpScreen';
import { HomeScreen } from './src/screens/home/HomeScreen';
import { GamesScreen } from './src/screens/games/GamesScreen';
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
  | 'TAB_GAMES'
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
  const { isDark, toggleTheme } = useTheme();
  const { updateAvailable, latestVersion, isUpdating, applyUpdate } = useUpdate();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Auth screen state
  const [authStep, setAuthStep] = useState<'LOGIN' | 'OTP'>('LOGIN');
  const [authEmail, setAuthEmail] = useState('');
  const [authPhone, setAuthPhone] = useState<string | undefined>(undefined);
  const [authDevOtp, setAuthDevOtp] = useState<string | undefined>(undefined);
  const [authName, setAuthName] = useState<string | undefined>(undefined);

  // App screen & history state
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('TAB_HOME');
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>(['TAB_HOME']);
  const [profileSubView, setProfileSubView] = useState<'MAIN' | 'APP_UPDATES'>('MAIN');
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [summaryGameId, setSummaryGameId] = useState<string | null>(null);
  const [h2hUserId, setH2hUserId] = useState<string | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [hasPlayedLoginSplash, setHasPlayedLoginSplash] = useState<boolean>(false);

  // Check for public ledger link in URL (?ledger=<id> or ?public_ledger=<id>)
  const [publicLedgerTableId, setPublicLedgerTableId] = useState<string | null>(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const searchParams = new URLSearchParams(window.location.search);
        // Clean cache-busting / version parameters (?_v=... or ?v=...) immediately from URL bar
        if (searchParams.has('_v') || searchParams.has('v')) {
          const url = new URL(window.location.href);
          url.searchParams.delete('_v');
          url.searchParams.delete('v');
          const cleanSearch = url.searchParams.toString();
          const cleanUrl = url.pathname + (cleanSearch ? `?${cleanSearch}` : '') + url.hash;
          if (window.history && window.history.replaceState) {
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }
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

  // Clean cache-busting / version parameters (?_v=... or ?v=...) from the browser address bar
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('_v') || url.searchParams.has('v')) {
          url.searchParams.delete('_v');
          url.searchParams.delete('v');
          const cleanSearch = url.searchParams.toString();
          const cleanUrl = url.pathname + (cleanSearch ? `?${cleanSearch}` : '') + url.hash;
          window.history.replaceState({}, document.title, cleanUrl);
        }
      } catch (_) {}
    }
  }, []);

  // Reset login splash state whenever user logs out
  useEffect(() => {
    if (!token || !user) {
      setHasPlayedLoginSplash(false);
      setShowLanding(true);
    }
  }, [token, user]);

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
    // Poll every 35s to keep notifications fresh while avoiding network flooding and battery drain
    const interval = setInterval(checkRequests, 35000);
    return () => clearInterval(interval);
  }, [token, user]);

  const navigateTo = (screen: ScreenType, replace = false) => {
    if (replace) {
      setScreenHistory(prev => {
        const next = [...prev];
        next[next.length - 1] = screen;
        return next;
      });
    } else {
      setScreenHistory(prev => (prev[prev.length - 1] === screen ? prev : [...prev, screen]));
    }
    setCurrentScreen(screen);
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history) {
      try {
        window.history.pushState({ screen }, '', window.location.href);
      } catch (_) {}
    }
  };

  const goBack = () => {
    if (screenHistory.length > 1) {
      const nextHistory = [...screenHistory];
      nextHistory.pop();
      const prevScreen = nextHistory[nextHistory.length - 1];
      setScreenHistory(nextHistory);
      setCurrentScreen(prevScreen);
      return true;
    } else if (currentScreen !== 'TAB_HOME') {
      setCurrentScreen('TAB_HOME');
      setScreenHistory(['TAB_HOME']);
      return true;
    }
    return false;
  };

  // Hardware back press listener on Android / mobile (unconditionally registered at top level)
  useEffect(() => {
    const handleHardwareBack = () => {
      if (!token || !user) return false;
      if (screenHistory.length > 1 || currentScreen !== 'TAB_HOME') {
        goBack();
        return true; // prevent exiting app
      }
      return false; // let app close only when at root Home tab
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => sub.remove();
  }, [screenHistory, currentScreen, token, user]);

  // Browser popstate listener on Web (swipe back / browser back button) (unconditionally registered at top level)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handlePopState = () => {
        if (!token || !user) return;
        if (screenHistory.length > 1) {
          const nextHistory = [...screenHistory];
          nextHistory.pop();
          const prevScreen = nextHistory[nextHistory.length - 1];
          setScreenHistory(nextHistory);
          setCurrentScreen(prevScreen);
        } else if (currentScreen !== 'TAB_HOME') {
          setCurrentScreen('TAB_HOME');
          setScreenHistory(['TAB_HOME']);
        }
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [screenHistory, currentScreen, token, user]);

  // Handle screen navigation
  const openLiveTable = (tableId: string) => {
    setActiveTableId(tableId);
    navigateTo('LIVE_TABLE');
  };

  const openSettlement = (tableId: string) => {
    setActiveTableId(tableId);
    navigateTo('SETTLEMENT');
  };

  const openSummary = (tableId: string) => {
    // Strictly decouple from activeTableId so past games never show active game banner
    setSummaryGameId(tableId);
    navigateTo('GAME_SUMMARY');
  };

  const openH2H = (otherUserId: string) => {
    setH2hUserId(otherUserId);
    navigateTo('HEAD_TO_HEAD');
  };

  const isTabScreen =
    currentScreen === 'TAB_HOME' ||
    currentScreen === 'TAB_GAMES' ||
    currentScreen === 'TAB_LEADERBOARD' ||
    currentScreen === 'TAB_FRIENDS' ||
    currentScreen === 'TAB_PROFILE';

  const navItems = [
    { id: 'TAB_HOME' as ScreenType, label: 'Home', icon: Home },
    { id: 'TAB_GAMES' as ScreenType, label: 'Games', icon: History },
    { id: 'TAB_LEADERBOARD' as ScreenType, label: 'Rankings', icon: Trophy },
    { id: 'TAB_FRIENDS' as ScreenType, label: 'Friends', icon: Users, badge: pendingRequestsCount },
    { id: 'TAB_PROFILE' as ScreenType, label: 'Profile', icon: User }
  ];

  const getDesktopPageTitle = () => {
    switch (currentScreen) {
      case 'TAB_HOME':
        return 'Home Dashboard';
      case 'TAB_GAMES':
        return 'Games & History';
      case 'TAB_LEADERBOARD':
        return 'Rankings & Leaderboard';
      case 'TAB_FRIENDS':
        return 'Friends & Social Groups';
      case 'TAB_PROFILE':
        return 'Player Profile';
      case 'CREATE_TABLE':
        return 'Host New Game Table';
      case 'JOIN_TABLE':
        return 'Join Game Table';
      case 'LIVE_TABLE':
        return 'Live Game Table';
      case 'SETTLEMENT':
        return 'Table Settlement & Payoffs';
      case 'GAME_SUMMARY':
        return 'Game Night Summary';
      case 'HEAD_TO_HEAD':
        return 'Head-to-Head Showdown';
      case 'MASTER_ADMIN':
        return 'Master Admin Console';
      default:
        return 'ChipMate';
    }
  };

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

  // Not authenticated: visitors immediately view the Landing Screen (NO splash video on landing)
  if (!token || !user) {
    if (showLanding) {
      return (
        <LandingScreen
          onEnterApp={() => setShowLanding(false)}
          onOpenSampleLedger={() => setShowLanding(false)}
        />
      );
    }

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
          onBackToLanding={() => setShowLanding(true)}
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

  // Authenticated: Signature cinematic splash video plays when logging in to mask the dashboard loading buffer
  if (!hasPlayedLoginSplash) {
    return (
      <SplashScreen
        isLoading={isLoading}
        onAnimationEnd={() => setHasPlayedLoginSplash(true)}
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

  const renderScreenBody = () => (
    <View style={styles.screenBody}>
      {currentScreen === 'TAB_HOME' && (
        <HomeScreen
          onOpenLiveTable={openLiveTable}
          onCreateTable={() => navigateTo('CREATE_TABLE')}
          onOpenJoinTable={() => navigateTo('JOIN_TABLE')}
          onOpenLeaderboard={() => navigateTo('TAB_LEADERBOARD')}
          onOpenGameHistory={() => navigateTo('TAB_GAMES')}
          onOpenSummary={openSummary}
        />
      )}

      {currentScreen === 'TAB_GAMES' && (
        <GamesScreen
          onOpenSummary={openSummary}
          onBackToHome={() => navigateTo('TAB_HOME')}
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
          onOpenMasterAdmin={() => navigateTo('MASTER_ADMIN')}
          initialSubView={profileSubView}
        />
      )}

      {currentScreen === 'MASTER_ADMIN' && (
        <MasterAdminScreen
          onBack={goBack}
          onOpenSummary={openSummary}
        />
      )}

      {currentScreen === 'CREATE_TABLE' && (
        <CreateTableScreen
          onBack={goBack}
          onTableCreated={tableId => openLiveTable(tableId)}
        />
      )}

      {currentScreen === 'JOIN_TABLE' && (
        <JoinTableScreen
          onBack={goBack}
          onTableJoined={tableId => openLiveTable(tableId)}
        />
      )}

      {currentScreen === 'LIVE_TABLE' && activeTableId && (
        <LiveTableScreen
          tableId={activeTableId}
          onBack={goBack}
          onProceedToSettlement={tableId => openSettlement(tableId)}
          onOpenSummary={tableId => {
            setActiveTableId(null);
            openSummary(tableId);
          }}
        />
      )}

      {currentScreen === 'SETTLEMENT' && activeTableId && (
        <SettlementScreen
          tableId={activeTableId}
          onBack={goBack}
          onGameFinalized={tableId => {
            refreshUser();
            setActiveTableId(null);
            openSummary(tableId);
          }}
        />
      )}

      {currentScreen === 'GAME_SUMMARY' && (summaryGameId || activeTableId) && (
        <GameSummaryScreen
          gameId={(summaryGameId || activeTableId)!}
          onBack={goBack}
          onGoHome={() => navigateTo('TAB_HOME')}
          onGoLeaderboard={() => navigateTo('TAB_LEADERBOARD')}
          onGameDeleted={() => {
            if (activeTableId === (summaryGameId || activeTableId)) {
              setActiveTableId(null);
            }
            setSummaryGameId(null);
            goBack();
          }}
        />
      )}

      {currentScreen === 'HEAD_TO_HEAD' && h2hUserId && (
        <HeadToHeadScreen
          otherUserId={h2hUserId}
          onBack={goBack}
        />
      )}

      {/* Safe fallback to HomeScreen if table/summary ID is missing or unknown screen state */}
      {((currentScreen === 'LIVE_TABLE' && !activeTableId) ||
        (currentScreen === 'SETTLEMENT' && !activeTableId) ||
        (currentScreen === 'GAME_SUMMARY' && !(summaryGameId || activeTableId)) ||
        (currentScreen === 'HEAD_TO_HEAD' && !h2hUserId) ||
        (![
          'TAB_HOME',
          'TAB_GAMES',
          'TAB_LEADERBOARD',
          'TAB_FRIENDS',
          'TAB_PROFILE',
          'MASTER_ADMIN',
          'CREATE_TABLE',
          'JOIN_TABLE',
          'LIVE_TABLE',
          'SETTLEMENT',
          'GAME_SUMMARY',
          'HEAD_TO_HEAD'
        ].includes(currentScreen))) && (
        <HomeScreen
          onOpenLiveTable={openLiveTable}
          onCreateTable={() => navigateTo('CREATE_TABLE')}
          onOpenJoinTable={() => navigateTo('JOIN_TABLE')}
          onOpenLeaderboard={() => navigateTo('TAB_LEADERBOARD')}
          onOpenGameHistory={() => navigateTo('TAB_GAMES')}
          onOpenSummary={openSummary}
        />
      )}
    </View>
  );

  // DESKTOP LAYOUT (Screen Width >= 768px)
  if (isDesktop) {
    return (
      <View style={[styles.desktopRootWrapper, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.card} />

        {/* Top Bar (Persistent on all desktop screens) */}
        <View style={styles.desktopTopBar}>
          <View style={styles.desktopTopBarLeft}>
            <TouchableOpacity
              onPress={() => setIsSidebarCollapsed(prev => !prev)}
              style={styles.desktopHamburgerBtn}
              activeOpacity={0.7}
              accessibilityLabel="Toggle Navigation Sidebar"
            >
              <Menu size={20} color={colors.text} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigateTo('TAB_HOME')}
              style={styles.desktopBrandWrap}
              activeOpacity={0.8}
            >
              <ChipMateLogo size={32} borderRadius={8} />
              <ChipMateWordmark size={16} spacing={3} />
              <View style={styles.desktopBrandBadge}>
                <Text style={styles.desktopBrandBadgeText}>PRO</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.desktopTopBarCenter}>
            <Text style={styles.desktopPageTitle}>{getDesktopPageTitle()}</Text>
          </View>

          <View style={styles.desktopTopBarRight}>
            {updateAvailable && (
              <TouchableOpacity
                style={styles.desktopUpdateBtn}
                onPress={applyUpdate}
                disabled={isUpdating}
                activeOpacity={0.8}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Sparkles size={14} color="#FFF" style={{ marginRight: 6 }} />
                    <Text style={styles.desktopUpdateBtnText}>Update v{latestVersion}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {activeTableId && currentScreen !== 'LIVE_TABLE' && currentScreen !== 'SETTLEMENT' && (
              <TouchableOpacity
                style={styles.desktopActiveTablePill}
                onPress={() => openLiveTable(activeTableId)}
                activeOpacity={0.8}
              >
                <View style={styles.desktopLiveDot} />
                <Text style={styles.desktopActiveTablePillText}>Table Active</Text>
              </TouchableOpacity>
            )}

            {/* Day / Night Mode Switch Button (Symbol only, placed to the left of Player Profile) */}
            <TouchableOpacity
              style={styles.desktopThemeToggleBtn}
              onPress={toggleTheme}
              activeOpacity={0.75}
              accessibilityLabel={isDark ? 'Switch to Day Mode' : 'Switch to Night Mode'}
            >
              {isDark ? (
                <Sun size={17} color="#FBBF24" />
              ) : (
                <Moon size={17} color="#2563EB" />
              )}
            </TouchableOpacity>

            {/* Player Name and Avatar (At the very top-right corner) */}
            <TouchableOpacity
              onPress={() => {
                setProfileSubView('MAIN');
                navigateTo('TAB_PROFILE');
              }}
              style={styles.desktopUserPill}
              activeOpacity={0.8}
            >
              <View style={styles.desktopUserAvatar}>
                <Text style={styles.desktopUserAvatarText}>
                  {(user?.display_name ? user.display_name.charAt(0) : 'P').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.desktopUserName} numberOfLines={1}>
                {user?.display_name || 'Player'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Desktop Main Row (Sidebar + Main Content) */}
        <View style={styles.desktopMainRow}>
          {/* Left Sidebar */}
          <View style={[styles.desktopSidebar, { width: isSidebarCollapsed ? 70 : 230 }]}>
            <View style={styles.desktopSidebarNavList}>
              {navItems.map(item => {
                const IconComponent = item.icon;
                const isActive = currentScreen === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      if (item.id === 'TAB_PROFILE') {
                        setProfileSubView('MAIN');
                      }
                      navigateTo(item.id);
                    }}
                    style={[
                      styles.desktopSidebarItem,
                      isSidebarCollapsed && styles.desktopSidebarItemCollapsed,
                      isActive && styles.desktopSidebarItemActive
                    ]}
                    activeOpacity={0.75}
                  >
                    <View style={styles.desktopSidebarIconWrap}>
                      <IconComponent
                        size={20}
                        color={isActive ? colors.primary : colors.textSecondary}
                      />
                      {Boolean(item.badge && item.badge > 0) && isSidebarCollapsed ? (
                        <View style={[styles.desktopSidebarBadge, styles.desktopSidebarBadgeCollapsed]}>
                          <Text style={styles.desktopSidebarBadgeText}>
                            {item.badge! > 9 ? '9+' : item.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {!isSidebarCollapsed && (
                      <Text
                        style={[
                          styles.desktopSidebarItemText,
                          isActive && styles.desktopSidebarItemTextActive
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    )}

                    {!isSidebarCollapsed && Boolean(item.badge && item.badge > 0) ? (
                      <View style={styles.desktopSidebarBadge}>
                        <Text style={styles.desktopSidebarBadgeText}>
                          {item.badge! > 9 ? '9+' : item.badge}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}

              {/* Active Table Quick Return (if user is in an active table) */}
              {activeTableId && (
                <TouchableOpacity
                  style={[
                    styles.desktopSidebarItem,
                    isSidebarCollapsed && styles.desktopSidebarItemCollapsed,
                    currentScreen === 'LIVE_TABLE' && styles.desktopSidebarItemActive,
                    styles.desktopActiveTableSidebarItem
                  ]}
                  onPress={() => openLiveTable(activeTableId)}
                  activeOpacity={0.75}
                >
                  <View style={styles.desktopSidebarIconWrap}>
                    <Play size={18} color={colors.successText} fill={colors.successText} />
                  </View>
                  {!isSidebarCollapsed && (
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.desktopSidebarItemText, { color: colors.successText, fontWeight: '800', marginLeft: 0 }]} numberOfLines={1}>
                        Live Table
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted }} numberOfLines={1}>
                        Game in progress
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {/* Sidebar Footer */}
            <View style={styles.desktopSidebarFooter}>
              {isSidebarCollapsed ? (
                <ChipMateLogo size={28} borderRadius={6} />
              ) : (
                <>
                  <ChipMateWordmark size={12} spacing={2} />
                  <Text style={styles.desktopSidebarSubText}>CALCULATE . SETTLE . PLAY.</Text>
                  <Text style={[styles.desktopSidebarVersionText, { marginTop: 4 }]}>
                    v{APP_BUILD_VERSION}
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Centered Main Screen Content */}
          <View style={styles.desktopContentArea}>
            <View style={styles.desktopInnerContainer}>
              {renderScreenBody()}
            </View>
          </View>
        </View>
      </View>
    );
  }

  // MOBILE LAYOUT (Screen Width < 768px, exactly as before)
  return (
    <View style={[styles.rootWrapper, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      <SafeAreaView style={styles.appContainer}>
        {renderScreenBody()}

        {/* Bottom Tab Bar (Visible on primary views on mobile) */}
        {isTabScreen && (
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateTo('TAB_HOME')}
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
              onPress={() => navigateTo('TAB_GAMES')}
              activeOpacity={0.7}
            >
              <View style={[styles.tabIconWrapper, currentScreen === 'TAB_GAMES' && styles.tabIconWrapperActive]}>
                <History
                  size={20}
                  color={currentScreen === 'TAB_GAMES' ? colors.primary : colors.textSecondary}
                />
              </View>
              <Text
                style={[
                  styles.tabItemText,
                  currentScreen === 'TAB_GAMES' && styles.tabItemTextActive
                ]}
              >
                Games
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tabItem}
              onPress={() => navigateTo('TAB_LEADERBOARD')}
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
              onPress={() => navigateTo('TAB_FRIENDS')}
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
              onPress={() => {
                setProfileSubView('MAIN');
                navigateTo('TAB_PROFILE');
              }}
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
    <ThemeProvider>
      <AuthProvider>
        <UpdateProvider>
          <ErrorBoundary>
            <MainNavigator />
            <InstallPromptModal />
            <UpdatePromptModal />
          </ErrorBoundary>
        </UpdateProvider>
      </AuthProvider>
    </ThemeProvider>
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
  },
  // Desktop Layout Styles
  desktopRootWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: colors.background
  },
  desktopTopBar: {
    height: 62,
    width: '100%',
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10
  },
  desktopTopBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  desktopHamburgerBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  desktopBrandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  desktopLogoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  desktopBrandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5
  },
  desktopBrandBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  desktopBrandBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5
  },
  desktopTopBarCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16
  },
  desktopPageTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.2
  },
  desktopTopBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  desktopUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  desktopUpdateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF'
  },
  desktopActiveTablePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    gap: 6
  },
  desktopLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e'
  },
  desktopActiveTablePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.successText
  },
  desktopUserPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardRaised,
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderDark,
    gap: 8
  },
  desktopUserAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  desktopUserAvatarText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800'
  },
  desktopUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    maxWidth: 140
  },
  desktopThemeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  desktopMainRow: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    overflow: 'hidden'
  },
  desktopSidebar: {
    backgroundColor: colors.card,
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
    paddingVertical: 16,
    paddingHorizontal: 10,
    justifyContent: 'space-between'
  },
  desktopSidebarNavList: {
    gap: 6
  },
  desktopSidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'transparent'
  },
  desktopSidebarItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: 0
  },
  desktopSidebarItemActive: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  desktopActiveTableSidebarItem: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
    backgroundColor: 'rgba(34, 197, 94, 0.08)'
  },
  desktopSidebarIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center'
  },
  desktopSidebarItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginLeft: 10
  },
  desktopSidebarItemTextActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  desktopSidebarBadge: {
    backgroundColor: colors.dangerText,
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    marginLeft: 'auto'
  },
  desktopSidebarBadgeCollapsed: {
    position: 'absolute',
    top: -2,
    right: -2,
    marginLeft: 0
  },
  desktopSidebarBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900'
  },
  desktopSidebarFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    alignItems: 'center'
  },
  desktopSidebarVersionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted
  },
  desktopSidebarSubText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  desktopContentArea: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    overflow: 'hidden'
  },
  desktopInnerContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignSelf: 'stretch'
  }
});
