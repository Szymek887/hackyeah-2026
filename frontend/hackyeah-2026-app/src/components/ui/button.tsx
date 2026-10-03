import { Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, variant = 'primary', disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={(state) => [
        styles.base,
        { backgroundColor: primary ? theme.primary : theme.backgroundElement },
        (state.pressed || disabled) && styles.dimmed,
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      <ThemedText type="smallBold" style={{ color: primary ? theme.onPrimary : theme.text }}>
        {title}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  dimmed: {
    opacity: 0.6,
  },
});
