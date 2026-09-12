import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Image
} from 'react-native';
import {
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Coins,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onOtpSent: (email: string, devOtp?: string, phoneNumber?: string, name?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOtpSent }) => {
  const { login } = useAuth();
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Sign In inputs
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up inputs (4 Mandatory Columns/Inputs)
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleRetry = () => {
    setError(null);
    if (authMode === 'LOGIN') {
      handleSignIn();
    } else {
      handleSignUp();
    }
  };

  // 1. Handle Sign In with Mobile Number + Password
  const handleSignIn = async () => {
    const cleanedPhone = signupPhoneClean(loginPhone);
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      setError('Please enter your registered 10-digit mobile number.');
      return;
    }
    if (!loginPassword) {
      setError('Please enter your password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/login', {
        method: 'POST',
        body: {
          phoneNumber: cleanedPhone,
          password: loginPassword
        }
      });

      if (res.success && res.token && res.user) {
        await login(res.token, res.user);
      } else {
        setError(res.error || 'Invalid mobile number or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Sign Up with 4 Mandatory Fields (Full Name, Phone Number, Email, Password)
  const handleSignUp = async () => {
    const cleanedName = signupName.trim();
    if (!cleanedName || cleanedName.length < 2) {
      setError('Field 1: Please enter your full name (at least 2 characters).');
      return;
    }

    const cleanedPhone = signupPhoneClean(signupPhone);
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      setError('Field 2: Please enter a valid 10-digit mobile number (will be your username).');
      return;
    }

    const cleanedEmail = signupEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanedEmail || !emailRegex.test(cleanedEmail)) {
      setError('Field 3: Please enter a valid email address to receive your OTP.');
      return;
    }

    if (!signupPassword || signupPassword.length < 6) {
      setError('Field 4: Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/signup-request-otp', {
        method: 'POST',
        body: {
          name: cleanedName,
          displayName: cleanedName,
          phoneNumber: cleanedPhone,
          email: cleanedEmail,
          password: signupPassword
        }
      });

      if (res.success) {
        onOtpSent(cleanedEmail, res.devOtp, cleanedPhone, cleanedName);
      } else {
        setError(res.error || 'Failed to initiate sign-up.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initiate sign-up.');
    } finally {
      setLoading(false);
    }
  };

  const signupPhoneClean = (input: string) => {
    return input.replace(/\D/g, '');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {/* Brand Logo & Header */}
          <View style={styles.logoRow}>
            <Image
              source={require('../../../assets/chip_icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>ChipMate</Text>
          <Text style={styles.subtitle}>
            Poker Chip Calculator & Records
          </Text>

          {/* Dual Mode Tab Selector */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, authMode === 'LOGIN' && styles.tabBtnActive]}
              onPress={() => {
                setAuthMode('LOGIN');
                setError(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, authMode === 'LOGIN' && styles.tabBtnTextActive]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, authMode === 'SIGNUP' && styles.tabBtnActive]}
              onPress={() => {
                setAuthMode('SIGNUP');
                setError(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabBtnText, authMode === 'SIGNUP' && styles.tabBtnTextActive]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {error.toLowerCase().includes('fetch') || error.toLowerCase().includes('network') || error.toLowerCase().includes('cannot reach')
                  ? 'Unable to reach the ChipMate server.\nIf the server was idle, it may take 30–45 seconds to wake up. Please check your internet connection and tap Retry.'
                  : error}
              </Text>
              {(error.toLowerCase().includes('fetch') || error.toLowerCase().includes('network') || error.toLowerCase().includes('cannot reach')) && (
                <TouchableOpacity
                  onPress={handleRetry}
                  style={styles.retryBtn}
                  activeOpacity={0.8}
                >
                  <RefreshCw size={14} color="#FFF" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* ================================================================= */}
          {/* TAB 1: SIGN IN MODE (Mobile Number + Password)                   */}
          {/* ================================================================= */}
          {authMode === 'LOGIN' ? (
            <View>
              {/* Field 1: Mobile Number */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>MOBILE NUMBER (USERNAME)</Text>
                <View style={[styles.inputRow, focusedField === 'loginPhone' && styles.inputRowFocused]}>
                  <Phone size={18} color={focusedField === 'loginPhone' ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={loginPhone}
                    onChangeText={setLoginPhone}
                    onFocus={() => setFocusedField('loginPhone')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Field 2: Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <View style={[styles.inputRow, focusedField === 'loginPassword' && styles.inputRowFocused]}>
                  <Lock size={18} color={focusedField === 'loginPassword' ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    onFocus={() => setFocusedField('loginPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(prev => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleSignIn}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <ArrowRight size={18} color="#FFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchModeRow}
                onPress={() => {
                  setAuthMode('SIGNUP');
                  setError(null);
                }}
              >
                <Text style={styles.switchModeText}>
                  Don't have an account? <Text style={styles.switchModeHighlight}>Sign Up</Text>
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ================================================================= */
            /* TAB 2: SIGN UP MODE (4 Fields - All Mandatory)                    */
            /* ================================================================= */
            <View>
              {/* Field 1: Full Name (Mandatory) */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>1. FULL NAME *</Text>
                </View>
                <View style={[styles.inputRow, focusedField === 'signupName' && styles.inputRowFocused]}>
                  <User size={18} color={focusedField === 'signupName' ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Your full name"
                    placeholderTextColor={colors.textMuted}
                    autoCapitalize="words"
                    value={signupName}
                    onChangeText={setSignupName}
                    onFocus={() => setFocusedField('signupName')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {signupName.trim().length >= 2 && (
                    <CheckCircle size={16} color={colors.successText} />
                  )}
                </View>
                <Text style={styles.fieldHint}>Used for table seatings, rankings, and personal greetings.</Text>
              </View>

              {/* Field 2: Mobile Number (Mandatory) */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>2. MOBILE NUMBER (USERNAME) *</Text>
                </View>
                <View style={[styles.inputRow, focusedField === 'signupPhone' && styles.inputRowFocused]}>
                  <Phone size={18} color={focusedField === 'signupPhone' ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit mobile number"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={signupPhone}
                    onChangeText={setSignupPhone}
                    onFocus={() => setFocusedField('signupPhone')}
                    onBlur={() => setFocusedField(null)}
                  />
                  {signupPhone.length === 10 && (
                    <CheckCircle size={16} color={colors.successText} />
                  )}
                </View>
                <Text style={styles.fieldHint}>This 10-digit number will be your username for login.</Text>
              </View>

              {/* Field 3: Email Address (Mandatory) */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>3. EMAIL ADDRESS *</Text>
                </View>
                <View style={[styles.inputRow, focusedField === 'signupEmail' && styles.inputRowFocused]}>
                  <Mail size={18} color={focusedField === 'signupEmail' ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="name@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    value={signupEmail}
                    onChangeText={setSignupEmail}
                    onFocus={() => setFocusedField('signupEmail')}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
                <Text style={styles.fieldHint}>We will send a 6-digit verification code to this email.</Text>
              </View>

              {/* Field 4: Password (Mandatory) */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>4. PASSWORD *</Text>
                </View>
                <View style={[styles.inputRow, focusedField === 'signupPassword' && styles.inputRowFocused]}>
                  <Lock size={18} color={focusedField === 'signupPassword' ? colors.primary : colors.textSecondary} style={{ marginRight: 12 }} />
                  <TextInput
                    style={styles.input}
                    placeholder="Minimum 6 characters"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={signupPassword}
                    onChangeText={setSignupPassword}
                    onFocus={() => setFocusedField('signupPassword')}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(prev => !prev)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {showPassword ? (
                      <EyeOff size={18} color={colors.textSecondary} />
                    ) : (
                      <Eye size={18} color={colors.textSecondary} />
                    )}
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldHint}>Used alongside your mobile number to sign in.</Text>
              </View>

              {/* Sign Up Action Button */}
              <TouchableOpacity
                style={[styles.button, loading && { opacity: 0.7 }]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.buttonText}>Send Verification Code</Text>
                    <ArrowRight size={18} color="#FFF" style={{ marginLeft: 8 }} />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchModeRow}
                onPress={() => {
                  setAuthMode('LOGIN');
                  setError(null);
                }}
              >
                <Text style={styles.switchModeText}>
                  Already have an account? <Text style={styles.switchModeHighlight}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footerNote}>
            ChipMate records physical chips, loans, and final settlements. It does not process real-money payments.
          </Text>

          <Text style={styles.madeWithLoveText}>
            Made with ❤️ by HRVS Solutions
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
    backgroundColor: colors.background
  },
  card: {
    backgroundColor: colors.background,
    width: '100%',
    maxWidth: 460,
    paddingHorizontal: 8,
    borderWidth: 0
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 12
  },
  logoImage: {
    width: 78,
    height: 78
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardInset,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 6
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderDark
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10
  },
  tabBtnActive: {
    backgroundColor: colors.cardRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  tabBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted
  },
  tabBtnTextActive: {
    color: colors.text,
    fontWeight: '700'
  },
  mandatoryNotice: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16
  },
  mandatoryNoticeText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16
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
    marginBottom: 16
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.6
  },
  fieldHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
    marginLeft: 2
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11141B',
    borderWidth: 1.5,
    borderColor: '#232936',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 54,
    minHeight: 54
  },
  inputRowFocused: {
    borderColor: colors.primary,
    backgroundColor: '#151922'
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    color: '#F8FAFC',
    paddingVertical: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? {
      outlineStyle: 'none',
      outlineWidth: 0,
      backgroundColor: 'transparent',
      boxShadow: 'none'
    } as any : {})
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3
  },
  switchModeRow: {
    alignItems: 'center',
    paddingVertical: 14
  },
  switchModeText: {
    fontSize: 13,
    color: colors.textSecondary
  },
  switchModeHighlight: {
    color: colors.primary,
    fontWeight: '700'
  },
  footerNote: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 15
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: 'center'
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF'
  },
  madeWithLoveText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 14,
    fontWeight: '600',
    letterSpacing: 0.3
  }
});
