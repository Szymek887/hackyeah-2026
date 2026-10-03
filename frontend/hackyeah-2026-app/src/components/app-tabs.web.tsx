import { Link } from 'expo-router';
import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  type TabTriggerSlotProps,
  type TabListProps,
} from 'expo-router/ui';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Button } from '@/components/ui/button';
import { Motion, Radius, Spacing, WebNavHeight } from '@/constants/theme';
import { useAuth } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

const NAV_ITEMS = [
  { name: 'index', href: '/', label: 'Mapa' },
  { name: 'requests', href: '/requests', label: 'Zgłoszenia' },
  { name: 'tasks', href: '/tasks', label: 'Moje zadania' },
  { name: 'new', href: '/new', label: 'Nowe zgłoszenie' },
  { name: 'profile', href: '/profile', label: 'Profil' },
] as const;

/** Web navigation: classic top bar (brand · links · account) instead of the mobile bottom tabs. */
export default function AppTabs() {
  return (
    <Tabs style={styles.root}>
      <TabList asChild>
        <TopNav>
          {NAV_ITEMS.map((item) => (
            <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
              <NavLink>{item.label}</NavLink>
            </TabTrigger>
          ))}
        </TopNav>
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

function NavLink({ children, isFocused, ...props }: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      accessibilityState={{ selected: isFocused }}
      style={(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        return [
          styles.link,
          { backgroundColor: hovered && !isFocused ? theme.backgroundMuted : 'transparent' },
        ];
      }}>
      <ThemedText type="smallBold" themeColor={isFocused ? 'primary' : 'textSecondary'}>
        {children}
      </ThemedText>
      <View
        style={[
          styles.underline,
          {
            backgroundColor: theme.primary,
            opacity: isFocused ? 1 : 0,
            transform: [{ scaleX: isFocused ? 1 : 0.4 }],
            // CSS transition, web only.
            transitionProperty: 'opacity, transform',
            transitionDuration: `${Motion.base}ms`,
          } as object,
        ]}
      />
    </Pressable>
  );
}

function TopNav({ children, ...props }: TabListProps) {
  const theme = useTheme();
  const { user, signOut } = useAuth();

  return (
    <View
      {...props}
      accessibilityRole="header"
      style={[
        styles.bar,
        { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border },
      ]}>
      <View style={styles.inner}>
        <Link href="/" style={styles.brand}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" themeColor="onPrimary">
              P
            </ThemedText>
          </View>
          <ThemedText type="defaultBold"> PoDrodze</ThemedText>
        </Link>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.links}
          style={styles.linksScroll}>
          {children}
          {user?.role === 'CITY_ADMIN' && (
            <Link href="/dashboard" style={styles.link}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Panel miasta
              </ThemedText>
            </Link>
          )}
        </ScrollView>

        {user && (
          <View style={styles.account}>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {user.displayName}
            </ThemedText>
            <Button title="Wyloguj" variant="ghost" inline onPress={signOut} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  bar: {
    height: WebNavHeight,
    borderBottomWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 1120,
    paddingHorizontal: Spacing.three,
    gap: Spacing.four,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linksScroll: {
    flex: 1,
  },
  links: {
    alignItems: 'center',
    gap: Spacing.one,
  },
  link: {
    height: WebNavHeight,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  underline: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    bottom: 0,
    height: 3,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
});
