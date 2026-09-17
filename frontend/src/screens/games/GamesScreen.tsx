import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import {
  History,
  Search,
  Trophy,
  TrendingDown,
  ArrowRight,
  Filter,
  Calendar,
  User as UserIcon,
  Gamepad2,
  RefreshCw
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';
import { formatGameDateTime } from '../home/HomeScreen';

interface GamesScreenProps {
  onOpenSummary: (tableId: string) => void;
  onBackToHome?: () => void;
}

type FilterType = 'ALL' | 'POKER' | 'TEEN_PATTI' | 'WON' | 'LOST';

export const GamesScreen: React.FC<GamesScreenProps> = ({
  onOpenSummary,
  onBackToHome
}) => {
  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');

  const isMasterAdmin = Boolean(user?.is_master_admin);

  const fetchGames = async () => {
    try {
      const res = await apiRequest('/tables/history');
      if (res.success && Array.isArray(res.tables)) {
        setGames(res.tables);
      } else if (res.success && Array.isArray(res.history)) {
        setGames(res.history);
      }
    } catch (err) {
      console.warn('Failed to load games list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchGames();
    setRefreshing(false);
  };

  // Filtered and searched games
  const filteredGames = useMemo(() => {
    return games.filter(game => {
      // Filter by type or outcome
      if (activeFilter === 'POKER' && game.game_type !== 'POKER') return false;
      if (activeFilter === 'TEEN_PATTI' && game.game_type !== 'TEEN_PATTI') return false;
      if (activeFilter === 'WON' && (game.net_winnings_money || 0) <= 0) return false;
      if (activeFilter === 'LOST' && (game.net_winnings_money || 0) >= 0) return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (game.name || '').toLowerCase().includes(q);
        const matchHost = (game.host_name || '').toLowerCase().includes(q);
        const matchType = (game.game_type || '').toLowerCase().includes(q);
        return matchName || matchHost || matchType;
      }

      return true;
    });
  }, [games, activeFilter, searchQuery]);

  // Overall Stats from loaded games
  const stats = useMemo(() => {
    const total = games.length;
    const wins = games.filter(g => (g.net_winnings_money || 0) > 0).length;
    const totalNet = games.reduce((acc, g) => acc + (Number(g.net_winnings_money) || 0), 0);
    return { total, wins, totalNet };
  }, [games]);

  return (
    <View style={styles.container}>
      <Header
        title="Games"
        subtitle={`${games.length} completed session${games.length === 1 ? '' : 's'}`}
        onBack={onBackToHome}
        rightAction={
          <TouchableOpacity
            style={styles.refreshIconBtn}
            onPress={onRefresh}
            activeOpacity={0.7}
            accessibilityLabel="Refresh Games List"
          >
            <RefreshCw size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Highlights Row */}
        {games.length > 0 && (
          <View style={styles.statsSummaryRow}>
            <View style={styles.statSummaryBox}>
              <Text style={styles.statSummaryLabel}>Total Games</Text>
              <Text style={styles.statSummaryValue}>{stats.total}</Text>
            </View>
            <View style={styles.statSummaryBox}>
              <Text style={styles.statSummaryLabel}>Victories</Text>
              <Text style={[styles.statSummaryValue, { color: colors.successText }]}>{stats.wins}</Text>
            </View>
            <View style={styles.statSummaryBox}>
              <Text style={styles.statSummaryLabel}>Net Profit/Loss</Text>
              <Text
                style={[
                  styles.statSummaryValue,
                  { color: stats.totalNet > 0 ? colors.successText : stats.totalNet < 0 ? colors.dangerText : colors.text }
                ]}
              >
                {stats.totalNet >= 0 ? `+₹${stats.totalNet.toLocaleString('en-IN')}` : `-₹${Math.abs(stats.totalNet).toLocaleString('en-IN')}`}
              </Text>
            </View>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchBarWrap}>
          <Search size={17} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by table name, host, or game..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills (Compact, wrapping to fit all screens without scrolling) */}
        <View style={styles.filtersWrap}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'ALL' && styles.filterPillActive]}
            onPress={() => setActiveFilter('ALL')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === 'ALL' && styles.filterPillTextActive]}>
              All ({games.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'POKER' && styles.filterPillActive]}
            onPress={() => setActiveFilter('POKER')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === 'POKER' && styles.filterPillTextActive]}>
              Poker
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'TEEN_PATTI' && styles.filterPillActive]}
            onPress={() => setActiveFilter('TEEN_PATTI')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterPillText, activeFilter === 'TEEN_PATTI' && styles.filterPillTextActive]}>
              Teen Patti
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'WON' && styles.filterPillActiveWon]}
            onPress={() => setActiveFilter('WON')}
            activeOpacity={0.7}
          >
            <Trophy size={12} color={activeFilter === 'WON' ? '#10b981' : colors.textMuted} style={{ marginRight: 3 }} />
            <Text style={[styles.filterPillText, activeFilter === 'WON' && styles.filterPillTextActiveWon]}>
              Won
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'LOST' && styles.filterPillActiveLost]}
            onPress={() => setActiveFilter('LOST')}
            activeOpacity={0.7}
          >
            <TrendingDown size={12} color={activeFilter === 'LOST' ? '#ef4444' : colors.textMuted} style={{ marginRight: 3 }} />
            <Text style={[styles.filterPillText, activeFilter === 'LOST' && styles.filterPillTextActiveLost]}>
              Lost
            </Text>
          </TouchableOpacity>
        </View>

        {/* Games List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading completed games...</Text>
          </View>
        ) : filteredGames.length === 0 ? (
          <View style={styles.emptyContainer}>
            <History size={48} color={colors.textMuted} style={{ marginBottom: 14 }} />
            <Text style={styles.emptyTitle}>
              {games.length === 0 ? 'No Completed Games Yet' : 'No Matching Games Found'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {games.length === 0
                ? 'When a game table is finalized and settled, its full results and debt breakdown will appear here.'
                : 'Try adjusting your search terms or filter selection.'}
            </Text>
          </View>
        ) : (
          filteredGames.map(game => {
            const netMoney = Number(game.net_winnings_money) || 0;
            const isWin = netMoney > 0;
            const isLoss = netMoney < 0;

            return (
              <TouchableOpacity
                key={game.id}
                style={styles.gameCard}
                onPress={() => onOpenSummary(game.id)}
                activeOpacity={0.75}
              >
                <View style={styles.gameCardTopRow}>
                  <View style={styles.gameTypeBadge}>
                    <Gamepad2 size={13} color={colors.primary} style={{ marginRight: 4 }} />
                    <Text style={styles.gameTypeBadgeText}>
                      {game.game_type === 'TEEN_PATTI' ? 'Teen Patti' : 'Poker'}
                    </Text>
                  </View>

                  <Text style={styles.gameDateText}>
                    📅 {formatGameDateTime(game.finalized_at || game.created_at)}
                  </Text>
                </View>

                <View style={styles.gameCardMainRow}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={styles.gameNameText} numberOfLines={1}>
                      {game.name}
                    </Text>
                    <Text style={styles.gameHostText}>
                      Host: <Text style={{ color: colors.text }}>{game.host_name || 'Host'}</Text>
                      {game.player_role ? ` • You were ${game.player_role}` : ''}
                    </Text>
                  </View>

                  <View style={styles.gameNetColumn}>
                    <Text
                      style={[
                        styles.gameNetText,
                        { color: isWin ? colors.successText : isLoss ? colors.dangerText : colors.textMuted }
                      ]}
                    >
                      {isWin ? `+₹${netMoney.toLocaleString('en-IN')}` : isLoss ? `-₹${Math.abs(netMoney).toLocaleString('en-IN')}` : '₹0'}
                    </Text>
                    <View style={styles.viewSummaryCta}>
                      <Text style={styles.viewSummaryCtaText}>View Summary</Text>
                      <ArrowRight size={13} color={colors.primary} style={{ marginLeft: 3 }} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
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
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  statsSummaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16
  },
  statSummaryBox: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center'
  },
  statSummaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  statSummaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text
  },
  searchBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    padding: 0
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.textMuted,
    fontWeight: '700',
    paddingHorizontal: 4
  },
  filtersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  filterPillActiveWon: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981'
  },
  filterPillActiveLost: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#ef4444'
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  filterPillTextActive: {
    color: '#FFF'
  },
  filterPillTextActiveWon: {
    color: '#10b981'
  },
  filterPillTextActiveLost: {
    color: '#ef4444'
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: colors.textSecondary
  },
  emptyContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: 10
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center'
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 320
  },
  gameCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginBottom: 12
  },
  gameCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  gameTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardRaised,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  gameTypeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  },
  gameDateText: {
    fontSize: 11,
    color: colors.textMuted
  },
  gameCardMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  gameNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4
  },
  gameHostText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  gameNetColumn: {
    alignItems: 'flex-end'
  },
  gameNetText: {
    fontSize: 16,
    fontWeight: '800'
  },
  viewSummaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  viewSummaryCtaText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  }
});
