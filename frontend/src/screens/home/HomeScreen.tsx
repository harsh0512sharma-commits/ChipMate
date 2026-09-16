import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Platform,
  Image,
  ActivityIndicator
} from 'react-native';
import {
  Plus,
  Play,
  QrCode,
  ArrowRight,
  Trophy,
  History,
  TrendingUp,
  Coins,
  Users,
  Sparkles,
  Sun,
  Moon
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useUpdate } from '../../context/UpdateContext';
import { useTheme } from '../../context/ThemeContext';

interface HomeScreenProps {
  onOpenLiveTable: (tableId: string) => void;
  onCreateTable: () => void;
  onOpenJoinTable: () => void;
  onOpenLeaderboard: () => void;
  onOpenGameHistory: () => void;
  onOpenSummary?: (tableId: string) => void;
}

export function formatGameDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const datePart = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timePart = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${datePart} • ${timePart}`;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenLiveTable,
  onCreateTable,
  onOpenJoinTable,
  onOpenLeaderboard,
  onOpenGameHistory,
  onOpenSummary
}) => {
  const { user, refreshUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { updateAvailable, latestVersion, isUpdating, applyUpdate } = useUpdate();
  const [activeTables, setActiveTables] = useState<any[]>([]);
  const [recentCompleted, setRecentCompleted] = useState<any[]>([]);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [activeRes, histRes] = await Promise.all([
        apiRequest('/tables/active'),
        apiRequest('/tables/history'),
        refreshUser()
      ]);

      if (activeRes.success) setActiveTables(activeRes.tables || []);
      if (histRes.success) setRecentCompleted(histRes.history || []);
    } catch (err: any) {
      console.warn('Home fetch error:', err.message);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshUser()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickJoin = async () => {
    if (!joinCodeInput.trim()) return;
    setJoinError(null);
    try {
      const res = await apiRequest('/tables/join', {
        method: 'POST',
        body: { code: joinCodeInput.trim().toUpperCase() }
      });
      if (res.success && res.table) {
        setJoinCodeInput('');
        onOpenLiveTable(res.table.id);
      } else {
        setJoinError(res.error || 'Could not join table with that code.');
      }
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join table.');
    }
  };

  const primaryActiveTable = activeTables.length > 0 ? activeTables[0] : null;
  const stats = user?.stats || {};
  const netWinnings = stats.net_winnings || 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Welcome Header */}
        <View style={styles.welcomeRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.headerAvatar} />
            ) : (
              <Image
                source={require('../../../assets/chip_icon.png')}
                style={styles.headerChipIcon}
                resizeMode="contain"
              />
            )}
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.greetingText}>Welcome,</Text>
              <Text style={styles.userName}>{user?.display_name || 'Player'}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {updateAvailable && (
              <TouchableOpacity
                style={styles.headerUpdateBtn}
                onPress={applyUpdate}
                disabled={isUpdating}
                activeOpacity={0.8}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Sparkles size={14} color="#FFF" style={{ marginRight: 5 }} />
                    <Text style={styles.headerUpdateBtnText}>Update v{latestVersion}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Day / Night Mode Switch Button */}
            <TouchableOpacity
              style={styles.themeToggleBtn}
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
          </View>
        </View>

        {/* PROMINENT UPDATE NOTICE CARD (If update available) */}
        {updateAvailable && (
          <View style={styles.homeUpdateBanner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
              <View style={styles.homeUpdateIconWrap}>
                <Sparkles size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.homeUpdateTitle}>New Release Available: v{latestVersion}</Text>
                <Text style={styles.homeUpdateSub}>
                  A newer build of ChipMate is ready. Update now to ensure instant data sync and latest features.
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.homeUpdateActionBtn}
              onPress={applyUpdate}
              disabled={isUpdating}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.homeUpdateActionText}>Update Now</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* ACTIVE GAME CARD (Highest Priority) */}
        {primaryActiveTable ? (
          <View style={styles.activeGameCard}>
            <View style={styles.activeGameHeader}>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>LIVE TABLE</Text>
              </View>
              <View style={styles.gameCodePill}>
                <Text style={styles.gameCodeText}>#{primaryActiveTable.join_code}</Text>
              </View>
            </View>

            <Text style={styles.activeGameTitle}>{primaryActiveTable.name}</Text>
            <Text style={styles.activeGameSubtitle}>
              {primaryActiveTable.game_type === 'TEEN_PATTI' ? 'Teen Patti' : 'Poker'} •{' '}
              {primaryActiveTable.total_chips} chips • ₹{primaryActiveTable.chip_value}/chip
            </Text>

            <View style={styles.activeGameStatsRow}>
              <View style={styles.activeStatItem}>
                <Text style={styles.activeStatLabel}>My Chips</Text>
                <Text style={styles.activeStatValue}>{primaryActiveTable.my_chips || 0}</Text>
              </View>
              <View style={styles.activeStatItem}>
                <Text style={styles.activeStatLabel}>Role</Text>
                <Text style={styles.activeStatValue}>{primaryActiveTable.player_role}</Text>
              </View>
              <View style={styles.activeStatItem}>
                <Text style={styles.activeStatLabel}>Status</Text>
                <Text style={styles.activeStatValue}>{primaryActiveTable.status}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={() => onOpenLiveTable(primaryActiveTable.id)}
            >
              <Play size={18} color="#FFF" fill="#FFF" />
              <Text style={styles.continueButtonText}>Continue Live Game</Text>
              <ArrowRight size={18} color="#FFF" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            {activeTables.length > 1 && (
              <View style={styles.otherActiveTablesBox}>
                <Text style={styles.otherActiveTablesTitle}>
                  You have {activeTables.length - 1} other active table{activeTables.length > 2 ? 's' : ''}:
                </Text>
                {activeTables.slice(1).map(otherTable => (
                  <TouchableOpacity
                    key={otherTable.id}
                    style={styles.otherTableRow}
                    onPress={() => onOpenLiveTable(otherTable.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.otherTableName}>{otherTable.name} (#{otherTable.join_code})</Text>
                      <Text style={styles.otherTableDetail}>Role: {otherTable.player_role} • {otherTable.status}</Text>
                    </View>
                    <Text style={styles.otherTableOpenLink}>Open & Settle / Delete →</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.createCard}>
            <View style={styles.createCardContent}>
              <Text style={styles.createCardTitle}>Ready for game night?</Text>
              <Text style={styles.createCardSubtitle}>
                Host a game with 100 physical chips and zero math.
              </Text>
            </View>
            <TouchableOpacity style={styles.createButton} onPress={onCreateTable}>
              <Plus size={18} color="#FFF" />
              <Text style={styles.createButtonText}>Create Table</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* JOIN TABLE SECTION */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Join Game</Text>
          <Text style={styles.sectionSubtitle}>Enter the 5-character table code from your host</Text>

          {joinError && <Text style={styles.errorText}>{joinError}</Text>}

          <View style={styles.joinInputRow}>
            <TextInput
              style={styles.joinInput}
              placeholder="e.g. A7K92"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              maxLength={6}
              value={joinCodeInput}
              onChangeText={setJoinCodeInput}
            />
            <TouchableOpacity
              style={[styles.joinBtn, !joinCodeInput.trim() && { opacity: 0.6 }]}
              onPress={handleQuickJoin}
              disabled={!joinCodeInput.trim()}
            >
              <Text style={styles.joinBtnText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* YOUR STATS SUMMARY */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Trophy size={18} color={colors.chipGold} />
              <Text style={styles.statsCardTitle}>Career Highlights</Text>
            </View>
            <TouchableOpacity onPress={onOpenLeaderboard}>
              <Text style={styles.viewLeaderboardText}>Friend Leaderboard →</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Lifetime Net</Text>
              <Text
                style={[
                  styles.statNumber,
                  { color: netWinnings > 0 ? colors.successText : netWinnings < 0 ? colors.dangerText : colors.text }
                ]}
              >
                {netWinnings >= 0 ? `+₹${netWinnings.toLocaleString('en-IN')}` : `-₹${Math.abs(netWinnings).toLocaleString('en-IN')}`}
              </Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Games Played</Text>
              <Text style={styles.statNumber}>{stats.games_played || 0}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Win Rate</Text>
              <Text style={styles.statNumber}>{stats.win_rate || 0}%</Text>
            </View>
          </View>
        </View>

        {/* RECENT GAMES */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Recent Games</Text>
            {recentCompleted.length > 0 && (
              <TouchableOpacity onPress={onOpenGameHistory}>
                <Text style={styles.viewAllText}>View All ({recentCompleted.length})</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentCompleted.length === 0 ? (
            <View style={styles.emptyRecentBox}>
              <History size={28} color={colors.textMuted} />
              <Text style={styles.emptyRecentText}>Your completed games will appear here.</Text>
            </View>
          ) : (
            recentCompleted.slice(0, 3).map(game => (
              <TouchableOpacity
                key={game.id}
                style={styles.recentGameItem}
                onPress={() => (onOpenSummary ? onOpenSummary(game.id) : onOpenGameHistory())}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.recentGameName}>{game.name}</Text>
                  <Text style={styles.recentGameMeta}>
                    {game.game_type === 'TEEN_PATTI' ? 'Teen Patti' : 'Poker'} • Host: {game.host_name}
                  </Text>
                  {(game.finalized_at || game.created_at) && (
                    <Text style={styles.recentGameDate}>
                      📅 {formatGameDateTime(game.finalized_at || game.created_at)}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.recentGameNet,
                      { color: (game.net_winnings_money || 0) >= 0 ? colors.successText : colors.dangerText }
                    ]}
                  >
                    {(game.net_winnings_money || 0) >= 0 ? `+₹${game.net_winnings_money || 0}` : `-₹${Math.abs(game.net_winnings_money || 0)}`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={styles.finalizedBadge}>Finalized</Text>
                    <ArrowRight size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Floating Create Table Button if no active table */}
      {primaryActiveTable && (
        <TouchableOpacity style={styles.floatingCreateBtn} onPress={onCreateTable}>
          <Plus size={20} color="#FFF" />
          <Text style={styles.floatingCreateBtnText}>New Table</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  welcomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 8
  },
  headerUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4
  },
  headerUpdateBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.2
  },
  themeToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center'
  },
  homeUpdateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1712',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4
  },
  homeUpdateIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  homeUpdateTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -0.2
  },
  homeUpdateSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15
  },
  homeUpdateActionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  homeUpdateActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF'
  },
  headerChipIcon: {
    width: 42,
    height: 42
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder
  },
  greetingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  friendCodeBadge: {
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center'
  },
  friendCodeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8
  },
  friendCodeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 1
  },
  activeGameCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder
  },
  activeGameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.successBorder
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.successText,
    marginRight: 6
  },
  liveLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.successText,
    letterSpacing: 0.5
  },
  gameCodePill: {
    backgroundColor: colors.cardInset,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  gameCodeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 1
  },
  activeGameTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  activeGameSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    marginBottom: 16,
    fontWeight: '500'
  },
  activeGameStatsRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  activeStatItem: {
    flex: 1
  },
  activeStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500'
  },
  activeStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2
  },
  continueButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 6
  },
  createCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  createCardContent: {
    flex: 1,
    paddingRight: 12
  },
  createCardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3
  },
  createCardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3
  },
  createButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12
  },
  createButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 4
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12
  },
  joinInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  joinInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 2,
    color: colors.text
  },
  joinBtn: {
    flexShrink: 0,
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  joinBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  },
  errorText: {
    fontSize: 12,
    color: colors.dangerText,
    marginBottom: 8,
    fontWeight: '500'
  },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  statsCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 6
  },
  viewLeaderboardText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statBox: {
    flex: 1
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500'
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 4
  },
  recentSection: {
    marginBottom: 20
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  viewAllText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600'
  },
  emptyRecentBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  emptyRecentText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8
  },
  recentGameItem: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center'
  },
  recentGameName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  recentGameMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  recentGameDate: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4
  },
  recentGameNet: {
    fontSize: 15,
    fontWeight: '800'
  },
  finalizedBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2
  },
  floatingCreateBtn: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6
  },
  floatingCreateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 6
  },
  otherActiveTablesBox: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark
  },
  otherActiveTablesTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.chipGold,
    marginBottom: 8
  },
  otherTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 10,
    padding: 10,
    marginBottom: 6
  },
  otherTableName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  otherTableDetail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  otherTableOpenLink: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 8
  }
});
