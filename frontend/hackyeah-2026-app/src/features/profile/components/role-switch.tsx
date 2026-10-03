import { Pressable, StyleSheet, View } from 'react-native';

import type { UserRole } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS: { role: UserRole; label: string }[] = [
  { role: 'REQUESTER', label: 'Potrzebuję pomocy' },
  { role: 'VOLUNTEER', label: 'Chcę pomagać' },
];

type RoleSwitchProps = {
  role: UserRole;
  onChange: (role: UserRole) => void;
};

/** Segmented control for the mock auth role (F1.4). */
export function RoleSwitch({ role, onChange }: RoleSwitchProps) {
  const theme = useTheme();

  return (
    <View style={[styles.track, { backgroundColor: theme.primarySoft, borderColor: theme.border }]}>
      {OPTIONS.map((option) => {
        const active = option.role === role;
        return (
          <Pressable
            key={option.role}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.role)}
            style={[styles.option, active && { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" themeColor={active ? 'primary' : 'textSecondary'}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: Spacing.one,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.two + Spacing.one,
    borderRadius: Radius.small,
  },
});
