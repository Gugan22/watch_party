'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook to request and maintain a Screen Wake Lock (prevents mobile phone screen from dimming or locking during movie watching).
 * Supports modern Android Chrome, Edge, and iOS 18.4+ PWA.
 */
export function useWakeLock(enabled: boolean = true) {
  const [isLocked, setIsLocked] = useState(false);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    let released = false;

    async function requestLock() {
      if (typeof window === 'undefined' || !('wakeLock' in navigator)) {
        return;
      }
      try {
        if (enabled && !wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setIsLocked(true);
          wakeLockRef.current.addEventListener('release', () => {
            setIsLocked(false);
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        // WakeLock request can fail if battery is low or user has tab in background
        setIsLocked(false);
      }
    }

    if (enabled) {
      requestLock();
    } else if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setIsLocked(false);
    }

    // Re-acquire lock if tab regains visibility
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabled) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [enabled]);

  return { isLocked };
}
