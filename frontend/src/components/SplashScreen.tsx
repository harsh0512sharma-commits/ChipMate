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
  Platform
} from 'react-native';
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
  const videoRef = useRef<any>(null);

  // Start with full opacity (1) so video is shown immediately with zero blank delay or flash
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const barProgress = useRef(new Animated.Value(0)).current;

  const hasFinishedRef = useRef(false);

  const finishSplash = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    // Smooth, professional fade out into the application
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
    // Continuous smooth animations for fallback mode
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

    // Instant DOM-level autoplay trigger for mobile Safari & Chrome Android
    if (Platform.OS === 'web' && videoRef.current) {
      try {
        videoRef.current.muted = true;
        videoRef.current.defaultMuted = true;
        videoRef.current.playsInline = true;
        videoRef.current.setAttribute('muted', '');
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('webkit-playsinline', '');
        videoRef.current.play().catch(() => {});
      } catch (_) {}
    }

    // Safety timer (7 seconds) to ensure app always transitions smoothly if onEnded doesn't fire
    const safetyTimer = setTimeout(() => {
      finishSplash();
    }, 7000);

    return () => {
      clearTimeout(safetyTimer);
      pulseLoop.stop();
      glowLoop.stop();
    };
  }, []);

  const barWidth = barProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const handleContainerTap = () => {
    if (videoRef.current) {
      try {
        if (videoRef.current.paused) {
          videoRef.current.play().catch(() => finishSplash());
        }
      } catch (_) {
        finishSplash();
      }
    }
  };

  // 1. Web Custom Video Mode: Shows 100% complete unzoomed video (contain) with zero clutter
  if (Platform.OS === 'web' && !videoFailed) {
    return (
      <Animated.View
        style={[styles.videoContainer, { opacity: opacityAnim }]}
        // @ts-ignore
        onClick={handleContainerTap}
        onTouchStart={handleContainerTap}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        <HtmlVideo
          ref={videoRef}
          src="/splash_video.mp4"
          autoPlay
          muted={true}
          playsInline
          preload="auto"
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.defaultMuted = true;
              videoRef.current.play().catch(() => {});
            }
          }}
          onCanPlay={() => {
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().catch(() => {});
            }
          }}
          onEnded={finishSplash}
          onError={() => setVideoFailed(true)}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000000'
          }}
        />
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
        <Text style={styles.versionText}>v1.0.13 • Zero-Sum Real-Time Ledger</Text>
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
