import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { KeyRound, ArrowLeft, User, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface VerifyOtpScreenProps {
  email: string;
  phoneNumber?: string;
  initialDevOtp?: string;
  initialName?: string;
  onBack: () => void;
}

export const VerifyOtpScreen: React.FC<VerifyOtpScreenProps> = ({
  email,
  phoneNumber,
  initialDevOtp,
  initialName,
  onBack
}) => {
  const { login } = useAuth();
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState(initialName || '');
  const [isNewUserStep, setIsNewUserStep] = useState(false);
  const [tempToken, setTempToken] = useState<string | null>(null);
  const [tempUser, setTempUser] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(30);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (phoneNumber) {
        // Sign-up OTP verification
        const res = await apiRequest('/auth/signup-verify-otp', {
          method: 'POST',
          body: {
            email,
            code: code.trim(),
            displayName: displayName.trim() || undefined
          }
        });

        if (res.success && res.token && res.user) {
          await login(res.token, res.user);
          return;
        } else {
          setError(res.error || 'Verification failed');
        }
      } else {
        // Standard OTP verification
        const res = await apiRequest('/auth/verify-otp', {
          method: 'POST',
          body: { email, code: code.trim() }
        });

        if (res.success) {
          if (res.isNewUser) {
            setTempToken(res.token);
            setTempUser(res.user);
            setDisplayName(res.user.display_name || '');
            setIsNewUserStep(true);
          } else {
            await login(res.token, res.user);
          }
        } else {
          setError(res.error || 'Verification failed');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteProfile = async () => {
    if (!displayName || displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Temporarily login to make authenticated request or update profile
      const res = await apiRequest('/auth/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${tempToken}` },
        body: { displayName: displayName.trim() }
      });

      if (res.success) {
        await login(tempToken!, res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      const res = await apiRequest('/auth/request-otp', {
        method: 'POST',
        body: { email }
      });
      if (res.success) {
        setResendCooldown(30);
        if (res.devOtp) setCode(res.devOtp);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <View style={styles.card}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <ArrowLeft size={20} color={colors.textSecondary} />
          <Text style={styles.backBtnText}>Change Email</Text>
        </TouchableOpacity>

        {!isNewUserStep ? (
          <>
            <Text style={styles.title}>Enter Verification Code</Text>
            <Text style={styles.subtitle}>
              {phoneNumber ? (
                <>
                  Verifying mobile number <Text style={{ fontWeight: '700', color: colors.primary }}>{phoneNumber}</Text>. We sent a 6-digit code to <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>
                </>
              ) : (
                <>
                  We sent a 6-digit code to <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>
                </>
              )}
            </Text>

            {initialDevOtp && (
              <View style={styles.devOtpBox}>
                <CheckCircle2 size={16} color={colors.successText} />
                <Text style={styles.devOtpText}>Development Code: {initialDevOtp}</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Symmetrical Centered 6-Digit OTP Cells */}
            <View style={styles.otpGridWrapper}>
              <View style={styles.otpGridRow}>
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const digit = code[idx] || '';
                  const isCurrent = code.length === idx;
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.otpBox,
                        isCurrent && styles.otpBoxActive,
                        digit ? styles.otpBoxFilled : null
                      ]}
                    >
                      <Text style={styles.otpDigitText}>{digit}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Invisible native input for typing/pasting */}
              <TextInput
                style={styles.otpNativeHiddenInput}
                keyboardType="number-pad"
                maxLength={6}
                value={code}
                onChangeText={(val) => setCode(val.replace(/\D/g, ''))}
                autoFocus
                caretHidden
              />
            </View>

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Verify & Continue</Text>
              )}
            </TouchableOpacity>

            <View style={styles.resendRow}>
              <TouchableOpacity onPress={handleResend} disabled={resendCooldown > 0}>
                <Text style={[styles.resendText, resendCooldown > 0 && { color: colors.textMuted }]}>
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend verification code'}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Create Your Profile</Text>
            <Text style={styles.subtitle}>
              What should your friends call you at the table?
            </Text>

            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Your Name</Text>
              <View style={styles.inputRow}>
                <User size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
                <TextInput
                  style={styles.nameInput}
                  placeholder="e.g. Rahul Sharma"
                  placeholderTextColor={colors.textMuted}
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && { opacity: 0.7 }]}
              onPress={handleCompleteProfile}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Start Playing</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16
  },
  card: {
    backgroundColor: colors.background,
    width: '100%',
    maxWidth: 440,
    paddingHorizontal: 8,
    borderWidth: 0
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  backBtnText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginLeft: 6,
    fontWeight: '500'
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    marginBottom: 20
  },
  devOtpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.successBorder
  },
  devOtpText: {
    fontSize: 13,
    color: colors.successText,
    fontWeight: '700',
    marginLeft: 8
  },
  errorBox: {
    backgroundColor: colors.dangerLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.dangerBorder
  },
  errorText: {
    fontSize: 13,
    color: colors.dangerText,
    textAlign: 'center',
    fontWeight: '500'
  },
  inputContainer: {
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardInset,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  otpGridWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    position: 'relative',
    height: 56
  },
  otpGridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 360
  },
  otpBox: {
    flex: 1,
    maxWidth: 50,
    height: 54,
    backgroundColor: '#12151C',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#242A36',
    justifyContent: 'center',
    alignItems: 'center'
  },
  otpBoxActive: {
    borderColor: colors.primary,
    backgroundColor: '#161922'
  },
  otpBoxFilled: {
    borderColor: 'rgba(235, 94, 40, 0.4)',
    backgroundColor: '#161922'
  },
  otpDigitText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#F8FAFC',
    textAlign: 'center'
  },
  otpNativeHiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
    width: '100%',
    height: '100%',
    fontSize: 24,
    color: 'transparent'
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3
  },
  resendRow: {
    alignItems: 'center',
    marginTop: 20
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary
  }
});
