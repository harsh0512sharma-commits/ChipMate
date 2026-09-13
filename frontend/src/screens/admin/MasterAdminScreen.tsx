import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import {
  ArrowLeft,
  RefreshCw,
  Users,
  Trophy,
  Flame,
  TrendingUp,
  Search,
  X,
  Trash2,
  AlertTriangle,
  Check,
  Shield,
  Layers,
  CircleDollarSign,
  ChevronRight,
  UserCheck,
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';

interface MasterAdminScreenProps {
  onBack: () => void;
  onOpenSummary?: (gameId: string) => void;
}

interface OverviewData {
  totalUsers: number;
  totalGames: number;
  activeGames: number;
  finalizedGames: number;
  totalTurnover: number;
  totalChips: number;
  totalTransactions: number;
  totalLoans: number;
  totalSettlements: number;
}

interface AdminPlayer {
  id: string;
  phone_number: string | null;
  email: string;
  display_name: string;
  friend_code: string;
  avatar_url: string | null;
  created_at: string;
  games_played: number;
  games_won: number;
  games_lost: number;
  win_rate: number;
  net_winnings: number;
  total_buyins: number;
  total_game_winnings: number;
  total_game_losses: number;
  biggest_win: number;
  biggest_loss: number;
  current_streak: number;
  best_winning_streak: number;
  worst_losing_streak: number;
  teen_patti_games: number;
  teen_patti_net: number;
  poker_games: number;
  poker_net: number;
  friends_count: number;
  games_hosted_count: number;
}

interface AdminGame {
  id: string;
  code: string;
  title: string;
  game_type: string;
  chip_value: number;
  default_starting_chips: number;
  status: string;
  created_at: string;
  finalized_at: string | null;
  host_user_id: string;
  host_name: string;
  host_phone: string;
  host_email: string;
  player_count: number;
  total_pot_amount: number;
  total_pot_chips: number;
}

export const MasterAdminScreen: React.FC<MasterAdminScreenProps> = ({ onBack, onOpenSummary }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PLAYERS' | 'GAMES'>('OVERVIEW');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [games, setGames] = useState<AdminGame[]>([]);

  // Search
  const [playerSearch, setPlayerSearch] = useState('');
  const [gameSearch, setGameSearch] = useState('');

  // Player Dossier Modal
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [playerDetails, setPlayerDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Deleting state
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const [resettingAll, setResettingAll] = useState(false);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [overviewRes, playersRes, gamesRes] = await Promise.all([
        apiRequest('/admin/overview'),
        apiRequest('/admin/users'),
        apiRequest('/admin/games'),
      ]);

      if (overviewRes.success) setOverview(overviewRes.overview);
      if (playersRes.success) setPlayers(playersRes.players || []);
      if (gamesRes.success) setGames(gamesRes.games || []);
    } catch (err: any) {
      Alert.alert('Admin Error', err.message || 'Failed to load master admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllAdminData();
  };

  const handleOpenPlayerDossier = async (userId: string) => {
    setSelectedPlayerId(userId);
    setLoadingDetails(true);
    try {
      const res = await apiRequest(`/admin/users/${userId}`);
      if (res.success) {
        setPlayerDetails(res.details);
      } else {
        Alert.alert('Error', res.error || 'Failed to load player dossier');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load player dossier');
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDeleteGame = (game: AdminGame) => {
    const isFinalized = game.status === 'FINALIZED';
    const confirmMsg = isFinalized
      ? `Are you sure you want to delete finalized game "${game.title}" (${game.code})?\n\nThis will purge all ledger records and RECALCULATE lifetime stats for participating players.`
      : `Are you sure you want to delete game "${game.title}" (${game.code})?`;

    const proceedWithDeletion = async () => {
      setDeletingGameId(game.id);
      try {
        const res = await apiRequest(`/admin/games/${game.id}`, { method: 'DELETE' });
        if (res.success) {
          Alert.alert('Game Purged', res.message || 'Game deleted successfully.');
          loadAllAdminData();
        } else {
          Alert.alert('Deletion Failed', res.error || 'Could not delete game.');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to delete game.');
      } finally {
        setDeletingGameId(null);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        proceedWithDeletion();
      }
    } else {
      Alert.alert('Delete Game', confirmMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete Permanently', style: 'destructive', onPress: proceedWithDeletion },
      ]);
    }
  };

  const handleResetAllGames = () => {
    const confirmMsg =
      'DANGER: Master Reset will permanently purge ALL games, transactions, and settlements across the platform, and reset all player lifetime stats to 0.\n\nType YES if you want to proceed.';

    const proceedWithReset = async () => {
      setResettingAll(true);
      try {
        const res = await apiRequest('/admin/reset-games', { method: 'POST' });
        if (res.success) {
          Alert.alert('Reset Complete', res.message || 'All platform games purged.');
          loadAllAdminData();
        } else {
          Alert.alert('Reset Failed', res.error || 'Could not reset games.');
        }
      } catch (err: any) {
        Alert.alert('Error', err.message || 'Failed to reset games.');
      } finally {
        setResettingAll(false);
      }
    };

    if (Platform.OS === 'web') {
      const input = window.prompt(confirmMsg);
      if (input === 'YES' || input === 'yes') {
        proceedWithReset();
      }
    } else {
      Alert.alert('Master Reset', 'Permanently purge all games and reset all stats?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset Everything', style: 'destructive', onPress: proceedWithReset },
      ]);
    }
  };

  const filteredPlayers = players.filter(p => {
    if (!playerSearch.trim()) return true;
    const q = playerSearch.toLowerCase();
    return (
      p.display_name?.toLowerCase().includes(q) ||
      p.phone_number?.includes(q) ||
      p.friend_code?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );
  });

  const filteredGames = games.filter(g => {
    if (!gameSearch.trim()) return true;
    const q = gameSearch.toLowerCase();
    return (
      g.title?.toLowerCase().includes(q) ||
      g.code?.toLowerCase().includes(q) ||
      g.host_name?.toLowerCase().includes(q) ||
      g.host_phone?.includes(q)
    );
  });

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <ArrowLeft size={20} color="#FFD700" />
          <Text style={styles.backBtnText}>Exit</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>👑 Master Admin</Text>
          <Text style={styles.headerSubtitle}>7319123393 • Full Platform Control</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} disabled={refreshing}>
          <RefreshCw size={18} color={refreshing ? colors.textMuted : '#FFD700'} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'OVERVIEW' && styles.tabItemActive]}
          onPress={() => setActiveTab('OVERVIEW')}
        >
          <Layers size={16} color={activeTab === 'OVERVIEW' ? '#FFD700' : colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.tabTextActive]}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'PLAYERS' && styles.tabItemActive]}
          onPress={() => setActiveTab('PLAYERS')}
        >
          <Users size={16} color={activeTab === 'PLAYERS' ? '#FFD700' : colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'PLAYERS' && styles.tabTextActive]}>
            Players ({players.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'GAMES' && styles.tabItemActive]}
          onPress={() => setActiveTab('GAMES')}
        >
          <Trophy size={16} color={activeTab === 'GAMES' ? '#FFD700' : colors.textMuted} />
          <Text style={[styles.tabText, activeTab === 'GAMES' && styles.tabTextActive]}>
            Games ({games.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading master controls...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          {/* OVERVIEW TAB */}
          {activeTab === 'OVERVIEW' && overview && (
            <View>
              <Text style={styles.sectionHeader}>PLATFORM METRICS</Text>

              <View style={styles.grid2}>
                <View style={styles.metricCard}>
                  <Text style={styles.metricVal}>{overview.totalUsers}</Text>
                  <Text style={styles.metricLabel}>Registered Players</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricVal}>{overview.totalGames}</Text>
                  <Text style={styles.metricLabel}>Total Games</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={[styles.metricVal, { color: '#00E676' }]}>{overview.activeGames}</Text>
                  <Text style={styles.metricLabel}>Active Right Now</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricVal}>{overview.finalizedGames}</Text>
                  <Text style={styles.metricLabel}>Finalized Games</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={[styles.metricVal, { color: '#FFD700' }]}>
                    ₹{overview.totalTurnover.toLocaleString('en-IN')}
                  </Text>
                  <Text style={styles.metricLabel}>Total Buy-in Turnover</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricVal}>{overview.totalChips.toLocaleString('en-IN')}</Text>
                  <Text style={styles.metricLabel}>Chips Cycled</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricVal}>{overview.totalTransactions}</Text>
                  <Text style={styles.metricLabel}>Transactions</Text>
                </View>
                <View style={styles.metricCard}>
                  <Text style={styles.metricVal}>{overview.totalLoans}</Text>
                  <Text style={styles.metricLabel}>Credit Loans / Shots</Text>
                </View>
              </View>

              {/* Master Danger Zone */}
              <View style={styles.dangerCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <AlertTriangle size={20} color={colors.dangerText} style={{ marginRight: 8 }} />
                  <Text style={styles.dangerTitle}>Master Platform Reset</Text>
                </View>
                <Text style={styles.dangerDesc}>
                  Permanently purge all games, transactions, and settlements ever recorded. All registered player accounts will remain intact, with lifetime career stats cleanly reset to 0.
                </Text>
                <TouchableOpacity
                  style={styles.dangerBtn}
                  onPress={handleResetAllGames}
                  disabled={resettingAll}
                >
                  {resettingAll ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Trash2 size={16} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.dangerBtnText}>Reset All Games Across App</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* PLAYERS TAB */}
          {activeTab === 'PLAYERS' && (
            <View>
              <View style={styles.searchBar}>
                <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by name, phone, or friend code..."
                  placeholderTextColor={colors.textMuted}
                  value={playerSearch}
                  onChangeText={setPlayerSearch}
                />
                {playerSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setPlayerSearch('')}>
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {filteredPlayers.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No players match your search</Text>
                </View>
              ) : (
                filteredPlayers.map(p => {
                  const isNetPositive = p.net_winnings >= 0;
                  const isMasterUser = p.phone_number === '7319123393';
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.playerCard, isMasterUser && styles.masterPlayerCard]}
                      onPress={() => handleOpenPlayerDossier(p.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.playerCardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.playerName}>{p.display_name}</Text>
                            {isMasterUser && (
                              <View style={styles.masterTag}>
                                <Text style={styles.masterTagText}>👑 ROOT</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.playerSub}>
                            📱 {p.phone_number || 'No Phone'} • 🔑 {p.friend_code}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={[
                              styles.playerNet,
                              { color: isNetPositive ? colors.successText : colors.dangerText },
                            ]}
                          >
                            {isNetPositive ? `+₹${p.net_winnings}` : `-₹${Math.abs(p.net_winnings)}`}
                          </Text>
                          <Text style={styles.playerWinRate}>
                            {p.win_rate}% Win ({p.games_won}W - {p.games_lost}L)
                          </Text>
                        </View>
                      </View>

                      <View style={styles.playerFooter}>
                        <Text style={styles.playerFooterText}>
                          Played: {p.games_played} • Buy-ins: ₹{p.total_buyins} • Friends: {p.friends_count}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={styles.viewDossierText}>Inspect</Text>
                          <ChevronRight size={14} color="#FFD700" />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}

          {/* GAMES TAB */}
          {activeTab === 'GAMES' && (
            <View>
              <View style={styles.searchBar}>
                <Search size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search games by title, code, or host..."
                  placeholderTextColor={colors.textMuted}
                  value={gameSearch}
                  onChangeText={setGameSearch}
                />
                {gameSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setGameSearch('')}>
                    <X size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {filteredGames.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No games found</Text>
                </View>
              ) : (
                filteredGames.map(g => {
                  const isDeleting = deletingGameId === g.id;
                  const isFinalized = g.status === 'FINALIZED';
                  return (
                    <View key={g.id} style={styles.gameCard}>
                      <View style={styles.gameCardTop}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                            <Text style={styles.gameTitle}>{g.title}</Text>
                            <View style={styles.codeTag}>
                              <Text style={styles.codeTagText}>{g.code}</Text>
                            </View>
                            <View
                              style={[
                                styles.statusTag,
                                {
                                  backgroundColor: isFinalized
                                    ? '#2E7D3222'
                                    : g.status === 'WAITING'
                                    ? '#FFA00022'
                                    : '#1976D222',
                                },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.statusTagText,
                                  {
                                    color: isFinalized
                                      ? colors.successText
                                      : g.status === 'WAITING'
                                      ? '#FFA000'
                                      : '#64B5F6',
                                  },
                                ]}
                              >
                                {g.status}
                              </Text>
                            </View>
                          </View>

                          <Text style={styles.gameMeta}>
                            Host: {g.host_name} (📱 {g.host_phone || 'N/A'})
                          </Text>
                          <Text style={styles.gameMetaSub}>
                            {g.game_type === 'TEEN_PATTI' ? 'Teen Patti' : 'Poker'} • ₹{g.chip_value}/chip •{' '}
                            {g.player_count} Players • Total Pot: ₹{g.total_pot_amount}
                          </Text>
                          <Text style={styles.gameDate}>
                            Created: {new Date(g.created_at).toLocaleString()}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.deleteGameBtn}
                          onPress={() => handleDeleteGame(g)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color={colors.dangerText} />
                          ) : (
                            <>
                              <Trash2 size={16} color={colors.dangerText} />
                              <Text style={styles.deleteGameText}>Delete</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* PLAYER DOSSIER MODAL */}
      <Modal visible={!!selectedPlayerId} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Player Dossier</Text>
                <Text style={styles.modalSubtitle}>{playerDetails?.user?.display_name || 'Loading...'}</Text>
              </View>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedPlayerId(null)}>
                <X size={20} color="#FFF" />
              </TouchableOpacity>
            </View>

            {loadingDetails || !playerDetails ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="large" color="#FFD700" />
                <Text style={styles.loadingText}>Fetching complete career ledger...</Text>
              </View>
            ) : (
              <ScrollView style={styles.modalScroll}>
                {/* Profile Card */}
                <View style={styles.dossierProfileCard}>
                  <Text style={styles.dossierField}>
                    <Text style={styles.dossierLabel}>Mobile: </Text>
                    {playerDetails.user.phone_number || 'N/A'}
                  </Text>
                  <Text style={styles.dossierField}>
                    <Text style={styles.dossierLabel}>Friend Code: </Text>
                    {playerDetails.user.friend_code}
                  </Text>
                  <Text style={styles.dossierField}>
                    <Text style={styles.dossierLabel}>Email: </Text>
                    {playerDetails.user.email}
                  </Text>
                  <Text style={styles.dossierField}>
                    <Text style={styles.dossierLabel}>Joined: </Text>
                    {new Date(playerDetails.user.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {/* Career Ledger Stats */}
                <View style={styles.dossierSection}>
                  <Text style={styles.dossierSectionTitle}>CAREER LEDGER</Text>
                  <View style={styles.grid2}>
                    <View style={styles.dossierStatItem}>
                      <Text style={styles.dossierStatLabel}>Net Career P&L</Text>
                      <Text
                        style={[
                          styles.dossierStatVal,
                          {
                            color:
                              (playerDetails.stats?.net_winnings || 0) >= 0
                                ? colors.successText
                                : colors.dangerText,
                          },
                        ]}
                      >
                        {(playerDetails.stats?.net_winnings || 0) >= 0 ? '+' : ''}₹
                        {playerDetails.stats?.net_winnings || 0}
                      </Text>
                    </View>
                    <View style={styles.dossierStatItem}>
                      <Text style={styles.dossierStatLabel}>Total Buy-ins</Text>
                      <Text style={styles.dossierStatVal}>₹{playerDetails.stats?.total_buyins || 0}</Text>
                    </View>
                    <View style={styles.dossierStatItem}>
                      <Text style={styles.dossierStatLabel}>Win Rate</Text>
                      <Text style={styles.dossierStatVal}>{playerDetails.stats?.win_rate || 0}%</Text>
                    </View>
                    <View style={styles.dossierStatItem}>
                      <Text style={styles.dossierStatLabel}>Record</Text>
                      <Text style={styles.dossierStatVal}>
                        {playerDetails.stats?.games_won || 0}W - {playerDetails.stats?.games_lost || 0}L
                      </Text>
                    </View>
                    <View style={styles.dossierStatItem}>
                      <Text style={styles.dossierStatLabel}>Best Win Streak</Text>
                      <Text style={[styles.dossierStatVal, { color: '#FFD700' }]}>
                        {playerDetails.stats?.best_winning_streak || 0} 🔥
                      </Text>
                    </View>
                    <View style={styles.dossierStatItem}>
                      <Text style={styles.dossierStatLabel}>Current Streak</Text>
                      <Text style={styles.dossierStatVal}>{playerDetails.stats?.current_streak || 0}</Text>
                    </View>
                    <View style={styles.dossierStatItem}>
                      <Text style={styles.dossierStatLabel}>Biggest Win</Text>
                      <Text style={[styles.dossierStatVal, { color: colors.successText }]}>
                        +₹{playerDetails.stats?.biggest_win || 0}
                      </Text>
                    </View>
                    <View style={styles.dossierStatItem}>
                      <Text style={styles.dossierStatLabel}>Worst Loss</Text>
                      <Text style={[styles.dossierStatVal, { color: colors.dangerText }]}>
                        -₹{Math.abs(playerDetails.stats?.biggest_loss || 0)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Games Participated */}
                <View style={styles.dossierSection}>
                  <Text style={styles.dossierSectionTitle}>
                    ALL GAMES JOINED ({playerDetails.games?.length || 0})
                  </Text>
                  {(!playerDetails.games || playerDetails.games.length === 0) ? (
                    <Text style={styles.emptyText}>No games participated yet</Text>
                  ) : (
                    playerDetails.games.map((g: any) => (
                      <View key={g.player_id} style={styles.dossierGameRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.dossierGameTitle}>{g.game_title}</Text>
                          <Text style={styles.dossierGameMeta}>
                            Code: {g.game_code} • {g.game_type} • Host: {g.host_name}
                          </Text>
                          <Text style={styles.dossierGameMeta}>
                            Buy-in: ₹{g.total_buyin_amount} ({g.total_buyin_chips} chips) • Final: {g.final_chips} chips
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text
                            style={[
                              styles.dossierGameNet,
                              {
                                color:
                                  (g.net_profit_loss || 0) >= 0
                                    ? colors.successText
                                    : colors.dangerText,
                              },
                            ]}
                          >
                            {(g.net_profit_loss || 0) >= 0 ? '+' : ''}₹{g.net_profit_loss || 0}
                          </Text>
                          <Text style={styles.dossierGameStatus}>{g.game_status}</Text>
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Friends List */}
                <View style={[styles.dossierSection, { marginBottom: 30 }]}>
                  <Text style={styles.dossierSectionTitle}>
                    CHIPMATE FRIENDS ({playerDetails.friends?.length || 0})
                  </Text>
                  {(!playerDetails.friends || playerDetails.friends.length === 0) ? (
                    <Text style={styles.emptyText}>No friends added</Text>
                  ) : (
                    playerDetails.friends.map((f: any) => (
                      <View key={f.friendship_id} style={styles.dossierFriendRow}>
                        <Text style={styles.dossierFriendName}>{f.display_name}</Text>
                        <Text style={styles.dossierFriendPhone}>📱 {f.phone_number || f.friend_code}</Text>
                      </View>
                    ))
                  )}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1218',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 16 : 48,
    paddingBottom: 14,
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: '#2D333B',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#21262D',
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  refreshBtn: {
    padding: 8,
    backgroundColor: '#21262D',
    borderRadius: 8,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#161B22',
    borderBottomWidth: 1,
    borderBottomColor: '#2D333B',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#FFD700',
    backgroundColor: '#21262D44',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 6,
  },
  tabTextActive: {
    color: '#FFD700',
    fontWeight: '700',
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 12,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
    marginBottom: 12,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  metricCard: {
    width: '50%',
    padding: 4,
    boxSizing: 'border-box',
  },
  metricVal: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  dangerCard: {
    marginTop: 20,
    backgroundColor: '#2D1214',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F8514944',
  },
  dangerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.dangerText,
  },
  dangerDesc: {
    fontSize: 12,
    color: '#E6EDF3',
    lineHeight: 18,
    marginBottom: 14,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DA3633',
    paddingVertical: 12,
    borderRadius: 8,
  },
  dangerBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161B22',
    borderWidth: 1,
    borderColor: '#30363D',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    padding: 0,
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#161B22',
    borderRadius: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  playerCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  masterPlayerCard: {
    borderColor: '#FFD700',
    backgroundColor: '#1C1A14',
  },
  playerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  masterTag: {
    backgroundColor: '#FFD70022',
    borderColor: '#FFD700',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 6,
  },
  masterTagText: {
    color: '#FFD700',
    fontSize: 9,
    fontWeight: '800',
  },
  playerSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 3,
  },
  playerNet: {
    fontSize: 16,
    fontWeight: '800',
  },
  playerWinRate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  playerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#21262D',
  },
  playerFooterText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  viewDossierText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
    marginRight: 2,
  },
  gameCard: {
    backgroundColor: '#161B22',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#30363D',
  },
  gameCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginRight: 6,
  },
  codeTag: {
    backgroundColor: '#21262D',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 6,
  },
  codeTagText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
  },
  statusTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  gameMeta: {
    fontSize: 12,
    color: '#C9D1D9',
    marginTop: 4,
  },
  gameMetaSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  gameDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 4,
  },
  deleteGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2D1214',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F8514966',
  },
  deleteGameText: {
    color: colors.dangerText,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161B22',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#30363D',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#C9D1D9',
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 6,
    backgroundColor: '#21262D',
    borderRadius: 20,
  },
  modalLoading: {
    padding: 40,
    alignItems: 'center',
  },
  modalScroll: {
    padding: 16,
  },
  dossierProfileCard: {
    backgroundColor: '#21262D',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  dossierField: {
    fontSize: 13,
    color: '#FFF',
    marginBottom: 4,
  },
  dossierLabel: {
    color: colors.textMuted,
    fontWeight: '600',
  },
  dossierSection: {
    marginBottom: 16,
  },
  dossierSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFD700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  dossierStatItem: {
    width: '50%',
    backgroundColor: '#21262D',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    boxSizing: 'border-box',
  },
  dossierStatLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },
  dossierStatVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFF',
  },
  dossierGameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#21262D',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  dossierGameTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  dossierGameMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  dossierGameNet: {
    fontSize: 14,
    fontWeight: '800',
  },
  dossierGameStatus: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  dossierFriendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#21262D',
    borderRadius: 8,
    marginBottom: 4,
  },
  dossierFriendName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  dossierFriendPhone: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
