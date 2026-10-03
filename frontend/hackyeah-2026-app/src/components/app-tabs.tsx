import { SymbolView } from 'expo-symbols';
import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ALL_TABS, navItemsFor, type NavItem } from '@/components/navigation/nav-items';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

/**
 * Phone navigation: custom bottom bar (native tabs cannot style one tab differently).
 * "Poproś o pomoc" sits in the middle as a large warm button.
 */
export default function AppTabs() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { role } = useSession();
  const items = navItemsFor(role);
  const visible = new Set(items.map((item) => item.name));
  // Requesters get fewer, bigger tabs.
  const simple = role !== 'VOLUNTEER';

  return (
    <Tabs style={styles.root}>
      <TabSlot style={styles.root} />
      <TabList
        style={[
          styles.bar,
          {
            backgroundColor: theme.backgroundElement,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, Spacing.two),
          },
        ]}>
        {items.map((item) => (
          <TabTrigger key={item.name} name={item.name} href={item.href} asChild>
            {item.primary ? (
              <AskForHelpButton item={item} />
            ) : (
              <TabButton item={item} simple={simple} />
            )}
          </TabTrigger>
        ))}
        {/* Routes hidden for this role stay registered, so deep links do not crash. */}
        {ALL_TABS.filter((tab) => !visible.has(tab.name)).map((tab) => (
          <TabTrigger key={tab.name} name={tab.name} href={tab.href} style={styles.hidden} />
        ))}
      </TabList>
    </Tabs>
  );
}

type ButtonProps = TabTriggerSlotProps & { item: NavItem; simple?: boolean };

function TabButton({ item, simple, isFocused, ...props }: ButtonProps) {
  const theme = useTheme();
  const color = isFocused ? theme.primary : theme.textSecondary;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={item.label}
      style={styles.tab}>
      <View
        style={[
          styles.iconPill,
          simple && styles.iconPillSimple,
          { backgroundColor: isFocused ? theme.primarySoft : 'transparent' },
        ]}>
        <SymbolView name={item.icon} size={simple ? 30 : 24} tintColor={color} />
      </View>
      <ThemedText
        type={simple ? 'smallBold' : 'caption'}
        style={[{ color }, isFocused && styles.bold]}
        numberOfLines={1}>
        {item.label}
      </ThemedText>
    </Pressable>
  );
}

function AskForHelpButton({ item, isFocused, ...props }: ButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={item.label}
      style={styles.tab}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.fab,
              {
                backgroundColor: pressed ? theme.accentStrong : theme.accent,
                borderColor: isFocused ? theme.accentSoft : theme.backgroundElement,
              },
            ]}>
            <SymbolView name={item.icon} size={34} tintColor={theme.onAccent} weight="bold" />
          </View>
          <ThemedText
            type="smallBold"
            style={[styles.bold, { color: theme.accent }]}
            numberOfLines={1}>
            {item.label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}

const FAB_SIZE = 60;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    minHeight: 48,
  },
  hidden: {
    display: 'none',
  },
  iconPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: 999,
  },
  iconPillSimple: {
    paddingVertical: Spacing.one,
  },
  bold: {
    fontWeight: '700',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    // Lifted above the bar so it reads as the main action.
    marginTop: -FAB_SIZE / 2,
    boxShadow: '0 4px 12px rgba(217, 72, 15, 0.35)',
  },
});
