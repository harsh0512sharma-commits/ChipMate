import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HandCoins,
  Check,
  Lock,
  RotateCcw
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { Header } from '../../components/Header';
import { useAuth } from '../../context/AuthContext';

interface SettlementScreenProps {
  tableId: string;
  onBack: () => void;
  onGameFinalized: (gameId: string) => void;
}

export const SettlementScreen: React.FC<SettlementScreenProps> = ({
  tableId,
  onBack,
  onGameFinalized
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const loadSettlement = async () => {
    try {
      // If table is not in settling mode yet, proceed to settle
      const res = await apiRequest(`/tables/${tableId}/settle`);
      if (res.success) {
        setData(res);
      }
    } catch (err: any) {
      console.warn('Failed to load settlement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlement();
  }, [tableId]);

  const handleMarkPayment = async (itemId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'PAID' ? 'UNPAID' : 'PAID';
      await apiRequest(`/tables/${tableId}/settle/payment-status`, {
        method: 'POST',
        body: { itemId, status: newStatus }
      });
      loadSettlement();
    } catch (err: any) {
      Alert.alert('Payment Status', err.message || 'Failed to update payment status');
    }
  };

  const handleFinalize = async () => {
    Alert.alert(
      'Finalize Game?',
      'This game will become read-only and its statistics will permanently update player profiles and friend leaderboards.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Finalize & Lock',
          style: 'destructive',
          onPress: async () => {
            setIsFinalizing(true);
            try {
              const res = await apiRequest(`/tables/${tableId}/settle/finalize`, {
                method: 'POST'
              });
              if (res.success) {
                onGameFinalized(tableId);
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to finalize game');
            } finally {
              setIsFinalizing(false);
            }
          }
        }
      ]
    );
  };

  if (loading || !data) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Calculating optimal settlement...</Text>
      </View>
    );
  }

  const isFinalized = data.status === 'FINALIZED';
  const players = data.players || [];
  const optimized = data.optimizedSettlements || [];
  const loans = data.outstandingLoans || [];

  return (
    <View style={styles.container}>
      <Header
        title="Game Settlement"
        subtitle={data.tableName}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* RECONCILIATION SUMMARY CARD */}
        <View style={styles.reconcileCard}>
          <View style={styles.reconcileHeader}>
            <Text style={styles.sectionHeaderTitle}>CHIP RECONCILIATION CHECK</Text>
            {data.isReconciled ? (
              <View style={styles.reconciledPill}>
                <CheckCircle2 size={13} color={colors.successText} />
                <Text style={styles.reconciledPillText}>100% Reconciled</Text>
              </View>
            ) : (
              <View style={styles.mismatchPill}>
                <AlertTriangle size={13} color={colors.dangerText} />
                <Text style={styles.mismatchPillText}>{data.discrepancy} chip mismatch</Text>
              </View>
            )}
          </View>

          <Text style={styles.reconcileCount}>
            {data.totalAccountedChips} / {data.totalChips} Chips
          </Text>
          <Text style={styles.reconcileSub}>
            Bank holds {data.bankChips} chips • Players hold {data.totalChips - data.bankChips} chips
          </Text>
        </View>

        {/* OUTSTANDING LOANS REVIEW */}
        {loans.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <HandCoins size={16} color={colors.warningText} />
              <Text style={styles.cardTitle}>Outstanding Loans Handled in Net</Text>
            </View>
            <Text style={styles.loanExplain}>
              These loans were automatically merged into the final settlement to avoid double payments.
            </Text>

            {loans.map((l: any) => (
              <View key={l.id} style={styles.loanItem}>
                <Text style={styles.loanPlayerText}>
                  {l.borrower_name} owes {l.lender_name}
                </Text>
                <Text style={styles.loanAmountText}>
                  {l.remaining_chip_amount} chips (₹{l.moneyEquivalent})
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* FINAL PLAYER NET POSITIONS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Player Final Positions</Text>
          <Text style={styles.cardSubtitle}>Based on physical chips, buy-ins, and loan debts</Text>

          {players.map((p: any) => {
            const isWinner = p.netPosition > 0;
            const isLoser = p.netPosition < 0;
            return (
              <View key={p.playerId} style={styles.playerResultRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pResultName}>{p.displayName}</Text>
                  <Text style={styles.pResultMeta}>
                    Held: {p.finalChips} chips • Buy-in: ₹{p.totalBuyinMoney}
                    {p.netLoanImpact !== 0 && ` • Loans: ${p.netLoanImpact > 0 ? '+' : ''}₹${p.netLoanImpact}`}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text
                    style={[
                      styles.pResultNet,
                      { color: isWinner ? colors.successText : isLoser ? colors.dangerText : colors.text }
                    ]}
                  >
                    {isWinner ? `+₹${p.netPosition}` : isLoser ? `-₹${Math.abs(p.netPosition)}` : '₹0'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* OPTIMIZED SETTLEMENT PAYMENTS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Minimal Settlement Transfers</Text>
          <Text style={styles.cardSubtitle}>
            Mathematical optimization eliminates circular debt.
          </Text>

          {optimized.length === 0 ? (
            <Text style={styles.emptySettlementText}>All balances are even! No transfers required.</Text>
          ) : (
            optimized.map((item: any, idx: number) => {
              const isPaid = item.status === 'PAID';
              return (
                <View key={idx} style={styles.settleTransferItem}>
                  <View style={styles.transferFlow}>
                    <Text style={styles.transferPayer}>{item.fromDisplayName}</Text>
                    <ArrowRight size={16} color={colors.textSecondary} style={{ marginHorizontal: 8 }} />
                    <Text style={styles.transferPayee}>{item.toDisplayName}</Text>
                  </View>

                  <View style={styles.transferRight}>
                    <Text style={styles.transferAmount}>₹{item.amount}</Text>
                    {!isFinalized && (
                      <TouchableOpacity
                        onPress={() => item.id && handleMarkPayment(item.id, item.status)}
                        style={[styles.paidPill, isPaid && styles.paidPillActive]}
                      >
                        {isPaid && <Check size={11} color="#FFF" style={{ marginRight: 3 }} />}
                        <Text style={[styles.paidPillText, isPaid && styles.paidPillTextActive]}>
                          {isPaid ? 'Paid' : 'Unpaid'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Host Actions: Finalize */}
        {!isFinalized ? (
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.finalizeBtn, isFinalizing && { opacity: 0.7 }]}
              onPress={handleFinalize}
              disabled={isFinalizing}
            >
              {isFinalizing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Lock size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.finalizeBtnText}>Finalize Game & Save Stats</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.keepPlayingBtn} onPress={onBack}>
              <RotateCcw size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
              <Text style={styles.keepPlayingBtnText}>Keep Playing (Return to Table)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.finalizedNotice}>
            <Lock size={16} color={colors.textSecondary} />
            <Text style={styles.finalizedNoticeText}>
              This game is finalized. Lifetime statistics have been updated.
            </Text>
          </View>
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
  content: {
    padding: 16,
    paddingBottom: 40
  },
  reconcileCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  reconcileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8
  },
  reconciledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.successBorder
  },
  reconciledPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.successText,
    marginLeft: 4
  },
  mismatchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  mismatchPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dangerText,
    marginLeft: 4
  },
  reconcileCount: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5
  },
  reconcileSub: {
    fontSize: 12,
    color: colors.textSecondary,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12
  },
  loanExplain: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 10
  },
  loanItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.cardInset,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  loanPlayerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text
  },
  loanAmountText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.warningText
  },
  playerResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  pResultName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  pResultMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  pResultNet: {
    fontSize: 17,
    fontWeight: '800'
  },
  settleTransferItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  transferFlow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  transferPayer: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dangerText
  },
  transferPayee: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.successText
  },
  transferRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  transferAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginRight: 10
  },
  paidPill: {
    backgroundColor: colors.cardRaised,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center'
  },
  paidPillActive: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  paidPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  paidPillTextActive: {
    color: '#FFF'
  },
  emptySettlementText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 8
  },
  actionsContainer: {
    marginTop: 8
  },
  finalizeBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10
  },
  finalizeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF'
  },
  keepPlayingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  keepPlayingBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary
  },
  finalizedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  finalizedNoticeText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6
  }
});
