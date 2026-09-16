import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { X, LogOut, AlertCircle, Coins, ArrowRight, CheckCircle2, Minus, Plus } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { PlayerCardData } from './PlayerCard';

interface CashOutModalProps {
  visible: boolean;
  player: PlayerCardData | null;
  chipValue: number;
  chipMode?: 'EQUAL' | 'DENOMINATION' | 'VALUE';
  tableDenominations?: any[];
  isHostView?: boolean;
  onClose: () => void;
  onSubmitCashOut: (data: {
    playerId: string;
    chipAmount?: number;
    moneyValue?: number;
    denominationsBreakdown?: Array<{ denom: number; count: number }>;
  }) => Promise<void>;
}

export const CashOutModal: React.FC<CashOutModalProps> = ({
  visible,
  player,
  chipValue,
  chipMode = 'EQUAL',
  tableDenominations = [],
  isHostView = false,
  onClose,
  onSubmitCashOut
}) => {
  const [chipAmountStr, setChipAmountStr] = useState<string>('');
  const [moneyValueStr, setMoneyValueStr] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const isValueMode = chipMode === 'VALUE';
  const isDenomMode = chipMode === 'DENOMINATION';

  // Initialize defaults when modal opens
  useEffect(() => {
    if (visible && player) {
      setErrorMsg(null);
      if (isValueMode) {
        const defaultMoney = Math.max(0, player.current_chips ?? 0);
        setMoneyValueStr(String(defaultMoney));
        setChipAmountStr(String(defaultMoney));
      } else if (isDenomMode) {
        const defaultMoney = Math.max(0, player.moneyEquivalent ?? player.total_buyin_amount ?? 0);
        setMoneyValueStr(String(defaultMoney));
        setChipAmountStr(String(Math.max(0, player.current_chips ?? 0)));
      } else {
        const defaultChips = Math.max(0, player.current_chips ?? 0);
        setChipAmountStr(String(defaultChips));
        setMoneyValueStr(String(defaultChips * chipValue));
      }
    }
  }, [visible, player, chipMode, chipValue]);

  if (!player) return null;

  const buyInAmount = Number(player.total_buyin_amount) || 0;
  const lentMoney = Number(player.loanCreditOwed) || 0;
  const borrowedMoney = Number(player.loanDebtOwed) || 0;

  // Calculate live values
  let cashOutMoney = 0;
  let cashOutChips = 0;

  if (isValueMode) {
    cashOutMoney = parseFloat(moneyValueStr) || 0;
    cashOutChips = cashOutMoney;
  } else if (isDenomMode) {
    cashOutMoney = parseFloat(moneyValueStr) || 0;
    cashOutChips = parseInt(chipAmountStr, 10) || 0;
  } else {
    cashOutChips = parseInt(chipAmountStr, 10) || 0;
    cashOutMoney = cashOutChips * chipValue;
  }

  // Authoritative Zero-Sum Formula: Cashout - BuyIn + Lent - Borrowed
  const netWinnings = Math.round((cashOutMoney - buyInAmount + lentMoney - borrowedMoney) * 100) / 100;
  const isProfit = netWinnings > 0;
  const isLoss = netWinnings < 0;

  const stepChips = (delta: number) => {
    const current = parseInt(chipAmountStr, 10) || 0;
    const next = Math.max(0, current + delta);
    setChipAmountStr(String(next));
    setMoneyValueStr(String(next * chipValue));
  };

  const stepValue = (delta: number) => {
    const current = parseFloat(moneyValueStr) || 0;
    const next = Math.max(0, current + delta);
    setMoneyValueStr(String(next));
    setChipAmountStr(String(next));
  };

  const handleQuickPreset = (amount: number) => {
    const val = Math.max(0, Math.floor(amount));
    if (isValueMode || isDenomMode) {
      setMoneyValueStr(String(val));
    } else {
      setChipAmountStr(String(val));
      setMoneyValueStr(String(val * chipValue));
    }
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorMsg(null);

    if (isValueMode) {
      if (isNaN(cashOutMoney) || cashOutMoney < 0) {
        setErrorMsg('Please enter a valid non-negative cash-out amount in Rupees.');
        return;
      }
    } else if (isDenomMode) {
      if (isNaN(cashOutMoney) || cashOutMoney < 0) {
        setErrorMsg('Please enter a valid cash-out money value in Rupees.');
        return;
      }
    } else {
      if (isNaN(cashOutChips) || cashOutChips < 0 || !Number.isInteger(cashOutChips)) {
        setErrorMsg('Please enter a valid non-negative integer chip count.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSubmitCashOut({
        playerId: player.id,
        chipAmount: isValueMode ? cashOutMoney : cashOutChips,
        moneyValue: cashOutMoney
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cash out. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}
        style={styles.overlay}
      >
        <View style={[styles.container, isDesktop && styles.containerDesktop]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <LogOut size={20} color="#38bdf8" />
              </View>
              <View>
                <Text style={styles.title}>Mid-Game Cash Out</Text>
                <Text style={styles.subtitle}>
                  {player.display_name} {player.role === 'HOST' ? '(Host)' : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} disabled={isSubmitting}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Current Player Standing Summary */}
            <View style={styles.standingCard}>
              <View style={styles.standingCol}>
                <Text style={styles.standingLabel}>TOTAL BUY-IN</Text>
                <Text style={styles.standingValue}>₹{buyInAmount.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.standingDivider} />
              <View style={styles.standingCol}>
                <Text style={styles.standingLabel}>
                  {isValueMode ? 'CURRENT IN-HAND' : 'CURRENT CHIPS'}
                </Text>
                <Text
                  style={[
                    styles.standingValue,
                    { color: player.current_chips < 0 ? colors.successText : colors.primary }
                  ]}
                >
                  {player.current_chips < 0
                    ? (isValueMode ? `₹${Math.abs(player.current_chips).toLocaleString('en-IN')}` : `${Math.abs(player.current_chips)}`)
                    : (isValueMode ? `₹${player.current_chips.toLocaleString('en-IN')}` : player.current_chips)}
                </Text>
              </View>
            </View>

            {/* Input Section */}
            <Text style={styles.sectionLabel}>
              {isValueMode
                ? 'ENTER CASH-OUT AMOUNT (₹)'
                : isDenomMode
                  ? 'ENTER CASH-OUT MONEY VALUE (₹)'
                  : 'ENTER CHIPS TO CASH OUT'}
            </Text>

            <View style={styles.inputCard}>
              <View style={styles.stepperRow}>
                <TouchableOpacity
                  style={[
                    styles.stepBtn,
                    (isValueMode ? cashOutMoney <= 0 : cashOutChips <= 0) && styles.stepBtnDisabled
                  ]}
                  onPress={() => (isValueMode ? stepValue(-50) : stepChips(-1))}
                  disabled={isValueMode ? cashOutMoney <= 0 : cashOutChips <= 0 || isSubmitting}
                  activeOpacity={0.7}
                >
                  <Minus size={18} color={colors.text} />
                </TouchableOpacity>

                <View style={styles.stepperInputWrap}>
                  <Text style={styles.currencyPrefix}>{isValueMode || isDenomMode ? '₹' : '🪙'}</Text>
                  <TextInput
                    style={styles.textInput}
                    keyboardType="numeric"
                    value={isValueMode || isDenomMode ? moneyValueStr : chipAmountStr}
                    onChangeText={txt => {
                      const sanitized = txt.replace(/[^0-9]/g, '');
                      if (isValueMode || isDenomMode) {
                        setMoneyValueStr(sanitized);
                      } else {
                        setChipAmountStr(sanitized);
                        const c = parseInt(sanitized, 10) || 0;
                        setMoneyValueStr(String(c * chipValue));
                      }
                    }}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    editable={!isSubmitting}
                    autoFocus
                  />
                  {!isValueMode && !isDenomMode && (
                    <Text style={styles.unitSuffix}>chips</Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={() => (isValueMode ? stepValue(50) : stepChips(1))}
                  disabled={isSubmitting}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              {!isValueMode && !isDenomMode && (
                <View style={styles.chipEquivBadge}>
                  <Text style={styles.chipEquivText}>
                    = <Text style={{ fontWeight: '800', color: colors.primary }}>₹{cashOutMoney.toLocaleString('en-IN')}</Text>
                    <Text style={{ color: colors.textMuted }}> (@ ₹{chipValue}/chip)</Text>
                  </Text>
                </View>
              )}
            </View>

            {/* Presets Row */}
            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickPreset(Math.max(0, player.current_chips))}
                activeOpacity={0.75}
              >
                <Text style={styles.presetChipText} numberOfLines={1}>
                  Holding ({isValueMode ? `₹${Math.max(0, player.current_chips)}` : `${Math.max(0, player.current_chips)}`})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickPreset(Math.max(0, isValueMode ? (buyInAmount - lentMoney + borrowedMoney) : Math.round((buyInAmount - lentMoney + borrowedMoney) / chipValue)))}
                activeOpacity={0.75}
              >
                <Text style={styles.presetChipText} numberOfLines={1}>
                  Break-Even
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickPreset(0)}
                activeOpacity={0.75}
              >
                <Text style={styles.presetChipText} numberOfLines={1}>
                  Busted (0)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Net Calculation Preview Card */}
            <View style={styles.previewCard}>
              <Text style={styles.previewCardTitle}>Settlement Projection</Text>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Cashing Out For:</Text>
                <Text style={styles.previewValueBold}>+₹{cashOutMoney.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Total Buy-In Paid:</Text>
                <Text style={[styles.previewValueBold, { color: colors.dangerText }]}>-₹{buyInAmount.toLocaleString('en-IN')}</Text>
              </View>
              {lentMoney > 0 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Lent to Others (repayment):</Text>
                  <Text style={[styles.previewValueBold, { color: colors.successText }]}>+₹{lentMoney.toLocaleString('en-IN')}</Text>
                </View>
              )}
              {borrowedMoney > 0 && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Borrowed from Others (debt):</Text>
                  <Text style={[styles.previewValueBold, { color: colors.dangerText }]}>-₹{borrowedMoney.toLocaleString('en-IN')}</Text>
                </View>
              )}

              <View style={styles.previewDivider} />

              <View style={styles.previewRow}>
                <Text style={styles.previewLabelBig}>Projected Net Profit / Loss:</Text>
                <View
                  style={[
                    styles.netBadge,
                    isProfit && styles.netBadgeProfit,
                    isLoss && styles.netBadgeLoss
                  ]}
                >
                  <Text
                    style={[
                      styles.netBadgeText,
                      isProfit && styles.netTextProfit,
                      isLoss && styles.netTextLoss
                    ]}
                  >
                    {isProfit
                      ? `+₹${netWinnings.toLocaleString('en-IN')}`
                      : isLoss
                        ? `-₹${Math.abs(netWinnings).toLocaleString('en-IN')}`
                        : 'Even (₹0)'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Notice Callout */}
            <View style={styles.noticeCard}>
              <CheckCircle2 size={16} color="#38bdf8" style={styles.noticeIcon} />
              <Text style={styles.noticeText}>
                Chips will be returned to the table bank vault. The game continues uninterrupted for active players. Final peer payments will be settled when the table ends.
              </Text>
            </View>

            {errorMsg && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color={colors.danger} />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
          </ScrollView>

          {/* Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.confirmBtn, isSubmitting && styles.btnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <LogOut size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmBtnText}>Confirm Cash Out</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    width: '100%',
    height: '100%'
  },
  container: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    maxHeight: '90%',
    overflow: 'hidden',
    alignSelf: 'center',
    marginHorizontal: 'auto'
  },
  containerDesktop: {
    maxWidth: 540
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  closeBtn: {
    padding: 6
  },
  content: {
    padding: 14
  },
  contentDesktop: {
    padding: 16
  },
  standingCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardRaised,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: 10
  },
  standingCol: {
    flex: 1,
    alignItems: 'center'
  },
  standingDivider: {
    width: 1,
    backgroundColor: colors.borderDark,
    marginHorizontal: 10
  },
  standingLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2
  },
  standingValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    marginBottom: 6,
    letterSpacing: 0.6
  },
  inputCard: {
    backgroundColor: colors.cardRaised,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    padding: 6,
    marginBottom: 8
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    justifyContent: 'center',
    alignItems: 'center'
  },
  stepBtnDisabled: {
    opacity: 0.3
  },
  stepperInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38bdf8',
    marginRight: 6
  },
  textInput: {
    minWidth: 50,
    maxWidth: 130,
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    paddingVertical: Platform.OS === 'ios' ? 6 : 2
  },
  unitSuffix: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 4
  },
  chipEquivBadge: {
    alignSelf: 'center',
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.08)'
  },
  chipEquivText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 6,
    marginBottom: 10
  },
  presetChip: {
    flex: 1,
    paddingHorizontal: 4,
    paddingVertical: 7,
    backgroundColor: colors.cardRaised,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center'
  },
  presetChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
    textAlign: 'center'
  },
  previewCard: {
    backgroundColor: colors.cardRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    padding: 10,
    marginBottom: 10
  },
  previewCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  previewLabel: {
    fontSize: 12,
    color: colors.textSecondary
  },
  previewLabelBig: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  previewValueBold: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  previewValueMuted: {
    fontSize: 12,
    color: colors.textMuted
  },
  previewDivider: {
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    marginVertical: 6
  },
  netBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.cardRaised
  },
  netBadgeProfit: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)'
  },
  netBadgeLoss: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  netBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted
  },
  netTextProfit: {
    color: colors.success
  },
  netTextLoss: {
    color: colors.danger
  },
  noticeCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)'
  },
  noticeIcon: {
    marginRight: 6
  },
  noticeText: {
    flex: 1,
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 11,
    fontWeight: '500'
  },
  footer: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 10
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 13
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13
  },
  btnDisabled: {
    opacity: 0.6
  }
});
