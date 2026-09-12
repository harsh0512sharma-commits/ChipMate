import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const TOKEN_KEY = 'chipmate_token';
const API_URL_KEY = 'chipmate_api_url';

let cachedToken: string | null = null;

export function getDefaultApiBase(): string {
  // 1. Environment variable (configured in Vercel or local .env)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    const trimmed = envUrl.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  }

  // 2. Localhost development on web
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:4000/api';
    }
  }

  // 3. Fallback for deployed cloud apps (Render backend default)
  return 'https://chipmate.onrender.com/api';
}

export async function loadSavedApiBase(): Promise<string> {
  try {
    // Security & reliability cleanup: remove any legacy stored custom URL
    await AsyncStorage.removeItem(API_URL_KEY);
  } catch (_) {}
  return getDefaultApiBase();
}

export async function setAuthToken(token: string | null) {
  cachedToken = token;
  if (token) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } else {
    await AsyncStorage.removeItem(TOKEN_KEY);
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  try {
    cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  } catch (_) {}
  return cachedToken;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const token = await getAuthToken();
  const baseUrl = getDefaultApiBase();
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json();

  if (!response.ok || (data && data.success === false)) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data;
}
