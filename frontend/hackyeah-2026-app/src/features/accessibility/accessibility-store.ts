import { useSyncExternalStore } from 'react';

import {
  defaultAccessibilitySettings,
  settingsForAgeGroup,
  TextScale,
  type AccessibilitySettings,
  type AgeGroup,
} from '@/features/accessibility/accessibility-settings';
import { webStorage } from '@/lib/web-storage';

const STORAGE_KEY = 'podrodze.ageGroup';

/** Only the age group is stored; text size, contrast and button size always follow from it. */
const storedAgeGroup = webStorage.read<AgeGroup>(STORAGE_KEY);
let current: AccessibilitySettings = storedAgeGroup
  ? settingsForAgeGroup(storedAgeGroup)
  : defaultAccessibilitySettings;
const listeners = new Set<() => void>();

export const accessibilityStore = {
  get: () => current,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  setAgeGroup(ageGroup: AgeGroup) {
    current = settingsForAgeGroup(ageGroup);
    webStorage.write(STORAGE_KEY, ageGroup);
    listeners.forEach((listener) => listener());
  },
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
  };
}
