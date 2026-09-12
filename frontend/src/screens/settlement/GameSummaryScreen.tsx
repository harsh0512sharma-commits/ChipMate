import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Trophy, TrendingDown, HandCoins, ArrowRight, Home, History } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { formatTxSummary } from '../table/LiveTableScreen';

interface GameSummaryScreenProps {
  gameId: string;
  onGoHome: () => void;
  onGoLeaderboard: () => void;
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

export const GameSummaryScreen: React.FC<GameSummaryScreenProps> = ({
  gameId,
  onGoHome,
  onGoLeaderboard
}) => {
  const [insights, setInsights] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllTx, setShowAllTx] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [insightsRes, txRes] = await Promise.allSettled([
          apiRequest(`/stats/game-insights/${gameId}`),
          apiRequest(`/tables/${gameId}/transactions`)
        ]);

        if (insightsRes.status === 'fulfilled' && insightsRes.value.success) {
          setInsights(insightsRes.value.insights);
        }
        if (txRes.status === 'fulfilled' && txRes.value.success) {
          setTransactions(txRes.value.transactions || []);
        }
      } catch (err) {
        console.warn('Failed to load summary details:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [gameId]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Celebration Banner */}
        <View style={styles.heroCard}>
          <Text style={styles.confetti}>🎉</Text>
          <Text style={styles.heroTitle}>Game Complete!</Text>
          <Text style={styles.heroSubtitle}>Results have been locked and added to player histories.</Text>

          {insights?.gameName && (
            <View style={styles.gameMetaBox}>
              <Text style={styles.gameMetaName}>{insights.gameName}</Text>
              <Text style={styles.gameMetaDate}>
                {insights.gameType === 'TEEN_PATTI' ? 'Teen Patti' : 'Poker'} • Played {formatGameDateTime(insights.finalizedAt || insights.createdAt)}
              </Text>
            </View>
          )}

          {insights?.winner && (
            <View style={styles.winnerBox}>
              <Trophy size={28} color={colors.chipGold} />
              <Text style={styles.winnerLabel}>CHAMPION</Text>
              <Text style={styles.winnerName}>{insights.winner.displayName}</Text>
              <Text style={styles.winnerNet}>+₹{insights.winner.netWinnings.toLocaleString('en-IN')}</Text>
            </View>
          )}
        </View>

        {/* Game Highlights */}
        <View style={styles.highlightsCard}>
          <Text style={styles.highlightsHeader}>GAME HIGHLIGHTS</Text>

          {insights?.winner && (
            <View style={styles.highlightItem}>
              <View style={[styles.highlightIcon, { backgroundColor: colors.successLight }]}>
                <Trophy size={16} color={colors.successText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.highlightLabel}>Biggest Winner</Text>
                <Text style={styles.highlightValue}>
                  {insights.winner.displayName} (+₹{insights.winner.netWinnings})
                </Text>
              </View>
            </View>
          )}

          {insights?.loser && (
            <View style={styles.highlightItem}>
              <View style={[styles.highlightIcon, { backgroundColor: colors.dangerLight }]}>
                <TrendingDown size={16} color={colors.dangerText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.highlightLabel}>Toughest Beat</Text>
                <Text style={styles.highlightValue}>
                  {insights.loser.displayName} (-₹{insights.loser.netLoss})
                </Text>
              </View>
            </View>
          )}

          {insights?.mostBorrowed && (
            <View style={styles.highlightItem}>
              <View style={[styles.highlightIcon, { backgroundColor: colors.warningLight }]}>
                <HandCoins size={16} color={colors.warningText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.highlightLabel}>Most Borrowed Chips</Text>
                <Text style={styles.highlightValue}>
                  {insights.mostBorrowed.displayName} ({insights.mostBorrowed.chipsBorrowed} chips)
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Transaction History & Audit Card */}
        <View style={styles.auditCard}>
          <View style={styles.auditHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <History size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.auditTitle}>Game Transaction History</Text>
            </View>
            <View style={styles.txCountBadge}>
              <Text style={styles.txCountText}>{transactions.length} events</Text>
            </View>
          </View>

          {transactions.length === 0 ? (
            <Text style={styles.emptyTxText}>No transactions recorded for this game.</Text>
          ) : (
            <View style={{ marginTop: 8 }}>
              {(showAllTx ? transactions : transactions.slice(0, 5)).map((tx: any) => {
                const summary = formatTxSummary(tx);
                return (
                  <View key={tx.id} style={styles.txItemRow}>
                    <Text style={styles.txItemIcon}>{summary.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txItemTitle}>{summary.title}</Text>
                      <Text style={styles.txItemDetail}>
                        {summary.subtitle} • Recorded by {tx.actor_name}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <Text style={styles.txItemDate}>
                        {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={styles.txItemTime}>
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {transactions.length > 5 && (
                <TouchableOpacity
                  style={styles.toggleTxBtn}
                  onPress={() => setShowAllTx(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleTxBtnText}>
                    {showAllTx ? 'Show Less' : `View All ${transactions.length} Transactions`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Buttons */}
        <TouchableOpacity style={styles.leaderboardBtn} onPress={onGoLeaderboard}>
          <Text style={styles.leaderboardBtnText}>View Friend Leaderboard</Text>
          <ArrowRight size={18} color="#FFF" style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.homeBtn} onPress={onGoHome}>
          <Home size={18} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={styles.homeBtnText}>Return to Home</Text>
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
    padding: 20,
    paddingTop: 30,
    paddingBottom: 40
  },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  confetti: {
    fontSize: 36,
    marginBottom: 8
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20
  },
  winnerBox: {
    backgroundColor: colors.cardInset,
    width: '100%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  winnerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.chipGoldText,
    letterSpacing: 1.5,
    marginTop: 6
  },
  winnerName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2
  },
  winnerNet: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.successText,
    marginTop: 4,
    letterSpacing: -0.5
  },
  highlightsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  highlightsHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 14
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  highlightIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  highlightLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500'
  },
  highlightValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1
  },
  leaderboardBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 12
  },
  leaderboardBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF'
  },
  homeBtn: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14
  },
  homeBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  auditCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  auditHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  auditTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  txCountBadge: {
    backgroundColor: colors.cardInset,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  txCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted
  },
  emptyTxText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 10,
    textAlign: 'center'
  },
  txItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  txItemIcon: {
    fontSize: 16,
    marginRight: 10
  },
  txItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  txItemDetail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  gameMetaBox: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center'
  },
  gameMetaName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text
  },
  gameMetaDate: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4
  },
  txItemDate: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2
  },
  txItemTime: {
    fontSize: 10,
    color: colors.textMuted
  },
  toggleTxBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6
  },
  toggleTxBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  }
});
