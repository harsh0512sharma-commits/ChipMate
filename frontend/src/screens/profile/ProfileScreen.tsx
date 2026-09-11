import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform
} from 'react-native';
import {
  User,
  Copy,
  Check,
  Trophy,
  Flame,
  Coins,
  TrendingUp,
  LogOut,
  Sliders,
  Sparkles
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { getDefaultApiBase, setCustomApiBase } from '../../api/client';

export const ProfileScreen: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(getDefaultApiBase());

  const stats = user?.stats || {};
  const netWinnings = stats.net_winnings || 0;
  const netChips = stats.net_chips || 0;

  const handleCopyCode = () => {
    if (user?.friend_code && Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(user.friend_code);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveApiBase = async () => {
    try {
      await setCustomApiBase(customApiUrl);
      Alert.alert('Saved', 'API Base URL updated.');
      setShowSettings(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save URL');
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Profile & Stats"
        rightAction={
          <TouchableOpacity onPress={() => setShowSettings(prev => !prev)} style={styles.settingsBtn}>
            <Sliders size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <Text style={styles.displayName}>{user?.display_name}</Text>
          <Text style={styles.emailText}>{user?.email}</Text>

          {/* Friend Code Box */}
          <TouchableOpacity style={styles.friendCodeBox} onPress={handleCopyCode}>
            <Text style={styles.codeLabel}>YOUR UNIQUE FRIEND CODE</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>#{user?.friend_code}</Text>
              {copied ? (
                <Check size={16} color={colors.successText} style={{ marginLeft: 6 }} />
              ) : (
                <Copy size={16} color={colors.primary} style={{ marginLeft: 6 }} />
              )}
            </View>
            <Text style={styles.copyHint}>{copied ? 'Copied to clipboard!' : 'Tap to copy and share'}</Text>
          </TouchableOpacity>
        </View>

        {/* Server Endpoint Settings (Toggled) */}
        {showSettings && (
          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>Backend Server Connection</Text>
            <Text style={styles.settingsSub}>
              Change this if testing from a physical phone on your local Wi-Fi:
            </Text>
            <TextInput
              style={styles.apiInput}
              value={customApiUrl}
              onChangeText={setCustomApiUrl}
              placeholder="http://192.168.x.x:4000/api"
            />
            <TouchableOpacity style={styles.saveApiBtn} onPress={handleSaveApiBase}>
              <Text style={styles.saveApiBtnText}>Save API URL</Text>
            </TouchableOpacity>
          </View>
        )}

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

        {/* CHIP STATISTICS (Separately tracked from ₹) */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
            <Coins size={16} color={colors.chipGold} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>LIFETIME CHIP STATS</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Separately tracked because chip rupee value varies across tables
          </Text>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Net Chips</Text>
              <Text style={[styles.gridVal, { color: netChips >= 0 ? colors.successText : colors.dangerText }]}>
                {netChips >= 0 ? `+${netChips}` : netChips}
              </Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Won Chips</Text>
              <Text style={styles.gridVal}>+{stats.total_chips_won || 0}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Lost Chips</Text>
              <Text style={styles.gridVal}>-{stats.total_chips_lost || 0}</Text>
            </View>
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

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={16} color={colors.dangerText} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Sign Out of ChipMate</Text>
        </TouchableOpacity>
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
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center'
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
  settingsCard: {
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  settingsSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 8
  },
  apiInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: colors.text
  },
  saveApiBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 9,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8
  },
  saveApiBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700'
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
  }
});
