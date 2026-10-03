import { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Motion } from '@/constants/theme';

/**
 * Shared animation presets. Short, calm and without bounce (clean & casual style).
 * Reanimated respects the OS "reduce motion" setting by default.
 */
export const enterScreen = FadeIn.duration(Motion.base);

/** List / card entrance; `index` staggers items, capped so long lists don't lag. */
export const enterItem = (index = 0) =>
  FadeInDown.duration(Motion.base).delay(Math.min(index, 8) * Motion.stagger);

export const exitItem = FadeOut.duration(Motion.fast);

/** Smoothly moves siblings when items are added, removed or filtered. */
export const layoutTransition = LinearTransition.duration(Motion.base);
