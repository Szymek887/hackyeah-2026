import {
  Platform,
  Pressable,
  StyleSheet,
  type PressableProps,
  type PressableStateCallbackType,
} from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Motion, Radius, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  /**
   * primary   – solid blue, the one main action on a screen
   * secondary – white with blue border, alternative actions
   * ghost     – text only, low-emphasis actions ("Anuluj", "Pokaż więcej")
   * danger    – destructive actions
   */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'medium' | 'large';
  /** Shrink to the label width instead of filling the row. */
  inline?: boolean;
};

export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  inline = false,
  disabled,
  style,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { minTouchSize } = useAccessibility();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  const palette = {
    primary: {
      background: theme.primary,
      active: theme.primaryStrong,
      text: theme.onPrimary,
      border: theme.primary,
    },
    secondary: {
      background: theme.backgroundElement,
      active: theme.primarySoft,
      text: theme.primary,
      border: theme.primary,
    },
    ghost: {
      background: 'transparent',
      active: theme.primarySoft,
      text: theme.primary,
      border: 'transparent',
    },
    danger: {
      background: theme.backgroundElement,
      active: theme.dangerSoft,
      text: theme.danger,
      border: theme.danger,
    },
  }[variant];

  return (
    <Animated.View style={[animatedStyle, inline && styles.inline]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={(event) => {
          scale.set(withTiming(0.98, { duration: Motion.fast }));
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          scale.set(withTiming(1, { duration: Motion.fast }));
          onPressOut?.(event);
        }}
        style={(state: PressableStateCallbackType) => {
          // `hovered` / `focused` exist only on web (react-native-web).
          const { pressed, hovered, focused } = state as typeof state & {
            hovered?: boolean;
            focused?: boolean;
          };
          return [
            styles.base,
            size === 'large' && styles.large,
            { minHeight: size === 'large' ? minTouchSize + 8 : minTouchSize },
            {
              backgroundColor: pressed || hovered ? palette.active : palette.background,
              borderColor: palette.border,
            },
            focused &&
              Platform.OS === 'web' && { outlineColor: theme.primary, ...styles.focusRing },
            disabled && styles.disabled,
            typeof style === 'function' ? style(state) : style,
          ];
        }}
        {...rest}>
        <ThemedText
          type={size === 'large' ? 'defaultBold' : 'smallBold'}
          style={[styles.label, { color: palette.text }]}>
          {title}
        </ThemedText>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three + Spacing.one,
    borderRadius: Radius.small + 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  large: {
    minHeight: 52,
    paddingHorizontal: Spacing.four,
  },
  inline: {
    alignSelf: 'flex-start',
  },
  label: {
    textAlign: 'center',
  },
  focusRing: {
    outlineWidth: 2,
    outlineStyle: 'solid',
    outlineOffset: 2,
  },
  disabled: {
    opacity: 0.45,
  },
});
