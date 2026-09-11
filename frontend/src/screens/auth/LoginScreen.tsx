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
  ScrollView
} from 'react-native';
import {
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
  Server,
  Settings,
  Check
} from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { apiRequest, getDefaultApiBase, setCustomApiBase } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface LoginScreenProps {
  onOtpSent: (email: string, devOtp?: string, phoneNumber?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onOtpSent }) => {
  const { login } = useAuth();
  const [authMode, setAuthMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');

  // Sign In inputs
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up inputs (3 Mandatory Columns/Inputs)
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Server URL custom config
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getDefaultApiBase());
  const [serverSavedMsg, setServerSavedMsg] = useState(false);

  const handleSaveServerUrl = async () => {
    let clean = serverUrlInput.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `https://${clean}`;
    }
    if (!clean.endsWith('/api')) {
      clean = `${clean}/api`;
    }
    await setCustomApiBase(clean);
    setServerUrlInput(clean);
    setServerSavedMsg(true);
    setTimeout(() => {
      setServerSavedMsg(false);
      setShowServerConfig(false);
      setError(null);
    }, 1000);
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

  // 2. Handle Sign Up with 3 Mandatory Fields (Phone Number, Email, Password)
  const handleSignUp = async () => {
    const cleanedPhone = signupPhoneClean(signupPhone);
    if (!cleanedPhone || cleanedPhone.length !== 10) {
      setError('Column 1: Please enter a valid 10-digit mobile number (will be your username).');
      return;
    }

    const cleanedEmail = signupEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanedEmail || !emailRegex.test(cleanedEmail)) {
      setError('Column 2: Please enter a valid email address to receive your OTP.');
      return;
    }

    if (!signupPassword || signupPassword.length < 6) {
      setError('Column 3: Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await apiRequest('/auth/signup-request-otp', {
        method: 'POST',
        body: {
          phoneNumber: cleanedPhone,
          email: cleanedEmail,
          password: signupPassword
        }
      });

      if (res.success) {
        onOtpSent(cleanedEmail, res.devOtp, cleanedPhone);
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
            <View style={styles.logoIcon}>
              <Coins size={32} color="#FFF" />
            </View>
          </View>

          <Text style={styles.title}>ChipMate</Text>
          <Text style={styles.subtitle}>
            Private Home Game Chip Ledger & Settlement
          </Text>

          <View style={styles.badgeRow}>
            <ShieldCheck size={14} color={colors.primary} />
            <Text style={styles.badgeText}>Real-Time • Non-Gambling • Ledger Only</Text>
          </View>

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
                {error.toLowerCase().includes('fetch')
                  ? `Cannot reach backend server at:\n${serverUrlInput}\n\nMake sure your Render backend service is deployed and running.`
                  : error}
              </Text>
              {error.toLowerCase().includes('fetch') && (
                <TouchableOpacity
                  onPress={() => setShowServerConfig(true)}
                  style={styles.errorConfigBtn}
                  activeOpacity={0.8}
                >
                  <Settings size={14} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={styles.errorConfigBtnText}>Change Backend URL</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Server Config Drawer */}
          {showServerConfig && (
            <View style={styles.serverConfigCard}>
              <View style={styles.serverConfigHeader}>
                <Server size={16} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.serverConfigTitle}>Backend Server Connection</Text>
              </View>
              <Text style={styles.serverConfigDesc}>
                Enter your Render backend URL (e.g. https://chipmate-backend.onrender.com):
              </Text>
              <View style={styles.serverInputRow}>
                <TextInput
                  style={styles.serverInput}
                  value={serverUrlInput}
                  onChangeText={setServerUrlInput}
                  placeholder="https://your-backend.onrender.com/api"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.serverBtnRow}>
                <TouchableOpacity
                  onPress={handleSaveServerUrl}
                  style={styles.serverSaveBtn}
                  activeOpacity={0.8}
                >
                  {serverSavedMsg ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Check size={14} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.serverSaveBtnText}>Saved!</Text>
                    </View>
                  ) : (
                    <Text style={styles.serverSaveBtnText}>Save & Connect</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowServerConfig(false)}
                  style={styles.serverCancelBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.serverCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
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
            /* TAB 2: SIGN UP MODE (3 Columns / Fields - All Mandatory)          */
            /* ================================================================= */
            <View>
              <View style={styles.mandatoryNotice}>
                <Text style={styles.mandatoryNoticeText}>
                  All 3 fields are mandatory. Your 10-digit mobile number will be your username.
                </Text>
              </View>

              {/* Column 1: Mobile Number (Mandatory) */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>1. MOBILE NUMBER (USERNAME) *</Text>
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

              {/* Column 2: Email Address (Mandatory) */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>2. EMAIL ADDRESS *</Text>
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

              {/* Column 3: Password (Mandatory) */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.inputLabel}>3. PASSWORD *</Text>
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
    padding: 20
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  logoRow: {
    alignItems: 'center',
    marginBottom: 14
  },
  logoIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    justifyContent: 'center',
    alignItems: 'center'
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
  errorConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(235, 94, 40, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(235, 94, 40, 0.3)'
  },
  errorConfigBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary
  },
  serverConfigCard: {
    backgroundColor: colors.cardInset,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle
  },
  serverConfigHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6
  },
  serverConfigTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text
  },
  serverConfigDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 10,
    lineHeight: 15
  },
  serverInputRow: {
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10
  },
  serverInput: {
    fontSize: 13,
    color: colors.text
  },
  serverBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  serverSaveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  serverSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF'
  },
  serverCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  serverCancelBtnText: {
    fontSize: 12,
    color: colors.textMuted
  },
  serverFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)'
  },
  serverFooterText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500'
  }
});
