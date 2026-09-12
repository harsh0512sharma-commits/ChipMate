import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert
} from 'react-native';
import {
  UserPlus,
  Users,
  Check,
  X,
  Swords,
  Copy,
  Search,
  CheckCircle2,
  Clock
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Header } from '../../components/Header';

interface FriendsScreenProps {
  onOpenHeadToHead: (friendUserId: string) => void;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({ onOpenHeadToHead }) => {
  const { user } = useAuth();
  const [tab, setTab] = useState<'FRIENDS' | 'REQUESTS'>('FRIENDS');
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<{ received: any[]; sent: any[] }>({ received: [], sent: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add friend modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const loadData = async () => {
    try {
      const [fRes, rRes] = await Promise.all([
        apiRequest('/friends'),
        apiRequest('/friends/requests')
      ]);

      if (fRes.success) setFriends(fRes.friends || []);
      if (rRes.success) setRequests({ received: rRes.received || [], sent: rRes.sent || [] });
    } catch (err) {
      console.warn('Failed to load friends:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleLookup = async () => {
    const trimmed = friendCodeInput.trim();
    if (!trimmed) return;
    if (trimmed.length < 5) {
      setSearchError('Please enter a valid mobile number');
      return;
    }
    setSearchError(null);
    setFoundUser(null);
    setSearchLoading(true);

    try {
      const res = await apiRequest(`/users/lookup?code=${encodeURIComponent(trimmed)}`);
      if (res.success && res.user) {
        setFoundUser(res.user);
      } else {
        setSearchError('No user found with that mobile number');
      }
    } catch (err: any) {
      setSearchError(err.message || 'No user found with that mobile number');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!foundUser) return;
    try {
      const res = await apiRequest('/friends/request', {
        method: 'POST',
        body: { friendCode: foundUser.friendCode }
      });
      if (res.success) {
        setRequestSent(true);
        setTimeout(() => {
          setShowAddModal(false);
          setRequestSent(false);
          setFoundUser(null);
          setFriendCodeInput('');
          loadData();
        }, 1200);
      }
    } catch (err: any) {
      setSearchError(err.message || 'Failed to send request');
    }
  };

  const handleRespond = async (friendshipId: string, action: 'ACCEPT' | 'DECLINE') => {
    try {
      const res = await apiRequest('/friends/respond', {
        method: 'POST',
        body: { friendshipId, action }
      });
      if (res.success) {
        loadData();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Action failed');
    }
  };

  const handleRemoveFriend = async (targetUserId: string, name: string) => {
    Alert.alert('Remove Friend', `Are you sure you want to remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiRequest(`/friends/${targetUserId}`, { method: 'DELETE' });
            loadData();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to remove');
          }
        }
      }
    ]);
  };

  return (
    <View style={styles.container}>
      <Header
        title="Friends"
        subtitle={`My Mobile No: ${user?.phone_number || user?.friend_code || 'N/A'}`}
        rightAction={
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => setShowAddModal(true)}
          >
            <UserPlus size={16} color="#FFF" />
            <Text style={styles.addBtnHeaderText}>Add Friend</Text>
          </TouchableOpacity>
        }
      />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          onPress={() => setTab('FRIENDS')}
          style={[styles.tabBtn, tab === 'FRIENDS' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabBtnText, tab === 'FRIENDS' && styles.tabBtnTextActive]}>
            My Friends ({friends.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setTab('REQUESTS')}
          style={[styles.tabBtn, tab === 'REQUESTS' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabBtnText, tab === 'REQUESTS' && styles.tabBtnTextActive]}>
            Requests ({requests.received.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {tab === 'FRIENDS' ? (
          friends.length === 0 ? (
            <View style={styles.emptyCard}>
              <Users size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No friends added yet</Text>
              <Text style={styles.emptySub}>
                Add your poker and teen patti friends using their 10-digit mobile number!
              </Text>
              <TouchableOpacity
                style={styles.addFriendCenterBtn}
                onPress={() => setShowAddModal(true)}
              >
                <UserPlus size={16} color="#FFF" />
                <Text style={styles.addFriendCenterBtnText}>Add by Mobile Number</Text>
              </TouchableOpacity>
            </View>
          ) : (
            friends.map(friend => (
              <View key={friend.id} style={styles.friendCard}>
                <View style={styles.friendAvatar}>
                  <Text style={styles.avatarLetter}>
                    {friend.displayName ? friend.displayName.charAt(0).toUpperCase() : 'P'}
                  </Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.friendName}>{friend.displayName}</Text>
                  <Text style={styles.friendCode}>📱 {friend.friendCode}</Text>
                  <Text style={styles.friendStats}>
                    Games: {friend.gamesPlayed} (Together: {friend.gamesTogether || 0}) • Win Rate: {friend.winRate}%
                  </Text>
                </View>

                <View style={styles.friendActions}>
                  <TouchableOpacity
                    style={styles.h2hBtn}
                    onPress={() => onOpenHeadToHead(friend.id)}
                  >
                    <Swords size={14} color={colors.primary} />
                    <Text style={styles.h2hBtnText}>H2H</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => handleRemoveFriend(friend.id, friend.displayName)}
                  >
                    <X size={14} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )
        ) : (
          <View>
            {requests.received.length === 0 && requests.sent.length === 0 ? (
              <View style={styles.emptyCard}>
                <Clock size={36} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No pending friend requests</Text>
              </View>
            ) : null}

            {/* Received Requests */}
            {requests.received.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text style={styles.requestSectionTitle}>Received Requests</Text>
                {requests.received.map(req => (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{req.display_name}</Text>
                      <Text style={styles.friendCode}>📱 {req.friend_code}</Text>
                    </View>
                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity
                        style={styles.acceptBtn}
                        onPress={() => handleRespond(req.id, 'ACCEPT')}
                      >
                        <Check size={14} color="#FFF" />
                        <Text style={styles.acceptBtnText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.declineBtn}
                        onPress={() => handleRespond(req.id, 'DECLINE')}
                      >
                        <X size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Sent Requests */}
            {requests.sent.length > 0 && (
              <View>
                <Text style={styles.requestSectionTitle}>Sent Requests</Text>
                {requests.sent.map(req => (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.friendName}>{req.display_name}</Text>
                      <Text style={styles.friendCode}>📱 {req.friend_code}</Text>
                    </View>
                    <View style={styles.pendingBadge}>
                      <Clock size={12} color={colors.warningText} />
                      <Text style={styles.pendingBadgeText}>Pending</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Friend Modal */}
      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Friend</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>Enter their 10-digit mobile number</Text>

            <View style={styles.searchInputRow}>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 9876543210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
                value={friendCodeInput}
                onChangeText={setFriendCodeInput}
              />
              <TouchableOpacity
                style={styles.modalSearchBtn}
                onPress={handleLookup}
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Search size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>

            {searchError && <Text style={styles.modalError}>{searchError}</Text>}

            {foundUser && (
              <View style={styles.foundUserCard}>
                <View style={styles.foundAvatar}>
                  <Text style={styles.avatarLetter}>
                    {foundUser.displayName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foundName}>{foundUser.displayName}</Text>
                  <Text style={styles.foundCode}>📱 {foundUser.friendCode}</Text>
                </View>

                {requestSent ? (
                  <View style={styles.sentPill}>
                    <CheckCircle2 size={14} color={colors.successText} />
                    <Text style={styles.sentPillText}>Sent!</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.sendRequestBtn}
                    onPress={handleSendRequest}
                  >
                    <Text style={styles.sendRequestBtnText}>Send Request</Text>
                  </TouchableOpacity>
                )}
              </View>
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
    backgroundColor: colors.background
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  addBtnHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10
  },
  addBtnHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 4
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700'
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    marginTop: 20
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    letterSpacing: -0.2
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20
  },
  addFriendCenterBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12
  },
  addFriendCenterBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6
  },
  friendCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center'
  },
  friendAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  avatarLetter: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary
  },
  friendName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  friendCode: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1
  },
  friendStats: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  friendActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  h2hBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  h2hBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4
  },
  removeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  requestSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10
  },
  requestCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center'
  },
  acceptBtn: {
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 4
  },
  declineBtn: {
    backgroundColor: colors.cardRaised,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.warningBorder
  },
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warningText,
    marginLeft: 4
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
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 16
  },
  searchInputRow: {
    flexDirection: 'row',
    marginBottom: 12
  },
  modalInput: {
    flex: 1,
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginRight: 8
  },
  modalSearchBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalError: {
    fontSize: 12,
    color: colors.dangerText,
    marginBottom: 12
  },
  foundUserCard: {
    backgroundColor: colors.cardInset,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  foundAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  foundName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  foundCode: {
    fontSize: 11,
    color: colors.textMuted
  },
  sendRequestBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  sendRequestBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF'
  },
  sentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8
  },
  sentPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.successText,
    marginLeft: 4
  }
});
