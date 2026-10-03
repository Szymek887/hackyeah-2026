import { StyleSheet, View } from 'react-native';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';

/** Top of the city panel: the admin has no tabs, so logo and logout live here. */
export function AdminBar() {
  const { user, signOut } = useSession();

  return (
    <View style={styles.bar}>
      <BrandLogo />
      <View style={styles.account}>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.name}>
          {user.displayName}
        </ThemedText>
        <Button title="Wyloguj" variant="secondary" inline onPress={signOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
  },
  name: {
    flexShrink: 1,
  },
});
