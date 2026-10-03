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

import { BrandLogo } from '@/components/brand-logo';
import { ALL_TABS, navItemsFor, type NavItem } from '@/components/navigation/nav-items';
import { Button } from '@/components/ui/button';
import { Motion, Radius, Spacing, WebNavHeight } from '@/constants/theme';
import { useAuth, useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

/** Web navigation: classic top bar (brand · links · account) instead of the mobile bottom tabs. */
export default function AppTabs() {
  const { role } = useSession();
  const items = navItemsFor(role);
  const visible = new Set(items.map((item) => item.name));

  return (
    <Tabs style={styles.root}>
      <TabList asChild>
        <TopNav>
          {items.map((item) => (
            <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
              {item.primary ? <AskForHelpLink item={item} /> : <NavLink>{item.label}</NavLink>}
            </TabTrigger>
          ))}
          {/* Routes hidden for this role stay registered, so typed URLs do not crash. */}
          {ALL_TABS.filter((tab) => !visible.has(tab.name)).map((tab) => (
            <TabTrigger key={tab.name} name={tab.name} href={tab.href} style={styles.hidden} />
          ))}
        </TopNav>
      </TabList>
      <TabSlot style={styles.slot} />
    </Tabs>
  );
}

/** "Poproś o pomoc" – filled warm pill, the most visible element of the bar. */
function AskForHelpLink({ item, isFocused, ...props }: TabTriggerSlotProps & { item: NavItem }) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      accessibilityRole="link"
      accessibilityState={{ selected: isFocused }}
      style={(state) => {
        const { hovered } = state as typeof state & { hovered?: boolean };
        return [
          styles.cta,
          {
            backgroundColor: hovered || state.pressed ? theme.accentStrong : theme.accent,
            outlineColor: theme.accentSoft,
            outlineWidth: isFocused ? 3 : 0,
            outlineStyle: 'solid',
          } as object,
        ];
      }}>
      <ThemedText type="defaultBold" style={{ color: theme.onAccent }}>
        + {item.label}
      </ThemedText>
    </Pressable>
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
          <BrandLogo />
        </Link>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.links}
          style={styles.linksScroll}>
          {children}
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
  hidden: {
    display: 'none',
  },
  cta: {
    justifyContent: 'center',
    height: 40,
    paddingHorizontal: Spacing.three,
    marginHorizontal: Spacing.two,
    borderRadius: Radius.pill,
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
