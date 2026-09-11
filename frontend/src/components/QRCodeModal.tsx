import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Platform } from 'react-native';
import { X, Copy, Check, Share2 } from 'lucide-react-native';
import QRCode from 'qrcode';
import { colors } from '../theme/colors';

interface QRCodeModalProps {
  visible: boolean;
  joinCode: string;
  tableName: string;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  visible,
  joinCode,
  tableName,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (visible && joinCode) {
      // Generate QR data pointing to app deep link or join code payload
      const payload = JSON.stringify({ app: 'chipmate', joinCode });
      QRCode.toDataURL(payload, { width: 250, margin: 2 })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR generation error:', err));
    }
  }, [visible, joinCode]);

  const handleCopy = () => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(joinCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Join Table</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.tableName}>{tableName}</Text>

          {/* QR Code image */}
          <View style={styles.qrContainer}>
            {qrDataUrl ? (
              <Image source={{ uri: qrDataUrl }} style={styles.qrImage} />
            ) : (
              <View style={[styles.qrImage, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: colors.textSecondary }}>Generating QR...</Text>
              </View>
            )}
          </View>

          {/* Big Code Pill */}
          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>TABLE JOIN CODE</Text>
            <Text style={styles.codeText}>{joinCode}</Text>
          </View>

          {/* Copy button */}
          <TouchableOpacity onPress={handleCopy} style={styles.copyButton}>
            {copied ? <Check size={18} color="#FFF" /> : <Copy size={18} color="#FFF" />}
            <Text style={styles.copyButtonText}>{copied ? 'Code Copied!' : 'Copy Code'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 7, 10, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
    marginBottom: 4
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.3
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.cardRaised,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  tableName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    fontWeight: '500'
  },
  qrContainer: {
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderDark,
    marginBottom: 16
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: 6
  },
  codeContainer: {
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  codeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1
  },
  codeText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 5,
    marginTop: 2
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12
  },
  copyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    marginLeft: 8
  }
});
