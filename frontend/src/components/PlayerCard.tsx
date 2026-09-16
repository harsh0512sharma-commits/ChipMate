import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Crown, UserCheck, Clock, UserPlus } from 'lucide-react-native';
import { colors } from '../theme/colors';

export interface PlayerCardData {
  id: string;
  user_id: string;
  display_name: string;
  friend_code: string;
  role: 'HOST' | 'PLAYER';
  current_chips: number;
  total_buyin_amount: number;
  total_buyin_chips: number;
  friendshipStatus: 'SELF' | 'FRIENDS' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'NONE';
  moneyEquivalent: number;
  is_guest?: boolean;
  avatar_url?: string | null;
  is_cashed_out?: boolean;
  cashed_out_at?: string | null;
  cashed_out_chips?: number;
  cashed_out_money?: number;
  cashed_out_net?: number;
  loanDebtOwed?: number;
  loanCreditOwed?: number;
  loanDebtChips?: number;
  loanCreditChips?: number;
}

interface PlayerCardProps {
  player: PlayerCardData;
  chipValue: number;
  chipMode?: 'EQUAL' | 'DENOMINATION' | 'VALUE';
  loansDescription?: string[];
  isHostView?: boolean;
  onAddFriend?: (friendCode: string) => void;
  onSelectPlayer?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  chipValue,
  chipMode = 'EQUAL',
  loansDescription = [],
  isHostView = false,
  onAddFriend,
  onSelectPlayer
}) => {
  const isHost = player.role === 'HOST';
  const isGuest = Boolean(player.is_guest || player.friend_code === 'GUEST' || (player.user_id && player.user_id.startsWith('guest_')));
  const isValueMode = chipMode === 'VALUE';
  const isDenomMode = chipMode === 'DENOMINATION';
  const isCashedOut = Boolean(player.is_cashed_out);

  const currentMoney = isCashedOut
    ? (player.cashed_out_money ?? 0)
    : (isValueMode
      ? (player.moneyEquivalent ?? player.current_chips)
      : isDenomMode
        ? (player.moneyEquivalent ?? player.total_buyin_amount)
        : (player.current_chips * chipValue));

  const netPnL = isCashedOut
    ? (player.cashed_out_net ?? (currentMoney - player.total_buyin_amount))
    : (currentMoney - player.total_buyin_amount);
  const isLenderNegative = player.current_chips < 0;
  const lentCredit = isValueMode
    ? (player.loanCreditOwed || 0)
    : (player.loanCreditChips || Math.round((player.loanCreditOwed || 0) / chipValue));
  const loanDebt = isValueMode
    ? (player.loanDebtOwed || 0)
    : (player.loanDebtChips || Math.round((player.loanDebtOwed || 0) / chipValue));

  // Determine displayed number, color, and label:
  let displayNumber = '';
  let displayColor = colors.text;
  let displayLabel = isValueMode ? 'IN-HAND BALANCE' : 'CHIPS HELD';

  if (isCashedOut) {
    displayNumber = isValueMode
      ? `₹${(player.cashed_out_money ?? 0).toLocaleString('en-IN')}`
      : String(player.cashed_out_chips ?? 0);
    displayColor = '#38bdf8';
    displayLabel = 'CASHED OUT';
  } else if (isLenderNegative) {
    // Player lent more than buyin (uncapped shot lending) -> running in profit/credit!
    // Display positive amount in GREEN without any minus sign
    displayNumber = isValueMode
      ? `₹${Math.abs(player.current_chips).toLocaleString('en-IN')}`
      : String(Math.abs(player.current_chips));
    displayColor = colors.successText;
    displayLabel = isValueMode ? 'IN-HAND BALANCE' : 'CHIPS HELD';
  } else {
    displayNumber = isValueMode
      ? `₹${player.current_chips.toLocaleString('en-IN')}`
      : String(player.current_chips);
    displayColor = isValueMode ? colors.primary : colors.text;
    displayLabel = isValueMode ? 'IN-HAND BALANCE' : 'CHIPS HELD';
  }

  return (
    <TouchableOpacity
      activeOpacity={onSelectPlayer ? 0.75 : 1}
      onPress={onSelectPlayer}
      disabled={!onSelectPlayer}
      style={[styles.card, isCashedOut && styles.cashedOutCard]}
    >
      {/* Top Header: Avatar, Name, Host Tag, Top-Right Social Icon */}
      <View style={styles.topRow}>
        <View style={styles.nameSection}>
          {player.avatar_url ? (
            <Image source={{ uri: player.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, isGuest && { backgroundColor: colors.cardRaised, borderColor: colors.borderDark }]}>
              <Text style={[styles.avatarText, isGuest && { color: colors.textSecondary }]}>
                {player.display_name ? player.display_name.charAt(0).toUpperCase() : 'G'}
              </Text>
            </View>
          )}
          <View style={styles.nameMeta}>
            <View style={styles.nameLine}>
              <Text style={styles.playerName} numberOfLines={1}>
                {player.display_name}
              </Text>
              {isHost && (
                <View style={styles.hostBadgeMini}>
                  <Crown size={10} color={colors.primary} />
                </View>
              )}
            </View>
            {isGuest ? (
              <View style={styles.guestBadge}>
                <Text style={styles.guestBadgeText}>GUEST</Text>
              </View>
            ) : (
              <Text style={styles.friendCodeText}>📱 {player.friend_code}</Text>
            )}
          </View>
        </View>

        {/* Top-Right Social / Friendship Action (Icon only, no wide text) */}
        {!isGuest && player.friendshipStatus === 'FRIENDS' ? (
          <View style={styles.topRightFriendBadge}>
            <UserCheck size={12} color={colors.successText} />
          </View>
        ) : !isGuest && (player.friendshipStatus === 'PENDING_SENT' || player.friendshipStatus === 'PENDING_RECEIVED') ? (
          <View style={styles.topRightPendingBadge}>
            <Clock size={11} color={colors.warningText} />
          </View>
        ) : !isGuest && player.friendshipStatus === 'NONE' && onAddFriend ? (
          <TouchableOpacity
            onPress={() => onAddFriend(player.friend_code)}
            style={styles.topRightAddFriendBtn}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <UserPlus size={12} color={colors.primary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Main Stats: Chips / In-Hand Balance */}
      <View style={styles.statsContainer}>
        <View style={styles.chipSection}>
          <Text style={[styles.bigChipNumber, { color: displayColor }]}>
            {displayNumber}
          </Text>
          <Text
            style={[
              styles.chipLabel,
              isCashedOut && { color: '#38bdf8' },
              isLenderNegative && { color: colors.successText }
            ]}
          >
            {displayLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: 0,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 105,
    justifyContent: 'space-between'
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  nameSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    marginRight: 8
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary
  },
  nameMeta: {
    flex: 1
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  playerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  friendCodeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
    fontWeight: '500'
  },
  guestBadge: {
    backgroundColor: colors.cardInset,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  guestBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5
  },
  hostBadgeMini: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5
  },
  cashedOutCard: {
    borderColor: 'rgba(56, 189, 248, 0.45)',
    backgroundColor: '#0c1626'
  },
  topRightFriendBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder,
    justifyContent: 'center',
    alignItems: 'center'
  },
  topRightPendingBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    justifyContent: 'center',
    alignItems: 'center'
  },
  topRightAddFriendBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loanDebtTag: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.dangerText,
    marginLeft: 2
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  chipSection: {
    justifyContent: 'center'
  },
  bigChipNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    lineHeight: 24,
    letterSpacing: -0.5
  },
  chipLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.6,
    marginTop: 1
  },
  moneySection: {
    alignItems: 'flex-end'
  },
  moneyAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  pnlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2
  },
  pnlPillGreen: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5
  },
  pnlTextGreen: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.successText
  },
  pnlPillRed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5
  },
  pnlTextRed: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.dangerText
  },
  pnlNeutral: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '500'
  },
  buyinSubText: {
    fontSize: 10,
    color: colors.textMuted
  }
});
