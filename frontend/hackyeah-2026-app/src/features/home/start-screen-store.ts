import { Platform } from 'react-native';

/**
 * On phones the requester's start screen ("Potrzebuję pomocy") is shown once, right after login.
 * Once left it cannot be opened again – home is "Moje prośby" from then on, which avoids jumping
 * between the stand-alone start screen and the tab navigator. Cleared on sign-out.
 * Web keeps the start screen as its home page.
 */
let seenByUserId: number | null = null;

export const startScreen = {
  /** Only once per login, and only on phones. */
  isAvailable: (userId: number) => Platform.OS === 'web' || seenByUserId !== userId,
  markSeen: (userId: number) => {
    seenByUserId = userId;
  },
  reset: () => {
    seenByUserId = null;
  },
};
