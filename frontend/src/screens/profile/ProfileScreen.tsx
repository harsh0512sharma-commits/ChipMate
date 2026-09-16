import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  Image
} from 'react-native';
import {
  User,
  Copy,
  Check,
  Trophy,
  Flame,
  TrendingUp,
  LogOut,
  Sparkles,
  Edit2,
  History,
  ArrowRight,
  Camera,
  Trash2,
  RefreshCw,
  Shield,
  ChevronLeft,
  ChevronRight
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useUpdate } from '../../context/UpdateContext';
import { Header } from '../../components/Header';
import { apiRequest } from '../../api/client';
import { APP_BUILD_VERSION } from '../../version';

interface ProfileScreenProps {
  onOpenSummary?: (gameId: string) => void;
  onOpenMasterAdmin?: () => void;
  initialSubView?: 'MAIN' | 'GAME_HISTORY' | 'APP_UPDATES';
}

function formatGameDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const datePart = d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timePart = d.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
  return `${datePart} • ${timePart}`;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onOpenSummary,
  onOpenMasterAdmin,
  initialSubView = 'MAIN'
}) => {
  const [subView, setSubView] = useState<'MAIN' | 'GAME_HISTORY' | 'APP_UPDATES'>(initialSubView);

  useEffect(() => {
    if (initialSubView) setSubView(initialSubView);
  }, [initialSubView]);
  const { user, logout, refreshUser, updateUser } = useAuth();
  const isMasterAdmin = Boolean(user?.isMasterAdmin || user?.phone_number === '7319123393');
  const [copied, setCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.display_name || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [gameHistory, setGameHistory] = useState<any[]>([]);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<any>(null);
  const {
    updateAvailable,
    currentVersion,
    latestVersion,
    isChecking: isCheckingUpdates,
    isUpdating: isApplyingUpdate,
    checkForUpdates,
    applyUpdate,
    forceCleanCache
  } = useUpdate();
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  const handleManualCheckUpdates = async () => {
    setUpdateMsg('Checking cloud servers for latest build...');
    try {
      const res = await checkForUpdates(true);
      if (res.updateAvailable) {
        setUpdateMsg(`Update available: v${res.latestVersion}!`);
        Alert.alert('Update Available', `ChipMate v${res.latestVersion} is ready to install. Tap "Update to v${res.latestVersion} Now" to apply.`);
      } else {
        setUpdateMsg(`App is running the latest build (v${currentVersion}).`);
        Alert.alert('Up to Date', `ChipMate is running the latest build (v${currentVersion}).`);
      }
    } catch (_) {
      setUpdateMsg('Check completed.');
    }
  };

  const handleForceClearCache = () => {
    Alert.alert(
      'Force Clear Cache',
      'This will clear offline cache storage, unregister service workers, and hard reload the application from the server. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear & Refresh', style: 'destructive', onPress: () => forceCleanCache() }
      ]
    );
  };

  const handlePickImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      Alert.alert('File too large', 'Please choose an image under 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const targetSize = 256;
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
          saveAvatar(compressedDataUrl);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const saveAvatar = async (dataUrl: string) => {
    setUploadingAvatar(true);
    try {
      const res = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: { avatarUrl: dataUrl }
      });
      if (res.success && res.user) {
        updateUser(res.user);
        Alert.alert('Success', 'Profile picture updated successfully!');
      } else {
        Alert.alert('Upload Failed', res.error || 'Could not update profile picture');
      }
    } catch (err: any) {
      Alert.alert('Upload Error', err.message || 'Failed to update profile picture');
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    refreshUser();
    apiRequest('/tables/history')
      .then(res => {
        if (res.success && res.history) setGameHistory(res.history);
      })
      .catch(err => console.warn('Failed to fetch profile game history:', err));
  }, []);

  const stats = user?.stats || {};
  const netWinnings = stats.net_winnings || 0;

  const handleCopyCode = () => {
    const codeToCopy = user?.phone_number || user?.friend_code || '';
    if (codeToCopy && Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(codeToCopy);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    setNameError(null);
    setSavingName(true);
    try {
      const res = await apiRequest('/auth/profile', {
        method: 'PUT',
        body: { displayName: trimmed }
      });
      if (res.success && res.user) {
        updateUser(res.user);
        setIsEditingName(false);
        Alert.alert('Success', 'Profile name updated successfully!');
      } else {
        setNameError(res.error || 'Failed to update name');
      }
    } catch (err: any) {
      setNameError(err.message || 'Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleDeleteHistoryGame = (game: any) => {
    const message = `Are you sure you want to permanently delete "${game.name}"? Player statistics and standings will be recalculated.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(message)) {
        performDeleteGame(game.id);
      }
    } else {
      Alert.alert(
        'Delete Completed Game',
        message,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performDeleteGame(game.id) }
        ]
      );
    }
  };

  const performDeleteGame = async (gameId: string) => {
    setDeletingGameId(gameId);
    try {
      const res = await apiRequest(`/tables/${gameId}`, { method: 'DELETE' });
      if (res.success) {
        setGameHistory(prev => prev.filter(g => g.id !== gameId));
        refreshUser();
        Alert.alert('Deleted', 'Game record deleted and player stats updated successfully.');
      } else {
        Alert.alert('Delete Failed', res.error || 'Could not delete game');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to delete game');
    } finally {
      setDeletingGameId(null);
    }
  };

  if (subView === 'GAME_HISTORY') {
    return (
      <View style={styles.container}>
        <View style={styles.subViewHeader}>
          <TouchableOpacity
            style={styles.subViewBackBtn}
            onPress={() => setSubView('MAIN')}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={colors.text} />
            <Text style={styles.subViewBackText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subViewTitle}>Game History</Text>
          <View style={styles.subViewCountPill}>
            <Text style={styles.subViewCountText}>{gameHistory.length}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {gameHistory.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <History size={40} color={colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No Completed Games</Text>
              <Text style={styles.emptyStateSubtitle}>
                Completed and settled games will appear here with full ledger breakdowns and winner summaries.
              </Text>
            </View>
          ) : (
            gameHistory.map(game => {
              const isHostOrAdmin = game.host_user_id === user?.id || game.player_role === 'HOST' || isMasterAdmin;
              const isDeleting = deletingGameId === game.id;
              return (
                <View key={game.id} style={styles.historyGameRow}>
                  <TouchableOpacity
                    style={styles.historyGameItem}
                    onPress={() => onOpenSummary && onOpenSummary(game.id)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.historyGameName}>{game.name}</Text>
                      <Text style={styles.historyGameMeta}>
                        {game.game_type === 'TEEN_PATTI' ? 'Teen Patti' : 'Poker'} • Host: {game.host_name}
                      </Text>
                      <Text style={styles.historyGameDate}>
                        📅 {formatGameDateTime(game.finalized_at || game.created_at)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={[
                          styles.historyGameNet,
                          { color: (game.net_winnings_money || 0) >= 0 ? colors.successText : colors.dangerText }
                        ]}
                      >
                        {(game.net_winnings_money || 0) >= 0 ? `+₹${game.net_winnings_money || 0}` : `-₹${Math.abs(game.net_winnings_money || 0)}`}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={styles.finalizedBadge}>View Summary</Text>
                        <ArrowRight size={12} color={colors.primary} style={{ marginLeft: 4 }} />
                      </View>
                    </View>
                  </TouchableOpacity>

                  {isHostOrAdmin && (
                    <TouchableOpacity
                      style={styles.deleteHistoryGameBtn}
                      onPress={() => handleDeleteHistoryGame(game)}
                      disabled={isDeleting}
                      activeOpacity={0.7}
                    >
                      {isDeleting ? (
                        <ActivityIndicator size={14} color={colors.dangerText} />
                      ) : (
                        <Trash2 size={16} color={colors.dangerText} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
    );
  }

  if (subView === 'APP_UPDATES') {
    return (
      <View style={styles.container}>
        <View style={styles.subViewHeader}>
          <TouchableOpacity
            style={styles.subViewBackBtn}
            onPress={() => setSubView('MAIN')}
            activeOpacity={0.7}
          >
            <ChevronLeft size={20} color={colors.text} />
            <Text style={styles.subViewBackText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.subViewTitle}>App Version & Updates</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.updateCardHeader}>
              <Sparkles size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>SYSTEM & BUILD STATUS</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Live build tracking, instant cloud releases, and cache-busting tools
            </Text>

            <View style={styles.versionDetailsBox}>
              <View style={styles.versionDetailRow}>
                <Text style={styles.versionDetailLabel}>Current Installed Build</Text>
                <Text style={styles.versionDetailValue}>v{currentVersion}</Text>
              </View>
              <View style={styles.versionDetailRow}>
                <Text style={styles.versionDetailLabel}>Latest Cloud Release</Text>
                <Text style={[styles.versionDetailValue, { color: updateAvailable ? colors.primary : colors.successText }]}>
                  v{latestVersion}
                </Text>
              </View>
              <View style={styles.versionStatusRow}>
                <View style={[styles.statusDot, { backgroundColor: updateAvailable ? colors.primary : colors.successText }]} />
                <Text style={[styles.statusText, { color: updateAvailable ? colors.primary : colors.successText }]}>
                  {updateAvailable
                    ? `Update Available! (v${latestVersion} ready to apply)`
                    : 'You are running the latest version'}
                </Text>
              </View>
            </View>

            {updateMsg ? (
              <Text style={styles.updateMsgText}>{updateMsg}</Text>
            ) : null}

            {updateAvailable && (
              <TouchableOpacity
                style={styles.profileUpdateNowBtn}
                onPress={applyUpdate}
                disabled={isApplyingUpdate}
                activeOpacity={0.8}
              >
                {isApplyingUpdate ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Sparkles size={16} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.profileUpdateNowText}>🚀 Update to v{latestVersion} Now</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <View style={styles.updateActionsRow}>
              <TouchableOpacity
                style={styles.checkUpdateBtn}
                onPress={handleManualCheckUpdates}
                disabled={isCheckingUpdates}
                activeOpacity={0.7}
              >
                {isCheckingUpdates ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <RefreshCw size={14} color={colors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.checkUpdateBtnText}>Check for Updates</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.clearCacheBtn}
                onPress={handleForceClearCache}
                activeOpacity={0.7}
              >
                <Text style={styles.clearCacheBtnText}>🧹 Clear Cache</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Profile & Stats" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.userCard}>
          {Platform.OS === 'web' && (
            // @ts-ignore
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          )}

          <View style={styles.avatarWrapper}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickImage}
              disabled={uploadingAvatar}
              style={styles.avatarTouchable}
              accessibilityLabel="Change profile avatar"
            >
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {user?.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                {uploadingAvatar ? (
                  <ActivityIndicator size={12} color="#FFF" />
                ) : (
                  <Camera size={13} color="#FFF" />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Name Display & Editing */}
          {isEditingName ? (
            <View style={styles.editNameBox}>
              <Text style={styles.editNameLabel}>FULL / DISPLAY NAME</Text>
              <TextInput
                style={styles.nameInput}
                value={newName}
                onChangeText={(text) => {
                  setNewName(text);
                  setNameError(null);
                }}
                placeholder="Enter your name"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
              {nameError && <Text style={styles.nameErrorText}>{nameError}</Text>}
              <View style={styles.editNameBtnRow}>
                <TouchableOpacity
                  style={[styles.saveNameBtn, savingName && { opacity: 0.6 }]}
                  onPress={handleSaveName}
                  disabled={savingName}
                >
                  {savingName ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.saveNameBtnText}>Save Name</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelNameBtn}
                  onPress={() => {
                    setIsEditingName(false);
                    setNewName(user?.display_name || '');
                    setNameError(null);
                  }}
                  disabled={savingName}
                >
                  <Text style={styles.cancelNameBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={styles.displayName}>{user?.display_name || 'Player'}</Text>
              <TouchableOpacity
                style={styles.editPencilBtn}
                onPress={() => {
                  setNewName(user?.display_name || '');
                  setNameError(null);
                  setIsEditingName(true);
                }}
                activeOpacity={0.7}
                accessibilityLabel="Edit display name"
              >
                <Edit2 size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {isMasterAdmin && (
            <View style={styles.masterBadge}>
              <Text style={styles.masterBadgeText}>👑 MASTER ADMIN</Text>
            </View>
          )}

          <Text style={styles.emailText}>{user?.email}</Text>

          {/* Unique Friend Code Box (Mobile Number) */}
          <TouchableOpacity style={styles.friendCodeBox} onPress={handleCopyCode} activeOpacity={0.8}>
            <Text style={styles.codeLabel}>YOUR UNIQUE FRIEND CODE (MOBILE NO.)</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{user?.phone_number || user?.friend_code || 'N/A'}</Text>
              {copied ? (
                <Check size={18} color={colors.successText} style={{ marginLeft: 8 }} />
              ) : (
                <Copy size={18} color={colors.primary} style={{ marginLeft: 8 }} />
              )}
            </View>
            <Text style={styles.copyHint}>
              {copied ? 'Copied to clipboard!' : 'Friends can add you using this 10-digit number'}
            </Text>
          </TouchableOpacity>

          {/* Master Admin Portal Access (Strictly for 7319123393) */}
          {isMasterAdmin && onOpenMasterAdmin && (
            <TouchableOpacity
              style={styles.masterAdminButton}
              onPress={onOpenMasterAdmin}
              activeOpacity={0.7}
            >
              <View style={styles.masterAdminIconWrap}>
                <Shield size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.masterAdminTitle}>Master Admin Controls</Text>
              </View>
              <ArrowRight size={15} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* LIFETIME FINANCIAL CAREER STATS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>LIFETIME FINANCIAL CAREER</Text>
          <Text style={styles.sectionSubtitle}>Generated strictly from finalized games</Text>

          <View style={styles.heroNetBox}>
            <Text style={styles.heroNetLabel}>NET PROFIT / LOSS</Text>
            <Text
              style={[
                styles.heroNetValue,
                { color: netWinnings >= 0 ? colors.successText : colors.dangerText }
              ]}
            >
              {netWinnings >= 0 ? `+₹${netWinnings.toLocaleString('en-IN')}` : `-₹${Math.abs(netWinnings).toLocaleString('en-IN')}`}
            </Text>
            <Text style={styles.heroAvgLabel}>
              Avg per game: {stats.avg_profit_per_game >= 0 ? '+' : ''}₹{stats.avg_profit_per_game || 0}
            </Text>
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Games Played</Text>
              <Text style={styles.gridVal}>{stats.games_played || 0}</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Win Rate</Text>
              <Text style={styles.gridVal}>{stats.win_rate || 0}%</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={styles.gridLabel}>Wins / Losses</Text>
              <Text style={styles.gridVal}>
                {stats.games_won || 0}W - {stats.games_lost || 0}L
              </Text>
            </View>
          </View>
        </View>

        {/* RECORDS & STREAKS */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>RECORDS & STREAKS</Text>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Biggest Win</Text>
            <Text style={[styles.statValue, { color: colors.successText }]}>
              +₹{(stats.biggest_win || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Biggest Loss</Text>
            <Text style={[styles.statValue, { color: colors.dangerText }]}>
              -₹{(stats.biggest_loss || 0).toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Best Winning Streak</Text>
            <Text style={styles.statValue}>{stats.best_winning_streak || 0} games</Text>
          </View>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Current Streak</Text>
            <Text style={styles.statValue}>
              {stats.current_streak > 0
                ? `🔥 ${stats.current_streak} Win Streak`
                : stats.current_streak < 0
                ? `❄️ ${Math.abs(stats.current_streak)} Loss Streak`
                : 'Even'}
            </Text>
          </View>
        </View>

        {/* GAME TYPE BREAKDOWN */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>GAME TYPE PERFORMANCE</Text>

          <View style={styles.gameTypeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gtTitle}>Teen Patti</Text>
              <Text style={styles.gtMeta}>
                {stats.teen_patti_games || 0} games • {stats.teen_patti_wins || 0} wins
              </Text>
            </View>
            <Text
              style={[
                styles.gtNet,
                { color: (stats.teen_patti_net || 0) >= 0 ? colors.successText : colors.dangerText }
              ]}
            >
              {(stats.teen_patti_net || 0) >= 0 ? `+₹${stats.teen_patti_net || 0}` : `-₹${Math.abs(stats.teen_patti_net || 0)}`}
            </Text>
          </View>

          <View style={[styles.gameTypeRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.gtTitle}>Poker</Text>
              <Text style={styles.gtMeta}>
                {stats.poker_games || 0} games • {stats.poker_wins || 0} wins
              </Text>
            </View>
            <Text
              style={[
                styles.gtNet,
                { color: (stats.poker_net || 0) >= 0 ? colors.successText : colors.dangerText }
              ]}
            >
              {(stats.poker_net || 0) >= 0 ? `+₹${stats.poker_net || 0}` : `-₹${Math.abs(stats.poker_net || 0)}`}
            </Text>
          </View>
        </View>

        {/* QUICK NAVIGATION: GAME HISTORY & SYSTEM UPDATES */}
        <View style={styles.navRowsCard}>
          {/* Game History Row */}
          <TouchableOpacity
            style={styles.navRowItem}
            onPress={() => setSubView('GAME_HISTORY')}
            activeOpacity={0.7}
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navRowIconWrap, { backgroundColor: 'rgba(234, 88, 12, 0.12)' }]}>
                <History size={19} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.navRowTitle}>Game History</Text>
                <Text style={styles.navRowSubtitle}>
                  {gameHistory.length} completed {gameHistory.length === 1 ? 'game' : 'games'} • View ledgers & summaries
                </Text>
              </View>
            </View>
            <View style={styles.navRowRight}>
              <View style={styles.navRowBadge}>
                <Text style={styles.navRowBadgeText}>{gameHistory.length}</Text>
              </View>
              <ChevronRight size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
            </View>
          </TouchableOpacity>

          <View style={styles.navRowDivider} />

          {/* App Version & Updates Row */}
          <TouchableOpacity
            style={styles.navRowItem}
            onPress={() => setSubView('APP_UPDATES')}
            activeOpacity={0.7}
          >
            <View style={styles.navRowLeft}>
              <View style={[styles.navRowIconWrap, { backgroundColor: updateAvailable ? 'rgba(234, 88, 12, 0.12)' : 'rgba(16, 185, 129, 0.12)' }]}>
                <Sparkles size={19} color={updateAvailable ? colors.primary : colors.successText} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.navRowTitle}>App Version & Updates</Text>
                <Text style={styles.navRowSubtitle}>
                  Build v{currentVersion} • {updateAvailable ? 'Update available!' : 'Up to date'}
                </Text>
              </View>
            </View>
            <View style={styles.navRowRight}>
              {updateAvailable ? (
                <View style={styles.updatePillBadge}>
                  <Text style={styles.updatePillBadgeText}>UPDATE</Text>
                </View>
              ) : null}
              <ChevronRight size={18} color={colors.textSecondary} style={{ marginLeft: 6 }} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <LogOut size={16} color={colors.dangerText} style={{ marginRight: 8 }} />
          <Text style={styles.logoutBtnText}>Sign Out of ChipMate</Text>
        </TouchableOpacity>

        {/* App Version Footer */}
        <View style={styles.versionFooter}>
          <Text style={styles.versionFooterText}>ChipMate v{APP_BUILD_VERSION}</Text>
          <Text style={styles.versionSubText}>Zero-Sum Card Ledger</Text>
          <Text style={styles.madeWithLoveText}>Made with ❤️ by HRVS Solutions</Text>
        </View>
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
    padding: 16,
    paddingBottom: 40
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4
  },
  editPencilBtn: {
    backgroundColor: colors.primaryLight,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '44',
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  editNameBox: {
    width: '100%',
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  editNameLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 6
  },
  nameInput: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text
  },
  nameErrorText: {
    fontSize: 11,
    color: colors.dangerText,
    marginTop: 4
  },
  editNameBtnRow: {
    flexDirection: 'row',
    marginTop: 10
  },
  saveNameBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center'
  },
  saveNameBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700'
  },
  cancelNameBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10
  },
  cancelNameBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  userCard: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.borderDark
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 14
  },
  avatarTouchable: {
    position: 'relative'
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.cardRaised,
    borderWidth: 2,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden'
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    borderColor: colors.primaryBorder
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.card,
    elevation: 3
  },
  changePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 6,
    letterSpacing: 0.2
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.primary
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  emailText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 16
  },
  friendCodeBox: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1.5,
    borderColor: colors.borderDark,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    alignItems: 'center',
    width: '100%'
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3
  },
  codeText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 3
  },
  copyHint: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: colors.borderDark
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: 12
  },
  heroNetBox: {
    backgroundColor: colors.cardInset,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  heroNetLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 1
  },
  heroNetValue: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: -0.5
  },
  heroAvgLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  gridItem: {
    flex: 1,
    alignItems: 'center'
  },
  gridLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500'
  },
  gridVal: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 3
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  gameTypeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  gtTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  gtMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  gtNet: {
    fontSize: 16,
    fontWeight: '800'
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  emptyHistoryText: {
    fontSize: 13,
    color: colors.textMuted,
    marginVertical: 12,
    textAlign: 'center'
  },
  historyGameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  historyGameItem: {
    flex: 1,
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderDark,
    flexDirection: 'row',
    alignItems: 'center'
  },
  deleteHistoryGameBtn: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    alignItems: 'center',
    justifyContent: 'center'
  },
  historyGameName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  historyGameMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  historyGameDate: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 3
  },
  historyGameNet: {
    fontSize: 14,
    fontWeight: '800'
  },
  finalizedBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary,
    marginRight: 2
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.dangerText
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 8
  },
  versionFooterText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.5
  },
  versionSubText: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 3
  },
  madeWithLoveText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 0.3
  },
  masterBadge: {
    alignSelf: 'center',
    backgroundColor: '#FFD70022',
    borderWidth: 1,
    borderColor: '#FFD700',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  masterBadgeText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  masterAdminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 12,
    width: '100%'
  },
  masterAdminIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterAdminTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  updateCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4
  },
  versionDetailsBox: {
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  versionDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4
  },
  versionDetailLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  versionDetailValue: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text
  },
  versionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700'
  },
  updateMsgText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500'
  },
  profileUpdateNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FFD700',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4
  },
  profileUpdateNowText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.3
  },
  updateActionsRow: {
    flexDirection: 'row',
    gap: 10
  },
  checkUpdateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  checkUpdateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  },
  clearCacheBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  clearCacheBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  subViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    backgroundColor: colors.card
  },
  subViewBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  subViewBackText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 4
  },
  subViewTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  subViewCountPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  subViewCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary
  },
  navRowsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden'
  },
  navRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12
  },
  navRowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navRowTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2
  },
  navRowSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  navRowRight: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  navRowBadge: {
    backgroundColor: colors.cardInset,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  navRowBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary
  },
  navRowDivider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginLeft: 64
  },
  updatePillBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  updatePillBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5
  },
  emptyStateBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: 20
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    marginTop: 12,
    letterSpacing: -0.3
  },
  emptyStateSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280
  }
});
