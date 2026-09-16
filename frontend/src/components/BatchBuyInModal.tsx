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
import { X, Check, Users, Coins, AlertCircle, Sparkles, CheckSquare, Square, Minus, Plus } from 'lucide-react-native';
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

  // Denomination Bundle State (quantity of each denomination per player)
  const [denomBundleCounts, setDenomBundleCounts] = useState<Record<number, number>>({});

  // Direct Rupee Value State for "VALUE" mode
  const [valueAmount, setValueAmount] = useState<string>('500');
  const [isCustomValue, setIsCustomValue] = useState<boolean>(false);
  const [customValue, setCustomValue] = useState<string>('500');

  const isValueMode = table?.chip_mode === 'VALUE';
  const isDenomMode = table?.chip_mode === 'DENOMINATION';
  const chipVal = table?.chip_value || 10;

  // Parse table denominations if present
  let tableDenomList: Array<{ denom: number; count: number; initial_count: number; color?: string; label?: string }> = [];
  if ((isDenomMode || isValueMode) && table?.denominations) {
    try {
      const parsed = typeof table.denominations === 'string' ? JSON.parse(table.denominations) : table.denominations;
      if (Array.isArray(parsed)) {
        tableDenomList = parsed.map((d: any) => {
          if (typeof d === 'object' && d !== null) {
            return {
              denom: Number(d.value) || 0,
              count: Number(d.count) || 0,
              initial_count: Number(d.initial_count ?? d.count) || 0,
              color: d.color,
              label: d.label
            };
          }
          return { denom: Number(d) || 0, count: 999, initial_count: 999 };
        }).filter(d => d.denom > 0);
      }
    } catch (_) {}
  }

  const updateDenomBundleCount = (denom: number, delta: number) => {
    setDenomBundleCounts(prev => {
      const current = prev[denom] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [denom]: next };
    });
  };

  const setDenomBundleDirect = (denom: number, countStr: string) => {
    const val = parseInt(countStr, 10) || 0;
    setDenomBundleCounts(prev => ({
      ...prev,
      [denom]: Math.max(0, val)
    }));
  };

  // When modal becomes visible, default to selecting all players
  useEffect(() => {
    if (visible && players && players.length > 0) {
      setSelectedPlayerIds(players.map(p => p.id));
      setErrorMsg(null);
      if (isDenomMode) {
        setDenomBundleCounts({});
      }
    }
  }, [visible, players, isDenomMode]);

  if (!visible) return null;

  const bundleChipsPerPlayer = Object.values(denomBundleCounts).reduce((acc, c) => acc + c, 0);
  const bundleMoneyPerPlayer = Object.entries(denomBundleCounts).reduce((acc, [d, c]) => acc + ((parseFloat(d) || 0) * c), 0);

  const valueMoneyPerPlayer = isCustomValue ? (parseInt(customValue, 10) || 0) : (parseInt(valueAmount, 10) || 0);

  const chipsPerPlayer = isValueMode
    ? valueMoneyPerPlayer
    : isDenomMode
      ? bundleChipsPerPlayer
      : (isCustomChips ? (parseInt(customChips, 10) || 0) : (parseInt(chipAmount, 10) || 0));

  const moneyPerPlayer = isValueMode
    ? valueMoneyPerPlayer
    : isDenomMode
      ? bundleMoneyPerPlayer
      : (chipsPerPlayer * chipVal);

  const numPlayers = selectedPlayerIds.length;
  const totalChipsNeeded = chipsPerPlayer * numPlayers;
  const totalMoneyValue = moneyPerPlayer * numPlayers;

  // Check if bank vault has enough for EACH denomination:
  let denomOverdraftError: string | null = null;
  if (isDenomMode && numPlayers > 0) {
    for (const [denomStr, count] of Object.entries(denomBundleCounts)) {
      const d = parseFloat(denomStr);
      const totalNeededForDenom = count * numPlayers;
      const bankItem = tableDenomList.find(item => item.denom === d);
      const available = bankItem ? bankItem.count : 0;
      if (totalNeededForDenom > available) {
        denomOverdraftError = `Vault only has ${available} chips of ₹${d}, but ${totalNeededForDenom} needed for ${numPlayers} players.`;
        break;
      }
    }
  }

  const bankHasEnough = isDenomMode ? !denomOverdraftError : ((table?.bank_chips ?? 0) >= totalChipsNeeded);

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
      setErrorMsg(isValueMode ? 'Please enter a buy-in amount greater than ₹0' : isDenomMode ? 'Please specify at least 1 chip in the denomination bundle' : 'Buy-in chip count must be greater than 0');
      return;
    }
    if (denomOverdraftError) {
      setErrorMsg(denomOverdraftError);
      return;
    }
    if (!bankHasEnough) {
      setErrorMsg(isValueMode ? `Total buy-in (₹${totalMoneyValue.toLocaleString('en-IN')}) exceeds bank vault balance of ₹${(table?.bank_chips ?? 0).toLocaleString('en-IN')}.` : `Bank vault only has ${table?.bank_chips ?? 0} chips available. Need ${totalChipsNeeded} chips.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const breakdown = isDenomMode
        ? Object.entries(denomBundleCounts)
            .map(([d, cnt]) => ({ denom: parseFloat(d), count: cnt }))
            .filter(item => item.count > 0)
        : undefined;

      await onSubmitBatchBuyIn(selectedPlayerIds, chipsPerPlayer, moneyPerPlayer, breakdown);
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
                <Text style={styles.headerSubtitle}>
                  {isValueMode ? 'Assign initial buy-in amount to selected or all players' : 'Assign equal buy-ins to selected or all players'}
                </Text>
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
              {isValueMode ? (
                <View>
                  <View style={styles.configHeaderRow}>
                    <Text style={styles.sectionLabel}>AMOUNT PER PLAYER</Text>
                    <Text style={styles.rateLabel}>By Value Mode</Text>
                  </View>
                  <Text style={[styles.perPlayerNoteText, { marginBottom: 10 }]}>
                    Choose or enter buy-in amount for each selected player:
                  </Text>

                  {/* Rupee Presets Row */}
                  <View style={styles.pillsRow}>
                    {['100', '200', '300', '500', '1000'].map(amt => (
                      <TouchableOpacity
                        key={amt}
                        onPress={() => {
                          setValueAmount(amt);
                          setIsCustomValue(false);
                        }}
                        style={[
                          styles.pill,
                          !isCustomValue && valueAmount === amt && styles.pillActive
                        ]}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            !isCustomValue && valueAmount === amt && styles.pillTextActive
                          ]}
                        >
                          ₹{amt}
                        </Text>
                        <Text
                          style={[
                            styles.pillSubText,
                            !isCustomValue && valueAmount === amt && styles.pillSubTextActive
                          ]}
                        >
                          buy-in
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      onPress={() => {
                        setIsCustomValue(true);
                        setCustomValue(valueAmount);
                      }}
                      style={[styles.pill, isCustomValue && styles.pillActive]}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.pillText, isCustomValue && styles.pillTextActive]}>
                        Custom
                      </Text>
                      <Text style={[styles.pillSubText, isCustomValue && styles.pillSubTextActive]}>
                        Any ₹
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {isCustomValue && (
                    <View style={styles.customInputRow}>
                      <Text style={styles.customInputLabel}>Enter ₹ value per player:</Text>
                      <TextInput
                        style={styles.customInput}
                        keyboardType="numeric"
                        placeholder="e.g. 750"
                        placeholderTextColor={colors.textMuted}
                        value={customValue}
                        onChangeText={setCustomValue}
                      />
                    </View>
                  )}

                  {/* Individual Player Preview Info */}
                  <View style={styles.perPlayerNoteRow}>
                    <Sparkles size={13} color={colors.primary} />
                    <Text style={styles.perPlayerNoteText}>
                      Each selected player receives{' '}
                      <Text style={{ fontWeight: '800', color: colors.primary }}>₹{moneyPerPlayer.toLocaleString('en-IN')}</Text>
                    </Text>
                  </View>
                </View>
              ) : isDenomMode ? (
                <View>
                  <View style={styles.configHeaderRow}>
                    <Text style={styles.sectionLabel}>CHIP BUNDLE PER PLAYER</Text>
                    <Text style={styles.rateLabel}>Denomination Mode</Text>
                  </View>
                  <Text style={[styles.perPlayerNoteText, { marginBottom: 10 }]}>
                    Configure exact chips to dispense to EACH selected player:
                  </Text>

                  <View style={styles.denomListContainer}>
                    {tableDenomList.map(item => {
                      const count = denomBundleCounts[item.denom] || 0;
                      const subtotal = count * item.denom;
                      const avail = item.count ?? 0;
                      const totalNeeded = count * numPlayers;
                      const isOver = totalNeeded > avail;

                      return (
                        <View key={item.denom} style={styles.denomRow}>
                          <View style={[styles.denomBadge, { backgroundColor: item.color || colors.primary }]}>
                            <Text style={styles.denomBadgeText}>₹{item.denom}</Text>
                          </View>

                          <View style={{ flex: 1, paddingLeft: 8 }}>
                            <Text style={styles.denomName}>₹{item.denom} Chip</Text>
                            <Text style={[styles.denomStock, isOver && { color: colors.dangerText, fontWeight: '700' }]}>
                              {avail} in vault {numPlayers > 0 && count > 0 ? `(${totalNeeded} needed)` : ''}
                            </Text>
                          </View>

                          <View style={styles.counterBox}>
                            <TouchableOpacity
                              onPress={() => updateDenomBundleCount(item.denom, -1)}
                              style={[styles.counterBtn, count <= 0 && { opacity: 0.35 }]}
                              disabled={count <= 0}
                            >
                              <Minus size={14} color={colors.text} />
                            </TouchableOpacity>

                            <TextInput
                              style={styles.counterInput}
                              keyboardType="numeric"
                              value={count.toString()}
                              onChangeText={t => setDenomBundleDirect(item.denom, t)}
                            />

                            <TouchableOpacity
                              onPress={() => updateDenomBundleCount(item.denom, 1)}
                              style={[styles.counterBtn, (count + 1) * Math.max(1, numPlayers) > avail && { opacity: 0.35 }]}
                              disabled={(count + 1) * Math.max(1, numPlayers) > avail}
                            >
                              <Plus size={14} color={colors.text} />
                            </TouchableOpacity>
                          </View>

                          <View style={{ width: 68, alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Text style={styles.denomSubtotal}>₹{subtotal.toLocaleString('en-IN')}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.perPlayerNoteRow}>
                    <Sparkles size={13} color={colors.primary} />
                    <Text style={styles.perPlayerNoteText}>
                      Each selected player receives{' '}
                      <Text style={{ fontWeight: '800', color: colors.text }}>{chipsPerPlayer} chips</Text> (₹{moneyPerPlayer.toLocaleString('en-IN')})
                    </Text>
                  </View>
                </View>
              ) : (
                <View>
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
              )}
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
                          {isValueMode
                            ? `Balance: ₹${(p.money_equivalent ?? p.current_chips ?? 0).toLocaleString('en-IN')}`
                            : isDenomMode
                              ? `Holding: ${p.current_chips} chips (₹${(p.money_equivalent ?? p.total_buyin_amount ?? 0).toLocaleString('en-IN')})`
                              : `Holding: ${p.current_chips} chips (₹${(p.current_chips * chipVal).toLocaleString('en-IN')})`}
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
                <Text style={styles.summaryLabel}>{isValueMode ? 'AMOUNT / PLAYER' : 'TOTAL CHIPS'}</Text>
                <Text style={[styles.summaryVal, !bankHasEnough && { color: colors.dangerText }]}>
                  {isValueMode ? `₹${moneyPerPlayer.toLocaleString('en-IN')}` : `${totalChipsNeeded} chips`}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>TOTAL BUY-IN</Text>
                <Text style={[styles.summaryVal, { color: colors.chipGold }]}>
                  ₹{totalMoneyValue.toLocaleString('en-IN')}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryCol}>
                <Text style={styles.summaryLabel}>BANK VAULT</Text>
                <Text style={[styles.summaryVal, table?.bank_chips === 0 && { color: colors.warningText }]}>
                  {isValueMode ? `₹${(table?.bank_chips ?? 0).toLocaleString('en-IN')}` : `${table?.bank_chips ?? 0} avail`}
                </Text>
              </View>
            </View>

            {!bankHasEnough && (
              <View style={styles.overdraftAlert}>
                <AlertCircle size={13} color={colors.dangerText} />
                <Text style={styles.overdraftAlertText}>
                  {isValueMode
                    ? `Total buy-in (₹${totalMoneyValue.toLocaleString('en-IN')}) exceeds bank vault balance of ₹${(table?.bank_chips ?? 0).toLocaleString('en-IN')}. Reduce amount or players.`
                    : isDenomMode && denomOverdraftError
                    ? denomOverdraftError
                    : `Bank vault only has ${table?.bank_chips ?? 0} chips available. Reduce amount or players.`}
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
                  {isValueMode
                    ? `Confirm Buy-In of ₹${moneyPerPlayer.toLocaleString('en-IN')} for ${selectedPlayerIds.length} Players (Total ₹${totalMoneyValue.toLocaleString('en-IN')})`
                    : `Confirm Buy-in for ${selectedPlayerIds.length} Players (₹${totalMoneyValue.toLocaleString('en-IN')})`}
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
    backgroundColor: colors.cardRaised,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 14,
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
  },
  denomListContainer: {
    gap: 8,
    marginBottom: 8
  },
  denomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  denomBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FFF'
  },
  denomBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#000'
  },
  denomName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  denomStock: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1
  },
  counterBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden'
  },
  counterBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardRaised
  },
  counterInput: {
    width: 38,
    height: 28,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    padding: 0
  },
  denomSubtotal: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.chipGold
  }
});