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
import { ArrowLeft, Sparkles, Check, Users, UserCheck, UserPlus } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { Header } from '../../components/Header';

interface CreateTableScreenProps {
  onBack: () => void;
  onTableCreated: (tableId: string) => void;
}

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

  // Instant Friend Seating
  const [friends, setFriends] = useState<any[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);

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
  }, []);

  const toggleFriend = (friendId: string) => {
    setSelectedFriendIds(prev =>
      prev.includes(friendId) ? prev.filter(id => id !== friendId) : [...prev, friendId]
    );
  };

  const numChips = isCustomChips ? (parseInt(customChips, 10) || 0) : (parseInt(totalChips, 10) || 100);
  const numValue = isCustomValue ? (parseFloat(customValue) || 0) : (parseFloat(chipValue) || 10);
  const totalPot = numChips * numValue;

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Please enter a game name');
      return;
    }
    if (numChips <= 0) {
      setError('Total chips must be greater than 0');
      return;
    }
    if (numValue <= 0) {
      setError('Chip value must be greater than 0');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/tables', {
        method: 'POST',
        body: {
          name: name.trim(),
          gameType,
          totalChips: numChips,
          chipValue: numValue,
          initialFriendUserIds: selectedFriendIds
        }
      });

      if (res.success && res.table) {
        onTableCreated(res.table.id);
      } else {
        setError(res.error || 'Failed to create table');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create table');
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

        {/* Chip Value */}
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
                return (
                  <TouchableOpacity
                    key={friend.id}
                    onPress={() => toggleFriend(friend.id)}
                    style={[styles.friendItemCard, isSelected && styles.friendItemCardSelected]}
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
          )}
        </View>

        {/* Real-Time Mathematical Pot Preview */}
        <View style={styles.calculationCard}>
          <View style={styles.calcHeaderRow}>
            <Sparkles size={16} color={colors.primary} />
            <Text style={styles.calcHeaderTitle}>TOTAL PHYSICAL POT VALUE</Text>
          </View>
          <Text style={styles.calcFormula}>
            {numChips} chips × ₹{numValue} / chip
          </Text>
          <Text style={styles.calcTotalMoney}>₹{totalPot.toLocaleString('en-IN')}</Text>
          <Text style={styles.calcNote}>
            ✓ Reconciles 100% against bank and player inventories at all times.
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
  }
});
