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
  Edit3,
  Minus,
  Plus
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
  const [editPlayerDenoms, setEditPlayerDenoms] = useState<Record<string, Record<number, number>>>({});
  const [editPlayerDirectValues, setEditPlayerDirectValues] = useState<Record<string, string>>({});
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
    const isDenom = data?.chipMode === 'DENOMINATION' || data?.chipMode === 'VALUE';
    if (isDenom) {
      const initialDenoms: Record<string, Record<number, number>> = {};
      const initialDirect: Record<string, string> = {};
      (data?.players || []).forEach((p: any) => {
        initialDenoms[p.playerId] = {};
        if (p.isCashedOut) {
          initialDirect[p.playerId] = String(p.cashedOutMoney ?? 0);
          return;
        }
        if (Array.isArray(p.finalDenominations)) {
          p.finalDenominations.forEach((item: any) => {
            if (item && item.denom !== undefined && item.count !== undefined) {
              initialDenoms[p.playerId][item.denom] = item.count;
            }
          });
        }
        if (p.finalChipsMoney !== null && p.finalChipsMoney !== undefined) {
          initialDirect[p.playerId] = String(p.finalChipsMoney);
        } else {
          const sumMoney = Object.entries(initialDenoms[p.playerId]).reduce((acc, [d, c]) => acc + ((parseFloat(d) || 0) * (c || 0)), 0);
          initialDirect[p.playerId] = sumMoney > 0 ? String(sumMoney) : String(p.finalChips ?? p.totalBuyinMoney ?? 0);
        }
      });
      setEditPlayerDenoms(initialDenoms);
      setEditPlayerDirectValues(initialDirect);
    } else {
      const initial: Record<string, string> = {};
      (data?.players || []).forEach((p: any) => {
        if (p.isCashedOut) {
          initial[p.playerId] = String(p.cashedOutChips ?? 0);
        } else {
          initial[p.playerId] = String(p.finalChips ?? 0);
        }
      });
      setEditChipInputs(initial);
    }
    setEditChipError(null);
    setShowEditChipsModal(true);
  };

  const updatePlayerDenom = (playerId: string, denom: number, delta: number) => {
    setEditPlayerDenoms(prev => {
      const pMap = { ...(prev[playerId] || {}) };
      const cur = pMap[denom] || 0;
      pMap[denom] = Math.max(0, cur + delta);
      const nextMap = { ...prev, [playerId]: pMap };

      const sumMoney = Object.entries(pMap).reduce((acc, [d, c]) => acc + ((parseFloat(d) || 0) * (c || 0)), 0);
      setEditPlayerDirectValues(dPrev => ({
        ...dPrev,
        [playerId]: String(sumMoney)
      }));

      return nextMap;
    });
  };

  const setPlayerDenomDirect = (playerId: string, denom: number, text: string) => {
    const val = parseInt(text, 10) || 0;
    setEditPlayerDenoms(prev => {
      const pMap = { ...(prev[playerId] || {}) };
      pMap[denom] = Math.max(0, val);
      const nextMap = { ...prev, [playerId]: pMap };

      const sumMoney = Object.entries(pMap).reduce((acc, [d, c]) => acc + ((parseFloat(d) || 0) * (c || 0)), 0);
      setEditPlayerDirectValues(dPrev => ({
        ...dPrev,
        [playerId]: String(sumMoney)
      }));

      return nextMap;
    });
  };

  const setEditPlayerTotalValueDirect = (playerId: string, text: string) => {
    setEditPlayerDirectValues(prev => ({
      ...prev,
      [playerId]: text
    }));
  };

  const getEditPlayerFinalValue = (playerId: string) => {
    const p = (data?.players || []).find((pl: any) => pl.playerId === playerId);
    if (p && p.isCashedOut) {
      return Number(p.cashedOutMoney) || 0;
    }
    if (editPlayerDirectValues[playerId] !== undefined) {
      return parseFloat(editPlayerDirectValues[playerId]) || 0;
    }
    const pDenoms = editPlayerDenoms[playerId] || {};
    return Object.entries(pDenoms).reduce((acc, [d, c]) => acc + ((parseFloat(d) || 0) * (c || 0)), 0);
  };

  const handleSaveEditChips = async () => {
    setSubmittingChips(true);
    setEditChipError(null);
    try {
      let res;
      if (data?.chipMode === 'DENOMINATION' || data?.chipMode === 'VALUE') {
        const finalPlayerCounts = (data?.players || []).map((p: any) => {
          if (p.isCashedOut) {
            return {
              playerId: p.playerId,
              finalChips: data?.chipMode === 'VALUE' ? Number(p.cashedOutMoney) : Number(p.cashedOutChips),
              finalChipsMoney: Number(p.cashedOutMoney),
              denominations: []
            };
          }
          const denoms = editPlayerDenoms[p.playerId] || {};
          const breakdown = Object.entries(denoms)
            .map(([d, cnt]) => ({ denom: parseFloat(d), count: cnt }))
            .filter(item => item.count > 0);
          const denomChips = breakdown.reduce((acc, item) => acc + item.count, 0);
          const money = getEditPlayerFinalValue(p.playerId);
          const chips = data?.chipMode === 'VALUE' ? money : (denomChips > 0 ? denomChips : ((data?.chipValue || 10) > 0 ? Math.round(money / (data?.chipValue || 10)) : 0));
          return {
            playerId: p.playerId,
            finalChips: chips,
            finalChipsMoney: money,
            denominations: breakdown
          };
        });

        res = await apiRequest(`/tables/${tableId}/settle/chips`, {
          method: 'POST',
          body: { finalPlayerCounts }
        });
      } else {
        const countsPayload: Record<string, number> = {};
        for (const p of (data?.players || [])) {
          if (p.isCashedOut) {
            countsPayload[p.playerId] = Number(p.cashedOutChips) || 0;
          } else {
            const countStr = editChipInputs[p.playerId];
            countsPayload[p.playerId] = parseInt(countStr || '0', 10) || 0;
          }
        }

        res = await apiRequest(`/tables/${tableId}/settle/chips`, {
          method: 'POST',
          body: { finalChipCounts: countsPayload }
        });
      }

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

  const isDenomMode = data.chipMode === 'DENOMINATION';
  const isValueMode = data.chipMode === 'VALUE';
  const isCustomOrValue = isDenomMode || isValueMode;

  let tableDenomList: Array<{ denom: number; color?: string; label?: string }> = [];
  if (isDenomMode && data.denominations) {
    try {
      const parsed = typeof data.denominations === 'string' ? JSON.parse(data.denominations) : data.denominations;
      if (Array.isArray(parsed)) {
        tableDenomList = parsed.map((d: any) => {
          if (typeof d === 'object' && d !== null) {
            return {
              denom: Number(d.value) || 0,
              color: d.color,
              label: d.label
            };
          }
          return { denom: Number(d) || 0 };
        }).filter(d => d.denom > 0);
      }
    } catch (_) {}
  }

  let totalEditDenomChips = 0;
  let totalEditDenomMoney = 0;
  if (isCustomOrValue) {
    for (const p of players) {
      totalEditDenomMoney += getEditPlayerFinalValue(p.playerId);
      const pDenoms = editPlayerDenoms[p.playerId] || {};
      for (const count of Object.values(pDenoms)) {
        totalEditDenomChips += (count || 0);
      }
    }
  }

  const totalEditEnteredChips = isCustomOrValue
    ? (isValueMode ? totalEditDenomMoney : totalEditDenomChips)
    : Object.values(editChipInputs).reduce(
        (acc, val) => acc + (parseInt(val || '0', 10) || 0),
        0
      );

  const totalEditEnteredMoney = isCustomOrValue
    ? totalEditDenomMoney
    : totalEditEnteredChips * (data.chipValue || 10);

  const expectedTotalChips = data.expectedTotalChips || data.totalChips || 0;
  const expectedTotalMoney = isCustomOrValue
    ? (data.summary?.totalBuyinPotMoney ?? data.expectedTotalValue ?? 0)
    : (expectedTotalChips * (data.chipValue || 10));

  const isChipCountMatched = totalEditEnteredChips === expectedTotalChips;
  const isMoneyMatched = isCustomOrValue ? (Math.abs(totalEditEnteredMoney - expectedTotalMoney) < 1) : true;
  const isEditMatched = isCustomOrValue ? isMoneyMatched : (isChipCountMatched && isMoneyMatched);

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
            <Text style={styles.sectionHeaderTitle}>{isValueMode ? 'FINANCIAL RECONCILIATION CHECK' : 'CHIP RECONCILIATION CHECK'}</Text>
            {data.isReconciled ? (
              <View style={styles.reconciledPill}>
                <CheckCircle2 size={13} color={colors.successText} />
                <Text style={styles.reconciledPillText}>100% Reconciled</Text>
              </View>
            ) : (
              <View style={styles.mismatchPill}>
                <AlertTriangle size={13} color={colors.dangerText} />
                <Text style={styles.mismatchPillText}>{isValueMode ? `₹${Math.abs(data.discrepancy || 0)} mismatch` : `${data.discrepancy} chip mismatch`}</Text>
              </View>
            )}
          </View>

          {isValueMode ? (
            <Text style={styles.reconcileCount}>
              ₹{Number(data.summary?.totalBuyinPotMoney ?? expectedTotalMoney).toLocaleString('en-IN')} Pot
            </Text>
          ) : (
            <>
              <Text style={styles.reconcileCount}>
                {data.totalAccountedChips} / {expectedTotalChips} Chips
              </Text>
              <Text style={styles.reconcileSub}>
                Total Accounted: {data.totalAccountedChips} chips • Total Expected: {expectedTotalChips} chips (₹{data.chipValue || 1}/chip)
              </Text>
            </>
          )}

          {Boolean(data.summary?.totalPotMoney) && (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ fontSize: 13, color: colors.chipGold, fontWeight: '700' }}>
                Total Pot: ₹{Number(data.summary.totalPotMoney).toLocaleString('en-IN')}
              </Text>
              {Boolean(data.summary?.totalActiveLoansMoney && data.summary.totalActiveLoansMoney > 0) && (
                <Text style={{ fontSize: 11, color: colors.warningText, fontWeight: '600', marginLeft: 8 }}>
                  (includes ₹{Number(data.summary.totalActiveLoansMoney).toLocaleString('en-IN')} in shots/credit)
                </Text>
              )}
            </View>
          )}

          {isHost && !isFinalized && (
            <TouchableOpacity style={styles.recountBtn} onPress={handleOpenEditChips}>
              <Edit3 size={14} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.recountBtnText}>{isValueMode ? 'Edit In-Hand Balances' : 'Edit Final Chip Counts'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* FINAL PLAYER NET POSITIONS */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Player Final Positions</Text>
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
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.pResultName}>{p.displayName}</Text>
                    {p.isCashedOut && (
                      <View style={styles.cashedOutPill}>
                        <Text style={styles.cashedOutPillText}>Cashed Out Early</Text>
                      </View>
                    )}
                  </View>
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
                      {p.isCashedOut ? 'Cashed out: ' : isValueMode ? 'Final in-hand: ' : `Final chips: ${p.finalChips} chips (`}
                      <Text style={styles.posVal}>+₹{p.finalChipsMoney}</Text>
                      {!p.isCashedOut && !isValueMode ? ')' : ''}
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
              <Text style={styles.modalTitle}>{isValueMode ? 'Edit In-Hand Balances' : 'Edit Final In-Hand Chips'}</Text>
              <TouchableOpacity
                onPress={() => setShowEditChipsModal(false)}
                disabled={submittingChips}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              {isValueMode
                ? `Enter the final in-hand ₹ balance for each player. Total must balance with the total buy-in pot (₹${expectedTotalMoney.toLocaleString('en-IN')}).`
                : isDenomMode
                ? `Enter the physical chip denominations held by each player. Total chips must equal ${expectedTotalChips} and total value must equal ₹${expectedTotalMoney.toLocaleString('en-IN')}.`
                : `Enter the exact count of physical chips each player has right now. Total must equal ${expectedTotalChips} chips.`}
            </Text>

            <View style={styles.countSummaryBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.countSummaryText}>
                  {isValueMode ? (
                    <>
                      Entered: ₹<Text style={{ fontWeight: '800', color: colors.chipGold }}>{totalEditEnteredMoney.toLocaleString('en-IN')}</Text> / ₹{expectedTotalMoney.toLocaleString('en-IN')}
                    </>
                  ) : (
                    <>
                      Entered: <Text style={{ fontWeight: '800', color: colors.text }}>{totalEditEnteredChips}</Text> / {expectedTotalChips} chips
                      {isCustomOrValue && (
                        <Text style={{ color: colors.textMuted }}>
                          {'\n'}Value: ₹<Text style={{ fontWeight: '800', color: colors.chipGold }}>{totalEditEnteredMoney.toLocaleString('en-IN')}</Text> / ₹{expectedTotalMoney.toLocaleString('en-IN')}
                        </Text>
                      )}
                    </>
                  )}
                </Text>
              </View>
              {isEditMatched ? (
                <View style={styles.matchedBadge}>
                  <CheckCircle2 size={12} color={colors.successText} />
                  <Text style={styles.matchedBadgeText}>Exact Match</Text>
                </View>
              ) : (
                <View style={styles.mismatchBadge}>
                  <AlertTriangle size={12} color={colors.dangerText} />
                  <Text style={styles.mismatchBadgeText}>
                    {isCustomOrValue
                      ? `₹${Math.abs(expectedTotalMoney - totalEditEnteredMoney).toLocaleString('en-IN')} ${totalEditEnteredMoney > expectedTotalMoney ? 'over' : 'short'}`
                      : `${Math.abs(expectedTotalChips - totalEditEnteredChips)} chips ${totalEditEnteredChips > expectedTotalChips ? 'over' : 'short'}`}
                  </Text>
                </View>
              )}
            </View>

            <ScrollView style={{ maxHeight: 320, marginVertical: 10 }} showsVerticalScrollIndicator={false}>
              {players.map((p: any) => {
                if (isCustomOrValue) {
                  if (p.isCashedOut) {
                    return (
                      <View key={p.playerId} style={[styles.denomPlayerCard, { borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: '#0c1626' }]}>
                        <View style={styles.denomPlayerHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={styles.chipInputName}>{p.displayName}</Text>
                              <View style={styles.cashedOutPill}>
                                <Text style={styles.cashedOutPillText}>✓ CASHED OUT</Text>
                              </View>
                            </View>
                            <Text style={styles.chipInputSub}>Buy-in: ₹{p.totalBuyinMoney?.toLocaleString('en-IN')}</Text>
                          </View>
                          <View style={[styles.denomPlayerTotalPill, { backgroundColor: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)' }]}>
                            <Text style={[styles.denomPlayerTotalText, { color: '#38bdf8' }]}>
                              ₹{Number(p.cashedOutMoney || 0).toLocaleString('en-IN')} (Locked)
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  }

                  const pDenoms = editPlayerDenoms[p.playerId] || {};
                  const pChips = Object.values(pDenoms).reduce((acc, c) => acc + (c || 0), 0);
                  const pMoney = getEditPlayerFinalValue(p.playerId);

                  return (
                    <View key={p.playerId} style={styles.denomPlayerCard}>
                      <View style={styles.denomPlayerHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.chipInputName}>{p.displayName}</Text>
                          <Text style={styles.chipInputSub}>Buy-in: ₹{p.totalBuyinMoney?.toLocaleString('en-IN')}</Text>
                        </View>
                        <View style={styles.denomPlayerTotalPill}>
                          <Text style={styles.denomPlayerTotalText}>
                            {isValueMode ? `₹${pMoney.toLocaleString('en-IN')}` : `${pChips > 0 ? `${pChips} chips • ` : ''}₹${pMoney.toLocaleString('en-IN')}`}
                          </Text>
                        </View>
                      </View>

                      {/* Direct Total Chip Value input row */}
                      <View style={styles.directValueInputRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.directValueLabel}>Total In-Hand Value:</Text>
                          <Text style={styles.directValueSubtext}>
                            {isValueMode ? 'Enter final ₹ value held by this player' : 'Write total ₹ directly, or enter chips below'}
                          </Text>
                        </View>
                        <View style={styles.directValueBox}>
                          <Text style={styles.rupeeSymbol}>₹</Text>
                          <TextInput
                            style={styles.directValueInput}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            value={editPlayerDirectValues[p.playerId] !== undefined ? editPlayerDirectValues[p.playerId] : String(pMoney)}
                            onChangeText={t => setEditPlayerTotalValueDirect(p.playerId, t)}
                          />
                        </View>
                      </View>

                      {isDenomMode && (
                        <View style={styles.denomChipsGrid}>
                          {tableDenomList.map(item => {
                            const count = pDenoms[item.denom] || 0;
                            return (
                              <View key={item.denom} style={styles.denomChipRow}>
                                <View style={[styles.denomBadgeSmall, { backgroundColor: item.color || colors.primary }]}>
                                  <Text style={styles.denomBadgeSmallText}>₹{item.denom}</Text>
                                </View>
                                <View style={{ flex: 1, paddingLeft: 8 }}>
                                  <Text style={styles.denomChipRowName}>₹{item.denom} Chip</Text>
                                </View>
                                <View style={styles.counterBoxSmall}>
                                  <TouchableOpacity
                                    onPress={() => updatePlayerDenom(p.playerId, item.denom, -1)}
                                    style={[styles.counterBtnSmall, count <= 0 && { opacity: 0.35 }]}
                                    disabled={count <= 0}
                                  >
                                    <Minus size={12} color="#FFF" />
                                  </TouchableOpacity>
                                  <TextInput
                                    style={styles.counterInputSmall}
                                    keyboardType="numeric"
                                    value={count.toString()}
                                    onChangeText={t => setPlayerDenomDirect(p.playerId, item.denom, t)}
                                  />
                                  <TouchableOpacity
                                    onPress={() => updatePlayerDenom(p.playerId, item.denom, 1)}
                                    style={styles.counterBtnSmall}
                                  >
                                    <Plus size={12} color="#FFF" />
                                  </TouchableOpacity>
                                </View>
                                <Text style={styles.denomRowSubtotal}>₹{(count * item.denom).toLocaleString('en-IN')}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                }

                if (p.isCashedOut) {
                  return (
                    <View key={p.playerId} style={[styles.chipInputRow, { borderColor: 'rgba(56, 189, 248, 0.4)', backgroundColor: '#0c1626' }]}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.chipInputName}>{p.displayName}</Text>
                          <View style={styles.cashedOutPill}>
                            <Text style={styles.cashedOutPillText}>✓ CASHED OUT</Text>
                          </View>
                        </View>
                        <Text style={styles.chipInputSub}>Buy-in: ₹{p.totalBuyinMoney}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#38bdf8' }}>
                          {p.cashedOutChips} chips
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          = ₹{Number(p.cashedOutMoney || 0).toLocaleString('en-IN')} (Locked)
                        </Text>
                      </View>
                    </View>
                  );
                }

                return (
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
                );
              })}
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
    fontWeight: '700',
    color: '#F8FAFC'
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
  },
  denomPlayerCard: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  denomPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  denomPlayerTotalPill: {
    backgroundColor: 'rgba(235, 94, 40, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(235, 94, 40, 0.25)'
  },
  denomPlayerTotalText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary
  },
  denomChipsGrid: {
    gap: 6
  },
  denomChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  denomBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF'
  },
  denomBadgeSmallText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000'
  },
  denomChipRowName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  counterBoxSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden'
  },
  counterBtnSmall: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  counterInputSmall: {
    width: 34,
    height: 26,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    padding: 0
  },
  denomRowSubtotal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.chipGold,
    width: 58,
    textAlign: 'right'
  },
  directValueInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(235, 94, 40, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(235, 94, 40, 0.25)'
  },
  directValueLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  directValueSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1
  },
  directValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingHorizontal: 8,
    height: 32
  },
  rupeeSymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 4
  },
  directValueInput: {
    width: 70,
    height: 30,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    padding: 0,
    textAlign: 'right'
  },
  cashedOutPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1
  },
  cashedOutPillText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  }
});
