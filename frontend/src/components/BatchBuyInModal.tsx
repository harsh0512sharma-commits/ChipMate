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
import { X, Check, Users, Coins, AlertCircle, Sparkles, CheckSquare, Square } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface BatchBuyInModalProps {
  visible: boolean;
  table: any;
  players: any[];
  onClose: () => void;
  onSubmitBatchBuyIn: (
    playerIds: string[],
    chipAmount: number,
    moneyValue?: number,
    denominationsBreakdown?: Array<{ denom: number; count: number }>
  ) => Promise<void>;
}

export const BatchBuyInModal: React.FC<BatchBuyInModalProps> = ({
  visible,
  table,
  players,
  onClose,
  onSubmitBatchBuyIn
}) => {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [chipAmount, setChipAmount] = useState<string>('50');
  const [isCustomChips, setIsCustomChips] = useState<boolean>(false);
  const [customChips, setCustomChips] = useState<string>('50');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // When modal becomes visible, default to selecting all players
  useEffect(() => {
    if (visible && players && players.length > 0) {
      setSelectedPlayerIds(players.map(p => p.id));
      setErrorMsg(null);
    }
  }, [visible, players]);

  if (!visible) return null;

  const isDenomMode = table?.chip_mode === 'DENOMINATION';
  const chipVal = table?.chip_value || 10;

  // Parse table denominations if present
  let tableDenoms: any[] = [];
  if (table?.denominations) {
    try {
      const parsed = typeof table.denominations === 'string' ? JSON.parse(table.denominations) : table.denominations;
      if (Array.isArray(parsed)) {
        tableDenoms = parsed.map((d: any) => (typeof d === 'object' && d !== null ? d.value : d));
      }
    } catch (_) {}
  }

  const chipsPerPlayer = isCustomChips ? (parseInt(customChips, 10) || 0) : (parseInt(chipAmount, 10) || 0);
  const moneyPerPlayer = chipsPerPlayer * chipVal;

  const totalChipsNeeded = chipsPerPlayer * selectedPlayerIds.length;
  const totalMoneyValue = moneyPerPlayer * selectedPlayerIds.length;
  const bankHasEnough = (table?.bank_chips ?? 0) >= totalChipsNeeded;

  const isAllSelected = players.length > 0 && selectedPlayerIds.length === players.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPlayerIds([]);
    } else {
      setSelectedPlayerIds(players.map(p => p.id));
    }
  };

  const togglePlayer = (id: string) => {
    setSelectedPlayerIds(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleExecute = async () => {
    setErrorMsg(null);
    if (selectedPlayerIds.length === 0) {
      setErrorMsg('Please select at least one player to assign buy-in');
      return;
    }
    if (chipsPerPlayer <= 0) {
      setErrorMsg('Buy-in chip count must be greater than 0');
      return;
    }
    if (!bankHasEnough) {
      setErrorMsg(`Bank vault only has ${table?.bank_chips ?? 0} chips available. Need ${totalChipsNeeded} chips.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitBatchBuyIn(selectedPlayerIds, chipsPerPlayer, moneyPerPlayer);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Batch buy-in failed');
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
            <View style={styles.titleWithIcon}>
              <View style={styles.headerIconRing}>
                <Coins size={16} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.headerTitle}>Buy-In for Table Members</Text>
                <Text style={styles.headerSubtitle}>Assign equal buy-ins to selected or all players</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {errorMsg && (
            <View style={styles.errorBanner}>
              <AlertCircle size={14} color={colors.dangerText} />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          )}

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Top Section: Buy-In Configuration / Presets */}
            <View style={styles.configCard}>
              <View style={styles.configHeaderRow}>
                <Text style={styles.sectionLabel}>CHIPS PER PLAYER</Text>
                <Text style={styles.rateLabel}>
                  Rate: ₹{chipVal.toFixed(1)} / chip
                </Text>
              </View>

              {/* Presets Row */}
              <View style={styles.pillsRow}>
                {['20', '50', '100', '200'].map(cnt => (
                  <TouchableOpacity
                    key={cnt}
                    onPress={() => {
                      setChipAmount(cnt);
                      setIsCustomChips(false);
                    }}
                    style={[
                      styles.pill,
                      !isCustomChips && chipAmount === cnt && styles.pillActive
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        !isCustomChips && chipAmount === cnt && styles.pillTextActive
                      ]}
                    >
                      {cnt} chips
                    </Text>
                    <Text
                      style={[
                        styles.pillSubText,
                        !isCustomChips && chipAmount === cnt && styles.pillSubTextActive
                      ]}
                    >
                      ₹{(parseInt(cnt, 10) * chipVal).toLocaleString('en-IN')}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  onPress={() => {
                    setIsCustomChips(true);
                    setCustomChips(chipAmount);
                  }}
                  style={[styles.pill, isCustomChips && styles.pillActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pillText, isCustomChips && styles.pillTextActive]}>
                    Custom
                  </Text>
                  <Text style={[styles.pillSubText, isCustomChips && styles.pillSubTextActive]}>
                    Any amount
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomChips && (
                <View style={styles.customInputRow}>
                  <Text style={styles.customInputLabel}>Enter Chips per player:</Text>
                  <TextInput
                    style={styles.customInput}
                    keyboardType="numeric"
                    placeholder="e.g. 75"
                    placeholderTextColor={colors.textMuted}
                    value={customChips}
                    onChangeText={setCustomChips}
                  />
                </View>
              )}

              {/* Individual Player Preview Info */}
              <View style={styles.perPlayerNoteRow}>
                <Sparkles size={13} color={colors.primary} />
                <Text style={styles.perPlayerNoteText}>
                  Each selected player will receive{' '}
                  <Text style={{ fontWeight: '800', color: colors.text }}>{chipsPerPlayer} chips</Text> (₹{moneyPerPlayer.toLocaleString('en-IN')})
                </Text>
              </View>
            </View>

            {/* Middle Section: Seated Players List with Checkboxes */}
            <View style={styles.playersSection}>
              <View style={styles.playersHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Users size={15} color={colors.text} />
                  <Text style={styles.sectionLabel}>
                    SELECT PLAYERS ({selectedPlayerIds.length}/{players.length})
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.selectAllBtn}
                  onPress={toggleSelectAll}
                  activeOpacity={0.7}
                >
                  <Text style={styles.selectAllBtnText}>
                    {isAllSelected ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.playersList}>
                {players.map(p => {
                  const isChecked = selectedPlayerIds.includes(p.id);
                  const initial = p.display_name ? p.display_name.charAt(0).toUpperCase() : 'P';
                  return (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => togglePlayer(p.id)}
                      style={[styles.playerItemCard, isChecked && styles.playerItemCardSelected]}
                      activeOpacity={0.7}
                    >
                      {/* Checkbox */}
                      <View style={[styles.checkboxContainer, isChecked && styles.checkboxContainerChecked]}>
                        {isChecked ? (
                          <Check size={14} color="#FFF" />
                        ) : (
                          <View style={styles.checkboxEmpty} />
                        )}
                      </View>

                      {/* Avatar */}
                      <View style={styles.playerAvatar}>
                        <Text style={styles.playerAvatarText}>{initial}</Text>
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.playerName, isChecked && styles.playerNameSelected]} numberOfLines={1}>
                            {p.display_name}
                          </Text>
                          {p.role === 'HOST' && (
                            <View style={styles.hostPill}>
                              <Text style={styles.hostPillText}>HOST</Text>
                            </View>
                          )}
                          {p.is_guest === 1 && (
                            <View style={styles.guestPill}>
                              <Text style={styles.guestPillText}>GUEST</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.playerHolding}>
                          Holding: {p.current_chips} chips (₹{(p.current_chips * chipVal).toLocaleString('en-IN')})
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Bottom Summary Bar & Action Button */}
          <View style={styles.footerContainer}>
            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>TOTAL CHIPS REQUIRED</Text>
                <Text style={[styles.summaryVal, !bankHasEnough && { color: colors.dangerText }]}>
                  {totalChipsNeeded} <Text style={styles.summaryUnit}>chips</Text>
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>BANK VAULT</Text>
                <Text style={[styles.summaryVal, table?.bank_chips === 0 && { color: colors.warningText }]}>
                  {table?.bank_chips ?? 0} <Text style={styles.summaryUnit}>avail</Text>
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>TOTAL MONEY</Text>
                <Text style={[styles.summaryVal, { color: colors.chipGold }]}>
                  ₹{totalMoneyValue.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {!bankHasEnough && (
              <View style={styles.overdraftAlert}>
                <AlertCircle size={13} color={colors.dangerText} />
                <Text style={styles.overdraftAlertText}>
                  Bank vault only has {table?.bank_chips ?? 0} chips available. Reduce amount or players.
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleExecute}
              disabled={isSubmitting || selectedPlayerIds.length === 0 || !bankHasEnough || chipsPerPlayer <= 0}
              style={[
                styles.submitBtn,
                (isSubmitting || selectedPlayerIds.length === 0 || !bankHasEnough || chipsPerPlayer <= 0) && {
                  opacity: 0.5
                }
              ]}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitBtnText}>
                  Confirm Buy-in for {selectedPlayerIds.length} Players (₹{totalMoneyValue.toLocaleString('en-IN')})
                </Text>
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
    backgroundColor: 'rgba(5, 7, 10, 0.75)',
    justifyContent: 'flex-end'
  },
  sheetContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 500,
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
    marginBottom: 14
  },
  titleWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1
  },
  headerIconRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(235, 94, 40, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(235, 94, 40, 0.25)'
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.cardInset
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.dangerText,
    fontWeight: '600',
    flex: 1
  },
  body: {
    maxHeight: 420
  },
  configCard: {
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 14,
    marginBottom: 16
  },
  configHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  pill: {
    flex: 1,
    minWidth: 64,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center'
  },
  pillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  pillTextActive: {
    color: colors.text,
    fontWeight: '800'
  },
  pillSubText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  pillSubTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle
  },
  customInputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  customInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    width: 90,
    textAlign: 'center'
  },
  perPlayerNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(235, 94, 40, 0.06)',
    borderRadius: 8,
    padding: 8
  },
  perPlayerNoteText: {
    fontSize: 11,
    color: colors.textSecondary
  },
  playersSection: {
    marginBottom: 8
  },
  playersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  selectAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  },
  playersList: {
    gap: 6
  },
  playerItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 10,
    gap: 10
  },
  playerItemCardSelected: {
    backgroundColor: 'rgba(235, 94, 40, 0.08)',
    borderColor: colors.primary
  },
  checkboxContainer: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxContainerChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  checkboxEmpty: {
    width: 10,
    height: 10
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  playerAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  playerNameSelected: {
    color: colors.text,
    fontWeight: '800'
  },
  hostPill: {
    backgroundColor: 'rgba(235, 94, 40, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  hostPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary
  },
  guestPill: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  guestPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary
  },
  playerHolding: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingTop: 12,
    marginTop: 4
  },
  summaryStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.cardInset,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10
  },
  summaryCol: {
    flex: 1,
    alignItems: 'center'
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.borderSubtle
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text
  },
  summaryUnit: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted
  },
  overdraftAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8
  },
  overdraftAlertText: {
    fontSize: 11,
    color: colors.dangerText,
    fontWeight: '600',
    flex: 1
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF'
  }
});