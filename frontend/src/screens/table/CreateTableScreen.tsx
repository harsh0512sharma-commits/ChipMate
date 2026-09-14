import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { ArrowLeft, Sparkles, Check, Users, UserCheck, UserPlus, Coins, Layers, Banknote, Plus, Trash2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { Header } from '../../components/Header';

interface CreateTableScreenProps {
  onBack: () => void;
  onTableCreated: (tableId: string) => void;
}

export interface PokerDenomRow {
  id: string;
  value: string;
  count: string;
  label?: string;
  color: string;
}

const POKER_CHIP_COLORS = ['#EF4444', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#1E293B', '#EC4899', '#06B6D4'];

export const DEFAULT_POKER_DENOMS: PokerDenomRow[] = [
  { id: '1', value: '5', count: '25', label: 'Red', color: '#EF4444' },
  { id: '2', value: '10', count: '25', label: 'Blue', color: '#3B82F6' },
  { id: '3', value: '25', count: '25', label: 'Green', color: '#10B981' },
  { id: '4', value: '100', count: '25', label: 'Black', color: '#1E293B' }
];

export const DENOMINATION_PRESETS = [
  {
    name: 'Home Casual (Micro)',
    denominations: [1, 2, 5, 10],
    chipDetails: [
      { val: 1, color: '#F1F5F9', textColor: '#0F172A', label: 'White' },
      { val: 2, color: '#EAB308', textColor: '#000000', label: 'Yellow' },
      { val: 5, color: '#EF4444', textColor: '#FFFFFF', label: 'Red' },
      { val: 10, color: '#3B82F6', textColor: '#FFFFFF', label: 'Blue' }
    ]
  },
  {
    name: 'Standard Stakes',
    denominations: [5, 10, 20, 50],
    chipDetails: [
      { val: 5, color: '#EF4444', textColor: '#FFFFFF', label: 'Red' },
      { val: 10, color: '#3B82F6', textColor: '#FFFFFF', label: 'Blue' },
      { val: 20, color: '#10B981', textColor: '#FFFFFF', label: 'Green' },
      { val: 50, color: '#8B5CF6', textColor: '#FFFFFF', label: 'Purple' }
    ]
  },
  {
    name: 'Casino / High Stakes',
    denominations: [10, 25, 50, 100],
    chipDetails: [
      { val: 10, color: '#3B82F6', textColor: '#FFFFFF', label: 'Blue' },
      { val: 25, color: '#10B981', textColor: '#FFFFFF', label: 'Green' },
      { val: 50, color: '#8B5CF6', textColor: '#FFFFFF', label: 'Purple' },
      { val: 100, color: '#1E293B', textColor: '#F8FAFC', label: 'Black' }
    ]
  }
];

export const CreateTableScreen: React.FC<CreateTableScreenProps> = ({
  onBack,
  onTableCreated
}) => {
  const [name, setName] = useState('Friday Night');
  const [gameType, setGameType] = useState<'TEEN_PATTI' | 'POKER'>('TEEN_PATTI');
  const [totalChips, setTotalChips] = useState('100');
  const [chipValue, setChipValue] = useState('10');
  const [customChips, setCustomChips] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [isCustomChips, setIsCustomChips] = useState(false);
  const [isCustomValue, setIsCustomValue] = useState(false);

  // Chip Valuation Mode: EQUAL (Single Value), DENOMINATION (Physical Chip Sets), or VALUE (Direct ₹ Values)
  const [chipMode, setChipMode] = useState<'EQUAL' | 'DENOMINATION' | 'VALUE'>('EQUAL');

  // Custom Denominations with Physical Chip Counts (Unified for both Teen Patti & Poker)
  const [denomRows, setDenomRows] = useState<PokerDenomRow[]>(DEFAULT_POKER_DENOMS);

  const updateDenomRow = (id: string, field: 'value' | 'count', val: string) => {
    setDenomRows(prev => prev.map(row => row.id === id ? { ...row, [field]: val } : row));
  };

  const addDenomRow = () => {
    const nextColor = POKER_CHIP_COLORS[denomRows.length % POKER_CHIP_COLORS.length];
    setDenomRows(prev => [
      ...prev,
      { id: Date.now().toString(), value: '100', count: '20', label: 'Black', color: nextColor }
    ]);
  };

  const removeDenomRow = (id: string) => {
    if (denomRows.length <= 1) return;
    setDenomRows(prev => prev.filter(row => row.id !== id));
  };

  // Instant Friend Seating
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

  // Saved Guests Seating
  const [savedGuests, setSavedGuests] = useState<any[]>([]);
  const [selectedGuestIds, setSelectedGuestIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest('/friends')
      .then(res => {
        if (res.success && res.friends) {
          setFriends(res.friends);
        }
      })
      .catch(err => console.warn('Failed to load friends:', err))
      .finally(() => setLoadingFriends(false));

    apiRequest('/tables/guests')
      .then(res => {
        if (res.success && res.guests) {
          setSavedGuests(res.guests);
        }
      })
      .catch(err => console.warn('Failed to load saved guests:', err));
  }, []);

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const toggleGuest = (guestId: string) => {
    setSelectedGuestIds(prev =>
      prev.includes(guestId) ? prev.filter(id => id !== guestId) : [...prev, guestId]
    );
  };

  // Calculations for Equal Chip Value mode
  const numChips = isCustomChips ? (parseInt(customChips, 10) || 0) : (parseInt(totalChips, 10) || 100);
  const numValue = isCustomValue ? (parseFloat(customValue) || 0) : (parseFloat(chipValue) || 10);

  // Calculations for Custom Denomination / Value mode (values + physical counts)
  const denomTotalChips = denomRows.reduce((sum, d) => sum + (parseInt(d.count, 10) || 0), 0);
  const denomTotalPot = denomRows.reduce((sum, d) => sum + ((parseInt(d.count, 10) || 0) * (parseFloat(d.value) || 0)), 0);
  const denomEffectiveChipValue = denomTotalChips > 0 ? (denomTotalPot / denomTotalChips) : 10;

  const isCustomInventory = chipMode === 'DENOMINATION' || chipMode === 'VALUE';
  const finalTotalChips = isCustomInventory ? denomTotalChips : numChips;
  const finalChipValue = chipMode === 'VALUE' ? 1.0 : (chipMode === 'DENOMINATION' ? denomEffectiveChipValue : numValue);
  const finalTotalPot = isCustomInventory ? denomTotalPot : (numChips * numValue);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a game name');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (chipMode === 'DENOMINATION' || chipMode === 'VALUE') {
        if (denomTotalChips <= 0) {
          setError('Total physical chips must be greater than 0');
          setLoading(false);
          return;
        }
        const validDenoms = denomRows
          .map(d => ({
            value: parseFloat(d.value) || 0,
            count: parseInt(d.count, 10) || 0,
            initial_count: parseInt(d.count, 10) || 0,
            label: d.label,
            color: d.color
          }))
          .filter(d => d.value > 0 && d.count > 0);

        if (validDenoms.length === 0) {
          setError('Please specify at least one chip denomination with positive value and quantity');
          setLoading(false);
          return;
        }

        const res = await apiRequest('/tables', {
          method: 'POST',
          body: {
            name: name.trim(),
            gameType,
            totalChips: denomTotalChips,
            chipValue: chipMode === 'VALUE' ? 1.0 : denomEffectiveChipValue,
            chipMode,
            denominations: validDenoms,
            initialFriendUserIds: selectedFriendIds,
            initialGuestIds: selectedGuestIds
          }
        });

        if (res.success && res.table) {
          onTableCreated(res.table.id);
        } else {
          setError(res.error || 'Failed to create table');
        }
        return;
      }

      // EQUAL CHIP VALUE validation & submission
      if (numChips <= 0) {
        setError('Total chips must be greater than 0');
        setLoading(false);
        return;
      }
      if (numValue <= 0) {
        setError('Chip value must be greater than 0');
        setLoading(false);
        return;
      }

      const res = await apiRequest('/tables', {
        method: 'POST',
        body: {
          name: name.trim(),
          gameType,
          totalChips: numChips,
          chipValue: numValue,
          chipMode: 'EQUAL',
          initialFriendUserIds: selectedFriendIds,
          initialGuestIds: selectedGuestIds
        }
      });

      if (res.success && res.table) {
        onTableCreated(res.table.id);
      } else {
        setError(res.error || 'Failed to create table');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Create Table" onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Game Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Game Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Friday Night Poker"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        {/* Game Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Game Type</Text>
          <View style={styles.typeSelectorRow}>
            <TouchableOpacity
              onPress={() => setGameType('TEEN_PATTI')}
              style={[styles.typeBtn, gameType === 'TEEN_PATTI' && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnTitle, gameType === 'TEEN_PATTI' && styles.typeBtnTitleActive]}>
                Teen Patti
              </Text>
              <Text style={[styles.typeBtnDesc, gameType === 'TEEN_PATTI' && styles.typeBtnDescActive]}>
                Traditional 3-card game
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGameType('POKER')}
              style={[styles.typeBtn, gameType === 'POKER' && styles.typeBtnActive]}
            >
              <Text style={[styles.typeBtnTitle, gameType === 'POKER' && styles.typeBtnTitleActive]}>
                Poker
              </Text>
              <Text style={[styles.typeBtnDesc, gameType === 'POKER' && styles.typeBtnDescActive]}>
                Texas Hold'em
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Chip Valuation Mode Toggle */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Chip Valuation Mode</Text>
          <Text style={styles.hint}>
            Choose whether all chips share one equal value, or play by physical custom denominations (₹10, ₹20, ₹50, ₹100...).
          </Text>

          <View style={styles.modeToggleRow}>
            <TouchableOpacity
              style={[styles.modeToggleBtn, chipMode === 'EQUAL' && styles.modeToggleBtnActive]}
              onPress={() => setChipMode('EQUAL')}
              activeOpacity={0.8}
            >
              <Coins size={18} color={chipMode === 'EQUAL' ? '#FFF' : colors.textMuted} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeToggleText, chipMode === 'EQUAL' && styles.modeToggleTextActive]}>
                  Equal Chip Value
                </Text>
                <Text style={styles.modeToggleSub}>All chips share 1 face value (e.g. 100 chips at ₹10)</Text>
              </View>
              {chipMode === 'EQUAL' && <Check size={16} color="#FFF" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeToggleBtn, chipMode === 'DENOMINATION' && styles.modeToggleBtnActive]}
              onPress={() => setChipMode('DENOMINATION')}
              activeOpacity={0.8}
            >
              <Layers size={18} color={chipMode === 'DENOMINATION' ? '#FFF' : colors.textMuted} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeToggleText, chipMode === 'DENOMINATION' && styles.modeToggleTextActive]}>
                  By Denomination
                </Text>
                <Text style={styles.modeToggleSub}>Custom chips (₹5, ₹10, ₹25, ₹100) with physical chip counting</Text>
              </View>
              {chipMode === 'DENOMINATION' && <Check size={16} color="#FFF" />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeToggleBtn, chipMode === 'VALUE' && styles.modeToggleBtnActive]}
              onPress={() => setChipMode('VALUE')}
              activeOpacity={0.8}
            >
              <Banknote size={18} color={chipMode === 'VALUE' ? '#FFF' : colors.textMuted} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.modeToggleText, chipMode === 'VALUE' && styles.modeToggleTextActive]}>
                  By Value (Recommended)
                </Text>
                <Text style={styles.modeToggleSub}>Custom chip inventory with direct ₹ value buy-ins & loans (no chip counting)</Text>
              </View>
              {chipMode === 'VALUE' && <Check size={16} color="#FFF" />}
            </TouchableOpacity>
          </View>
        </View>

        {chipMode === 'EQUAL' ? (
          <>
            {/* Total Physical Chips */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Total Physical Chips</Text>
              <Text style={styles.hint}>
                Default is exactly 100 chips. You can increase or set custom quantities.
              </Text>
              <View style={styles.pillsRow}>
                {['50', '100', '150', '200'].map(cnt => (
                  <TouchableOpacity
                    key={cnt}
                    onPress={() => {
                      setTotalChips(cnt);
                      setIsCustomChips(false);
                    }}
                    style={[
                      styles.pill,
                      !isCustomChips && totalChips === cnt && styles.pillActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        !isCustomChips && totalChips === cnt && styles.pillTextActive
                      ]}
                    >
                      {cnt} chips
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setIsCustomChips(true)}
                  style={[styles.pill, isCustomChips && styles.pillActive]}
                >
                  <Text style={[styles.pillText, isCustomChips && styles.pillTextActive]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomChips && (
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  placeholder="Enter total chips count"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={customChips}
                  onChangeText={setCustomChips}
                />
              )}
            </View>

            {/* Single Chip Value Selector */}
            <View style={styles.formGroup}>
              <Text style={styles.label}>Amount Assigned to 1 Chip</Text>
              <Text style={styles.hint}>
                All chips have the exact same value. Money is derived automatically.
              </Text>
              <View style={styles.pillsRow}>
                {['1', '2', '5', '10', '20', '50'].map(val => (
                  <TouchableOpacity
                    key={val}
                    onPress={() => {
                      setChipValue(val);
                      setIsCustomValue(false);
                    }}
                    style={[
                      styles.pill,
                      !isCustomValue && chipValue === val && styles.pillActive
                    ]}
                  >
                    <Text
                      style={[
                        styles.pillText,
                        !isCustomValue && chipValue === val && styles.pillTextActive
                      ]}
                    >
                      ₹{val}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  onPress={() => setIsCustomValue(true)}
                  style={[styles.pill, isCustomValue && styles.pillActive]}
                >
                  <Text style={[styles.pillText, isCustomValue && styles.pillTextActive]}>
                    Custom
                  </Text>
                </TouchableOpacity>
              </View>

              {isCustomValue && (
                <TextInput
                  style={[styles.input, { marginTop: 10 }]}
                  placeholder="Enter custom ₹ value per chip"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={customValue}
                  onChangeText={setCustomValue}
                />
              )}
            </View>
          </>
        ) : (
          /* CUSTOM CHIP VALUATION & PHYSICAL INVENTORY (DENOMINATION OR VALUE) */
          <View style={styles.formGroup}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <Text style={styles.label}>Custom Chip Denominations & Inventory</Text>
              <View style={styles.pokerModeBadge}>
                {chipMode === 'VALUE' ? (
                  <Banknote size={12} color="#FFF" style={{ marginRight: 4 }} />
                ) : (
                  <Layers size={12} color="#FFF" style={{ marginRight: 4 }} />
                )}
                <Text style={styles.pokerModeBadgeText}>
                  {chipMode === 'VALUE' ? 'By Value' : 'By Denomination'}
                </Text>
              </View>
            </View>
            <Text style={styles.hint}>
              {chipMode === 'VALUE'
                ? 'Define the chips in your physical set to set the total pot valuation. In game, you enter buy-ins, loans, and end-game values directly in rupees without micro-managing physical chip counts.'
                : 'Define the chip values (₹) and the exact count of physical chips in your game set.'}
            </Text>

            {/* List of Custom Denominations */}
            <View style={styles.pokerDenomContainer}>
              <View style={styles.pokerDenomHeaderRow}>
                <Text style={[styles.pokerDenomColHeader, { width: 44, textAlign: 'center' }]}>CHIP</Text>
                <Text style={[styles.pokerDenomColHeader, { flex: 1.2, paddingLeft: 8 }]}>VALUE (₹)</Text>
                <Text style={[styles.pokerDenomColHeader, { flex: 1.2, paddingLeft: 8 }]}>QTY (COUNT)</Text>
                <Text style={[styles.pokerDenomColHeader, { width: 80, textAlign: 'right', paddingRight: 4 }]}>TOTAL (₹)</Text>
                <Text style={[styles.pokerDenomColHeader, { width: 36 }]}></Text>
              </View>

              {denomRows.map((row) => {
                const rowVal = parseFloat(row.value) || 0;
                const rowCount = parseInt(row.count, 10) || 0;
                const rowTotal = rowVal * rowCount;
                return (
                  <View key={row.id} style={styles.pokerDenomRow}>
                    <View style={[styles.pokerChipDisc, { backgroundColor: row.color }]}>
                      <Text style={styles.pokerChipDiscText}>₹{rowVal || '?'}</Text>
                    </View>

                    <View style={{ flex: 1.2, paddingHorizontal: 4 }}>
                      <TextInput
                        style={styles.pokerDenomInput}
                        keyboardType="numeric"
                        placeholder="₹ Val"
                        placeholderTextColor={colors.textMuted}
                        value={row.value}
                        onChangeText={t => updateDenomRow(row.id, 'value', t)}
                      />
                    </View>

                    <View style={{ flex: 1.2, paddingHorizontal: 4 }}>
                      <TextInput
                        style={styles.pokerDenomInput}
                        keyboardType="numeric"
                        placeholder="Count"
                        placeholderTextColor={colors.textMuted}
                        value={row.count}
                        onChangeText={t => updateDenomRow(row.id, 'count', t)}
                      />
                    </View>

                    <View style={{ width: 80, alignItems: 'flex-end', justifyContent: 'center', paddingRight: 4 }}>
                      <Text style={styles.pokerDenomRowTotal}>₹{rowTotal.toLocaleString('en-IN')}</Text>
                      <Text style={styles.pokerDenomRowSub}>{rowCount} chips</Text>
                    </View>

                    <TouchableOpacity
                      onPress={() => removeDenomRow(row.id)}
                      disabled={denomRows.length <= 1}
                      style={[styles.pokerDenomDeleteBtn, denomRows.length <= 1 && { opacity: 0.3 }]}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={colors.dangerText} />
                    </TouchableOpacity>
                  </View>
                );
              })}

              <TouchableOpacity
                style={styles.addDenomBtn}
                onPress={addDenomRow}
                activeOpacity={0.8}
              >
                <Plus size={15} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.addDenomBtnText}>+ Add Custom Denomination</Text>
              </TouchableOpacity>
            </View>

            {/* Inventory Distribution Summary */}
            <View style={styles.breakdownBox}>
              <Text style={styles.breakdownTitle}>
                PHYSICAL CHIP INVENTORY ({denomTotalChips} TOTAL CHIPS • ₹{denomTotalPot.toLocaleString('en-IN')} VAULT):
              </Text>
              <View style={styles.breakdownRow}>
                {denomRows.map(d => {
                  const val = parseFloat(d.value) || 0;
                  const cnt = parseInt(d.count, 10) || 0;
                  return (
                    <View key={d.id} style={[styles.breakdownPill, { borderColor: d.color }]}>
                      <View style={[styles.miniDot, { backgroundColor: d.color }]} />
                      <Text style={styles.breakdownPillText}>
                        {cnt} × ₹{val} = ₹{(cnt * val).toLocaleString('en-IN')}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
        )}

        {/* Seat Friends Instantly (Frictionless - No Codes Needed) */}
        <View style={styles.formGroup}>
          <View style={styles.friendHeaderRow}>
            <Users size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.label}>Seat Friends Instantly (No Codes Needed)</Text>
          </View>
          <Text style={styles.hint}>
            Tap friends to seat them directly. They will be in the game immediately without needing to enter any join code.
          </Text>

          {loadingFriends ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : friends.length === 0 ? (
            <View style={styles.noFriendsBox}>
              <Text style={styles.noFriendsText}>
                No friends added yet. You can also seat friends directly inside the live table after creating it.
              </Text>
            </View>
          ) : (
            <View style={styles.friendListGrid}>
              {friends.map(friend => {
                const isSelected = selectedFriendIds.includes(friend.id);
                const isBusy = Boolean(friend.isInActiveGame);
                return (
                  <TouchableOpacity
                    key={friend.id}
                    onPress={() => !isBusy && toggleFriend(friend.id)}
                    style={[
                      styles.friendItemCard,
                      isSelected && styles.friendItemCardSelected,
                      isBusy && { opacity: 0.55 }
                    ]}
                    disabled={isBusy}
                    activeOpacity={0.7}
                  >
                    <View style={styles.friendAvatarBadge}>
                      <Text style={styles.friendAvatarText}>
                        {friend.displayName ? friend.displayName.charAt(0).toUpperCase() : 'P'}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.friendNameText, isSelected && styles.friendNameTextSelected]} numberOfLines={1}>
                        {friend.displayName}
                      </Text>
                      <Text style={styles.friendCodeSmall}>#{friend.friendCode}</Text>
                    </View>

                    {isBusy ? (
                      <View style={styles.friendInGameBadge}>
                        <Text style={styles.friendInGameBadgeText} numberOfLines={1}>
                          In Game: {friend.activeGameName || 'Active'}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.friendCheckCircle, isSelected && styles.friendCheckCircleSelected]}>
                        {isSelected ? (
                          <Check size={12} color="#FFF" />
                        ) : (
                          <UserPlus size={12} color={colors.textMuted} />
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Seat Saved Guests (Offline Players) */}
        {savedGuests.length > 0 && (
          <View style={styles.formGroup}>
            <View style={styles.friendHeaderRow}>
              <Users size={16} color={colors.primary} style={{ marginRight: 6 }} />
              <Text style={styles.label}>Seat Saved Guests</Text>
            </View>
            <Text style={styles.hint}>
              Tap offline or recurring guest players to seat them at the table right away.
            </Text>

            <View style={styles.friendListGrid}>
              {savedGuests.map(guest => {
                const isSelected = selectedGuestIds.includes(guest.id);
                return (
                  <TouchableOpacity
                    key={guest.id}
                    onPress={() => toggleGuest(guest.id)}
                    style={[
                      styles.friendItemCard,
                      isSelected && styles.friendItemCardSelected
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.friendAvatarBadge, { backgroundColor: colors.cardRaised }]}>
                      <Text style={styles.friendAvatarText}>
                        {guest.name ? guest.name.charAt(0).toUpperCase() : 'G'}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={[styles.friendNameText, isSelected && styles.friendNameTextSelected]} numberOfLines={1}>
                        {guest.name}
                      </Text>
                      <Text style={styles.friendCodeSmall}>
                        {guest.games_played > 0 ? `${guest.games_played} game${guest.games_played === 1 ? '' : 's'}` : 'Guest'}
                      </Text>
                    </View>

                    <View style={[styles.friendCheckCircle, isSelected && styles.friendCheckCircleSelected]}>
                      {isSelected ? (
                        <Check size={12} color="#FFF" />
                      ) : (
                        <UserPlus size={12} color={colors.textMuted} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Real-Time Mathematical Pot Preview */}
        <View style={styles.calculationCard}>
          <View style={styles.calcHeaderRow}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={styles.calcHeaderTitle}>TOTAL PHYSICAL POT VALUE</Text>
          </View>
          <Text style={styles.calcFormula}>
            {chipMode === 'DENOMINATION'
              ? `${denomTotalChips} physical chips across ${denomRows.map(d => '₹' + (d.value || '0')).join(', ')}`
              : `${numChips} chips × ₹${numValue} / chip`}
          </Text>
          <Text style={styles.calcTotalMoney}>₹{finalTotalPot.toLocaleString('en-IN')}</Text>
          <Text style={styles.calcNote}>
            {chipMode === 'DENOMINATION'
              ? `✓ Custom Denominations • Total ${denomTotalChips} physical chips in vault • Effective avg ₹${denomEffectiveChipValue.toFixed(1)}/chip.`
              : '✓ Reconciles 100% against bank and player inventories at all times.'}
          </Text>
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitButton, loading && { opacity: 0.7 }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create & Open Table</Text>
          )}
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
    paddingBottom: 40
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16
  },
  errorText: {
    fontSize: 13,
    color: colors.dangerText,
    fontWeight: '600'
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 10
  },
  input: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    fontWeight: '600'
  },
  typeSelectorRow: {
    flexDirection: 'row'
  },
  typeBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    padding: 14,
    marginRight: 10
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight
  },
  typeBtnTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text
  },
  typeBtnTitleActive: {
    color: colors.primary
  },
  typeBtnDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  typeBtnDescActive: {
    color: colors.textSecondary
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  pill: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8
  },
  pillActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  calculationCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 18,
    padding: 18,
    marginVertical: 10
  },
  calcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  calcHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.8,
    marginLeft: 6
  },
  calcFormula: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary
  },
  calcTotalMoney: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginVertical: 4,
    letterSpacing: -0.5
  },
  calcNote: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF'
  },
  friendHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  noFriendsBox: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    padding: 14
  },
  noFriendsText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16
  },
  friendListGrid: {
    gap: 8
  },
  friendItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 10,
    marginBottom: 6
  },
  friendItemCardSelected: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  friendAvatarBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  friendAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text
  },
  friendNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  friendNameTextSelected: {
    color: colors.primary
  },
  friendCodeSmall: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  friendCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  friendCheckCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  friendInGameBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    maxWidth: 130
  },
  friendInGameBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B'
  },
  modeToggleRow: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 6
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    padding: 12
  },
  modeToggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight
  },
  modeToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary
  },
  modeToggleTextActive: {
    color: colors.text,
    fontWeight: '800'
  },
  modeToggleSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  presetsColumn: {
    gap: 10,
    marginTop: 4
  },
  presetCard: {
    backgroundColor: colors.cardInset,
    borderWidth: 1.5,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    padding: 12
  },
  presetCardActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(235, 94, 40, 0.08)'
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  presetName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary
  },
  presetNameActive: {
    color: colors.primary,
    fontWeight: '800'
  },
  chipBadgesRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  chipBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  chipBadgeVal: {
    fontSize: 12,
    fontWeight: '800'
  },
  chipBadgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    opacity: 0.85
  },
  customDenomDesc: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  breakdownBox: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  breakdownTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginBottom: 8
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  breakdownPill: {
    backgroundColor: colors.cardInset,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  breakdownPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary
  },
  pokerModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  pokerModeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF'
  },
  pokerDenomContainer: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 14,
    padding: 12,
    marginTop: 6
  },
  pokerDenomHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    marginBottom: 8
  },
  pokerDenomColHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5
  },
  pokerDenomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  pokerChipDisc: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)'
  },
  pokerChipDiscText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFF'
  },
  pokerDenomInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center'
  },
  pokerDenomRowTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text
  },
  pokerDenomRowSub: {
    fontSize: 10,
    color: colors.textMuted
  },
  pokerDenomDeleteBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  addDenomBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: 'rgba(235, 94, 40, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(235, 94, 40, 0.25)',
    borderStyle: 'dashed',
    marginTop: 4
  },
  addDenomBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  },
  miniDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5
  }
});
