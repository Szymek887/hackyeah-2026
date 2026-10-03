import { StyleSheet, View, type ViewProps } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardProps = ViewProps & {
  /** Light blue background instead of white, for highlighted content. */
  highlighted?: boolean;
};

/** White surface with a thin border. The base container for list items and sections. */
export function Card({ highlighted = false, style, ...rest }: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: highlighted ? theme.primarySoft : theme.backgroundElement,
          borderColor: highlighted ? theme.primarySoft : theme.border,
        },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth * 2,
    gap: Spacing.two,
  },
});
