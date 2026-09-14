import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { ArrowLeft, WifiOff, Sparkles } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useUpdate } from '../context/UpdateContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  isConnected?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  isConnected = true
}) => {
  const { updateAvailable, isUpdating, applyUpdate } = useUpdate();
  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        <View style={styles.leftSection}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={styles.backButton}
              activeOpacity={0.7}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <ArrowLeft size={18} color={colors.text} />
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightSection}>
          {updateAvailable && (
            <TouchableOpacity
              style={styles.headerUpdatePill}
              onPress={applyUpdate}
              disabled={isUpdating}
              activeOpacity={0.8}
            >
              <Sparkles size={11} color="#FFF" style={{ marginRight: 3 }} />
              <Text style={styles.headerUpdatePillText}>Update</Text>
            </TouchableOpacity>
          )}
          {!isConnected && (
            <View style={styles.offlineBadge}>
              <WifiOff size={12} color={colors.dangerText} />
              <Text style={styles.offlineText}>Offline</Text>
            </View>
          )}
          {rightAction}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    paddingTop: Platform.OS === 'ios' ? 48 : (StatusBar.currentHeight || 20) + 10,
    paddingBottom: 14,
    paddingHorizontal: 16
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  titleContainer: {
    flex: 1
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '500'
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.dangerText,
    marginLeft: 4
  },
  headerUpdatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FFD700'
  },
  headerUpdatePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF'
  }
});
