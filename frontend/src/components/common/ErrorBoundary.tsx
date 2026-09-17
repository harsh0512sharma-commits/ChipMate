import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform
} from 'react-native';
import { AlertTriangle, RefreshCw, LogOut, Home } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { ChipMateLogo } from '../ChipMateBrand';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ChipMate ErrorBoundary Caught Error]:', error, errorInfo);
  }

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  handleResetToHome = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        window.history.replaceState({}, document.title, '/');
      } catch (_) {}
      window.location.href = '/';
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  handleLogout = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        localStorage.removeItem('chipmate_token');
        localStorage.removeItem('@chipmate_auth_token');
        window.history.replaceState({}, document.title, '/');
      } catch (_) {}
      window.location.href = '/';
    } else {
      this.setState({ hasError: false, error: null });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0B0D12" />
          <View style={styles.card}>
            <View style={styles.logoRow}>
              <ChipMateLogo size={44} borderRadius={10} />
            </View>

            <View style={styles.iconCircle}>
              <AlertTriangle size={32} color={colors.dangerText} />
            </View>

            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              An unexpected render issue occurred. Your game ledger data is safely preserved on the server.
            </Text>

            {this.state.error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText} numberOfLines={3}>
                  {this.state.error.message || String(this.state.error)}
                </Text>
              </View>
            )}

            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={this.handleReload}
                activeOpacity={0.8}
              >
                <RefreshCw size={16} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryBtnText}>Reload App</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={this.handleResetToHome}
                activeOpacity={0.8}
              >
                <Home size={16} color={colors.text} style={{ marginRight: 8 }} />
                <Text style={styles.secondaryBtnText}>Return to Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ghostBtn}
                onPress={this.handleLogout}
                activeOpacity={0.7}
              >
                <LogOut size={15} color={colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.ghostBtnText}>Log Out & Return to Landing</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07090D',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#12151D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24
  },
  logoRow: {
    marginBottom: 16
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
    marginBottom: 8,
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#090B0F',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 10,
    marginBottom: 20
  },
  errorText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#F87171',
    lineHeight: 16
  },
  buttonGroup: {
    width: '100%',
    gap: 10
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    width: '100%'
  },
  primaryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700'
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E232F',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
    width: '100%'
  },
  secondaryBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600'
  },
  ghostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4
  },
  ghostBtnText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600'
  }
});
