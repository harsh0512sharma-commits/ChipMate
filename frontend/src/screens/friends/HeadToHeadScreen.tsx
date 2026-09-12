import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Swords, Trophy, History } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { Header } from '../../components/Header';

interface HeadToHeadScreenProps {
  otherUserId: string;
  onBack: () => void;
}

export const HeadToHeadScreen: React.FC<HeadToHeadScreenProps> = ({
  otherUserId,
  onBack
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiRequest(`/stats/head-to-head/${otherUserId}`);
        if (res.success) {
          setData(res);
        }
      } catch (err) {
        console.warn('Failed to load head-to-head:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [otherUserId]);

  if (loading || !data) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { userA, userB, gamesPlayedTogether, winsA, winsB, netA, netB, biggestWinA, biggestWinB, recentGames } = data;

  return (
    <View style={styles.container}>
      <Header
        title="Head-to-Head"
        subtitle={`${userA.displayName} vs ${userB.displayName}`}
        onBack={onBack}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Matchup Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.vsBadge}>
            <Swords size={18} color="#FFF" />
          </View>

          <View style={styles.versusRow}>
            {/* Player A */}
            <View style={styles.playerColumn}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userA.displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName} numberOfLines={1}>{userA.displayName}</Text>
              <Text style={styles.playerCode}>#{userA.friendCode}</Text>
              <Text style={[styles.netAmount, { color: netA >= 0 ? colors.successText : colors.dangerText }]}>
                {netA >= 0 ? `+₹${netA}` : `-₹${Math.abs(netA)}`}
              </Text>
            </View>

            <View style={styles.middleVs}>
              <Text style={styles.totalGames}>{gamesPlayedTogether}</Text>
              <Text style={styles.gamesLabel}>GAMES</Text>
            </View>

            {/* Player B */}
            <View style={styles.playerColumn}>
              <View style={[styles.avatar, { backgroundColor: colors.purpleLight }]}>
                <Text style={[styles.avatarText, { color: colors.purple }]}>{userB.displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName} numberOfLines={1}>{userB.displayName}</Text>
              <Text style={styles.playerCode}>#{userB.friendCode}</Text>
              <Text style={[styles.netAmount, { color: netB >= 0 ? colors.successText : colors.dangerText }]}>
                {netB >= 0 ? `+₹${netB}` : `-₹${Math.abs(netB)}`}
              </Text>
            </View>
          </View>

          {/* Win count bars */}
          <View style={styles.scoreRow}>
            <Text style={styles.scoreNumber}>{winsA} Wins</Text>
            <Text style={styles.scoreDivider}>•</Text>
            <Text style={styles.scoreNumber}>{winsB} Wins</Text>
          </View>
        </View>

        {/* Head-to-Head Records */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>RIVALRY STATS</Text>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Biggest Win by {userA.displayName}</Text>
            <Text style={styles.statVal}>+₹{biggestWinA}</Text>
          </View>

          <View style={styles.statLine}>
            <Text style={styles.statLabel}>Biggest Win by {userB.displayName}</Text>
            <Text style={styles.statVal}>+₹{biggestWinB}</Text>
          </View>
        </View>

        {/* Recent Games */}
        <View style={styles.recentCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <History size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.statsTitle}>LAST 5 ENCOUNTERS</Text>
          </View>

          {recentGames.length === 0 ? (
            <Text style={styles.emptyText}>No completed games recorded together yet.</Text>
          ) : (
            recentGames.map((g: any) => (
              <View key={g.gameId} style={styles.gameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gameName}>{g.name}</Text>
                  <Text style={styles.gameDate}>
                    📅 {g.date ? new Date(g.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Finalized'}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.resultText}>
                    You: {g.netA >= 0 ? `+₹${g.netA}` : `-₹${Math.abs(g.netA)}`}
                  </Text>
                  <Text style={styles.resultTextFriend}>
                    {userB.displayName}: {g.netB >= 0 ? `+₹${g.netB}` : `-₹${Math.abs(g.netB)}`}
                  </Text>
                </View>
              </View>
            ))
          )}
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
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center'
  },
  vsBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12
  },
  versusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center'
  },
  playerColumn: {
    flex: 1,
    alignItems: 'center'
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text
  },
  playerCode: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1
  },
  netAmount: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 6
  },
  middleVs: {
    paddingHorizontal: 10,
    alignItems: 'center'
  },
  totalGames: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5
  },
  gamesLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderDark,
    width: '100%',
    justifyContent: 'center'
  },
  scoreNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  scoreDivider: {
    marginHorizontal: 12,
    color: colors.textMuted
  },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  statsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10
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
  statVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  recentCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    paddingVertical: 12
  },
  gameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark
  },
  gameName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text
  },
  gameDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2
  },
  resultText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  resultTextFriend: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1
  }
});
