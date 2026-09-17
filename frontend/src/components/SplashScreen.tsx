import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Animated,
  StatusBar,
  Platform
} from 'react-native';

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

    // Smooth, professional fade out into the application
    try {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
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
    }, 350);
  };

  useEffect(() => {
    // If not web, instantly finish splash with zero delay
    if (Platform.OS !== 'web') {
      finishSplash();
      return;
    }

    // Instant DOM-level autoplay trigger for mobile Safari & Chrome Android
    if (videoRef.current) {
      try {
        videoRef.current.muted = true;
        videoRef.current.defaultMuted = true;
        videoRef.current.playsInline = true;
        videoRef.current.setAttribute('muted', '');
        videoRef.current.setAttribute('playsinline', '');
        videoRef.current.setAttribute('webkit-playsinline', '');
        videoRef.current.play().catch(() => {
          // If autoplay fails, finish splash immediately so screen is never black
          finishSplash();
        });
      } catch (_) {
        finishSplash();
      }
    }

    // Safety timer (2 seconds max) to ensure app transitions smoothly
    const safetyTimer = setTimeout(() => {
      finishSplash();
    }, 2000);

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

      {Platform.OS === 'web' && (
        <HtmlVideo
          ref={videoRef}
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
            backgroundColor: '#000000'
          }}
        />
      )}
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
  }
});
