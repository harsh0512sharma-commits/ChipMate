import React, { useState } from 'react';
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
  Alert
} from 'react-native';
import { X, ArrowRight, AlertCircle, RefreshCw, Check } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface ActionSheetProps {
  visible: boolean;
  type: 'BUY' | 'LEND' | 'RETURN' | 'TRANSFER' | 'CORRECTION' | 'UNDO' | null;
  table: any;
  players: any[];
  activeLoans: any[];
  lastTransaction?: any;
  initialPlayerId?: string;
  onClose: () => void;
  onSubmitBuy: (playerId: string, chipAmount: number, isRebuy: boolean) => Promise<void>;
  onSubmitLend: (lenderPlayerId: string, borrowerPlayerId: string, chipAmount: number) => Promise<void>;
  onSubmitReturn: (loanId: string, chipAmount: number) => Promise<void>;
  onSubmitTransfer: (fromPlayerId: string, toPlayerId: string, chipAmount: number) => Promise<void>;
  onSubmitCorrection: (playerId: string, newChipCount: number, reason?: string) => Promise<void>;
  onSubmitUndo: (transactionId: string) => Promise<void>;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  type,
  table,
  players,
  activeLoans,
  lastTransaction,
  initialPlayerId,
  onClose,
  onSubmitBuy,
  onSubmitLend,
  onSubmitReturn,
  onSubmitTransfer,
  onSubmitCorrection,
  onSubmitUndo
}) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialPlayerId || players[0]?.id || '');
  const [secondPlayerId, setSecondPlayerId] = useState<string>(players[1]?.id || '');
  const [selectedLoanId, setSelectedLoanId] = useState<string>(activeLoans[0]?.id || '');
  const [chipAmount, setChipAmount] = useState<string>('10');
  const [isRebuy, setIsRebuy] = useState<boolean>(false);
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialPlayerId) {
      setSelectedPlayerId(initialPlayerId);
    }
  }, [initialPlayerId, visible]);

  if (!visible || !type) return null;

  const chipVal = table?.chip_value || 10;
  const numChips = parseInt(chipAmount, 10) || 0;
  const calculatedMoney = numChips * chipVal;

  const handleExecute = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (type === 'BUY') {
        if (numChips <= 0) throw new Error('Chip amount must be greater than 0');
        if (numChips > table.bank_chips) throw new Error(`Bank only has ${table.bank_chips} chips available.`);
        await onSubmitBuy(selectedPlayerId, numChips, isRebuy);
      } else if (type === 'LEND') {
        if (numChips <= 0) throw new Error('Chip amount must be greater than 0');
        if (selectedPlayerId === secondPlayerId) throw new Error('Lender and borrower cannot be the same');
        await onSubmitLend(selectedPlayerId, secondPlayerId, numChips);
      } else if (type === 'RETURN') {
        if (!selectedLoanId) throw new Error('Please select an active loan');
        if (numChips <= 0) throw new Error('Repayment amount must be greater than 0');
        await onSubmitReturn(selectedLoanId, numChips);
      } else if (type === 'TRANSFER') {
        if (numChips <= 0) throw new Error('Chip amount must be greater than 0');
        if (selectedPlayerId === secondPlayerId) throw new Error('Sender and recipient cannot be the same');
        await onSubmitTransfer(selectedPlayerId, secondPlayerId, numChips);
      } else if (type === 'CORRECTION') {
        if (numChips < 0) throw new Error('Chip count cannot be negative');
        await onSubmitCorrection(selectedPlayerId, numChips, correctionReason);
      } else if (type === 'UNDO') {
        if (!lastTransaction) throw new Error('No transaction available to undo');
        await onSubmitUndo(lastTransaction.id);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>
              {type === 'BUY' && 'Buy Chips'}
              {type === 'LEND' && 'Lend Chips (Loan)'}
              {type === 'RETURN' && 'Return Lent Chips'}
              {type === 'TRANSFER' && 'Transfer Chips (No Debt)'}
              {type === 'CORRECTION' && 'Correct Chip Count'}
              {type === 'UNDO' && 'Undo Transaction'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <AlertCircle size={14} color={colors.dangerText} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* BUY CHIPS */}
            {type === 'BUY' && (
              <View>
                <Text style={styles.sectionLabel}>Select Player</Text>
                <View style={styles.chipsSelectorRow}>
                  {players.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSelectedPlayerId(p.id)}
                      style={[styles.playerChipPill, selectedPlayerId === p.id && styles.playerChipPillActive]}
                    >
                      <Text style={[styles.playerChipPillText, selectedPlayerId === p.id && styles.playerChipPillTextActive]}>
                        {p.display_name} ({p.current_chips})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Number of Chips</Text>
                <TextInput
                  keyboardType="numeric"
                  value={chipAmount}
                  onChangeText={setChipAmount}
                  placeholder="Enter chips"
                  style={styles.input}
                />

                {/* Quick preset chips */}
                <View style={styles.presetsRow}>
                  {[5, 10, 20, 25, 50].map(val => (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setChipAmount(val.toString())}
                      style={[styles.presetBtn, numChips === val && styles.presetBtnActive]}
                    >
                      <Text style={[styles.presetBtnText, numChips === val && styles.presetBtnTextActive]}>+{val}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.calcCard}>
                  <Text style={styles.calcText}>
                    {numChips} chips × ₹{chipVal} = <Text style={styles.calcHighlight}>₹{calculatedMoney.toLocaleString('en-IN')}</Text>
                  </Text>
                  <Text style={styles.bankAvailText}>Bank has {table.bank_chips} chips available</Text>
                </View>

                {/* Buy-in Type Toggle */}
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    onPress={() => setIsRebuy(false)}
                    style={[styles.toggleBtn, !isRebuy && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleBtnText, !isRebuy && styles.toggleBtnTextActive]}>Initial Buy-in</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsRebuy(true)}
                    style={[styles.toggleBtn, isRebuy && styles.toggleBtnActive]}
                  >
                    <Text style={[styles.toggleBtnText, isRebuy && styles.toggleBtnTextActive]}>Re-buy / Add-on</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* LEND CHIPS */}
            {type === 'LEND' && (
              <View>
                <View style={styles.infoBanner}>
                  <Text style={styles.infoBannerText}>
                    🤝 <Text style={{ fontWeight: '700' }}>These chips are lent, not won.</Text> Creates an outstanding debt between players.
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>Lender (From)</Text>
                <View style={styles.chipsSelectorRow}>
                  {players.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSelectedPlayerId(p.id)}
                      style={[styles.playerChipPill, selectedPlayerId === p.id && styles.playerChipPillActive]}
                    >
                      <Text style={[styles.playerChipPillText, selectedPlayerId === p.id && styles.playerChipPillTextActive]}>
                        {p.display_name} ({p.current_chips})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Borrower (To)</Text>
                <View style={styles.chipsSelectorRow}>
                  {players.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSecondPlayerId(p.id)}
                      style={[styles.playerChipPill, secondPlayerId === p.id && styles.playerChipPillActive]}
                    >
                      <Text style={[styles.playerChipPillText, secondPlayerId === p.id && styles.playerChipPillTextActive]}>
                        {p.display_name} ({p.current_chips})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Chips to Lend</Text>
                <TextInput
                  keyboardType="numeric"
                  value={chipAmount}
                  onChangeText={setChipAmount}
                  style={styles.input}
                />

                <View style={styles.calcCard}>
                  <Text style={styles.calcText}>
                    {numChips} chips × ₹{chipVal} = <Text style={styles.calcHighlight}>₹{calculatedMoney.toLocaleString('en-IN')}</Text>
                  </Text>
                </View>
              </View>
            )}

            {/* RETURN LOAN */}
            {type === 'RETURN' && (
              <View>
                <Text style={styles.sectionLabel}>Select Active Loan</Text>
                {activeLoans.length === 0 ? (
                  <Text style={styles.emptyText}>No active loans at this table.</Text>
                ) : (
                  activeLoans.map(loan => (
                    <TouchableOpacity
                      key={loan.id}
                      onPress={() => {
                        setSelectedLoanId(loan.id);
                        setChipAmount(loan.remaining_chip_amount.toString());
                      }}
                      style={[styles.loanCard, selectedLoanId === loan.id && styles.loanCardActive]}
                    >
                      <Text style={styles.loanCardTitle}>
                        {loan.borrower_name} owes {loan.lender_name}
                      </Text>
                      <Text style={styles.loanCardAmount}>
                        {loan.remaining_chip_amount} chips (₹{loan.remaining_chip_amount * chipVal})
                      </Text>
                    </TouchableOpacity>
                  ))
                )}

                {activeLoans.length > 0 && (
                  <>
                    <Text style={styles.sectionLabel}>Chips to Return</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={chipAmount}
                      onChangeText={setChipAmount}
                      style={styles.input}
                    />
                  </>
                )}
              </View>
            )}

            {/* TRANSFER CHIPS */}
            {type === 'TRANSFER' && (
              <View>
                <View style={styles.infoBanner}>
                  <Text style={styles.infoBannerText}>
                    ↔️ <Text style={{ fontWeight: '700' }}>Normal Chip Transfer.</Text> Moves physical chips between players without creating debt.
                  </Text>
                </View>

                <Text style={styles.sectionLabel}>From Player</Text>
                <View style={styles.chipsSelectorRow}>
                  {players.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSelectedPlayerId(p.id)}
                      style={[styles.playerChipPill, selectedPlayerId === p.id && styles.playerChipPillActive]}
                    >
                      <Text style={[styles.playerChipPillText, selectedPlayerId === p.id && styles.playerChipPillTextActive]}>
                        {p.display_name} ({p.current_chips})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>To Player</Text>
                <View style={styles.chipsSelectorRow}>
                  {players.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => setSecondPlayerId(p.id)}
                      style={[styles.playerChipPill, secondPlayerId === p.id && styles.playerChipPillActive]}
                    >
                      <Text style={[styles.playerChipPillText, secondPlayerId === p.id && styles.playerChipPillTextActive]}>
                        {p.display_name} ({p.current_chips})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Chips to Transfer</Text>
                <TextInput
                  keyboardType="numeric"
                  value={chipAmount}
                  onChangeText={setChipAmount}
                  style={styles.input}
                />
              </View>
            )}

            {/* CORRECTION */}
            {type === 'CORRECTION' && (
              <View>
                <Text style={styles.sectionLabel}>Select Player to Correct</Text>
                <View style={styles.chipsSelectorRow}>
                  {players.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => {
                        setSelectedPlayerId(p.id);
                        setChipAmount(p.current_chips.toString());
                      }}
                      style={[styles.playerChipPill, selectedPlayerId === p.id && styles.playerChipPillActive]}
                    >
                      <Text style={[styles.playerChipPillText, selectedPlayerId === p.id && styles.playerChipPillTextActive]}>
                        {p.display_name} ({p.current_chips})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionLabel}>Actual Correct Chip Count</Text>
                <TextInput
                  keyboardType="numeric"
                  value={chipAmount}
                  onChangeText={setChipAmount}
                  style={styles.input}
                />

                <Text style={styles.sectionLabel}>Reason (Optional)</Text>
                <TextInput
                  value={correctionReason}
                  onChangeText={setCorrectionReason}
                  placeholder="e.g. Recount at table break"
                  style={styles.input}
                />
              </View>
            )}

            {/* UNDO */}
            {type === 'UNDO' && (
              <View>
                {lastTransaction ? (
                  <View style={styles.undoCard}>
                    <Text style={styles.undoTitle}>Reversing Last Transaction:</Text>
                    <Text style={styles.undoDetail}>
                      Type: <Text style={{ fontWeight: '700' }}>{lastTransaction.type}</Text>
                    </Text>
                    <Text style={styles.undoDetail}>
                      Amount: <Text style={{ fontWeight: '700' }}>{lastTransaction.chip_amount} chips (₹{lastTransaction.money_value})</Text>
                    </Text>
                    <Text style={styles.undoWarning}>
                      An auditable reversal record will be created to reverse the chip counts safely.
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.emptyText}>No recent transaction to undo.</Text>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleExecute}
            disabled={isSubmitting || (type === 'RETURN' && activeLoans.length === 0)}
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Recording...' : 'Confirm & Record'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.75)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '88%',
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderSubtle
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.dangerText,
    marginLeft: 6,
    flex: 1,
    fontWeight: '500'
  },
  infoBanner: {
    backgroundColor: colors.primaryLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  infoBannerText: {
    fontSize: 12,
    color: colors.primary,
    lineHeight: 18,
    fontWeight: '500'
  },
  body: {
    maxHeight: 450
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.5
  },
  chipsSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8
  },
  playerChipPill: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    marginRight: 8,
    marginBottom: 8
  },
  playerChipPillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  playerChipPillText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  playerChipPillTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  input: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 20,
    fontWeight: '800',
    color: colors.text
  },
  presetsRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 12
  },
  presetBtn: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8
  },
  presetBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  presetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  presetBtnTextActive: {
    color: colors.primary
  },
  calcCard: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  calcText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  calcHighlight: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary
  },
  bankAvailText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4
  },
  toggleRow: {
    flexDirection: 'row',
    marginTop: 6
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.cardInset,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  toggleBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary
  },
  toggleBtnTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  loanCard: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  loanCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight
  },
  loanCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  loanCardAmount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  undoCard: {
    backgroundColor: colors.warningLight,
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.warningBorder
  },
  undoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.warningText,
    marginBottom: 6
  },
  undoDetail: {
    fontSize: 13,
    color: colors.text,
    marginBottom: 4
  },
  undoWarning: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic'
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 12,
    textAlign: 'center'
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 14
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3
  }
});
