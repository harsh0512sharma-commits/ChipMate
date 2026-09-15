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
  Modal,
  TextInput,
  Share
} from 'react-native';
import {
  QrCode,
  Share2,
  Users,
  Play,
  CheckCircle2,
  AlertTriangle,
  HandCoins,
  History,
  Settings,
  Plus,
  Minus,
  ArrowRight,
  ShieldAlert,
  Flag,
  UserPlus,
  Check,
  X,
  UserCheck,
  Trash2,
  LogOut
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
import { BatchBuyInModal } from '../../components/BatchBuyInModal';

export function formatTxSummary(tx: any, isValueMode?: boolean): { title: string; subtitle: string; icon: string } {
  const fromName = tx.from_player_name || 'Bank';
  const toName = tx.to_player_name || 'Bank';
  const amount = tx.chip_amount;
  const money = tx.money_value;
  const isPureMoney = isValueMode || (tx.chip_value === 1 && tx.chip_amount === tx.money_value);

  switch (tx.type) {
    case 'BUY_IN':
      return {
        title: isPureMoney ? `Bank issued ₹${money} to ${toName}` : `Bank issued ${amount} chips to ${toName}`,
        subtitle: isPureMoney ? `Buy-in: ₹${money} • Vault balance updated` : `Buy-in: ₹${money} • Vault chips issued`,
        icon: '💰'
      };
    case 'RE_BUY':
      return {
        title: isPureMoney ? `Bank issued ₹${money} (Re-buy) to ${toName}` : `Bank issued ${amount} chips (Re-buy) to ${toName}`,
        subtitle: `Re-buy: ₹${money} • Added to table`,
        icon: '🔄'
      };
    case 'LEND':
      return {
        title: isPureMoney ? `${fromName} lent ₹${money} to ${toName}` : `${fromName} lent ${amount} chips to ${toName}`,
        subtitle: `Loan: ₹${money} • Tracked until settled`,
        icon: '🤝'
      };
    case 'RETURN':
      return {
        title: isPureMoney ? `${fromName} repaid ₹${money} to ${toName}` : `${fromName} repaid ${amount} chips to ${toName}`,
        subtitle: `Loan Repayment: ₹${money}`,
        icon: '↩️'
      };
    case 'TRANSFER':
      return {
        title: isPureMoney ? `${fromName} transferred ₹${money} to ${toName}` : `${fromName} transferred ${amount} chips to ${toName}`,
        subtitle: isPureMoney ? `Direct transfer: ₹${money}` : `Direct chip transfer: ₹${money}`,
        icon: '↔️'
      };
    case 'CORRECTION':
      return {
        title: isPureMoney ? `Balance corrected for ${toName || fromName}` : `Chip count corrected for ${toName || fromName}`,
        subtitle: isPureMoney ? `Set to ₹${money ?? amount}` : `Set to ${amount} chips`,
        icon: '✏️'
      };
    case 'REVERSAL':
      return {
        title: `Reversal of transaction`,
        subtitle: isPureMoney ? `₹${money} reversed` : `${amount} chips (₹${money}) reversed`,
        icon: '⏪'
      };
    default:
      return {
        title: isPureMoney ? `${tx.type} (₹${money})` : `${tx.type} (${amount} chips)`,
        subtitle: `₹${money} • By ${tx.actor_name}`,
        icon: '⚡'
      };
  }
}

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
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [guestNameInput, setGuestNameInput] = useState('');
  const [addingGuest, setAddingGuest] = useState(false);
  const [savedGuests, setSavedGuests] = useState<any[]>([]);
  const [loadingSavedGuests, setLoadingSavedGuests] = useState(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [addFriendFeedback, setAddFriendFeedback] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTable, setDeletingTable] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leavingTable, setLeavingTable] = useState(false);
  const [showFinalChipsModal, setShowFinalChipsModal] = useState(false);
  const [finalChipInputs, setFinalChipInputs] = useState<Record<string, string>>({});
  const [finalPlayerDenoms, setFinalPlayerDenoms] = useState<Record<string, Record<number, number>>>({});
  const [finalPlayerDirectValues, setFinalPlayerDirectValues] = useState<Record<string, string>>({});
  const [submittingFinalChips, setSubmittingFinalChips] = useState(false);
  const [finalChipError, setFinalChipError] = useState<string | null>(null);
  const [showBatchBuyInModal, setShowBatchBuyInModal] = useState(false);

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
        if (payload.eventType === 'TABLE_DELETED') {
          Alert.alert('Table Deleted', payload.payload?.message || 'This table was deleted by the host.');
          onBack();
          return;
        }
        if (payload.eventType === 'HOST_CHANGED') {
          if (payload.payload?.newHostUserId === user?.id) {
            Alert.alert('Host Assigned', 'The previous host left the table. You are now the Table Host!');
          }
        }
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
  }, [tableId, fetchTableData, user?.id, onBack]);

  const handleDeleteTable = async () => {
    setDeletingTable(true);
    try {
      const res = await apiRequest(`/tables/${tableId}`, { method: 'DELETE' });
      if (res.success) {
        setShowDeleteModal(false);
        Alert.alert('Table Deleted', 'The table has been deleted successfully.');
        onBack();
      } else {
        Alert.alert('Delete Failed', res.error || 'Could not delete table');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete table');
    } finally {
      setDeletingTable(false);
    }
  };

  const handleLeaveTable = async () => {
    if (isFinalized) {
      setShowLeaveModal(false);
      onBack();
      return;
    }
    setLeavingTable(true);
    try {
      const res = await apiRequest(`/tables/${tableId}/leave`, { method: 'POST' });
      if (res.success) {
        setShowLeaveModal(false);
        Alert.alert('Table Notice', res.message || 'You have left the table.');
        onBack();
      } else {
        Alert.alert('Leave Failed', res.error || 'Could not leave table');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to leave table');
    } finally {
      setLeavingTable(false);
    }
  };

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

  const loadSavedGuests = async () => {
    setLoadingSavedGuests(true);
    try {
      const res = await apiRequest('/tables/guests');
      if (res.success && res.guests) {
        setSavedGuests(res.guests);
      }
    } catch (_) {
    } finally {
      setLoadingSavedGuests(false);
    }
  };

  const handleSeatSavedGuest = async (guest: { id: string; name: string }) => {
    setAddingGuest(true);
    try {
      const res = await apiRequest(`/tables/${tableId}/seat-guest`, {
        method: 'POST',
        body: { guestId: guest.id }
      });
      if (res.success) {
        setShowAddGuestModal(false);
        setAddFriendFeedback(`✓ Seated guest "${res.displayName}" at the table!`);
        setTimeout(() => setAddFriendFeedback(null), 3500);
        fetchTableData();
      } else {
        Alert.alert('Error', res.error || 'Failed to add guest player');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add guest player');
    } finally {
      setAddingGuest(false);
    }
  };

  const handleSeatGuest = async () => {
    const clean = guestNameInput.trim();
    if (!clean || clean.length < 2) {
      Alert.alert('Guest Name', 'Please enter a valid name for the guest (at least 2 characters).');
      return;
    }
    setAddingGuest(true);
    try {
      const res = await apiRequest(`/tables/${tableId}/seat-guest`, {
        method: 'POST',
        body: { guestName: clean }
      });
      if (res.success) {
        setGuestNameInput('');
        setShowAddGuestModal(false);
        setAddFriendFeedback(`✓ Seated guest "${res.displayName}" at the table!`);
        setTimeout(() => setAddFriendFeedback(null), 3500);
        fetchTableData();
      } else {
        Alert.alert('Error', res.error || 'Failed to add guest player');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add guest player');
    } finally {
      setAddingGuest(false);
    }
  };

  const handlePlayerCardTap = (player: any) => {
    if (!isHost) return;
    setSelectedPlayerForMenu(player);
  };

  // Quick Action Submissions
  const handleBatchBuyIn = async (
    playerIds: string[],
    chipAmount: number,
    moneyValue?: number,
    denominationsBreakdown?: Array<{ denom: number; count: number }>
  ) => {
    try {
      const res = await apiRequest(`/tables/${tableId}/batch-buy-in`, {
        method: 'POST',
        body: {
          playerIds,
          chipAmount,
          moneyValue,
          denominationsBreakdown,
          idempotencyKey: `batch_${Date.now()}`
        }
      });
      if (res.success) {
        fetchTableData();
      } else {
        throw new Error(res.error || 'Failed to record batch buy-in');
      }
    } catch (err: any) {
      Alert.alert('Buy-In Error', err.message || 'Failed to record batch buy-in');
      throw err;
    }
  };

  const handleBuy = async (
    playerId: string,
    chipAmount: number,
    isRebuy: boolean,
    moneyValue?: number,
    denominationsBreakdown?: Array<{ denom: number; count: number }>
  ) => {
    await apiRequest(`/tables/${tableId}/buy-in`, {
      method: 'POST',
      body: {
        playerId,
        chipAmount,
        moneyValue,
        denominationsBreakdown,
        isRebuy,
        idempotencyKey: `buy_${Date.now()}`
      }
    });
    fetchTableData();
  };

  const handleLend = async (
    lenderPlayerId: string,
    borrowerPlayerId: string,
    chipAmount: number,
    moneyValue?: number,
    denominationsBreakdown?: Array<{ denom: number; count: number }>
  ) => {
    await apiRequest(`/tables/${tableId}/lend`, {
      method: 'POST',
      body: {
        lenderPlayerId,
        borrowerPlayerId,
        chipAmount,
        moneyValue,
        denominationsBreakdown,
        idempotencyKey: `lend_${Date.now()}`
      }
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

  const handleShareLedger = async () => {
    const origin = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : 'https://chipmate-h96z.onrender.com';
    const ledgerUrl = `${origin}/?ledger=${tableId}`;
    const shareTitle = `${data?.table?.name || 'Game'} — Public Ledger`;
    const shareMessage = `View the live public game ledger for "${data?.table?.name || 'Poker'}" on ChipMate (anyone can view, no login required):\n${ledgerUrl}`;

    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
        if (navigator.share) {
          try {
            await navigator.share({
              title: shareTitle,
              text: shareMessage,
              url: ledgerUrl
            });
            return;
          } catch (_) {}
        }
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(ledgerUrl);
          setAddFriendFeedback('✓ Public ledger link copied! Anyone can view live standings without logging in.');
          setTimeout(() => setAddFriendFeedback(null), 4500);
          return;
        }
      }
      await Share.share({
        message: shareMessage,
        url: ledgerUrl,
        title: shareTitle
      });
    } catch (err: any) {
      Alert.alert('Share Public Ledger', ledgerUrl);
    }
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

  const otherRegisteredPlayers = (players || []).filter((p: any) => p.user_id !== user?.id && !p.is_guest);
  const nextHostName = otherRegisteredPlayers.length > 0 ? otherRegisteredPlayers[0].display_name : 'the next player';

  const totalActiveLoansMoney = (activeLoans || []).reduce(
    (sum: number, l: any) => sum + (Number(l.moneyEquivalent) || 0),
    0
  );

  // Expected chips calculation for final settlement
  const isDenomMode = table?.chip_mode === 'DENOMINATION';
  const isValueMode = table?.chip_mode === 'VALUE';
  const isCustomOrValue = isDenomMode || isValueMode;

  let tableDenomList: Array<{ denom: number; color?: string; label?: string }> = [];
  if (isDenomMode && table?.denominations) {
    try {
      const parsed = typeof table.denominations === 'string' ? JSON.parse(table.denominations) : table.denominations;
      if (Array.isArray(parsed)) {
        tableDenomList = parsed.map((d: any) => {
          if (typeof d === 'object' && d !== null) {
            return {
              denom: Number(d.value) || 0,
              color: d.color,
              label: d.label
            };
          }
          return { denom: Number(d) || 0 };
        }).filter(d => d.denom > 0);
      }
    } catch (_) {}
  }

  const updateFinalPlayerDenom = (playerId: string, denom: number, delta: number) => {
    setFinalPlayerDenoms(prev => {
      const pMap = { ...(prev[playerId] || {}) };
      const cur = pMap[denom] || 0;
      pMap[denom] = Math.max(0, cur + delta);
      const nextMap = { ...prev, [playerId]: pMap };

      // Automatically calculate sum of (count * denom) and update direct value
      const sumMoney = Object.entries(pMap).reduce((acc, [d, c]) => acc + ((parseFloat(d) || 0) * (c || 0)), 0);
      setFinalPlayerDirectValues(dPrev => ({
        ...dPrev,
        [playerId]: String(sumMoney)
      }));

      return nextMap;
    });
  };

  const setFinalPlayerDenomDirect = (playerId: string, denom: number, text: string) => {
    const val = parseInt(text, 10) || 0;
    setFinalPlayerDenoms(prev => {
      const pMap = { ...(prev[playerId] || {}) };
      pMap[denom] = Math.max(0, val);
      const nextMap = { ...prev, [playerId]: pMap };

      // Automatically calculate sum of (count * denom) and update direct value
      const sumMoney = Object.entries(pMap).reduce((acc, [d, c]) => acc + ((parseFloat(d) || 0) * (c || 0)), 0);
      setFinalPlayerDirectValues(dPrev => ({
        ...dPrev,
        [playerId]: String(sumMoney)
      }));

      return nextMap;
    });
  };

  const setPlayerTotalValueDirect = (playerId: string, text: string) => {
    setFinalPlayerDirectValues(prev => ({
      ...prev,
      [playerId]: text
    }));
  };

  const getPlayerFinalValue = (playerId: string) => {
    if (finalPlayerDirectValues[playerId] !== undefined) {
      return parseFloat(finalPlayerDirectValues[playerId]) || 0;
    }
    const pDenoms = finalPlayerDenoms[playerId] || {};
    return Object.entries(pDenoms).reduce((acc, [d, c]) => acc + ((parseFloat(d) || 0) * (c || 0)), 0);
  };

  const totalBuyinChips = (players || []).reduce((sum: number, p: any) => sum + (p.total_buyin_chips || 0), 0);
  const expectedTotalChips = totalBuyinChips > 0 ? totalBuyinChips : (table.total_chips || 100);
  const chipValue = table.chip_value || 10;

  const totalBuyinMoney = (players || []).reduce((sum: number, p: any) => sum + (p.total_buyin_amount || 0), 0);
  const expectedTotalValue = isCustomOrValue ? totalBuyinMoney : expectedTotalChips * chipValue;

  let totalFinalDenomChips = 0;
  let totalFinalDenomMoney = 0;
  if (isCustomOrValue) {
    for (const p of (players || [])) {
      totalFinalDenomMoney += getPlayerFinalValue(p.id);
      const pDenoms = finalPlayerDenoms[p.id] || {};
      for (const count of Object.values(pDenoms)) {
        totalFinalDenomChips += (count || 0);
      }
    }
  }

  const totalEnteredChips = isCustomOrValue
    ? (isValueMode ? totalFinalDenomMoney : totalFinalDenomChips)
    : (players || []).reduce((sum: number, p: any) => {
        const raw = finalChipInputs[p.id];
        const val = raw !== undefined ? parseInt(raw, 10) : p.current_chips;
        return sum + (isNaN(val) || val < 0 ? 0 : val);
      }, 0);

  const totalEnteredMoney = isCustomOrValue
    ? totalFinalDenomMoney
    : totalEnteredChips * chipValue;

  const chipDiscrepancy = expectedTotalChips - totalEnteredChips;
  const isChipCountMatched = totalEnteredChips === expectedTotalChips;
  const isMoneyMatched = isCustomOrValue ? (Math.abs(totalFinalDenomMoney - expectedTotalValue) < 1) : true;
  const isCountsMatched = isCustomOrValue ? isMoneyMatched : (isChipCountMatched && isMoneyMatched);

  const handleOpenFinalChipsModal = () => {
    if (isCustomOrValue) {
      const initialDenoms: Record<string, Record<number, number>> = {};
      const initialDirect: Record<string, string> = {};
      for (const p of (players || [])) {
        initialDenoms[p.id] = {};
        if (p.final_denominations) {
          try {
            const parsed = typeof p.final_denominations === 'string' ? JSON.parse(p.final_denominations) : p.final_denominations;
            if (Array.isArray(parsed)) {
              parsed.forEach((item: any) => {
                if (item && item.denom !== undefined && item.count !== undefined) {
                  initialDenoms[p.id][item.denom] = item.count;
                }
              });
            }
          } catch (_) {}
        }
        if (p.final_chips_value !== null && p.final_chips_value !== undefined) {
          initialDirect[p.id] = String(p.final_chips_value);
        } else {
          const sumMoney = Object.entries(initialDenoms[p.id]).reduce((acc, [d, c]) => acc + ((parseFloat(d) || 0) * (c || 0)), 0);
          initialDirect[p.id] = sumMoney > 0 ? String(sumMoney) : String(p.current_chips ?? p.total_buyin_amount ?? 0);
        }
      }
      setFinalPlayerDenoms(initialDenoms);
      setFinalPlayerDirectValues(initialDirect);
    } else {
      const initialCounts: Record<string, string> = {};
      for (const p of (players || [])) {
        initialCounts[p.id] = String(p.current_chips ?? 0);
      }
      setFinalChipInputs(initialCounts);
    }
    setFinalChipError(null);
    setShowFinalChipsModal(true);
  };

  const handleFinalChipsSubmit = async () => {
    if (!isCountsMatched) {
      if (isCustomOrValue) {
        setFinalChipError(`Total value mismatch: ₹${totalFinalDenomMoney.toLocaleString('en-IN')} entered, but ₹${expectedTotalValue.toLocaleString('en-IN')} was bought in.`);
      } else {
        setFinalChipError(`Chip count mismatch: ${totalEnteredChips} chips entered, but ${expectedTotalChips} chips are expected.`);
      }
      return;
    }
    setSubmittingFinalChips(true);
    setFinalChipError(null);
    try {
      let res;
      if (isCustomOrValue) {
        const finalPlayerCounts = (players || []).map((p: any) => {
          const denoms = finalPlayerDenoms[p.id] || {};
          const breakdown = Object.entries(denoms)
            .map(([d, cnt]) => ({ denom: parseFloat(d), count: cnt }))
            .filter(item => item.count > 0);
          const denomChips = breakdown.reduce((acc, item) => acc + item.count, 0);
          const money = getPlayerFinalValue(p.id);
          const chips = isValueMode ? money : (denomChips > 0 ? denomChips : (table.chip_value > 0 ? Math.round(money / table.chip_value) : 0));
          return {
            playerId: p.id,
            finalChips: chips,
            finalChipsMoney: money,
            denominations: breakdown
          };
        });

        res = await apiRequest(`/tables/${table.id}/settle/chips`, {
          method: 'POST',
          body: { finalPlayerCounts }
        });
      } else {
        const countsPayload: Record<string, number> = {};
        for (const p of (players || [])) {
          const raw = finalChipInputs[p.id];
          const val = raw !== undefined ? parseInt(raw, 10) : p.current_chips;
          countsPayload[p.id] = isNaN(val) || val < 0 ? 0 : val;
        }
        res = await apiRequest(`/tables/${table.id}/settle/chips`, {
          method: 'POST',
          body: { finalChipCounts: countsPayload }
        });
      }

      if (res.success) {
        setShowFinalChipsModal(false);
        onProceedToSettlement(table.id);
      } else {
        setFinalChipError(res.error || 'Failed to submit final chip counts');
      }
    } catch (err: any) {
      setFinalChipError(err.message || 'Failed to submit final chip counts');
    } finally {
      setSubmittingFinalChips(false);
    }
  };

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
            <TouchableOpacity onPress={handleShareLedger} style={styles.headerIconBtn} activeOpacity={0.7} accessibilityLabel="Share Public Ledger">
              <Share2 size={19} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowQR(true)} style={styles.headerIconBtn}>
              <QrCode size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowActivity(prev => !prev)} style={styles.headerIconBtn}>
              <History size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLeaveModal(true)} style={styles.headerIconBtn}>
              <LogOut size={20} color={colors.dangerText} />
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


        {/* Viewer Mode Banner for Non-Hosts */}
        {!isHost && (
          <View style={[styles.viewerBanner, isFinalized && { borderColor: colors.primaryBorder, backgroundColor: colors.cardInset }]}>
            <ShieldAlert size={15} color={isFinalized ? colors.successText : colors.primary} style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.viewerBannerText}>
                {isFinalized
                  ? 'Game Completed • Results & Lifetime Statistics have been finalized.'
                  : 'Spectator / Player Mode • The host records all table transactions.'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (isFinalized) {
                  onBack();
                } else {
                  setShowLeaveModal(true);
                }
              }}
              style={[styles.leaveBannerBtn, isFinalized && { borderColor: colors.primaryBorder }]}
              activeOpacity={0.7}
            >
              <LogOut size={12} color={isFinalized ? colors.primary : colors.dangerText} style={{ marginRight: 4 }} />
              <Text style={[styles.leaveBannerBtnText, isFinalized && { color: colors.primary }]}>
                {isFinalized ? 'Exit Table' : 'Leave'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 100/100 PHYSICAL CHIP RECONCILIATION CARD */}
        <ChipCard
          totalChips={reconciliation.totalChips}
          playerChips={reconciliation.playerChips}
          bankChips={reconciliation.bankChips}
          chipValue={table.chip_value}
          totalLoansMoney={totalActiveLoansMoney}
          chipMode={table.chip_mode}
          denominations={table.denominations}
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
                onPress={() => setShowBatchBuyInModal(true)}
              >
                <Text style={styles.actionBtnText}>{isValueMode ? 'BUY-IN' : 'BUY CHIPS'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.actionLend]}
                onPress={() => setActiveSheet('LEND')}
              >
                <Text style={styles.actionBtnText}>{isValueMode ? '🤝 LEND (₹)' : '🤝 LEND'}</Text>
              </TouchableOpacity>
            </View>

            {/* Additional host options */}
            <View style={styles.hostMenuRow}>
              {lastTx && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => setActiveSheet('UNDO')}
                >
                  <Text style={styles.menuItemText}>Undo ({lastTx.type})</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.menuItem}
                onPress={handleShareLedger}
              >
                <Share2 size={13} color={colors.textSecondary} />
                <Text style={[styles.menuItemText, { marginLeft: 4 }]}>Share Ledger</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.endGameMenuItem]}
                onPress={handleOpenFinalChipsModal}
              >
                <Flag size={14} color={colors.dangerText} />
                <Text style={[styles.menuItemText, { color: colors.dangerText, fontWeight: '700', marginLeft: 4 }]}>
                  End Game
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.deleteTableMenuItem]}
                onPress={() => setShowDeleteModal(true)}
              >
                <Trash2 size={14} color={colors.dangerText} />
                <Text style={[styles.menuItemText, { color: colors.dangerText, fontWeight: '700', marginLeft: 4 }]}>
                  Delete Table
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
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <TouchableOpacity
                style={[styles.viewSettlementBtn, { flex: 1, marginTop: 0 }]}
                onPress={() => onProceedToSettlement(table.id)}
              >
                <Text style={styles.viewSettlementBtnText}>
                  {isFinalized ? 'View Final Results & Settlement' : 'Review & Finalize Settlement →'}
                </Text>
              </TouchableOpacity>
              {isHost && isSettling && !isFinalized && (
                <TouchableOpacity
                  style={styles.recountBtn}
                  onPress={handleOpenFinalChipsModal}
                >
                  <Text style={styles.recountBtnText}>Re-count</Text>
                </TouchableOpacity>
              )}
            </View>
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
              recentTransactions.map((tx: any) => {
                const summary = formatTxSummary(tx, isValueMode);
                return (
                  <View key={tx.id} style={styles.txRow}>
                    <Text style={styles.txIcon}>{summary.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txType}>{summary.title}</Text>
                      <Text style={styles.txDetail}>
                        {summary.subtitle} • Recorded by {tx.actor_name}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
                      <Text style={styles.txDate}>
                        {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                      <Text style={styles.txTime}>
                        {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* PLAYER LIST */}
        <View style={styles.playerListHeader}>
          <Text style={styles.playerListTitle}>Players ({players.length})</Text>
          {isHost && !isFinalized && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={styles.seatGuestHeaderBtn}
                onPress={() => {
                  loadSavedGuests();
                  setShowAddGuestModal(true);
                }}
                activeOpacity={0.7}
              >
                <Plus size={13} color="#FFF" style={{ marginRight: 3 }} />
                <Text style={styles.seatGuestHeaderBtnText}>+ Add Guest</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.seatFriendHeaderBtn}
                onPress={() => {
                  loadFriends();
                  setShowSeatFriendModal(true);
                }}
                activeOpacity={0.7}
              >
                <UserPlus size={13} color={colors.primary} style={{ marginRight: 3 }} />
                <Text style={styles.seatFriendHeaderBtnText}>+ Seat Friend</Text>
              </TouchableOpacity>
            </View>
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
            chipMode={table.chip_mode}
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

      {/* Batch Multi-Player Buy-In Modal */}
      <BatchBuyInModal
        visible={showBatchBuyInModal}
        table={table}
        players={players}
        onClose={() => setShowBatchBuyInModal(false)}
        onSubmitBatchBuyIn={handleBatchBuyIn}
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
                  const isInOtherGame = f.isInActiveGame && f.activeGameId !== table.id;
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
                      ) : isInOtherGame ? (
                        <View style={styles.inGameBadge}>
                          <Text style={styles.inGameBadgeText} numberOfLines={1}>
                            In Game: {f.activeGameName || 'Active'}
                          </Text>
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
                <Text style={styles.modalSubtitle}>
                  {isValueMode
                    ? `Currently holding ₹${(selectedPlayerForMenu?.current_chips || 0).toLocaleString('en-IN')}`
                    : `Currently holding ${selectedPlayerForMenu?.current_chips} chips`}
                </Text>
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
                <Text style={styles.quickActionOptionTitle}>
                  {isValueMode ? '💰 Buy-In from Bank (₹)' : '💰 Buy Chips from Bank'}
                </Text>
                <Text style={styles.quickActionOptionDesc}>
                  {isValueMode
                    ? `Issue ₹ buy-in from bank vault to ${selectedPlayerForMenu?.display_name}`
                    : `Issue chips from bank vault to ${selectedPlayerForMenu?.display_name}`}
                </Text>
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
                <Text style={styles.quickActionOptionTitle}>
                  {isValueMode ? '🤝 Lend Money (Loan)' : '🤝 Lend Chips (Loan)'}
                </Text>
                <Text style={styles.quickActionOptionDesc}>
                  {isValueMode
                    ? `Record a cash loan with ${selectedPlayerForMenu?.display_name} as the lender`
                    : `Record a loan with ${selectedPlayerForMenu?.display_name} as the lender`}
                </Text>
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

      {/* ADD GUEST PLAYER MODAL */}
      <Modal visible={showAddGuestModal} transparent animationType="fade" onRequestClose={() => setShowAddGuestModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Seat Guest Player</Text>
                <Text style={styles.modalSubtitle}>Pick from saved guests or create a new one.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddGuestModal(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* SAVED GUESTS LIST */}
            {loadingSavedGuests ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 14 }} />
            ) : savedGuests && savedGuests.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.guestInputLabel}>SAVED GUESTS (TAP TO SEAT)</Text>
                <ScrollView style={{ maxHeight: 150, marginVertical: 6 }} nestedScrollEnabled>
                  {savedGuests
                    .filter(sg => !(players || []).some((p: any) => p.user_id === sg.id || p.id === sg.id || (p.is_guest && p.display_name?.toLowerCase() === sg.name?.toLowerCase())))
                    .map((g: any) => (
                      <View key={g.id} style={styles.savedGuestRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.savedGuestName}>{g.name}</Text>
                          <Text style={styles.savedGuestSub}>
                            {g.games_played > 0 ? `${g.games_played} game${g.games_played === 1 ? '' : 's'} played` : 'Saved Guest'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.savedGuestSeatBtn}
                          onPress={() => handleSeatSavedGuest(g)}
                          disabled={addingGuest}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.savedGuestSeatBtnText}>+ Seat</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                </ScrollView>
              </View>
            ) : null}

            {/* CREATE NEW GUEST */}
            <View style={{ marginTop: 10 }}>
              <Text style={styles.guestInputLabel}>
                {savedGuests.length > 0 ? 'OR CREATE NEW GUEST *' : 'GUEST PLAYER NAME *'}
              </Text>
              <TextInput
                style={styles.guestTextInput}
                placeholder="e.g. Rohan, Dev, Uncle Dave"
                placeholderTextColor={colors.textMuted}
                value={guestNameInput}
                onChangeText={setGuestNameInput}
              />
              <Text style={styles.guestHintText}>
                New guests are automatically saved so you can seat them in future games with 1 tap.
              </Text>

              <TouchableOpacity
                style={[styles.addGuestSubmitBtn, (!guestNameInput.trim() || addingGuest) && { opacity: 0.6 }]}
                onPress={handleSeatGuest}
                disabled={!guestNameInput.trim() || addingGuest}
                activeOpacity={0.8}
              >
                {addingGuest ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.addGuestSubmitBtnText}>+ Create & Seat Guest</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE TABLE MODAL (Host Only) */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.dangerText }]}>Delete Table?</Text>
                <Text style={styles.modalSubtitle}>Permanently cancel and remove this table.</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDeleteModal(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.confirmModalWarningText}>
                ⚠️ Are you sure you want to delete this table? All chip records, loans, and player sessions will be cleared. This action cannot be undone.
              </Text>

              <TouchableOpacity
                style={[styles.dangerConfirmBtn, deletingTable && { opacity: 0.6 }]}
                onPress={handleDeleteTable}
                disabled={deletingTable}
                activeOpacity={0.8}
              >
                {deletingTable ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.dangerConfirmBtnText}>Yes, Delete Table</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowDeleteModal(false)}
                disabled={deletingTable}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LEAVE TABLE MODAL */}
      <Modal visible={showLeaveModal} transparent animationType="fade" onRequestClose={() => setShowLeaveModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, { color: colors.dangerText }]}>
                  {isHost
                    ? otherRegisteredPlayers.length === 0
                      ? 'Leave & Delete Table?'
                      : 'Leave Table & Transfer Host?'
                    : 'Leave Table?'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isHost
                    ? otherRegisteredPlayers.length === 0
                      ? 'You are the only registered player.'
                      : `Host will transfer to ${nextHostName}.`
                    : 'Exit this active game session.'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLeaveModal(false)} style={styles.modalCloseBtn} activeOpacity={0.7}>
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={styles.confirmModalWarningText}>
                {isHost
                  ? otherRegisteredPlayers.length === 0
                    ? '⚠️ Since you are the only player, leaving this table will permanently delete it.'
                    : `⚠️ Since you are the host, leaving will automatically transfer host control to ${nextHostName}. Any active chips you hold will be returned to the vault.`
                  : '⚠️ Any active chips you hold will be returned to the vault. If you have active loans, please repay or settle them first.'}
              </Text>

              <TouchableOpacity
                style={[styles.dangerConfirmBtn, leavingTable && { opacity: 0.6 }]}
                onPress={handleLeaveTable}
                disabled={leavingTable}
                activeOpacity={0.8}
              >
                {leavingTable ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.dangerConfirmBtnText}>
                    {isHost
                      ? otherRegisteredPlayers.length === 0
                        ? 'Leave & Delete Table'
                        : `Transfer & Leave Table`
                      : 'Confirm Leave Table'}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setShowLeaveModal(false)}
                disabled={leavingTable}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelModalBtnText}>Stay at Table</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FINAL CHIP COUNT ENTRY MODAL (End Game Step) */}
      <Modal
        visible={showFinalChipsModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!submittingFinalChips) setShowFinalChipsModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>
                  {isValueMode ? 'End Game — Final In-Hand Balances' : 'End Game — Final Chip Count'}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {isValueMode
                    ? 'Enter the final in-hand money (₹) held by each player to compute the zero-sum settlement.'
                    : 'Enter the physical in-hand chips held by each player to compute the zero-sum settlement.'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFinalChipsModal(false)}
                style={styles.modalCloseBtn}
                disabled={submittingFinalChips}
                activeOpacity={0.7}
              >
                <X size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Expected chips summary */}
            <View style={styles.finalChipsExpectCard}>
              {!isValueMode && (
                <View style={styles.finalChipsExpectRow}>
                  <Text style={styles.finalChipsExpectLabel}>Total chips in game:</Text>
                  <Text style={styles.finalChipsExpectVal}>{expectedTotalChips}</Text>
                </View>
              )}
              {!isCustomOrValue && (
                <View style={styles.finalChipsExpectRow}>
                  <Text style={styles.finalChipsExpectLabel}>Chip value:</Text>
                  <Text style={styles.finalChipsExpectVal}>₹{chipValue}</Text>
                </View>
              )}
              <View style={[styles.finalChipsExpectRow, { marginTop: isValueMode ? 0 : 4, paddingTop: isValueMode ? 0 : 4, borderTopWidth: isValueMode ? 0 : 1, borderTopColor: colors.borderDark }]}>
                <Text style={[styles.finalChipsExpectLabel, { fontWeight: '700', color: colors.text }]}>
                  {isValueMode ? 'Total Table Buy-in Pot:' : 'Expected total value:'}
                </Text>
                <Text style={[styles.finalChipsExpectVal, { fontWeight: '800', color: colors.primary }]}>₹{expectedTotalValue.toLocaleString('en-IN')}</Text>
              </View>
            </View>

            {/* Dynamic Reconciliation Status */}
            <View style={[
              styles.finalChipsTallyCard,
              isCountsMatched ? styles.finalChipsTallyMatch : styles.finalChipsTallyMismatch
            ]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isCountsMatched ? (
                  <CheckCircle2 size={16} color={colors.successText} style={{ marginRight: 6 }} />
                ) : (
                  <AlertTriangle size={16} color={colors.dangerText} style={{ marginRight: 6 }} />
                )}
                <Text style={[
                  styles.finalChipsTallyTitle,
                  { color: isCountsMatched ? colors.successText : colors.dangerText }
                ]}>
                  {isCountsMatched
                    ? (isValueMode
                        ? `100% Reconciled • Total Pot ₹${expectedTotalValue.toLocaleString('en-IN')} Balanced`
                        : isCustomOrValue
                        ? `100% Reconciled • Total Value ₹${expectedTotalValue.toLocaleString('en-IN')} Balanced`
                        : `Chip count and values match perfectly (${expectedTotalChips} chips / ₹${expectedTotalValue.toLocaleString('en-IN')})`)
                    : (isValueMode
                        ? `Amount mismatch: ₹${totalFinalDenomMoney.toLocaleString('en-IN')} entered, but ₹${expectedTotalValue.toLocaleString('en-IN')} was bought in.`
                        : isCustomOrValue
                        ? `Value mismatch: ₹${totalFinalDenomMoney.toLocaleString('en-IN')} entered, but ₹${expectedTotalValue.toLocaleString('en-IN')} was bought in.`
                        : `Chip count mismatch: ${totalEnteredChips} chips entered, but ${expectedTotalChips} chips are expected.`)}
                </Text>
              </View>
              {!isCountsMatched && (
                <Text style={styles.finalChipsTallyDiff}>
                  {isCustomOrValue
                    ? `₹${Math.abs(expectedTotalValue - totalFinalDenomMoney).toLocaleString('en-IN')} ${totalFinalDenomMoney > expectedTotalValue ? 'extra' : 'short'}`
                    : (chipDiscrepancy > 0
                        ? `Missing ${chipDiscrepancy} chip${chipDiscrepancy === 1 ? '' : 's'}`
                        : `${Math.abs(chipDiscrepancy)} extra chip${Math.abs(chipDiscrepancy) === 1 ? '' : 's'}`)}
                </Text>
              )}
            </View>

            {/* Players in-hand chips entry list */}
            <ScrollView style={{ maxHeight: 320, marginVertical: 8 }} showsVerticalScrollIndicator={false}>
              {players.map((p: any) => {
                const isHostPlayer = p.role === 'HOST';
                const isGuestPlayer = Boolean(p.is_guest || p.friend_code === 'GUEST' || (p.user_id && p.user_id.startsWith('guest_')));

                if (isCustomOrValue) {
                  const pDenoms = finalPlayerDenoms[p.id] || {};
                  const pChips = Object.values(pDenoms).reduce((acc, c) => acc + (c || 0), 0);
                  const pMoney = getPlayerFinalValue(p.id);

                  return (
                    <View key={p.id} style={styles.denomPlayerCard}>
                      <View style={styles.denomPlayerHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.finalChipPlayerName} numberOfLines={1}>{p.display_name}</Text>
                            {isHostPlayer && (
                              <View style={styles.hostBadge}>
                                <Text style={styles.hostBadgeText}>HOST</Text>
                              </View>
                            )}
                            {isGuestPlayer && (
                              <View style={styles.guestBadge}>
                                <Text style={styles.guestBadgeText}>GUEST</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.finalChipPlayerMeta}>
                            {isValueMode ? `Buy-in: ₹${p.total_buyin_amount}` : `Buy-in: ₹${p.total_buyin_amount} (${p.total_buyin_chips} chips)`}
                          </Text>
                        </View>
                        <View style={styles.denomPlayerTotalPill}>
                          <Text style={styles.denomPlayerTotalText}>
                            {isValueMode ? `₹${pMoney.toLocaleString('en-IN')}` : `${pChips > 0 ? `${pChips} chips • ` : ''}₹${pMoney.toLocaleString('en-IN')}`}
                          </Text>
                        </View>
                      </View>

                      {/* Direct Total Chip Value input row */}
                      <View style={styles.directValueInputRow}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={styles.directValueLabel}>
                            {isValueMode ? 'In-Hand Balance:' : 'Total In-Hand Value:'}
                          </Text>
                          <Text style={styles.directValueSubtext}>
                            {isValueMode ? 'Enter final ₹ balance held by this player' : 'Write total ₹ directly, or enter chips below'}
                          </Text>
                        </View>
                        <View style={styles.directValueBox}>
                          <Text style={styles.rupeeSymbol}>₹</Text>
                          <TextInput
                            style={styles.directValueInput}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            value={finalPlayerDirectValues[p.id] !== undefined ? finalPlayerDirectValues[p.id] : String(pMoney)}
                            onChangeText={t => setPlayerTotalValueDirect(p.id, t)}
                          />
                        </View>
                      </View>

                      {isDenomMode && (
                        <View style={styles.denomChipsGrid}>
                          {tableDenomList.map(item => {
                            const count = pDenoms[item.denom] || 0;
                            return (
                              <View key={item.denom} style={styles.denomChipRow}>
                                <View style={[styles.denomBadgeSmall, { backgroundColor: item.color || colors.primary }]}>
                                  <Text style={styles.denomBadgeSmallText}>₹{item.denom}</Text>
                                </View>
                                <View style={{ flex: 1, paddingLeft: 8 }}>
                                  <Text style={styles.denomChipRowName}>₹{item.denom} Chip</Text>
                                </View>
                                <View style={styles.counterBoxSmall}>
                                  <TouchableOpacity
                                    onPress={() => updateFinalPlayerDenom(p.id, item.denom, -1)}
                                    style={[styles.counterBtnSmall, count <= 0 && { opacity: 0.35 }]}
                                    disabled={count <= 0}
                                  >
                                    <Minus size={12} color="#FFF" />
                                  </TouchableOpacity>
                                  <TextInput
                                    style={styles.counterInputSmall}
                                    keyboardType="numeric"
                                    value={count.toString()}
                                    onChangeText={t => setFinalPlayerDenomDirect(p.id, item.denom, t)}
                                  />
                                  <TouchableOpacity
                                    onPress={() => updateFinalPlayerDenom(p.id, item.denom, 1)}
                                    style={styles.counterBtnSmall}
                                  >
                                    <Plus size={12} color="#FFF" />
                                  </TouchableOpacity>
                                </View>
                                <Text style={styles.denomRowSubtotal}>₹{(count * item.denom).toLocaleString('en-IN')}</Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                }

                const rawVal = finalChipInputs[p.id];
                const enteredChips = rawVal !== undefined ? (parseInt(rawVal, 10) || 0) : (p.current_chips ?? 0);
                const enteredMoney = enteredChips * chipValue;

                return (
                  <View key={p.id} style={styles.finalChipPlayerRow}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.finalChipPlayerName} numberOfLines={1}>{p.display_name}</Text>
                        {isHostPlayer && (
                          <View style={styles.hostBadge}>
                            <Text style={styles.hostBadgeText}>HOST</Text>
                          </View>
                        )}
                        {isGuestPlayer && (
                          <View style={styles.guestBadge}>
                            <Text style={styles.guestBadgeText}>GUEST</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.finalChipPlayerMeta}>
                        Buy-in: ₹{p.total_buyin_amount} ({p.total_buyin_chips} chips)
                      </Text>
                    </View>

                    <View style={styles.finalChipInputWrapper}>
                      <TextInput
                        style={styles.finalChipInput}
                        keyboardType="number-pad"
                        value={finalChipInputs[p.id] !== undefined ? finalChipInputs[p.id] : String(p.current_chips ?? 0)}
                        onChangeText={(val) => {
                          const clean = val.replace(/[^0-9]/g, '');
                          setFinalChipInputs(prev => ({ ...prev, [p.id]: clean }));
                        }}
                        selectTextOnFocus
                      />
                      <Text style={styles.finalChipMoneySub}>= ₹{enteredMoney.toLocaleString('en-IN')}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {finalChipError && (
              <View style={styles.finalChipErrorBox}>
                <Text style={styles.finalChipErrorText}>{finalChipError}</Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowFinalChipsModal(false)}
                disabled={submittingFinalChips}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalConfirmBtn,
                  (!isCountsMatched || submittingFinalChips) && { opacity: 0.5 }
                ]}
                onPress={handleFinalChipsSubmit}
                disabled={!isCountsMatched || submittingFinalChips}
              >
                {submittingFinalChips ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Proceed to Settlement →</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  txIcon: {
    fontSize: 16,
    marginRight: 10
  },
  txType: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  txDetail: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  txDate: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2
  },
  txTime: {
    fontSize: 10,
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
  seatGuestHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  seatGuestHeaderBtnText: {
    fontSize: 12,
    color: '#FFF',
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
  savedGuestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardInset,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  savedGuestName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  savedGuestSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  savedGuestSeatBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  savedGuestSeatBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700'
  },
  guestInputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6
  },
  guestTextInput: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600'
  },
  guestHintText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 16
  },
  addGuestSubmitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addGuestSubmitBtnText: {
    color: '#FFF',
    fontSize: 14,
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
  },
  deleteTableMenuItem: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)'
  },
  leaveBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8
  },
  leaveBannerBtnText: {
    color: colors.dangerText,
    fontSize: 11,
    fontWeight: '700'
  },
  inGameBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    maxWidth: 140
  },
  inGameBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F59E0B'
  },
  confirmModalWarningText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 10,
    padding: 12
  },
  dangerConfirmBtn: {
    backgroundColor: colors.dangerText,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  dangerConfirmBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  cancelModalBtn: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelModalBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  recountBtn: {
    backgroundColor: colors.cardRaised,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    justifyContent: 'center',
    alignItems: 'center'
  },
  recountBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary
  },
  finalChipsExpectCard: {
    backgroundColor: colors.cardInset,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginTop: 12,
    marginBottom: 8
  },
  finalChipsExpectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2
  },
  finalChipsExpectLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  finalChipsExpectVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  finalChipsTallyCard: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1
  },
  finalChipsTallyMatch: {
    backgroundColor: colors.successLight,
    borderColor: colors.successBorder
  },
  finalChipsTallyMismatch: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.dangerBorder
  },
  finalChipsTallyTitle: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1
  },
  finalChipsTallyDiff: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dangerText,
    marginTop: 3,
    marginLeft: 22
  },
  finalChipPlayerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  finalChipPlayerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  finalChipPlayerMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  finalChipInputWrapper: {
    alignItems: 'flex-end',
    width: 90
  },
  finalChipInput: {
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderDark,
    borderRadius: 8,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    width: '100%'
  },
  finalChipMoneySub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '600'
  },
  finalChipErrorBox: {
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  finalChipErrorText: {
    fontSize: 12,
    color: colors.dangerText,
    fontWeight: '600',
    textAlign: 'center'
  },
  hostBadge: {
    backgroundColor: 'rgba(234, 88, 12, 0.22)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6
  },
  hostBadgeText: {
    color: '#FF8A4C',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  guestBadge: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6
  },
  guestBadgeText: {
    color: '#E2E8F0',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC'
  },
  modalConfirmBtn: {
    flex: 1.6,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalConfirmBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF'
  },
  denomPlayerCard: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  denomPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  denomPlayerTotalPill: {
    backgroundColor: 'rgba(235, 94, 40, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(235, 94, 40, 0.25)'
  },
  denomPlayerTotalText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary
  },
  denomChipsGrid: {
    gap: 6
  },
  denomChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  denomBadgeSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFF'
  },
  denomBadgeSmallText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#000'
  },
  denomChipRowName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  counterBoxSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden'
  },
  counterBtnSmall: {
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)'
  },
  counterInputSmall: {
    width: 34,
    height: 26,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    padding: 0
  },
  denomRowSubtotal: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.chipGold,
    width: 58,
    textAlign: 'right'
  },
  directValueInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(235, 94, 40, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(235, 94, 40, 0.25)'
  },
  directValueLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text
  },
  directValueSubtext: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1
  },
  directValueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderDark,
    paddingHorizontal: 8,
    height: 32
  },
  rupeeSymbol: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 4
  },
  directValueInput: {
    width: 70,
    height: 30,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    padding: 0,
    textAlign: 'right'
  }
});
