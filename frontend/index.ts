import { registerRootComponent } from 'expo';
import { Alert, Platform } from 'react-native';

// Polyfill Alert.alert for Web because react-native-web provides an empty no-op
if (Platform.OS === 'web') {
  Alert.alert = (title: string, message?: string, buttons?: Array<{ text?: string; onPress?: () => void; style?: string }>) => {
    const fullText = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length <= 1) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(fullText);
      }
      buttons?.[0]?.onPress?.();
      return;
    }
    // Confirmation dialog with multiple options (e.g. Cancel vs Confirm)
    const confirmed = typeof window !== 'undefined' && window.confirm ? window.confirm(fullText) : true;
    if (confirmed) {
      const confirmButton = buttons.find(b => b.style !== 'cancel') || buttons[1] || buttons[0];
      confirmButton?.onPress?.();
    } else {
      const cancelButton = buttons.find(b => b.style === 'cancel');
      cancelButton?.onPress?.();
    }
  };
}

import App from './App';

registerRootComponent(App);
