import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export const BRAND_PRIMARY_ORANGE = '#EA580C';
export const BRAND_VIBRANT_ORANGE = '#F97316';
export const BRAND_CHARCOAL = '#1E2129';

interface ChipMateLogoProps {
  size?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const ChipMateLogo: React.FC<ChipMateLogoProps> = ({
  size = 32,
  borderRadius = 8,
  style
}) => {
  return (
    <View
      style={[
        styles.logoBadge,
        {
          width: size,
          height: size,
          borderRadius: borderRadius
        },
        style
      ]}
    >
      <Image
        source={require('../../assets/chipmate_logo_emblem.png')}
        style={styles.logoImage}
        resizeMode="contain"
      />
    </View>
  );
};

interface ChipMateWordmarkProps {
  size?: number;
  spacing?: number;
  style?: ViewStyle;
}

export const ChipMateWordmark: React.FC<ChipMateWordmarkProps> = ({
  size = 18,
  spacing,
  style
}) => {
  const { isDark } = useTheme();
  const letterSpacing = spacing !== undefined ? spacing : Math.max(2, Math.round(size * 0.16));

  return (
    <View style={[styles.wordmarkRow, style]}>
      <Text
        style={[
          styles.chipText,
          {
            fontSize: size,
            letterSpacing,
            color: isDark ? '#FFFFFF' : BRAND_CHARCOAL
          }
        ]}
      >
        CHIP
      </Text>
      <Text
        style={[
          styles.mateText,
          {
            fontSize: size,
            letterSpacing,
            color: isDark ? BRAND_VIBRANT_ORANGE : BRAND_PRIMARY_ORANGE
          }
        ]}
      >
        MATE
      </Text>
    </View>
  );
};

interface ChipMateBrandProps {
  logoSize?: number;
  fontSize?: number;
  showTagline?: boolean;
  style?: ViewStyle;
}

export const ChipMateBrand: React.FC<ChipMateBrandProps> = ({
  logoSize = 34,
  fontSize = 17,
  showTagline = false,
  style
}) => {
  return (
    <View style={[styles.brandContainer, style]}>
      <View style={styles.brandRow}>
        <ChipMateLogo size={logoSize} />
        <View style={{ marginLeft: 8 }}>
          <ChipMateWordmark size={fontSize} />
          {showTagline && (
            <Text style={styles.taglineText}>CALCULATE . SETTLE . PLAY.</Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  logoBadge: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(197, 165, 108, 0.35)',
    overflow: 'hidden',
    padding: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2
  },
  logoImage: {
    width: '100%',
    height: '100%'
  },
  wordmarkRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  chipText: {
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? "'Montserrat', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : undefined,
    textTransform: 'uppercase'
  },
  mateText: {
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? "'Montserrat', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : undefined,
    textTransform: 'uppercase'
  },
  brandContainer: {
    alignItems: 'flex-start'
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  taglineText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 2,
    marginTop: 2,
    textTransform: 'uppercase',
    fontFamily: Platform.OS === 'web' ? "'Montserrat', 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" : undefined
  }
});
