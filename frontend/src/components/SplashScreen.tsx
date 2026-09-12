import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Image,
  Easing,
  Dimensions,
  StatusBar,
  Platform,
  TouchableOpacity
} from 'react-native';
import { Volume2, VolumeX } from 'lucide-react-native';
import { colors } from '../theme/colors';

interface SplashScreenProps {
  onAnimationEnd?: () => void;
  isLoading?: boolean;
}

const { width } = Dimensions.get('window');

// HTML video element reference for React Native Web
const HtmlVideo = 'video' as any;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationEnd, isLoading = true }) => {
  const [videoFailed, setVideoFailed] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<any>(null);

  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const barProgress = useRef(new Animated.Value(0)).current;

  const hasFinishedRef = useRef(false);

  const finishSplash = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    });
  };

  useEffect(() => {
    // 1. Initial fade-in
    Animated.timing(opacityAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    // 2. Animated fallback elements in case video fails or isn't used
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 40,
      useNativeDriver: true,
    }).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.96,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.9,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    Animated.timing(barProgress, {
      toValue: 1,
      duration: 2500,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    // Max display safety timer of 6 seconds before automatically transitioning
    const maxTimer = setTimeout(() => {
      finishSplash();
    }, 6000);

    return () => {
      clearTimeout(maxTimer);
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, []);

  const barWidth = barProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const toggleSound = () => {
    setIsMuted(prev => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
      return next;
    });
  };

  // 1. Web Custom Video Mode
  if (Platform.OS === 'web' && !videoFailed) {
    return (
      <Animated.View style={[styles.videoContainer, { opacity: opacityAnim }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        <HtmlVideo
          ref={videoRef}
          src="/splash_video.mp4"
          autoPlay
          muted={isMuted}
          playsInline
          onEnded={finishSplash}
          onError={() => setVideoFailed(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            backgroundColor: '#000000'
          }}
        />

        {/* Skip button in top-right */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={finishSplash}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip ›</Text>
        </TouchableOpacity>

        {/* Sound toggle button in bottom-right */}
        <TouchableOpacity
          style={styles.soundButton}
          onPress={toggleSound}
          activeOpacity={0.7}
        >
          {isMuted ? (
            <VolumeX size={18} color="#FFFFFF" />
          ) : (
            <Volume2 size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  // 2. Animated Brand Chip Fallback Mode
  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0F1D" />

      <View style={styles.centerBox}>
        {/* Glowing Background Radial Ring */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              opacity: glowAnim,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />

        {/* Animated Brand Chip Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: scaleAnim },
                { scale: pulseAnim }
              ],
            },
          ]}
        >
          <Image
            source={require('../../assets/chip_icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Title & Tagline */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>CHIPMATE</Text>
          <Text style={styles.subtitle}>POKER & TEEN PATTI LEDGER</Text>
        </View>

        {/* Loading Indicator Bar */}
        <View style={styles.barBackground}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
        </View>

        <Text style={styles.statusText}>
          {isLoading ? 'Syncing tables & chip balances...' : 'Entering game...'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.versionText}>v1.0.12 • Zero-Sum Real-Time Ledger</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  skipButton: {
    position: 'absolute',
    top: 24,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    zIndex: 10000
  },
  skipButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  soundButton: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000
  },
  container: {
    flex: 1,
    backgroundColor: '#0A0F1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  glowRing: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    top: -15,
  },
  logoContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  logoImage: {
    width: 130,
    height: 130,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 2.2,
    marginTop: 6,
    textAlign: 'center',
  },
  barBackground: {
    width: Math.min(width * 0.55, 220),
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 2,
  },
  statusText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
