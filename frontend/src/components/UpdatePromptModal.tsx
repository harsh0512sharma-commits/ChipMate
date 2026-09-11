import React, { useEffect, useState, useRef } from 'react';
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
import { APP_BUILD_VERSION } from '../version';

const STORAGE_KEY_INSTALLED = 'chipmate_installed_version';
const STORAGE_KEY_DISMISSED = 'chipmate_dismissed_version';

const INITIAL_CHECK_DELAY_MS = 2500;
const POLL_INTERVAL_MS = 60 * 1000; // Check every 60s

const getStoredInstalledVersion = (): string => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(STORAGE_KEY_INSTALLED) || APP_BUILD_VERSION;
    }
  } catch (_) {}
  return APP_BUILD_VERSION;
};

const setStoredInstalledVersion = (v: string) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_INSTALLED, v);
    }
  } catch (_) {}
};

const getStoredDismissedVersion = (): string | null => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(STORAGE_KEY_DISMISSED);
    }
  } catch (_) {}
  return null;
};

const setStoredDismissedVersion = (v: string) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_DISMISSED, v);
    }
  } catch (_) {}
};

export const UpdatePromptModal: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [newVersion, setNewVersion] = useState<string>(APP_BUILD_VERSION);
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [dismissed, setDismissed] = useState<boolean>(false);

  const slideAnim = useRef(new Animated.Value(-120)).current;

  // On initial mount, ensure current executing build is recorded as installed
  useEffect(() => {
    setStoredInstalledVersion(APP_BUILD_VERSION);
  }, []);

  // Animate banner entry
  useEffect(() => {
    if (updateAvailable && !dismissed) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [updateAvailable, dismissed]);

  // Version checking routine
  const checkForUpdates = async () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      // Fetch with cache busting parameter
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
      });

      if (!res.ok) return;

      const data = await res.json();
      if (!data || !data.version) return;

      const remoteVersion = String(data.version).trim();
      const currentInstalled = getStoredInstalledVersion();
      const currentDismissed = getStoredDismissedVersion();

      // If user is already running this version or has already updated to it:
      if (remoteVersion === APP_BUILD_VERSION || remoteVersion === currentInstalled) {
        setUpdateAvailable(false);
        setStoredInstalledVersion(remoteVersion);
        return;
      }

      // If user previously dismissed this version in this browser session:
      if (remoteVersion === currentDismissed) {
        setUpdateAvailable(false);
        return;
      }

      // There is an actual new update!
      setNewVersion(remoteVersion);
      if (data.releaseNotes) {
        setReleaseNotes(data.releaseNotes);
      }
      setUpdateAvailable(true);
    } catch (err) {
      // Silently fail network checks
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // 1. Listen to ServiceWorker update events - verify before showing banner!
    const handleSwUpdate = () => {
      console.log('[ChipMate PWA] Service Worker update detected via event');
      checkForUpdates();
    };

    window.addEventListener('chipmate-update-available', handleSwUpdate);

    // 2. Initial check after app mounts
    const initTimer = setTimeout(() => {
      checkForUpdates();
    }, INITIAL_CHECK_DELAY_MS);

    // 3. Periodic poll
    const interval = setInterval(() => {
      checkForUpdates();
    }, POLL_INTERVAL_MS);

    // 4. Check on tab focus / visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('chipmate-update-available', handleSwUpdate);
      clearTimeout(initTimer);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const handleApplyUpdate = async () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    setIsUpdating(true);
    setStoredInstalledVersion(newVersion);
    setStoredDismissedVersion(newVersion);
    setUpdateAvailable(false);

    try {
      // 1. Tell all service workers to skip waiting
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      }

      // 2. Clear browser cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
    } catch (err) {
      console.warn('[ChipMate PWA] Cache flush warning:', err);
    }

    // 3. Hard reload with cache-bust so browser pulls the fresh bundle
    setTimeout(() => {
      window.location.href = window.location.origin + window.location.pathname + '?_v=' + Date.now();
    }, 400);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setUpdateAvailable(false);
    setStoredDismissedVersion(newVersion);
  };

  if (!updateAvailable || dismissed) return null;

  return (
    <Animated.View style={[styles.floatingBanner, { transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.contentRow}>
        <View style={styles.iconCircle}>
          <Sparkles size={20} color={colors.primary} />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>New Update Available</Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{newVersion}</Text>
            </View>
          </View>
          <Text style={styles.subText} numberOfLines={1}>
            {releaseNotes || 'Major features and performance improvements ready.'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleApplyUpdate}
          disabled={isUpdating}
          style={styles.updateButton}
          activeOpacity={0.8}
        >
          {isUpdating ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <ArrowUpCircle size={16} color="#FFF" style={{ marginRight: 5 }} />
              <Text style={styles.updateButtonText}>Update</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismissBtn}
          activeOpacity={0.7}
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  floatingBanner: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 48,
    left: 16,
    right: 16,
    maxWidth: 500,
    alignSelf: 'center',
    backgroundColor: '#161922',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primaryBorder,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 9999,
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
    fontSize: 14,
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
    borderColor: colors.borderSubtle
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
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
