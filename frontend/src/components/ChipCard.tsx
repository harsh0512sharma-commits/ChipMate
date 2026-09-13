import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coins, Layers, Building, Landmark } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface ChipCardProps {
  totalChips: number;
  playerChips: number;
  bankChips: number;
  chipValue: number;
  totalLoansMoney?: number;
  chipMode?: 'EQUAL' | 'DENOMINATION';
  denominations?: number[] | string | null;
  isReconciled?: boolean;
  discrepancy?: number;
  onReviewActivity?: () => void;
}

export const ChipCard: React.FC<ChipCardProps> = ({
  totalChips,
  playerChips,
  bankChips,
  chipValue,
  totalLoansMoney = 0,
  chipMode,
  denominations
}) => {
  const hasLoans = totalLoansMoney > 0;
  const totalPotMoney = (totalChips * chipValue) + totalLoansMoney;
  const inPlayMoney = playerChips * chipValue;
  const bankMoney = bankChips * chipValue;

  let parsedDenoms: any[] | null = null;
  if (denominations) {
    try {
      parsedDenoms = typeof denominations === 'string' ? JSON.parse(denominations) : denominations;
    } catch (_) {}
  }

  return (
    <View style={styles.card}>
      {/* Top Header: Badge + Rate Pill */}
      <View style={styles.headerRow}>
        <View style={styles.badgeRow}>
          <View style={styles.iconRing}>
            <Coins size={14} color={colors.primary} />
          </View>
          <Text style={styles.badgeLabel}>CHIP INVENTORY</Text>
        </View>
        {chipMode === 'DENOMINATION' && Array.isArray(parsedDenoms) && parsedDenoms.length > 0 ? (
          <View style={styles.ratePill}>
            <Text style={styles.ratePillText}>
              Set: {parsedDenoms.map((d: any) => (typeof d === 'object' && d !== null ? `₹${d.value}` : `₹${d}`)).join(' • ')}
            </Text>
          </View>
        ) : (
          <View style={styles.ratePill}>
            <Text style={styles.ratePillText}>₹{chipValue} / chip</Text>
          </View>
        )}
      </View>

      {/* 3 Metrics Horizontally Side-by-Side */}
      <View style={styles.metricRow}>
        {/* Column 1: In-Play Chips */}
        <View style={styles.metricCol}>
          <View style={styles.metricHeader}>
            <Layers size={13} color={colors.primary} style={{ marginRight: 4 }} />
            <Text style={styles.metricLabel}>IN-PLAY</Text>
          </View>
          <Text style={styles.metricChips}>
            {playerChips} <Text style={styles.chipUnit}>chips</Text>
          </Text>
          <Text style={styles.metricMoney}>₹{inPlayMoney.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.divider} />

        {/* Column 2: Bank Vault */}
        <View style={styles.metricCol}>
          <View style={styles.metricHeader}>
            <Building size={13} color={colors.textSecondary} style={{ marginRight: 4 }} />
            <Text style={styles.metricLabel}>BANK VAULT</Text>
          </View>
          <Text style={[styles.metricChips, bankChips === 0 && { color: colors.warningText }]}>
            {bankChips} <Text style={styles.chipUnit}>chips</Text>
          </Text>
          <Text style={styles.metricMoney}>₹{bankMoney.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.divider} />

        {/* Column 3: Total Game Pot */}
        <View style={styles.metricCol}>
          <View style={styles.metricHeader}>
            <Landmark size={13} color={colors.chipGold} style={{ marginRight: 4 }} />
            <Text style={[styles.metricLabel, { color: colors.chipGold }]}>TOTAL POT</Text>
          </View>
          <Text style={[styles.metricChips, { color: colors.chipGold }]}>
            {totalChips} <Text style={[styles.chipUnit, { color: colors.chipGold }]}>chips</Text>
          </Text>
          <Text style={[styles.metricMoney, { color: colors.successText }]}>₹{totalPotMoney.toLocaleString('en-IN')}</Text>
          {hasLoans && (
            <Text style={styles.loansTag}>+₹{totalLoansMoney.toLocaleString('en-IN')} shots</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconRing: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.8
  },
  ratePill: {
    backgroundColor: colors.cardInset,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  ratePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary
  },
  metricRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  metricCol: {
    flex: 1,
    alignItems: 'center'
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5
  },
  metricChips: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  chipUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary
  },
  metricMoney: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 2
  },
  divider: {
    width: 1,
    height: 38,
    backgroundColor: colors.borderDark,
    marginHorizontal: 2
  },
  loansTag: {
    fontSize: 9,
    color: colors.warningText,
    fontWeight: '700',
    marginTop: 2
  }
});
