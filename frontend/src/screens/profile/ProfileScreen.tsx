import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import {
  User,
  Copy,
  Check,
  Trophy,
  Flame,
  TrendingUp,
  LogOut,
  Sparkles,
  Edit2,
  History,
  ArrowRight
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { apiRequest } from '../../api/client';
import { APP_BUILD_VERSION } from '../../version';

interface ProfileScreenProps {
  onOpenSummary?: (gameId: string) => void;
}

function formatGameDateTime(dateStr?: string): string {
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

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onOpenSummary }) => {
  const { user, logout, refreshUser, updateUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.display_name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<any[]>([]);

  useEffect(() => {
    refreshUser();
    apiRequest('/tables/history')
      .then(res => {
        if (res.success && res.history) setGameHistory(res.history);
      })
      .catch(err => console.warn('Failed to fetch profile game history:', err));
  }, []);

  const stats = user?.stats || {};
  const netWinnings = stats.net_winnings || 0;

  const handleCopyCode = () => {
    const codeToCopy = user?.phone_number || user?.friend_code || '';
    if (codeToCopy && Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(codeToCopy);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    setNameError(null);
    setSavingName(true);
    try {
      const res = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: { displayName: trimmed }
      });
      if (res.success && res.user) {
        updateUser(res.user);
        setIsEditingName(false);
        Alert.alert('Success', 'Profile name updated successfully!');
      } else {
        setNameError(res.error || 'Failed to update name');
      }
    } catch (err: any) {
      setNameError(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Profile & Stats" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          {/* Name Display & Editing */}
          {isEditingName ? (
            <View style={styles.editNameBox}>
              <Text style={styles.editNameLabel}>FULL / DISPLAY NAME</Text>
              <TextInput
                style={styles.nameInput}
                value={newName}
                onChangeText={(text) => {
                  setNewName(text);
                  setNameError(null);
                }}
                placeholder="Enter your name"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              {nameError && <Text style={styles.nameErrorText}>{nameError}</Text>}
              <View style={styles.editNameBtnRow}>
                <TouchableOpacity
                  style={[styles.saveNameBtn, savingName && { opacity: 0.6 }]}
                  onPress={handleSaveName}
                  disabled={savingName}
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveNameBtnText}>Save Name</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelNameBtn}
                  onPress={() => {
                    setIsEditingName(false);
                    setNewName(user?.display_name || '');
                    setNameError(null);
                  }}
                  disabled={savingName}
                >
                  <Text style={styles.cancelNameBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{user?.display_name || 'Player'}</Text>
              <TouchableOpacity
                style={styles.editNameBtn}
                onPress={() => {
                  setNewName(user?.display_name || '');
                  setNameError(null);
                  setIsEditingName(true);
                }}
              >
                <Edit2 size={13} color={colors.primary} />
                <Text style={styles.editNameBtnText}>Edit Name</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.emailText}>{user?.email}</Text>

          {/* Unique Friend Code Box (Mobile Number) */}
          <TouchableOpacity style={styles.friendCodeBox} onPress={handleCopyCode} activeOpacity={0.8}>
            <Text style={styles.codeLabel}>YOUR UNIQUE FRIEND CODE (MOBILE NO.)</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{user?.phone_number || user?.friend_code || 'N/A'}</Text>
              {copied ? (
                <Check size={18} color={colors.successText} style={{ marginLeft: 8 }} />
              ) : (
                <Copy size={18} color={colors.primary} style={{ marginLeft: 8 }} />
              )}
            </View>
            <Text style={styles.copyHint}>
              {copied ? 'Copied to clipboard!' : 'Friends can add you using this 10-digit number'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* LIFETIME FINANCIAL CAREER STATS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>LIFETIME FINANCIAL CAREER</Text>
          <Text style={styles.sectionSubtitle}>Generated strictly from finalized games</Text>

          <View style={styles.heroNetBox}>
            <Text style={styles.heroNetLabel}>NET PROFIT / LOSS</Text>
            <Text
              style={[
                styles.heroNetValue,
                { color: netWinnings >= 0 ? colors.successText : colors.dangerText }
              ]}
            >
              {netWinnings >= 0 ? `+₹${netWinnings.toLocaleString('en-IN')}` : `-₹${Math.abs(netWinnings).toLocaleString('en-IN')}`}
            </Text>
            <Text style={styles.heroAvgLabel}>
              Avg per game: {stats.avg_profit_per_game >= 0 ? '+' : ''}₹{stats.avg_profit_per_game || 0}
            </Text>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Games Played</Text>
              <Text style={styles.gridVal}>{stats.games_played || 0}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Win Rate</Text>
              <Text style={styles.gridVal}>{stats.win_rate || 0}%</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Wins / Losses</Text>
              <Text style={styles.gridVal}>
                {stats.games_won || 0}W - {stats.games_lost || 0}L
              </Text>
            </View>
          </View>
        </View>

        {/* RECORDS & STREAKS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RECORDS & STREAKS</Text>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Biggest Win</Text>
            <Text style={[styles.statValue, { color: colors.successText }]}>
              +₹{(stats.biggest_win || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Biggest Loss</Text>
            <Text style={[styles.statValue, { color: colors.dangerText }]}>
              -₹{(stats.biggest_loss || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Best Winning Streak</Text>
            <Text style={styles.statValue}>{stats.best_winning_streak || 0} games</Text>
          </View>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Current Streak</Text>
            <Text style={styles.statValue}>
              {stats.current_streak > 0
                ? `🔥 ${stats.current_streak} Win Streak`
                : stats.current_streak < 0
                ? `❄️ ${Math.abs(stats.current_streak)} Loss Streak`
                : 'Even'}
            </Text>
          </View>
        </View>

        {/* GAME TYPE BREAKDOWN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>GAME TYPE PERFORMANCE</Text>

          <View style={styles.gameTypeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gtTitle}>Teen Patti</Text>
              <Text style={styles.gtMeta}>
                {stats.teen_patti_games || 0} games • {stats.teen_patti_wins || 0} wins
              </Text>
            </View>
            <Text
              style={[
                styles.gtNet,
                { color: (stats.teen_patti_net || 0) >= 0 ? colors.successText : colors.dangerText }
              ]}
            >
              {(stats.teen_patti_net || 0) >= 0 ? `+₹${stats.teen_patti_net || 0}` : `-₹${Math.abs(stats.teen_patti_net || 0)}`}
            </Text>
          </View>

          <View style={[styles.gameTypeRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gtTitle}>Poker</Text>
              <Text style={styles.gtMeta}>
                {stats.poker_games || 0} games • {stats.poker_wins || 0} wins
              </Text>
            </View>
            <Text
              style={[
                styles.gtNet,
                { color: (stats.poker_net || 0) >= 0 ? colors.successText : colors.dangerText }
              ]}
            >
              {(stats.poker_net || 0) >= 0 ? `+₹${stats.poker_net || 0}` : `-₹${Math.abs(stats.poker_net || 0)}`}
            </Text>
          </View>
        </View>

        {/* COMPLETED GAMES HISTORY */}
        <View style={styles.card}>
          <View style={styles.historyCardHeader}>
            <History size={18} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.sectionTitle}>GAME HISTORY ({gameHistory.length})</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Complete ledger of all your finalized tables</Text>

          {gameHistory.length === 0 ? (
            <Text style={styles.emptyHistoryText}>No completed games recorded yet.</Text>
          ) : (
            gameHistory.map(game => (
              <TouchableOpacity
                key={game.id}
                style={styles.historyGameItem}
                onPress={() => onOpenSummary && onOpenSummary(game.id)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.historyGameName}>{game.name}</Text>
                  <Text style={styles.historyGameMeta}>
                    {game.game_type === 'TEEN_PATTI' ? 'Teen Patti' : 'Poker'} • Host: {game.host_name}
                  </Text>
                  <Text style={styles.historyGameDate}>
                    📅 {formatGameDateTime(game.finalized_at || game.created_at)}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.historyGameNet,
                      { color: (game.net_winnings_money || 0) >= 0 ? colors.successText : colors.dangerText }
                    ]}
                  >
                    {(game.net_winnings_money || 0) >= 0 ? `+₹${game.net_winnings_money || 0}` : `-₹${Math.abs(game.net_winnings_money || 0)}`}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text style={styles.finalizedBadge}>View Summary</Text>
                    <ArrowRight size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={16} color={colors.dangerText} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Sign Out of ChipMate</Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <View style={styles.versionFooter}>
          <Text style={styles.versionFooterText}>ChipMate v{APP_BUILD_VERSION}</Text>
          <Text style={styles.versionSubText}>Zero-Sum Card Ledger • Real-Time Offline Sync</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  editNameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '33',
    marginLeft: 8
  },
  editNameBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 3
  },
  editNameBox: {
    width: '100%',
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  editNameLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6
  },
  nameInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text
  },
  nameErrorText: {
    fontSize: 11,
    color: colors.dangerText,
    marginTop: 4
  },
  editNameBtnRow: {
    flexDirection: 'row',
    marginTop: 10
  },
  saveNameBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveNameBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700'
  },
  cancelNameBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10
  },
  cancelNameBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  emailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 16
  },
  friendCodeBox: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%'
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 3
  },
  copyHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12
  },
  heroNetBox: {
    backgroundColor: colors.cardInset,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  heroNetLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1
  },
  heroNetValue: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5
  },
  heroAvgLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  gridItem: {
    flex: 1,
    alignItems: 'center'
  },
  gridLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500'
  },
  gridVal: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 3
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  gameTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  gtTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  gtMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  gtNet: {
    fontSize: 16,
    fontWeight: '800'
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  emptyHistoryText: {
    fontSize: 13,
    color: colors.textMuted,
    marginVertical: 12,
    textAlign: 'center'
  },
  historyGameItem: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.borderDark,
    flexDirection: 'row',
    alignItems: 'center'
  },
  historyGameName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  historyGameMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  historyGameDate: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 3
  },
  historyGameNet: {
    fontSize: 14,
    fontWeight: '800'
  },
  finalizedBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 2
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dangerText
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8
  },
  versionFooterText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5
  },
  versionSubText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 3
  }
});
