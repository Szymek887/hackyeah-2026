import { Platform } from 'react-native';

/**
 * Small JSON wrapper over `localStorage`. Web only: native keeps state in memory
 * (no storage dependency yet). Storage can be blocked (private mode), so every call is guarded.
 */
export const webStorage = {
  read<T>(key: string): T | null {
    if (Platform.OS !== 'web') return null;
    try {
      const raw = globalThis.localStorage?.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },
  write(key: string, value: unknown) {
    if (Platform.OS !== 'web') return;
    try {
      if (value === null || value === undefined) globalThis.localStorage?.removeItem(key);
      else globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {
      // Storage blocked – the value simply won't survive a reload.
    }
  },
};
