import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Animated,
  StatusBar,
  Platform,
  TouchableOpacity,
  Text,
  View
} from 'react-native';
import { ChipMateLogo } from './ChipMateBrand';

interface SplashScreenProps {
  onAnimationEnd?: () => void;
  isLoading?: boolean;
}

// HTML video element reference for React Native Web
const HtmlVideo = 'video' as any;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onAnimationEnd }) => {
  const videoRef = useRef<any>(null);
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const hasFinishedRef = useRef(false);

  const finishSplash = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;

    // Smooth fade out into the application
    try {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: Platform.OS !== 'web',
      }).start(() => {
        if (onAnimationEnd) {
          onAnimationEnd();
        }
      });
    } catch (_) {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }

    // Safety fallback so web never hangs on black screen
    setTimeout(() => {
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, 320);
  };

  useEffect(() => {
    // If not web, instantly finish splash with zero delay
    if (Platform.OS !== 'web') {
      finishSplash();
      return;
    }

    // Direct DOM-level muted autoplay trigger for mobile Safari & Chrome Android
    if (videoRef.current) {
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

    // Safety timer: video is 3.5s runtime; safety timeout at 4.2s ensures app transitions smoothly
    const safetyTimer = setTimeout(() => {
      finishSplash();
    }, 4200);

    return () => {
      clearTimeout(safetyTimer);
    };
  }, []);

  const handleContainerTap = () => {
    finishSplash();
  };

  return (
    <Animated.View
      style={[styles.videoContainer, { opacity: opacityAnim }]}
      // @ts-ignore
      onClick={handleContainerTap}
      onTouchStart={handleContainerTap}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* Subtle brand backdrop shown while video buffer starts */}
      <View style={styles.backdropBrand}>
        <ChipMateLogo size={56} borderRadius={14} />
      </View>

      {Platform.OS === 'web' && (
        <HtmlVideo
          ref={(el: any) => {
            videoRef.current = el;
            if (el) {
              try {
                el.muted = true;
                el.defaultMuted = true;
                el.playsInline = true;
                el.setAttribute('muted', '');
                el.setAttribute('playsinline', '');
                el.setAttribute('webkit-playsinline', '');
                el.play().catch(() => {});
              } catch (_) {}
            }
          }}
          src="/splash_video_v2.mp4?v=1.0.22"
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
              videoRef.current.defaultMuted = true;
              videoRef.current.play().catch(() => {});
            }
          }}
          onEnded={finishSplash}
          onError={() => finishSplash()}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            backgroundColor: '#000000',
            zIndex: 10
          }}
        />
      )}

      {/* Tap to skip button for fast access */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={finishSplash}
        activeOpacity={0.7}
        accessibilityLabel="Skip intro video"
      >
        <Text style={styles.skipButtonText}>Skip →</Text>
      </TouchableOpacity>
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
  backdropBrand: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 20 : 48,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    zIndex: 20
  },
  skipButtonText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3
  }
});
