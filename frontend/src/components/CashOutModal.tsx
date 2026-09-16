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
  ActivityIndicator
} from 'react-native';
import { X, LogOut, AlertCircle, Coins, ArrowRight, CheckCircle2 } from 'lucide-react-native';
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
        <View style={styles.container}>
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

          <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
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

            <View style={styles.inputWrapper}>
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
            </View>

            {/* Presets Row */}
            <View style={styles.presetsRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickPreset(Math.max(0, player.current_chips))}
              >
                <Text style={styles.presetChipText}>
                  Current ({isValueMode ? `₹${Math.max(0, player.current_chips)}` : `${Math.max(0, player.current_chips)} chips`})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickPreset(Math.max(0, isValueMode ? (buyInAmount - lentMoney + borrowedMoney) : Math.round((buyInAmount - lentMoney + borrowedMoney) / chipValue)))}
              >
                <Text style={styles.presetChipText}>
                  Break-Even
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => handleQuickPreset(0)}
              >
                <Text style={styles.presetChipText}>0 (Busted)</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2
  },
  closeBtn: {
    padding: 6
  },
  content: {
    padding: 20
  },
  standingCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardRaised,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: 18
  },
  standingCol: {
    flex: 1,
    alignItems: 'center'
  },
  standingDivider: {
    width: 1,
    backgroundColor: colors.borderDark,
    marginHorizontal: 12
  },
  standingLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 4
  },
  standingValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    letterSpacing: 0.5
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardRaised,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#38bdf8',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 6,
    marginBottom: 10
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '800',
    color: '#38bdf8',
    marginRight: 8
  },
  textInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: colors.text
  },
  presetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    marginBottom: 16
  },
  presetChip: {
    flex: 1,
    paddingHorizontal: 6,
    paddingVertical: 9,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    padding: 14,
    marginBottom: 14
  },
  previewCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#38bdf8',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  previewLabel: {
    fontSize: 13,
    color: colors.textSecondary
  },
  previewLabelBig: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  previewValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  previewValueMuted: {
    fontSize: 13,
    color: colors.textMuted
  },
  previewDivider: {
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    marginVertical: 8
  },
  netBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
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
    fontSize: 14,
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
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)'
  },
  noticeIcon: {
    marginRight: 8
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '500'
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    gap: 12
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.cardRaised,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: 14
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  confirmBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  },
  btnDisabled: {
    opacity: 0.6
  }
});
