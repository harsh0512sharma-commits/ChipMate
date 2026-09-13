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
    // If not web, instantly finish splash with zero delay and zero logo
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
        videoRef.current.play().catch(() => {});
      } catch (_) {}
    }

    // Safety timer (5 seconds) to ensure app transitions smoothly if onEnded doesn't fire
    const safetyTimer = setTimeout(() => {
      finishSplash();
    }, 5000);

    return () => {
      clearTimeout(safetyTimer);
    };
  }, []);

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
