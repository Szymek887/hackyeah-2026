import { useSyncExternalStore } from 'react';

import {
  adjustForDisabilities,
  defaultAccessibilitySettings,
  settingsForAgeGroup,
  TextScale,
  type AccessibilitySettings,
  type AgeGroup,
  type DisabilityType,
} from '@/features/accessibility/accessibility-settings';
import { webStorage } from '@/lib/web-storage';

const STORAGE_KEY = 'podrodze.accessibility';

let current: AccessibilitySettings = {
  ...defaultAccessibilitySettings,
  ...webStorage.read<Partial<AccessibilitySettings>>(STORAGE_KEY),
};
const listeners = new Set<() => void>();

function set(next: AccessibilitySettings) {
  current = next;
  webStorage.write(STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

export const accessibilityStore = {
  get: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  /** Applies the preset of the age group (overrides manual tweaks). */
  setAgeGroup: (ageGroup: AgeGroup) => set(settingsForAgeGroup(ageGroup)),
  update: (changes: Partial<AccessibilitySettings>) => set({ ...current, ...changes }),
  /** Makes the display fit the needs declared at sign-up / in the profile. */
  applyDisabilities: (disabilities: DisabilityType[]) =>
    set(adjustForDisabilities(current, disabilities)),
  reset: () => set(defaultAccessibilitySettings),
};

/** Current display preferences plus derived values used by the UI primitives. */
export function useAccessibility() {
  const settings = useSyncExternalStore(
    accessibilityStore.subscribe,
    accessibilityStore.get,
    () => defaultAccessibilitySettings,
  );

  return {
    settings,
    textScale: TextScale[settings.textSize],
    /** Minimum height of tappable elements (WCAG 2.5.5 recommends 44, seniors benefit from more). */
    minTouchSize: settings.largeTouchTargets ? 56 : 44,
    setAgeGroup: accessibilityStore.setAgeGroup,
    updateSettings: accessibilityStore.update,
    applyDisabilities: accessibilityStore.applyDisabilities,
    resetSettings: accessibilityStore.reset,
  };
}
