import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, AlertTriangle, Coins, Building, Layers } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface ChipCardProps {
  totalChips: number;
  playerChips: number;
  bankChips: number;
  chipValue: number;
  isReconciled: boolean;
  discrepancy: number;
  onReviewActivity?: () => void;
}

export const ChipCard: React.FC<ChipCardProps> = ({
  totalChips,
  playerChips,
  bankChips,
  chipValue,
  isReconciled,
  discrepancy,
  onReviewActivity
}) => {
  const totalAccounted = playerChips + bankChips;
  const totalPotMoney = totalChips * chipValue;
  const inPlayPercent = totalChips > 0 ? Math.min(100, Math.max(0, (playerChips / totalChips) * 100)) : 0;

  return (
    <View style={styles.card}>
      {/* Top Header: Badge + Reconciliation Pill */}
      <View style={styles.statusRow}>
        <View style={styles.badgeRow}>
          <View style={styles.iconRing}>
            <Coins size={14} color={colors.primary} />
          </View>
          <Text style={styles.badgeLabel}>CHIP INVENTORY</Text>
        </View>

        {isReconciled ? (
          <View style={styles.reconciledPill}>
            <CheckCircle2 size={12} color={colors.successText} />
            <Text style={styles.reconciledText}>Reconciled</Text>
          </View>
        ) : (
          <View style={styles.mismatchPill}>
            <AlertTriangle size={12} color={colors.dangerText} />
            <Text style={styles.mismatchText}>{discrepancy} Unaccounted</Text>
          </View>
        )}
      </View>

      {/* Hero Numbers */}
      <View style={styles.heroRow}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroNumber}>
            {totalAccounted}
            <Text style={styles.heroSubNumber}>/{totalChips}</Text>
          </Text>
          <Text style={styles.heroUnit}>CHIPS ACCOUNTED</Text>
        </View>
        <View style={styles.heroRight}>
          <Text style={styles.potValue}>₹{totalPotMoney.toLocaleString('en-IN')}</Text>
          <Text style={styles.potLabel}>Total Game Pot</Text>
        </View>
      </View>

      {/* Modern Chip Distribution Visual Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBarInPlay, { width: `${inPlayPercent}%` }]} />
        <View style={[styles.progressBarBank, { width: `${100 - inPlayPercent}%` }]} />
      </View>

      {/* Two Inset Metric Tiles */}
      <View style={styles.breakdownRow}>
        <View style={styles.breakdownItem}>
          <View style={styles.tileHeader}>
            <Layers size={12} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.breakdownLabel}>In Play (Players)</Text>
          </View>
          <Text style={styles.breakdownValue}>{playerChips} <Text style={styles.chipTextSmall}>chips</Text></Text>
          <Text style={styles.breakdownMoney}>₹{(playerChips * chipValue).toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.breakdownItem}>
          <View style={styles.tileHeader}>
            <Building size={12} color={colors.textSecondary} style={{ marginRight: 5 }} />
            <Text style={styles.breakdownLabel}>Bank Vault</Text>
          </View>
          <Text style={[styles.breakdownValue, bankChips === 0 && { color: colors.warningText }]}>
            {bankChips} <Text style={styles.chipTextSmall}>chips</Text>
          </Text>
          <Text style={styles.breakdownMoney}>₹{(bankChips * chipValue).toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Footer Rate Info */}
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          Configured Rate: <Text style={styles.footerHighlight}>₹{chipValue} / chip</Text>
        </Text>
        <Text style={styles.footerText}>
          In Play: <Text style={styles.footerHighlight}>{Math.round(inPlayPercent)}%</Text>
        </Text>
      </View>

      {/* Discrepancy warning banner */}
      {!isReconciled && (
        <View style={styles.discrepancyBox}>
          <Text style={styles.discrepancyWarningText}>
            ⚠️ Mismatch: {totalAccounted} chips active vs {totalChips} physical chips.
          </Text>
          {onReviewActivity && (
            <TouchableOpacity onPress={onReviewActivity} style={styles.reviewButton} activeOpacity={0.8}>
              <Text style={styles.reviewButtonText}>Review Audit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  statusRow: {
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
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8
  },
  reconciledPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.successBorder
  },
  reconciledText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.successText,
    marginLeft: 5
  },
  mismatchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  mismatchText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dangerText,
    marginLeft: 5
  },
  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 14
  },
  heroLeft: {
    flex: 1
  },
  heroNumber: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1
  },
  heroSubNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textSecondary
  },
  heroUnit: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginTop: 2
  },
  heroRight: {
    alignItems: 'flex-end'
  },
  potValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary
  },
  potLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500'
  },
  progressContainer: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.cardInset,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14
  },
  progressBarInPlay: {
    backgroundColor: colors.primary,
    height: '100%'
  },
  progressBarBank: {
    backgroundColor: colors.border,
    height: '100%'
  },
  breakdownRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  breakdownItem: {
    flex: 1
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  breakdownLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  breakdownValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text
  },
  chipTextSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary
  },
  breakdownMoney: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2
  },
  divider: {
    width: 1,
    backgroundColor: colors.borderDark,
    marginHorizontal: 12
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2
  },
  footerText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500'
  },
  footerHighlight: {
    fontWeight: '600',
    color: colors.textSecondary
  },
  discrepancyBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: colors.dangerLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  discrepancyWarningText: {
    fontSize: 12,
    color: colors.dangerText,
    fontWeight: '600',
    flex: 1
  },
  reviewButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8
  },
  reviewButtonText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700'
  }
});
