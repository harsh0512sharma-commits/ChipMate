import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
  TextInput
} from 'react-native';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  HandCoins,
  Check,
  Lock,
  RotateCcw,
  X,
  Edit3
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
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Edit final chip counts modal
  const [showEditChipsModal, setShowEditChipsModal] = useState(false);
  const [editChipInputs, setEditChipInputs] = useState<Record<string, string>>({});
  const [submittingChips, setSubmittingChips] = useState(false);
  const [editChipError, setEditChipError] = useState<string | null>(null);

  const loadSettlement = async () => {
    try {
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

  const handleOpenEditChips = () => {
    const initial: Record<string, string> = {};
    (data?.players || []).forEach((p: any) => {
      initial[p.playerId] = String(p.finalChips ?? 0);
    });
    setEditChipInputs(initial);
    setEditChipError(null);
    setShowEditChipsModal(true);
  };

  const handleSaveEditChips = async () => {
    setSubmittingChips(true);
    setEditChipError(null);
    try {
      const finalCounts = Object.entries(editChipInputs).map(([playerId, countStr]) => ({
        playerId,
        finalChips: parseInt(countStr || '0', 10) || 0
      }));

      const res = await apiRequest(`/tables/${tableId}/settle/chips`, {
        method: 'POST',
        body: { finalChipCounts: finalCounts }
      });

      if (res.success) {
        setShowEditChipsModal(false);
        loadSettlement();
      } else {
        setEditChipError(res.error || 'Failed to update final chip counts');
      }
    } catch (err: any) {
      setEditChipError(err.message || 'Failed to update final chip counts');
    } finally {
      setSubmittingChips(false);
    }
  };

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

  const handleFinalizePress = () => {
    if (!data.isReconciled) {
      Alert.alert(
        'Cannot Finalize',
        `Chip count mismatch: ${data.discrepancy} chip discrepancy. Final chip count must equal expected chips before finalizing.`
      );
      return;
    }
    setFinalizeError(null);
    setShowConfirmModal(true);
  };

  const performFinalize = async () => {
    setIsFinalizing(true);
    setFinalizeError(null);
    try {
      const res = await apiRequest(`/tables/${tableId}/settle/finalize`, {
        method: 'POST'
      });
      if (res.success) {
        setShowConfirmModal(false);
        onGameFinalized(tableId);
      } else {
        setFinalizeError(res.error || 'Failed to finalize game');
      }
    } catch (err: any) {
      setFinalizeError(err.message || 'Failed to finalize game');
    } finally {
      setIsFinalizing(false);
    }
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
  const isHost = !data.hostUserId || !user?.id || data.hostUserId === user?.id;
  const players = data.players || [];
  const optimized = data.optimizedSettlements || [];
  const loans = data.outstandingLoans || [];
  const allGenuinelyZero = players.length > 0 && players.every((p: any) => Math.round(Math.abs(p.netPosition || 0) * 100) === 0);

  const totalEditEnteredChips = Object.values(editChipInputs).reduce(
    (acc, val) => acc + (parseInt(val || '0', 10) || 0),
    0
  );
  const expectedTotalChips = data.expectedTotalChips || data.totalChips || 0;
  const isEditMatched = totalEditEnteredChips === expectedTotalChips;

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
            {data.totalAccountedChips} / {expectedTotalChips} Chips
          </Text>
          <Text style={styles.reconcileSub}>
            Total Accounted: {data.totalAccountedChips} chips • Total Expected: {expectedTotalChips} chips (₹{data.chipValue || 1}/chip)
          </Text>

          {isHost && !isFinalized && (
            <TouchableOpacity style={styles.recountBtn} onPress={handleOpenEditChips}>
              <Edit3 size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.recountBtnText}>Edit Final Chip Counts</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* OUTSTANDING LOANS REVIEW */}
        {loans.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <HandCoins size={16} color={colors.warningText} />
              <Text style={styles.cardTitle}>Outstanding Loans Handled in Net</Text>
            </View>
            <Text style={styles.loanExplain}>
              These loans were automatically factored into each player's net position.
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
          <View style={styles.cardTitleRow}>
            <View>
              <Text style={styles.cardTitle}>Player Final Positions</Text>
              <Text style={styles.cardSubtitle}>Unified zero-sum net formula: In-Hand Value − Buy-ins − Borrowed + Lent</Text>
            </View>
            {isHost && !isFinalized && (
              <TouchableOpacity style={styles.smallEditBtn} onPress={handleOpenEditChips}>
                <Edit3 size={13} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.smallEditBtnText}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {players.map((p: any) => {
            const isWinner = p.netPosition > 0;
            const isLoser = p.netPosition < 0;
            return (
              <View key={p.playerId} style={styles.playerResultRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pResultName}>{p.displayName}</Text>
                  <View style={styles.accountingBreakdown}>
                    <Text style={styles.breakdownItem}>
                      Buy-ins: <Text style={styles.negVal}>-₹{p.totalBuyinMoney}</Text>
                    </Text>
                    <Text style={styles.breakdownItem}>
                      Borrowed: <Text style={p.loanDebtOwed > 0 ? styles.loanDebtVal : styles.zeroVal}>₹{p.loanDebtOwed || 0}</Text>
                    </Text>
                    <Text style={styles.breakdownItem}>
                      Lent: <Text style={p.loanCreditOwed > 0 ? styles.loanCreditVal : styles.zeroVal}>₹{p.loanCreditOwed || 0}</Text>
                    </Text>
                    <Text style={styles.breakdownItem}>
                      Final chips: {p.finalChips} chips (<Text style={styles.posVal}>+₹{p.finalChipsMoney}</Text>)
                    </Text>
                  </View>
                </View>

                <View style={{ alignItems: 'flex-end', justifyContent: 'center', minWidth: 80 }}>
                  <Text
                    style={[
                      styles.pResultNet,
                      { color: isWinner ? colors.successText : isLoser ? colors.dangerText : colors.text }
                    ]}
                  >
                    {isWinner ? `+₹${p.netPosition}` : isLoser ? `-₹${Math.abs(p.netPosition)}` : '₹0'}
                  </Text>
                  <Text style={styles.netLabelText}>
                    {isWinner ? 'Profit' : isLoser ? 'Loss' : 'Even'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* OPTIMIZED SETTLEMENT PAYMENTS */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Final Settlement</Text>
          <Text style={styles.cardSubtitle}>
            Direct transfers minimizing transactions. Circular debts cancel out completely.
          </Text>

          {optimized.length === 0 ? (
            <View style={styles.allEvenContainer}>
              <CheckCircle2 size={24} color={allGenuinelyZero ? colors.successText : colors.warningText} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptySettlementText, allGenuinelyZero && { color: colors.successText, fontWeight: '700' }]}>
                {allGenuinelyZero ? 'Settled / Nobody owes anyone' : 'No transfers calculated (reconciliation pending)'}
              </Text>
            </View>
          ) : (
            optimized.map((item: any, idx: number) => {
              const isPaid = item.status === 'PAID';
              return (
                <View key={idx} style={styles.settleTransferItem}>
                  <View style={styles.transferFlow}>
                    <Text style={styles.transferStatement}>
                      <Text style={styles.transferPayer}>{item.fromDisplayName}</Text>
                      {' pays '}
                      <Text style={styles.transferPayee}>{item.toDisplayName}</Text>
                      {' '}
                      <Text style={styles.transferAmountHighlight}>₹{item.amount}</Text>
                    </Text>
                  </View>

                  <View style={styles.transferRight}>
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
            {isHost ? (
              <TouchableOpacity
                style={[styles.finalizeBtn, (isFinalizing || !data.isReconciled) && { opacity: 0.7 }]}
                onPress={handleFinalizePress}
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
            ) : (
              <View style={styles.nonHostNotice}>
                <Text style={styles.nonHostNoticeText}>
                  Table Host will finalize the game when all chip counts and debts are settled.
                </Text>
              </View>
            )}

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

      {/* Edit Final Chips Modal */}
      <Modal
        visible={showEditChipsModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!submittingChips) setShowEditChipsModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Edit Final In-Hand Chips</Text>
              <TouchableOpacity
                onPress={() => setShowEditChipsModal(false)}
                disabled={submittingChips}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Enter the exact count of physical chips each player has right now. Total must equal {expectedTotalChips} chips.
            </Text>

            <View style={styles.countSummaryBox}>
              <Text style={styles.countSummaryText}>
                Entered: <Text style={{ fontWeight: '800', color: colors.text }}>{totalEditEnteredChips}</Text> / {expectedTotalChips} chips
              </Text>
              {isEditMatched ? (
                <View style={styles.matchedBadge}>
                  <CheckCircle2 size={12} color={colors.successText} />
                  <Text style={styles.matchedBadgeText}>Exact Match</Text>
                </View>
              ) : (
                <View style={styles.mismatchBadge}>
                  <AlertTriangle size={12} color={colors.dangerText} />
                  <Text style={styles.mismatchBadgeText}>
                    {Math.abs(expectedTotalChips - totalEditEnteredChips)}{' '}
                    {totalEditEnteredChips > expectedTotalChips ? 'over' : 'short'}
                  </Text>
                </View>
              )}
            </View>

            <ScrollView style={{ maxHeight: 260, marginVertical: 10 }}>
              {players.map((p: any) => (
                <View key={p.playerId} style={styles.chipInputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chipInputName}>{p.displayName}</Text>
                    <Text style={styles.chipInputSub}>Buy-in: ₹{p.totalBuyinMoney}</Text>
                  </View>
                  <View style={styles.chipInputBoxContainer}>
                    <TextInput
                      style={styles.chipInputBox}
                      keyboardType="numeric"
                      value={editChipInputs[p.playerId] ?? ''}
                      onChangeText={(val) => {
                        const sanitized = val.replace(/[^0-9]/g, '');
                        setEditChipInputs((prev) => ({ ...prev, [p.playerId]: sanitized }));
                      }}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                    />
                    <Text style={styles.chipsSuffix}>chips</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {editChipError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{editChipError}</Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowEditChipsModal(false)}
                disabled={submittingChips}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (!isEditMatched || submittingChips) && { opacity: 0.6 }
                ]}
                onPress={handleSaveEditChips}
                disabled={!isEditMatched || submittingChips}
              >
                {submittingChips ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Update & Recalculate</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Finalize Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isFinalizing) setShowConfirmModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBadge}>
                <Lock size={22} color={colors.primary} />
              </View>
              <Text style={styles.modalTitle}>Finalize Game & Save Stats</Text>
              <Text style={styles.modalSub}>
                Are you sure you want to end and lock this game?
              </Text>
            </View>

            <View style={styles.modalInfoBox}>
              <Text style={styles.modalBullet}>• Table will be locked as permanent read-only</Text>
              <Text style={styles.modalBullet}>• Debt settlement transfers will be frozen</Text>
              <Text style={styles.modalBullet}>• Career earnings, win rates, and streak stats will be recorded to profiles & leaderboards</Text>
            </View>

            {!data.isReconciled && (
              <View style={styles.modalWarnBox}>
                <AlertTriangle size={15} color={colors.warningText} style={{ marginRight: 6 }} />
                <Text style={styles.modalWarnText}>
                  Note: Chips are not 100% reconciled (Discrepancy: {data.discrepancy} chips).
                </Text>
              </View>
            )}

            {finalizeError && (
              <View style={styles.modalErrorBox}>
                <Text style={styles.modalErrorText}>{finalizeError}</Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowConfirmModal(false)}
                disabled={isFinalizing}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, isFinalizing && { opacity: 0.7 }]}
                onPress={performFinalize}
                disabled={isFinalizing}
              >
                {isFinalizing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Finalize & Lock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16
  },
  modalIconBadge: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center'
  },
  modalSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4
  },
  modalInfoBox: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: 14
  },
  modalBullet: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 6
  },
  modalWarnBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.warningBorder
  },
  modalWarnText: {
    fontSize: 11,
    color: colors.warningText,
    flex: 1,
    fontWeight: '600'
  },
  modalErrorBox: {
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  modalErrorText: {
    fontSize: 12,
    color: colors.dangerText,
    fontWeight: '600',
    textAlign: 'center'
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary
  },
  modalConfirmBtn: {
    flex: 1.3,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  },
  nonHostNotice: {
    backgroundColor: colors.cardInset,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    marginBottom: 10
  },
  nonHostNoticeText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center'
  },
  recountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  recountBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8
  },
  smallEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.cardRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  smallEditBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  },
  accountingBreakdown: {
    marginTop: 4,
    gap: 2
  },
  breakdownItem: {
    fontSize: 12,
    color: colors.textSecondary
  },
  negVal: {
    color: colors.dangerText,
    fontWeight: '600'
  },
  posVal: {
    color: colors.successText,
    fontWeight: '600'
  },
  zeroVal: {
    color: colors.textMuted
  },
  loanDebtVal: {
    color: colors.dangerText,
    fontWeight: '600'
  },
  loanCreditVal: {
    color: colors.successText,
    fontWeight: '600'
  },
  netLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 2,
    textTransform: 'uppercase'
  },
  allEvenContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16
  },
  transferStatement: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text
  },
  transferAmountHighlight: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  countSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginVertical: 10
  },
  countSummaryText: {
    fontSize: 13,
    color: colors.textSecondary
  },
  matchedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  matchedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successText,
    marginLeft: 4
  },
  mismatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  mismatchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.dangerText,
    marginLeft: 4
  },
  chipInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  chipInputName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  chipInputSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  chipInputBoxContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  chipInputBox: {
    width: 72,
    backgroundColor: colors.cardInset,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  chipsSuffix: {
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: 6
  }
});
