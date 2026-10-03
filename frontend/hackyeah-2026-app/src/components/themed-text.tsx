import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'defaultBold'
    | 'title'
    | 'subtitle'
    | 'small'
    | 'smallBold'
    | 'caption'
    | 'link'
    | 'linkPrimary'
    | 'code';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const { textScale } = useAccessibility();
  const defaultColor = type === 'linkPrimary' ? 'primary' : 'text';
  const base = styles[type];

  return (
    <Text
      style={[
        { color: theme[themeColor ?? defaultColor] },
        base,
        // Accessibility text size (age group / profile setting), on top of the OS font scale.
        textScale !== 1 && scaled(base, textScale),
        style,
      ]}
      {...rest}
    />
  );
}

function scaled(base: TextStyle, scale: number): TextStyle {
  return {
    fontSize: base.fontSize && Math.round(base.fontSize * scale),
    lineHeight: base.lineHeight && Math.round(base.lineHeight * scale),
  };
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 600,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 400,
  },
  defaultBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 600,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 400,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: 500,
  },
  link: {
    fontSize: 14,
    lineHeight: 20,
    textDecorationLine: 'underline',
  },
  linkPrimary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 600,
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
