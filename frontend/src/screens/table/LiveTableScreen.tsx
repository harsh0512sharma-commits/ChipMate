import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
  Modal
} from 'react-native';
import {
  QrCode,
  Share2,
  Users,
  Play,
  CheckCircle2,
  HandCoins,
  History,
  Settings,
  Plus,
  ArrowRight,
  ShieldAlert,
  Flag,
  UserPlus,
  Check,
  X,
  UserCheck
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { joinTableRoom, leaveTableRoom, onTableUpdated, onConnectionChange } from '../../api/socket';
import { Header } from '../../components/Header';
import { ChipCard } from '../../components/ChipCard';
import { PlayerCard } from '../../components/PlayerCard';
import { ActionSheet } from '../../components/ActionSheet';
import { QRCodeModal } from '../../components/QRCodeModal';

interface LiveTableScreenProps {
  tableId: string;
  onBack: () => void;
  onProceedToSettlement: (tableId: string) => void;
  onAddPlayerModalOpen?: () => void;
}

export const LiveTableScreen: React.FC<LiveTableScreenProps> = ({
  tableId,
  onBack,
  onProceedToSettlement
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Modals & Action Sheets
  const [activeSheet, setActiveSheet] = useState<'BUY' | 'LEND' | 'RETURN' | 'TRANSFER' | 'CORRECTION' | 'UNDO' | null>(null);
  const [initialActionPlayerId, setInitialActionPlayerId] = useState<string | undefined>(undefined);
  const [selectedPlayerForMenu, setSelectedPlayerForMenu] = useState<any | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showSeatFriendModal, setShowSeatFriendModal] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addFriendFeedback, setAddFriendFeedback] = useState<string | null>(null);

  const fetchTableData = useCallback(async () => {
    try {
      const res = await apiRequest(`/tables/${tableId}`);
      if (res.success) {
        setData(res);
      }
    } catch (err: any) {
      console.warn('Failed to fetch table details:', err);
    } finally {
      setLoading(false);
    }
  }, [tableId]);

  useEffect(() => {
    fetchTableData();

    // Join Socket Room
    joinTableRoom(tableId);

    const unsubscribeSocket = onTableUpdated((payload: any) => {
      if (payload.tableId === tableId) {
        fetchTableData();
      }
    });

    const unsubscribeConn = onConnectionChange((connected: boolean) => {
      setIsConnected(connected);
    });

    return () => {
      leaveTableRoom(tableId);
      unsubscribeSocket();
      unsubscribeConn();
    };
  }, [tableId, fetchTableData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTableData();
    setRefreshing(false);
  };

  // Host Actions
  const handleStartGame = async () => {
    try {
      const res = await apiRequest(`/tables/${tableId}/start`, { method: 'POST' });
      if (res.success) {
        fetchTableData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to start game');
    }
  };

  const handleAddFriend = async (targetFriendCode: string) => {
    try {
      const res = await apiRequest('/friends/request', {
        method: 'POST',
        body: { friendCode: targetFriendCode }
      });
      if (res.success) {
        setAddFriendFeedback('Friend request sent!');
        setTimeout(() => setAddFriendFeedback(null), 3000);
        fetchTableData();
      }
    } catch (err: any) {
      Alert.alert('Friend Request', err.message || 'Could not send request');
    }
  };

  const loadFriends = async () => {
    setLoadingFriends(true);
    try {
      const res = await apiRequest('/friends');
      if (res.success && res.friends) {
        setFriends(res.friends);
      }
    } catch (_) {
    } finally {
      setLoadingFriends(false);
    }
  };

  const handleSeatFriend = async (friendUserId: string) => {
    try {
      const res = await apiRequest(`/tables/${tableId}/seat-friend`, {
        method: 'POST',
        body: { friendUserId }
      });
      if (res.success) {
        setAddFriendFeedback(`✓ Seated ${res.displayName} at the table!`);
        setTimeout(() => setAddFriendFeedback(null), 3500);
        setShowSeatFriendModal(false);
        fetchTableData();
      }
    } catch (err: any) {
      Alert.alert('Seating Error', err.message || 'Could not seat friend');
    }
  };

  const handlePlayerCardTap = (player: any) => {
    if (!isHost) return;
    setSelectedPlayerForMenu(player);
  };

  // Quick Action Submissions
  const handleBuy = async (playerId: string, chipAmount: number, isRebuy: boolean) => {
    await apiRequest(`/tables/${tableId}/buy-in`, {
      method: 'POST',
      body: { playerId, chipAmount, isRebuy, idempotencyKey: `buy_${Date.now()}` }
    });
    fetchTableData();
  };

  const handleLend = async (lenderPlayerId: string, borrowerPlayerId: string, chipAmount: number) => {
    await apiRequest(`/tables/${tableId}/lend`, {
      method: 'POST',
      body: { lenderPlayerId, borrowerPlayerId, chipAmount, idempotencyKey: `lend_${Date.now()}` }
    });
    fetchTableData();
  };

  const handleReturn = async (loanId: string, chipAmount: number) => {
    await apiRequest(`/tables/${tableId}/return`, {
      method: 'POST',
      body: { loanId, chipAmount, idempotencyKey: `ret_${Date.now()}` }
    });
    fetchTableData();
  };

  const handleTransfer = async (fromPlayerId: string, toPlayerId: string, chipAmount: number) => {
    await apiRequest(`/tables/${tableId}/transfer`, {
      method: 'POST',
      body: { fromPlayerId, toPlayerId, chipAmount, idempotencyKey: `trans_${Date.now()}` }
    });
    fetchTableData();
  };

  const handleCorrection = async (playerId: string, newChipCount: number, reason?: string) => {
    await apiRequest(`/tables/${tableId}/correction`, {
      method: 'POST',
      body: { playerId, newChipCount, reason }
    });
    fetchTableData();
  };

  const handleUndo = async (transactionId: string) => {
    await apiRequest(`/tables/${tableId}/undo`, {
      method: 'POST',
      body: { transactionId }
    });
    fetchTableData();
  };

  if (loading || !data) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 12, color: colors.textSecondary }}>Syncing live table...</Text>
      </View>
    );
  }

  const { table, isHost, players, reconciliation, activeLoans, recentTransactions } = data;
  const isWaiting = table.status === 'WAITING';
  const isSettling = table.status === 'SETTLING';
  const isFinalized = table.status === 'FINALIZED';

  // Build loan descriptions map per player
  const loansMap: Record<string, string[]> = {};
  for (const l of activeLoans) {
    if (!loansMap[l.borrower_player_id]) loansMap[l.borrower_player_id] = [];
    loansMap[l.borrower_player_id].push(
      `Owes ${l.lender_name} ${l.remaining_chip_amount} chips (₹${l.moneyEquivalent})`
    );

    if (!loansMap[l.lender_player_id]) loansMap[l.lender_player_id] = [];
    loansMap[l.lender_player_id].push(
      `Lent ${l.borrower_name} ${l.remaining_chip_amount} chips (₹${l.moneyEquivalent})`
    );
  }

  const lastTx = recentTransactions && recentTransactions.length > 0 ? recentTransactions[0] : null;

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <Header
        title={table.name}
        subtitle={`${table.game_type === 'TEEN_PATTI' ? 'Teen Patti' : 'Poker'} • #${table.join_code}`}
        onBack={onBack}
        isConnected={isConnected}
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setShowQR(true)} style={styles.headerIconBtn}>
              <QrCode size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowActivity(prev => !prev)} style={styles.headerIconBtn}>
              <History size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status and Connection Alert */}
        {!isConnected && (
          <View style={styles.connectionAlert}>
            <ShieldAlert size={16} color={colors.dangerText} />
            <Text style={styles.connectionAlertText}>
              ⚠️ Connection lost. Waiting for network reconnection...
            </Text>
          </View>
        )}

        {addFriendFeedback && (
          <View style={styles.feedbackBanner}>
            <CheckCircle2 size={16} color={colors.successText} />
            <Text style={styles.feedbackText}>{addFriendFeedback}</Text>
          </View>
        )}

        {/* Start Game prompt if in WAITING mode */}
        {isWaiting && isHost && (
          <View style={styles.waitingBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.waitingTitle}>Table is in Setup Mode</Text>
              <Text style={styles.waitingSubtitle}>
                Invite or seat friends directly, then start the game.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TouchableOpacity
                style={styles.seatFriendBannerBtn}
                onPress={() => {
                  loadFriends();
                  setShowSeatFriendModal(true);
                }}
                activeOpacity={0.8}
              >
                <UserPlus size={14} color="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.seatFriendBannerBtnText}>Seat Friend</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.startGameBtn} onPress={handleStartGame} activeOpacity={0.8}>
                <Play size={14} color="#FFF" fill="#FFF" style={{ marginRight: 4 }} />
                <Text style={styles.startGameBtnText}>Start Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Viewer Mode Banner for Non-Hosts */}
        {!isHost && (
          <View style={styles.viewerBanner}>
            <ShieldAlert size={15} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.viewerBannerText}>
              Spectator / Player Mode • The host records all table transactions.
            </Text>
          </View>
        )}

        {/* 100/100 PHYSICAL CHIP RECONCILIATION CARD */}
        <ChipCard
          totalChips={reconciliation.totalChips}
          playerChips={reconciliation.playerChips}
          bankChips={reconciliation.bankChips}
          chipValue={table.chip_value}
          isReconciled={reconciliation.isReconciled}
          discrepancy={reconciliation.discrepancy}
          onReviewActivity={() => setShowActivity(true)}
        />

        {/* HOST QUICK ACTIONS BAR */}
        {isHost && !isFinalized && (
          <View style={styles.hostActionBar}>
            <Text style={styles.hostSectionHeader}>HOST QUICK ACTIONS</Text>

            <View style={styles.primaryActionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBuy]}
                onPress={() => setActiveSheet('BUY')}
              >
                <Text style={styles.actionBtnText}>BUY CHIPS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionLend]}
                onPress={() => setActiveSheet('LEND')}
              >
                <Text style={styles.actionBtnText}>🤝 LEND</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.secondaryActionRow}>
              <TouchableOpacity
                style={[styles.actionBtnSec, { marginRight: 6 }]}
                onPress={() => setActiveSheet('RETURN')}
              >
                <Text style={styles.actionBtnSecText}>↩ RETURN</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtnSec, { marginLeft: 6 }]}
                onPress={() => setActiveSheet('TRANSFER')}
              >
                <Text style={styles.actionBtnSecText}>↔ TRANSFER</Text>
              </TouchableOpacity>
            </View>

            {/* Additional host options */}
            <View style={styles.hostMenuRow}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => setActiveSheet('CORRECTION')}
              >
                <Text style={styles.menuItemText}>Correction</Text>
              </TouchableOpacity>

              {lastTx && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setActiveSheet('UNDO')}
                >
                  <Text style={styles.menuItemText}>Undo ({lastTx.type})</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.menuItem, styles.endGameMenuItem]}
                onPress={() => onProceedToSettlement(table.id)}
              >
                <Flag size={14} color={colors.dangerText} />
                <Text style={[styles.menuItemText, { color: colors.dangerText, fontWeight: '700', marginLeft: 4 }]}>
                  End Game
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* If Game is in SETTLING or FINALIZED mode */}
        {(isSettling || isFinalized) && (
          <View style={styles.settlingCard}>
            <Text style={styles.settlingTitle}>
              {isFinalized ? 'Game Finalized (Read-Only)' : 'Game is in Settlement Review'}
            </Text>
            <TouchableOpacity
              style={styles.viewSettlementBtn}
              onPress={() => onProceedToSettlement(table.id)}
            >
              <Text style={styles.viewSettlementBtnText}>
                {isFinalized ? 'View Final Results & Settlement' : 'Review & Finalize Settlement →'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ACTIVITY LOG DRAWER (if toggled) */}
        {showActivity && (
          <View style={styles.activityDrawer}>
            <View style={styles.activityHeader}>
              <Text style={styles.activityTitle}>Table Activity History</Text>
              <TouchableOpacity onPress={() => setShowActivity(false)}>
                <Text style={styles.activityClose}>Close</Text>
              </TouchableOpacity>
            </View>

            {recentTransactions.length === 0 ? (
              <Text style={styles.emptyActivityText}>No transactions recorded yet.</Text>
            ) : (
              recentTransactions.map((tx: any) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txType}>{tx.type}</Text>
                    <Text style={styles.txDetail}>
                      {tx.chip_amount} chips (₹{tx.money_value}) • By {tx.actor_name}
                    </Text>
                  </View>
                  <Text style={styles.txTime}>
                    {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))
            )}
          </View>
        )}

        {/* PLAYER LIST */}
        <View style={styles.playerListHeader}>
          <Text style={styles.playerListTitle}>Players ({players.length})</Text>
          {isHost && !isFinalized && (
            <TouchableOpacity
              style={styles.seatFriendHeaderBtn}
              onPress={() => {
                loadFriends();
                setShowSeatFriendModal(true);
              }}
              activeOpacity={0.7}
            >
              <UserPlus size={13} color={colors.primary} style={{ marginRight: 5 }} />
              <Text style={styles.seatFriendHeaderBtnText}>+ Seat Friend</Text>
            </TouchableOpacity>
          )}
        </View>

        {isHost && !isFinalized && (
          <Text style={styles.playerListSubtext}>
            💡 Tap any player card to quickly record a buy-in, loan, or transfer for them.
          </Text>
        )}

        {players.map((p: any) => (
          <PlayerCard
            key={p.id}
            player={p}
            chipValue={table.chip_value}
            loansDescription={loansMap[p.id]}
            isHostView={isHost}
            onAddFriend={handleAddFriend}
            onSelectPlayer={isHost && !isFinalized ? () => handlePlayerCardTap(p) : undefined}
          />
        ))}
      </ScrollView>

      {/* Quick Action Sheet Modal */}
      <ActionSheet
        visible={activeSheet !== null}
        type={activeSheet}
        table={table}
        players={players}
        activeLoans={activeLoans}
        lastTransaction={lastTx}
        initialPlayerId={initialActionPlayerId}
        onClose={() => {
          setActiveSheet(null);
          setInitialActionPlayerId(undefined);
        }}
        onSubmitBuy={handleBuy}
        onSubmitLend={handleLend}
        onSubmitReturn={handleReturn}
        onSubmitTransfer={handleTransfer}
        onSubmitCorrection={handleCorrection}
        onSubmitUndo={handleUndo}
      />

      {/* SEAT FRIEND MODAL (Frictionless - No Codes Needed) */}
      <Modal visible={showSeatFriendModal} transparent animationType="fade" onRequestClose={() => setShowSeatFriendModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Seat Friend at Table</Text>
                <Text style={styles.modalSubtitle}>Friends join instantly without entering any code.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSeatFriendModal(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {loadingFriends ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={{ marginTop: 8, color: colors.textSecondary, fontSize: 12 }}>Loading friends...</Text>
              </View>
            ) : friends.length === 0 ? (
              <View style={styles.emptyFriendsModalBox}>
                <Text style={styles.emptyFriendsModalText}>
                  You have not added any friends yet. Players can still join using code #{table.join_code}.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {friends.map(f => {
                  const isSeated = players.some((p: any) => p.user_id === f.id);
                  return (
                    <View key={f.id} style={styles.friendModalRow}>
                      <View style={styles.friendModalAvatar}>
                        <Text style={styles.friendModalAvatarText}>
                          {f.displayName ? f.displayName.charAt(0).toUpperCase() : 'P'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.friendModalName}>{f.displayName}</Text>
                        <Text style={styles.friendModalCode}>#{f.friendCode}</Text>
                      </View>

                      {isSeated ? (
                        <View style={styles.seatedBadge}>
                          <Check size={11} color={colors.successText} style={{ marginRight: 4 }} />
                          <Text style={styles.seatedBadgeText}>Seated</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.seatActionBtn}
                          onPress={() => handleSeatFriend(f.id)}
                          activeOpacity={0.8}
                        >
                          <UserPlus size={12} color="#FFF" style={{ marginRight: 4 }} />
                          <Text style={styles.seatActionBtnText}>Seat</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Host Quick Actions for Selected Player Card */}
      <Modal visible={selectedPlayerForMenu !== null} transparent animationType="fade" onRequestClose={() => setSelectedPlayerForMenu(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Actions for {selectedPlayerForMenu?.display_name}</Text>
                <Text style={styles.modalSubtitle}>Currently holding {selectedPlayerForMenu?.current_chips} chips</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedPlayerForMenu(null)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 8, marginTop: 10 }}>
              <TouchableOpacity
                style={styles.quickActionOption}
                onPress={() => {
                  setInitialActionPlayerId(selectedPlayerForMenu?.id);
                  setActiveSheet('BUY');
                  setSelectedPlayerForMenu(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActionOptionTitle}>💰 Buy Chips from Bank</Text>
                <Text style={styles.quickActionOptionDesc}>Issue chips from bank vault to {selectedPlayerForMenu?.display_name}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionOption}
                onPress={() => {
                  setInitialActionPlayerId(selectedPlayerForMenu?.id);
                  setActiveSheet('LEND');
                  setSelectedPlayerForMenu(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActionOptionTitle}>🤝 Lend Chips (Loan)</Text>
                <Text style={styles.quickActionOptionDesc}>Record a loan with {selectedPlayerForMenu?.display_name} as the lender</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionOption}
                onPress={() => {
                  setInitialActionPlayerId(selectedPlayerForMenu?.id);
                  setActiveSheet('TRANSFER');
                  setSelectedPlayerForMenu(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActionOptionTitle}>↔️ Transfer Chips</Text>
                <Text style={styles.quickActionOptionDesc}>Transfer chips from {selectedPlayerForMenu?.display_name} to another player</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionOption}
                onPress={() => {
                  setInitialActionPlayerId(selectedPlayerForMenu?.id);
                  setActiveSheet('CORRECTION');
                  setSelectedPlayerForMenu(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActionOptionTitle}>✏️ Chip Count Correction</Text>
                <Text style={styles.quickActionOptionDesc}>Adjust miscounted chips</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* QR Code Modal */}
      <QRCodeModal
        visible={showQR}
        joinCode={table.join_code}
        tableName={table.name}
        onClose={() => setShowQR(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    paddingBottom: 40
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    marginLeft: 8,
    backgroundColor: colors.cardRaised,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center'
  },
  connectionAlert: {
    backgroundColor: colors.dangerLight,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    flexDirection: 'row',
    alignItems: 'center'
  },
  connectionAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dangerText,
    marginLeft: 6
  },
  feedbackBanner: {
    backgroundColor: colors.successLight,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.successBorder,
    flexDirection: 'row',
    alignItems: 'center'
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.successText,
    marginLeft: 6
  },
  waitingBanner: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  waitingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2
  },
  waitingSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  startGameBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginLeft: 10
  },
  startGameBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    marginLeft: 4
  },
  hostActionBar: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  hostSectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10
  },
  primaryActionRow: {
    flexDirection: 'row',
    marginBottom: 8
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionBuy: {
    backgroundColor: colors.primary,
    marginRight: 6
  },
  actionLend: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginLeft: 6
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3
  },
  secondaryActionRow: {
    flexDirection: 'row',
    marginBottom: 10
  },
  actionBtnSec: {
    flex: 1,
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  actionBtnSecText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  hostMenuRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark
  },
  menuItem: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center'
  },
  menuItemText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  endGameMenuItem: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  settlingCard: {
    backgroundColor: colors.warningLight,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.warningBorder
  },
  settlingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.warningText,
    marginBottom: 8
  },
  viewSettlementBtn: {
    backgroundColor: colors.warningText,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center'
  },
  viewSettlementBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13
  },
  activityDrawer: {
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  activityClose: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600'
  },
  emptyActivityText: {
    fontSize: 12,
    color: colors.textMuted,
    paddingVertical: 8
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  txType: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  txDetail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  txTime: {
    fontSize: 11,
    color: colors.textMuted
  },
  playerListHeader: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  playerListTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2
  },
  playerListSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    paddingHorizontal: 20,
    marginBottom: 8
  },
  seatFriendBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10
  },
  seatFriendBannerBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700'
  },
  seatFriendHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  seatFriendHeaderBtnText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700'
  },
  viewerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8
  },
  viewerBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    lineHeight: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  emptyFriendsModalBox: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  emptyFriendsModalText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center'
  },
  friendModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  friendModalAvatar: {
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
  friendModalAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text
  },
  friendModalName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  friendModalCode: {
    fontSize: 11,
    color: colors.textMuted
  },
  seatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.successBorder
  },
  seatedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successText
  },
  seatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8
  },
  seatActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF'
  },
  quickActionOption: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    padding: 12
  },
  quickActionOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2
  },
  quickActionOptionDesc: {
    fontSize: 11,
    color: colors.textSecondary
  }
});
