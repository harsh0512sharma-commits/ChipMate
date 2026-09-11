import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Download, Share2, PlusSquare, X, Smartphone, Sparkles, Check } from 'lucide-react-native';
import { colors } from '../theme/colors';

const DISMISS_STORAGE_KEY = 'chipmate_pwa_install_dismissed_at';
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours cooldown if dismissed

export const InstallPromptModal: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const [platformType, setPlatformType] = useState<'ANDROID_CHROME' | 'IOS_SAFARI' | 'DESKTOP_OTHER' | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return;
    }

    // 1. Check if already installed / running in standalone mode
    const isStandalone =
      (window.navigator as any).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if user dismissed recently
    AsyncStorage.getItem(DISMISS_STORAGE_KEY).then(dismissedAtStr => {
      if (dismissedAtStr) {
        const dismissedAt = parseInt(dismissedAtStr, 10);
        if (Date.now() - dismissedAt < DISMISS_COOLDOWN_MS) {
          return; // Still within cooldown
        }
      }

      // 3. Detect iOS Safari (iPhone, iPad, iPod)
      const ua = window.navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(ua);
      const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|android/.test(ua);

      if (isIOS) {
        setPlatformType('IOS_SAFARI');
        // Show after a gentle 1.5s delay so screen is already loaded
        const timer = setTimeout(() => setVisible(true), 1500);
        return () => clearTimeout(timer);
      }

      // 4. Listen for Chrome / Android / Edge eforeinstallprompt
      const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setPlatformType(/android/.test(ua) ? 'ANDROID_CHROME' : 'DESKTOP_OTHER');
        setTimeout(() => setVisible(true), 1000);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

      // 5. Fallback for Android/tablets if beforeinstallprompt already fired or browser doesn't emit it immediately
      const fallbackTimer = setTimeout(() => {
        if (!isStandalone && (/android/.test(ua) || /tablet/.test(ua))) {
          setPlatformType('ANDROID_CHROME');
          setVisible(true);
        }
      }, 3000);

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        clearTimeout(fallbackTimer);
      };
    });
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
          setVisible(false);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
      setDeferredPrompt(null);
    } else {
      // If native deferred prompt isn't directly triggered, advise user to use browser menu
      alert('To install: Tap your browser menu (⋮) and choose "Install app" or "Add to Home screen".');
      handleDismiss();
    }
  };

  const handleDismiss = async () => {
    setVisible(false);
    try {
      await AsyncStorage.setItem(DISMISS_STORAGE_KEY, Date.now().toString());
    } catch (e) {
      // ignore
    }
  };

  if (!visible || isInstalled) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Close button */}
          <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* App Icon / Graphic Header */}
          <View style={styles.iconContainer}>
            <View style={styles.iconBadge}>
              <Smartphone size={28} color={colors.primary} />
            </View>
          </View>

          {/* Title & Tagline */}
          <Text style={styles.title}>Install ChipMate App</Text>
          <Text style={styles.subtitle}>
            Install on your home screen for full-screen games, zero lag, and instant updates.
          </Text>

          {/* Feature Highlights */}
          <View style={styles.featureBox}>
            <View style={styles.featureItem}>
              <View style={styles.checkDot}>
                <Check size={12} color={colors.successText} />
              </View>
              <Text style={styles.featureText}>Works offline & saves your session</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.checkDot}>
                <Check size={12} color={colors.successText} />
              </View>
              <Text style={styles.featureText}>Instant real-time physical chip sync</Text>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.checkDot}>
                <Check size={12} color={colors.successText} />
              </View>
              <Text style={styles.featureText}>Automatic background app updates</Text>
            </View>
          </View>

          {/* Platform Specific Action */}
          {platformType === 'IOS_SAFARI' ? (
            <View style={styles.iosInstructionsCard}>
              <Text style={styles.iosStepTitle}>2 Simple Steps for iPhone & iPad:</Text>
              
              <View style={styles.iosStepRow}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>1</Text>
                </View>
                <Text style={styles.stepInstruction}>
                  Tap the <Text style={styles.boldText}>Share</Text> button <Share2 size={14} color={colors.primary} /> at bottom of Safari
                </Text>
              </View>

              <View style={styles.iosStepRow}>
                <View style={styles.stepNumBadge}>
                  <Text style={styles.stepNumText}>2</Text>
                </View>
                <Text style={styles.stepInstruction}>
                  Select <Text style={styles.boldText}>Add to Home Screen</Text> <PlusSquare size={14} color={colors.primary} />
                </Text>
              </View>

              <TouchableOpacity onPress={handleDismiss} style={styles.gotItButton} activeOpacity={0.8}>
                <Text style={styles.gotItButtonText}>Got It</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                onPress={handleInstallClick}
                style={styles.installButton}
                activeOpacity={0.8}
              >
                <Download size={18} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.installButtonText}>Install App</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleDismiss} style={styles.laterButton} activeOpacity={0.7}>
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    zIndex: 10
  },
  iconContainer: {
    marginTop: 8,
    marginBottom: 14,
    alignItems: 'center'
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18
  },
  featureBox: {
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    padding: 14,
    width: '100%',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  featureText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  actionsContainer: {
    width: '100%'
  },
  installButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10
  },
  installButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2
  },
  laterButton: {
    alignItems: 'center',
    paddingVertical: 8
  },
  laterButtonText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600'
  },
  iosInstructionsCard: {
    width: '100%',
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  iosStepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 10,
    letterSpacing: 0.3
  },
  iosStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  stepNumBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.text
  },
  stepInstruction: {
    fontSize: 12,
    color: colors.text,
    flex: 1,
    lineHeight: 16
  },
  boldText: {
    fontWeight: '700',
    color: colors.primary
  },
  gotItButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6
  },
  gotItButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF'
  }
});
