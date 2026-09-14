import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Platform } from 'react-native';
import { APP_BUILD_VERSION } from '../version';
import { getDefaultApiBase } from '../api/client';

export function compareVersions(v1: string, v2: string): number {
  const clean = (v: string) => (v || '').replace(/^v/i, '').trim();
  const parts1 = clean(v1).split('.').map(n => parseInt(n, 10) || 0);
  const parts2 = clean(v2).split('.').map(n => parseInt(n, 10) || 0);
  const maxLen = Math.max(parts1.length, parts2.length, 3);
  for (let i = 0; i < maxLen; i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 > p2) return 1;
    if (p1 < p2) return -1;
  }
  return 0;
}

export function isNewerVersion(remote: string, local: string): boolean {
  return compareVersions(remote, local) > 0;
}

interface UpdateContextType {
  updateAvailable: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseNotes: string;
  isChecking: boolean;
  isUpdating: boolean;
  lastChecked: number | null;
  bannerDismissed: boolean;
  dismissBanner: () => void;
  checkForUpdates: (manual?: boolean) => Promise<{ updateAvailable: boolean; latestVersion: string }>;
  applyUpdate: () => Promise<void>;
  forceCleanCache: () => Promise<void>;
}

const UpdateContext = createContext<UpdateContextType | null>(null);

const POLL_INTERVAL_MS = 35 * 1000; // Check every 35s

export const UpdateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [updateAvailable, setUpdateAvailable] = useState<boolean>(false);
  const [currentVersion] = useState<string>(APP_BUILD_VERSION);
  const [latestVersion, setLatestVersion] = useState<string>(APP_BUILD_VERSION);
  const [releaseNotes, setReleaseNotes] = useState<string>('');
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const [bannerDismissedUntil, setBannerDismissedUntil] = useState<number>(0);

  const checkForUpdates = useCallback(async (manual = false): Promise<{ updateAvailable: boolean; latestVersion: string }> => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return { updateAvailable: false, latestVersion: APP_BUILD_VERSION };
    }

    setIsChecking(true);
    let candidateVersion = APP_BUILD_VERSION;
    let candidateNotes = '';

    // Check service worker for pending updates
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          reg.update().catch(() => {});
        }
      } catch (_) {}
    }

    // 1. Check static version.json
    try {
      const res = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.version) {
          const v = String(data.version).trim();
          if (compareVersions(v, candidateVersion) > 0) {
            candidateVersion = v;
            candidateNotes = data.releaseNotes || '';
          }
        }
      }
    } catch (_) {}

    // 2. Check backend API version
    try {
      const apiBase = getDefaultApiBase();
      const res = await fetch(`${apiBase}/api/version?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.version) {
          const v = String(data.version).trim();
          if (compareVersions(v, candidateVersion) > 0) {
            candidateVersion = v;
            candidateNotes = data.releaseNotes || candidateNotes;
          }
        }
      }
    } catch (_) {}

    // 3. Fallback /version
    if (candidateVersion === APP_BUILD_VERSION) {
      try {
        const apiBase = getDefaultApiBase();
        const res = await fetch(`${apiBase}/version?_t=${Date.now()}`, {
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version) {
            const v = String(data.version).trim();
            if (compareVersions(v, candidateVersion) > 0) {
              candidateVersion = v;
              candidateNotes = data.releaseNotes || candidateNotes;
            }
          }
        }
      } catch (_) {}
    }

    setLastChecked(Date.now());
    setIsChecking(false);

    const hasNew = isNewerVersion(candidateVersion, APP_BUILD_VERSION);
    if (hasNew) {
      setLatestVersion(candidateVersion);
      if (candidateNotes) setReleaseNotes(candidateNotes);
      setUpdateAvailable(true);
      return { updateAvailable: true, latestVersion: candidateVersion };
    } else {
      setUpdateAvailable(false);
      return { updateAvailable: false, latestVersion: APP_BUILD_VERSION };
    }
  }, []);

  const applyUpdate = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    setIsUpdating(true);

    try {
      // 1. Unregister all service workers and skip waiting
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          try {
            if (reg.waiting) {
              reg.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            if (reg.active) {
              reg.active.postMessage({ type: 'CLEAR_CACHE' });
            }
            await reg.unregister();
          } catch (_) {}
        }
      }

      // 2. Delete all caches in CacheStorage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 3. Clear session storage flags
      try {
        window.sessionStorage.clear();
      } catch (_) {}
    } catch (err) {
      console.warn('[ChipMate Update] Cache cleanup warning:', err);
    }

    // 4. Force hard navigation reload bypassing browser HTTP cache
    setTimeout(() => {
      const cleanUrl = window.location.origin + window.location.pathname + '?_v=' + Date.now();
      window.location.replace(cleanUrl);
    }, 250);
  }, []);

  const forceCleanCache = useCallback(async () => {
    await applyUpdate();
  }, [applyUpdate]);

  const dismissBanner = useCallback(() => {
    // Snooze the top banner for 5 minutes (never permanently suppress an outdated version)
    setBannerDismissedUntil(Date.now() + 5 * 60 * 1000);
  }, []);

  // Periodic and reactive triggers
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Initial check after 1.5s
    const initTimer = setTimeout(() => {
      checkForUpdates();
    }, 1500);

    // Listen to custom event from SW
    const handleSwUpdate = () => {
      checkForUpdates();
    };
    window.addEventListener('chipmate-update-available', handleSwUpdate);

    // Visibility / tab focus triggers
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('online', handleVisibility);

    // Background interval
    const interval = setInterval(() => {
      checkForUpdates();
    }, POLL_INTERVAL_MS);

    return () => {
      clearTimeout(initTimer);
      clearInterval(interval);
      window.removeEventListener('chipmate-update-available', handleSwUpdate);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('online', handleVisibility);
    };
  }, [checkForUpdates]);

  const bannerDismissed = Date.now() < bannerDismissedUntil;

  return (
    <UpdateContext.Provider
      value={{
        updateAvailable,
        currentVersion,
        latestVersion,
        releaseNotes,
        isChecking,
        isUpdating,
        lastChecked,
        bannerDismissed,
        dismissBanner,
        checkForUpdates,
        applyUpdate,
        forceCleanCache
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
};

export const useUpdate = (): UpdateContextType => {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error('useUpdate must be used within an UpdateProvider');
  }
  return context;
};
