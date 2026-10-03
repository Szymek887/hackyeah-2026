import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useTheme } from '@/hooks/use-theme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, multiline, style, onFocus, onBlur, ...rest }: InputProps) {
  const theme = useTheme();
  const { textScale, minTouchSize, settings } = useAccessibility();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;

  return (
    <View style={styles.container}>
      {label && <ThemedText type="smallBold">{label}</ThemedText>}
      <TextInput
        placeholderTextColor={theme.textSecondary}
        accessibilityLabel={label}
        accessibilityHint={error}
        multiline={multiline}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[
          styles.input,
          multiline && styles.multiline,
          { color: theme.text, backgroundColor: theme.backgroundElement, borderColor },
          {
            fontSize: Math.round(16 * textScale),
            minHeight: minTouchSize,
            borderWidth: settings.palette !== 'standard' || focused ? 2 : 1,
          },
          style,
        ]}
        {...rest}
      />
      {error && (
        <ThemedText type="caption" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  input: {
    fontSize: 16,
    paddingVertical: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  multiline: {
    minHeight: 112,
    textAlignVertical: 'top',
  },
});
