import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Animated
} from 'react-native';
import { Sparkles, X, ArrowUpCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useUpdate } from '../context/UpdateContext';

export const UpdatePromptModal: React.FC = () => {
  const {
    updateAvailable,
    latestVersion,
    currentVersion,
    releaseNotes,
    isUpdating,
    bannerDismissed,
    dismissBanner,
    applyUpdate
  } = useUpdate();

  const slideAnim = useRef(new Animated.Value(-150)).current;

  // Animate banner entry/exit
  useEffect(() => {
    if (updateAvailable && !bannerDismissed) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: Platform.OS !== 'web',
        bounciness: 6
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web'
      }).start();
    }
  }, [updateAvailable, bannerDismissed, slideAnim]);

  if (!updateAvailable || bannerDismissed) return null;

  return (
    <Animated.View style={[styles.floatingBanner, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.contentRow}>
        <View style={styles.iconCircle}>
          <Sparkles size={20} color={colors.primary} />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>Update Available</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{latestVersion}</Text>
            </View>
          </View>
          <Text style={styles.subText} numberOfLines={1}>
            {releaseNotes || 'Major features and performance improvements ready.'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={applyUpdate}
          disabled={isUpdating}
          style={styles.updateButton}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <ArrowUpCircle size={15} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.updateButtonText}>Update</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={dismissBanner}
          style={styles.dismissBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <X size={15} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingBanner: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 14 : 48,
    left: 14,
    right: 14,
    maxWidth: 500,
    alignSelf: 'center',
    backgroundColor: '#161922',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    zIndex: 99999,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  textColumn: {
    flex: 1,
    marginRight: 8
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  titleText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.2
  },
  versionBadge: {
    backgroundColor: colors.cardRaised,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.primaryBorder
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary
  },
  subText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 6
  },
  updateButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF'
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)'
  }
});
