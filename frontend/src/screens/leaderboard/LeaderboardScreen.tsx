import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image
} from 'react-native';
import { Trophy, Medal, Award, Flame } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { Header } from '../../components/Header';

export const LeaderboardScreen: React.FC = () => {
  const [sortBy, setSortBy] = useState<'NET_WINNINGS' | 'WIN_RATE' | 'GAMES_PLAYED' | 'BIGGEST_WIN'>('NET_WINNINGS');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = async () => {
    try {
      const res = await apiRequest(`/stats/leaderboard?sortBy=${sortBy}`);
      if (res.success) {
        setLeaderboard(res.leaderboard || []);
      }
    } catch (err) {
      console.warn('Failed to load leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
  }, [sortBy]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadLeaderboard();
    setRefreshing(false);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Text style={styles.rankMedal}>🥇</Text>;
    if (rank === 2) return <Text style={styles.rankMedal}>🥈</Text>;
    if (rank === 3) return <Text style={styles.rankMedal}>🥉</Text>;
    return <Text style={styles.rankNum}>#{rank}</Text>;
  };

  return (
    <View style={styles.container}>
      <Header
        title="Friend Leaderboard"
        subtitle="Ranked among your accepted friend network"
      />

      {/* Tabs */}
      <View style={styles.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setSortBy('NET_WINNINGS')}
            style={[styles.tab, sortBy === 'NET_WINNINGS' && styles.tabActive]}
          >
            <Text style={[styles.tabText, sortBy === 'NET_WINNINGS' && styles.tabTextActive]}>Net Winnings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSortBy('WIN_RATE')}
            style={[styles.tab, sortBy === 'WIN_RATE' && styles.tabActive]}
          >
            <Text style={[styles.tabText, sortBy === 'WIN_RATE' && styles.tabTextActive]}>Win Rate</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSortBy('GAMES_PLAYED')}
            style={[styles.tab, sortBy === 'GAMES_PLAYED' && styles.tabActive]}
          >
            <Text style={[styles.tabText, sortBy === 'GAMES_PLAYED' && styles.tabTextActive]}>Games</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSortBy('BIGGEST_WIN')}
            style={[styles.tab, sortBy === 'BIGGEST_WIN' && styles.tabActive]}
          >
            <Text style={[styles.tabText, sortBy === 'BIGGEST_WIN' && styles.tabTextActive]}>Biggest Win</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : leaderboard.length === 0 ? (
          <View style={styles.emptyCard}>
            <Trophy size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No games finalized yet</Text>
            <Text style={styles.emptySub}>
              Play and finalize games with friends to start ranking on the leaderboard!
            </Text>
          </View>
        ) : (
          leaderboard.map(item => {
            const isSelf = item.isSelf;
            const net = item.netWinnings || 0;
            return (
              <View
                key={item.id}
                style={[styles.leaderboardRow, isSelf && styles.leaderboardRowSelf]}
              >
                <View style={styles.rankContainer}>
                  {getRankBadge(item.rank)}
                </View>

                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.rankAvatarImage} />
                ) : (
                  <View style={styles.rankAvatar}>
                    <Text style={styles.rankAvatarText}>
                      {item.displayName ? item.displayName.charAt(0).toUpperCase() : 'P'}
                    </Text>
                  </View>
                )}

                <View style={styles.infoContainer}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.playerName}>{item.displayName}</Text>
                    {isSelf && <Text style={styles.youBadge}>(You)</Text>}
                  </View>
                  <Text style={styles.playerStats}>
                    {item.gamesPlayed} games • {item.winRate}% win rate
                    {item.currentStreak > 1 && ` • 🔥 ${item.currentStreak} streak`}
                  </Text>
                </View>

                <View style={styles.scoreContainer}>
                  {sortBy === 'NET_WINNINGS' && (
                    <Text
                      style={[
                        styles.primaryScore,
                        { color: net >= 0 ? colors.successText : colors.dangerText }
                      ]}
                    >
                      {net >= 0 ? `+₹${net.toLocaleString('en-IN')}` : `-₹${Math.abs(net).toLocaleString('en-IN')}`}
                    </Text>
                  )}
                  {sortBy === 'WIN_RATE' && (
                    <Text style={[styles.primaryScore, { color: colors.primary }]}>
                      {item.winRate}%
                    </Text>
                  )}
                  {sortBy === 'GAMES_PLAYED' && (
                    <Text style={[styles.primaryScore, { color: colors.text }]}>
                      {item.gamesPlayed}
                    </Text>
                  )}
                  {sortBy === 'BIGGEST_WIN' && (
                    <Text style={[styles.primaryScore, { color: colors.successText }]}>
                      +₹{item.biggestWin.toLocaleString('en-IN')}
                    </Text>
                  )}
                  <Text style={styles.chipsLabel}>{item.netChips >= 0 ? `+${item.netChips}` : item.netChips} chips</Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  tabsWrapper: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.cardInset,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  tabActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: 20
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 10,
    letterSpacing: -0.2
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4
  },
  leaderboardRow: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center'
  },
  leaderboardRowSelf: {
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryLight
  },
  rankContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6
  },
  rankAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  rankAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    marginRight: 10
  },
  rankAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary
  },
  rankMedal: {
    fontSize: 20
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMuted
  },
  infoContainer: {
    flex: 1
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  youBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4
  },
  playerStats: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  scoreContainer: {
    alignItems: 'flex-end'
  },
  primaryScore: {
    fontSize: 16,
    fontWeight: '800'
  },
  chipsLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  }
});
