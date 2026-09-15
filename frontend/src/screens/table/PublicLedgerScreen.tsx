import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Share,
  Alert
} from 'react-native';
import {
  Share2,
  RefreshCw,
  Trophy,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Check,
  CheckCircle2,
  Clock,
  Users,
  Banknote,
  Coins,
  Crown
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';

interface PublicLedgerScreenProps {
  tableId: string;
  onBackToApp?: () => void;
  isLoggedIn?: boolean;
}

export const PublicLedgerScreen: React.FC<PublicLedgerScreenProps> = ({
  tableId,
  onBackToApp,
  isLoggedIn = false
}) => {
  const [ledger, setLedger] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchLedger = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await apiRequest(`/tables/${tableId}/public-ledger`);
      if (res.success && res.ledger) {
        setLedger(res.ledger);
        setError(null);
      } else {
        setError(res.error || 'Game ledger not found');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to table ledger');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchLedger();
    // Auto-poll live tables every 10 seconds for real-time spectator view
    const timer = setInterval(() => {
      fetchLedger(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchLedger]);

  const handleShare = async () => {
    const shareUrl = Platform.OS === 'web' && typeof window !== 'undefined'
      ? `${window.location.origin}/?ledger=${tableId}`
      : `https://chipmate-h96z.onrender.com/?ledger=${tableId}`;

    const shareTitle = ledger?.name ? `${ledger.name} — ChipMate Ledger` : 'ChipMate Game Ledger';
    const shareIntro = `Check out the live game ledger for "${ledger?.name || 'Poker'}" on ChipMate:`;
    const shareMessage = `${shareIntro}\n${shareUrl}`;

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        if (navigator.share) {
          try {
            await navigator.share({
              title: shareTitle,
              text: shareIntro,
              url: shareUrl
            });
            return;
          } catch (_) {}
        }
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareUrl);
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
          return;
        }
      }
      await Share.share({
        title: shareTitle,
        message: shareMessage
      });
    } catch (err) {
      // Fallback alert
      Alert.alert('Ledger Link', shareUrl);
    }
  };

  if (loading && !ledger) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading game ledger...</Text>
      </View>
    );
  }

  if (error || !ledger) {
    return (
      <View style={[styles.container, styles.centered, { padding: 24 }]}>
        <View style={styles.errorIconBox}>
          <ShieldCheck size={36} color={colors.dangerText} />
        </View>
        <Text style={styles.errorTitle}>Ledger Unavailable</Text>
        <Text style={styles.errorSubtitle}>{error || 'The requested table could not be found or has been removed.'}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => fetchLedger()} activeOpacity={0.8}>
          <RefreshCw size={16} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Retry</Text>
        </TouchableOpacity>
        {onBackToApp && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onBackToApp} activeOpacity={0.8}>
            <Text style={styles.secondaryBtnText}>Open ChipMate App</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const isFinalized = ledger.status === 'FINALIZED';
  const isValueMode = ledger.chipMode === 'VALUE';
  const isDenomMode = ledger.chipMode === 'DENOMINATION';
  const totalPot = Number(ledger.totalPotMoney) || 0;
  const players = ledger.players || [];
  const transactions = ledger.transactions || [];
  const settlementPayments: any[] = ledger.settlementPayments || [];

  return (
    <View style={styles.container}>
      {/* Top Navbar */}
      <View style={styles.navBar}>
        <View style={styles.navLeft}>
          {onBackToApp && (
            <TouchableOpacity onPress={onBackToApp} style={styles.navIconBtn} activeOpacity={0.7}>
              <ArrowLeft size={18} color={colors.text} />
            </TouchableOpacity>
          )}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.navTitle} numberOfLines={1}>{ledger.name}</Text>
              <View style={[styles.statusTag, isFinalized ? styles.statusFinalized : styles.statusLive]}>
                <Text style={isFinalized ? styles.statusFinalizedText : styles.statusLiveText}>
                  {isFinalized ? 'COMPLETED' : 'LIVE'}
                </Text>
              </View>
            </View>
            <Text style={styles.navSubtitle}>
              {ledger.gameType === 'POKER' ? 'Poker' : 'Teen Patti'} • #{ledger.joinCode}
              {isValueMode ? ' • Value Mode' : isDenomMode ? ' • Denominations' : ''}
            </Text>
          </View>
        </View>

        <View style={styles.navRight}>
          <TouchableOpacity
            onPress={() => fetchLedger()}
            style={styles.navIconBtn}
            disabled={refreshing}
            activeOpacity={0.7}
          >
            <RefreshCw size={17} color={refreshing ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleShare}
            style={[styles.sharePill, copied && styles.sharePillSuccess]}
            activeOpacity={0.8}
          >
            {copied ? (
              <>
                <Check size={14} color="#FFF" style={{ marginRight: 5 }} />
                <Text style={styles.sharePillText}>Copied!</Text>
              </>
            ) : (
              <>
                <Share2 size={14} color="#FFF" style={{ marginRight: 5 }} />
                <Text style={styles.sharePillText}>Share</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 36 }}>
        {/* Spectator Notice Banner */}
        <View style={styles.spectatorBanner}>
          <ShieldCheck size={16} color={colors.chipGoldText} style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.spectatorBannerTitle}>Official Public Ledger</Text>
            <Text style={styles.spectatorBannerDesc}>
              Read-only view of game buy-ins, active balances, and financial settlement.
            </Text>
          </View>
          {onBackToApp && !isLoggedIn && (
            <TouchableOpacity onPress={onBackToApp} style={styles.joinAppMiniBtn} activeOpacity={0.8}>
              <Text style={styles.joinAppMiniBtnText}>Sign In</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Overview Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Banknote size={14} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.statLabel}>TOTAL POT</Text>
            </View>
            <Text style={styles.statValue}>₹{totalPot.toLocaleString('en-IN')}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Users size={14} color={colors.chipGoldText} style={{ marginRight: 5 }} />
              <Text style={styles.statLabel}>PLAYERS</Text>
            </View>
            <Text style={styles.statValue}>{players.length}</Text>
          </View>
        </View>

        {/* Player Standings Section */}
        <View style={styles.sectionHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Trophy size={16} color={colors.chipGoldText} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>
              {isFinalized ? 'Final Results & Rankings' : 'Live Player Standings'}
            </Text>
          </View>
          <Text style={styles.sectionSub}>Sorted by Net Profit / Loss</Text>
        </View>

        <View style={styles.tableCard}>
          {players.map((p: any, idx: number) => {
            const net = p.netWinnings ?? 0;
            const isWin = net > 0;
            const isLoss = net < 0;
            const isHost = p.role === 'HOST';

            return (
              <View key={p.playerId || idx} style={[styles.playerResultRow, idx === players.length - 1 && { borderBottomWidth: 0 }]}>
                {/* Rank Badge */}
                <View style={{ width: 32, justifyContent: 'flex-start', paddingTop: 2 }}>
                  <Text style={[styles.rankText, idx === 0 && styles.rankFirst]}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}`}
                  </Text>
                </View>

                {/* Player Name, Cashed Out Tag, and Accounting Breakdown */}
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={styles.playerNameText} numberOfLines={1}>{p.displayName}</Text>
                    {isHost && (
                      <View style={styles.hostBadge}>
                        <Crown size={9} color={colors.primary} />
                      </View>
                    )}
                    {p.isCashedOut && (
                      <View style={styles.cashedOutPill}>
                        <Text style={styles.cashedOutPillText}>Cashed Out</Text>
                      </View>
                    )}
                    {p.isGuest && (
                      <Text style={styles.playerMetaText}>(Guest)</Text>
                    )}
                  </View>

                  {/* Accounting Breakdown matching SettlementScreen */}
                  <View style={styles.accountingBreakdown}>
                    <Text style={styles.breakdownItem}>
                      Buy-ins: <Text style={styles.negVal}>-₹{(p.buyInMoney || 0).toLocaleString('en-IN')}</Text>
                    </Text>
                    {Number(p.loanDebtOwed) > 0 && (
                      <Text style={styles.breakdownItem}>
                        Borrowed: <Text style={styles.loanDebtVal}>-₹{Number(p.loanDebtOwed).toLocaleString('en-IN')}</Text>
                      </Text>
                    )}
                    {Number(p.loanCreditOwed) > 0 && (
                      <Text style={styles.breakdownItem}>
                        Lent: <Text style={styles.loanCreditVal}>+₹{Number(p.loanCreditOwed).toLocaleString('en-IN')}</Text>
                      </Text>
                    )}
                    <Text style={styles.breakdownItem}>
                      {p.isCashedOut ? 'Cashed out: ' : isFinalized ? 'Final in-hand: ' : 'Current in-hand: '}
                      <Text style={styles.posVal}>+₹{(p.inHandMoney || 0).toLocaleString('en-IN')}</Text>
                    </Text>
                  </View>
                </View>

                {/* Net P&L Column */}
                <View style={{ alignItems: 'flex-end', justifyContent: 'center', minWidth: 84 }}>
                  <View style={[styles.pnlPill, isWin ? styles.pnlWin : isLoss ? styles.pnlLoss : styles.pnlEven]}>
                    <Text style={[styles.pnlText, isWin ? styles.pnlWinText : isLoss ? styles.pnlLossText : styles.pnlEvenText]}>
                      {isWin ? `+₹${net.toLocaleString('en-IN')}` : isLoss ? `-₹${Math.abs(net).toLocaleString('en-IN')}` : '₹0'}
                    </Text>
                  </View>
                  <Text style={styles.netLabelText}>
                    {isWin ? 'Profit' : isLoss ? 'Loss' : 'Even'}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Final Settlements (Who Pays Whom) */}
        {settlementPayments.length > 0 && (
          <View style={{ marginTop: 24 }}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CheckCircle2 size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.sectionTitle}>Final Settlements (Who Pays Whom)</Text>
              </View>
            </View>

            <View style={styles.settleListCard}>
              {settlementPayments.map((item: any, idx: number) => (
                <View key={idx} style={[styles.settleRow, idx === settlementPayments.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.settleFlowBox}>
                    <Text style={styles.settleFlowText}>
                      <Text style={styles.settlePayer}>{item.fromDisplayName}</Text>
                      {'  pays  '}
                      <Text style={styles.settlePayee}>{item.toDisplayName}</Text>
                    </Text>
                  </View>
                  <Text style={styles.settleAmount}>₹{Math.round(item.amount).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Transaction History Section */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Clock size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Audit Trail & Transactions</Text>
          </View>
          <Text style={styles.sectionSub}>{transactions.length} recorded events</Text>
        </View>

        {transactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No buy-ins or transactions recorded yet.</Text>
          </View>
        ) : (
          <View style={styles.txListCard}>
            {transactions.map((tx: any, idx: number) => {
              const dateStr = tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              return (
                <View key={tx.id || idx} style={[styles.txRow, idx === transactions.length - 1 && { borderBottomWidth: 0 }]}>
                  <View style={styles.txIconBox}>
                    <Text style={styles.txIconEmoji}>
                      {tx.type === 'BUY_IN' ? '💰' : tx.type === 'LEND' ? '🤝' : tx.type === 'RETURN' ? '↩️' : tx.type === 'TRANSFER' ? '🔁' : tx.type === 'CASH_OUT' ? '💵' : '📝'}
                    </Text>
                  </View>

                  <View style={{ flex: 1, paddingHorizontal: 10 }}>
                    <Text style={styles.txDescText}>
                      {tx.description || (tx.fromDisplayName && tx.toDisplayName ? `${tx.fromDisplayName} → ${tx.toDisplayName}` : `${tx.actorName || 'Player'} transaction`)}
                    </Text>
                    <Text style={styles.txTimeText}>{dateStr} • {tx.type}</Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.txMoneyText}>
                      {Number(tx.moneyValue) > 0 ? `₹${Number(tx.moneyValue).toLocaleString('en-IN')}` : `${tx.chipAmount || 0} chips`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Footer CTA */}
        {onBackToApp && (
          <View style={styles.footerCta}>
            <TouchableOpacity style={styles.ctaButton} onPress={onBackToApp} activeOpacity={0.85}>
              <ExternalLink size={16} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.ctaButtonText}>{isLoggedIn ? 'Back to ChipMate' : 'Open / Join ChipMate'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 12,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  errorIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6
  },
  errorSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },
  primaryBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14
  },
  secondaryBtn: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 14
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  navIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    maxWidth: 160
  },
  navSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8
  },
  statusLive: {
    backgroundColor: 'rgba(234, 88, 12, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.4)'
  },
  statusLiveText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.primary
  },
  statusFinalized: {
    backgroundColor: colors.successLight,
    borderWidth: 1,
    borderColor: colors.successBorder
  },
  statusFinalizedText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.successText
  },
  navRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sharePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18
  },
  sharePillSuccess: {
    backgroundColor: colors.success
  },
  sharePillText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700'
  },
  body: {
    flex: 1,
    padding: 16
  },
  spectatorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },
  spectatorBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.chipGoldText
  },
  spectatorBannerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1
  },
  joinAppMiniBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8
  },
  joinAppMiniBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700'
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text
  },
  sectionSub: {
    fontSize: 11,
    color: colors.textMuted
  },
  tableCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden'
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.cardRaised,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  colHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.4
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center'
  },
  playerResultRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'flex-start'
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted
  },
  rankFirst: {
    fontSize: 15
  },
  playerNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  playerMetaText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1
  },
  hostBadge: {
    marginLeft: 4,
    padding: 2,
    borderRadius: 4,
    backgroundColor: colors.primaryLight
  },
  cashedOutPill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1
  },
  cashedOutPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.successText
  },
  accountingBreakdown: {
    marginTop: 4,
    gap: 2
  },
  breakdownItem: {
    fontSize: 11,
    color: colors.textSecondary
  },
  negVal: {
    color: colors.dangerText,
    fontWeight: '600'
  },
  posVal: {
    color: colors.successText,
    fontWeight: '600'
  },
  loanDebtVal: {
    color: colors.dangerText,
    fontWeight: '600'
  },
  loanCreditVal: {
    color: colors.successText,
    fontWeight: '600'
  },
  netLabelText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: 3,
    textTransform: 'uppercase'
  },
  numText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  },
  pnlPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  pnlWin: {
    backgroundColor: colors.successLight
  },
  pnlLoss: {
    backgroundColor: colors.dangerLight
  },
  pnlEven: {
    backgroundColor: colors.cardRaised
  },
  pnlText: {
    fontSize: 12,
    fontWeight: '800'
  },
  pnlWinText: {
    color: colors.successText
  },
  pnlLossText: {
    color: colors.dangerText
  },
  pnlEvenText: {
    color: colors.textMuted
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  emptyCardText: {
    color: colors.textMuted,
    fontSize: 12
  },
  txListCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden'
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)'
  },
  txIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center'
  },
  txIconEmoji: {
    fontSize: 14
  },
  txDescText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text
  },
  txTimeText: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  txMoneyText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text
  },
  footerCta: {
    marginTop: 28,
    alignItems: 'center'
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320
  },
  ctaButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800'
  },
  settleListCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden'
  },
  settleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)'
  },
  settleFlowBox: {
    flex: 1,
    marginRight: 12
  },
  settleFlowText: {
    fontSize: 13,
    color: colors.textSecondary
  },
  settlePayer: {
    fontWeight: '700',
    color: colors.text
  },
  settlePayee: {
    fontWeight: '700',
    color: colors.primary
  },
  settleAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.chipGoldText
  }
});
