import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { ArrowLeft, Users, ShieldCheck, Check } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { Header } from '../../components/Header';

interface JoinTableScreenProps {
  onBack: () => void;
  onTableJoined: (tableId: string) => void;
}

export const JoinTableScreen: React.FC<JoinTableScreenProps> = ({
  onBack,
  onTableJoined
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    if (!code.trim()) {
      setError('Please enter a 5-character table code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/tables/join', {
        method: 'POST',
        body: { code: code.trim().toUpperCase() }
      });

      if (res.success && res.table) {
        onTableJoined(res.table.id);
      } else {
        setError(res.error || 'Failed to join table');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to join table');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Join Table" onBack={onBack} />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>Enter Table Join Code</Text>
          <Text style={styles.subtitle}>
            Ask the table host for their 5-character join code.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="e.g. A7K92"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />

          <TouchableOpacity
            style={[styles.button, loading && { opacity: 0.7 }]}
            onPress={handleJoin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Join Game Table</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <ShieldCheck size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={styles.infoText}>
              Once joined, your chip balance and live transactions will sync in real time.
            </Text>
          </View>
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
    padding: 20
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 20
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  errorText: {
    fontSize: 13,
    color: colors.dangerText,
    textAlign: 'center',
    fontWeight: '500'
  },
  input: {
    backgroundColor: colors.cardInset,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 6,
    textAlign: 'center',
    color: colors.primary,
    marginBottom: 20
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  infoText: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 17
  }
});
