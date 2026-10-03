import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { UserProfile, UserRole } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Radius, Spacing } from '@/constants/theme';
import { RoleLabels } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';
import { enterScreen } from '@/lib/motion';

const GROUP_LABELS: Record<UserRole, string> = {
  REQUESTER: 'Potrzebuję pomocy',
  VOLUNTEER: 'Potrzebuję i pomagam',
  CITY_ADMIN: 'Urząd miasta',
};
const ROLES = Object.keys(GROUP_LABELS) as UserRole[];

type AccountSelectProps = {
  accounts: UserProfile[];
  value: UserProfile | null;
  onChange: (account: UserProfile) => void;
};

/** Single dropdown field with the accounts grouped by role, instead of one long list. */
export function AccountSelect({ accounts, value, onChange }: AccountSelectProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="combobox"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Konto: ${value?.displayName ?? 'nie wybrano'}`}
        onPress={() => setOpen((current) => !current)}
        style={(state) => {
          const { hovered } = state as typeof state & { hovered?: boolean };
          return [
            styles.field,
            {
              borderColor: open || hovered ? theme.primary : theme.border,
              backgroundColor: theme.backgroundElement,
            },
          ];
        }}>
        <View style={styles.flex}>
          {value ? (
            <>
              <ThemedText type="defaultBold">{value.displayName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {RoleLabels[value.role]}
                {value.identityVerified ? ' · zweryfikowany' : ''}
              </ThemedText>
            </>
          ) : (
            <ThemedText themeColor="textSecondary">Wybierz konto</ThemedText>
          )}
        </View>
        <ThemedText themeColor="textSecondary">{open ? '▴' : '▾'}</ThemedText>
      </Pressable>

      {open && (
        <Animated.View
          entering={enterScreen}
          style={[
            styles.menu,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {ROLES.map((role) => {
              const group = accounts.filter((a) => a.role === role);
              if (group.length === 0) return null;
              return (
                <View key={role}>
                  <ThemedText type="caption" themeColor="textSecondary" style={styles.groupLabel}>
                    {GROUP_LABELS[role].toUpperCase()}
                  </ThemedText>
                  {group.map((account) => (
                    <AccountRow
                      key={account.id}
                      account={account}
                      selected={account.id === value?.id}
                      onPress={() => {
                        onChange(account);
                        setOpen(false);
                      }}
                    />
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
}

type AccountRowProps = {
  account: UserProfile;
  selected: boolean;
  onPress: () => void;
};

function AccountRow({ account, selected, onPress }: AccountRowProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="menuitem"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        return [
          styles.row,
          {
            backgroundColor: selected
              ? theme.primarySoft
              : hovered
                ? theme.backgroundMuted
                : 'transparent',
          },
        ];
      }}>
      <ThemedText type={selected ? 'defaultBold' : 'default'} style={styles.flex}>
        {account.displayName}
      </ThemedText>
      {account.identityVerified && (
        <Badge label="Zweryfikowany" color={theme.success} backgroundColor={theme.successSoft} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.one,
  },
  flex: {
    flex: 1,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 56,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1.5,
  },
  menu: {
    maxHeight: 280,
    borderRadius: Radius.medium,
    borderWidth: 1,
    paddingVertical: Spacing.one,
  },
  groupLabel: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
});
