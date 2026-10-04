import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Tabs } from 'expo-router';
import { useEffect, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { navItemsFor, type NavItem } from '@/components/navigation/nav-items';
import { Motion, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useSession } from '@/features/auth/session-context';
import { useTheme } from '@/hooks/use-theme';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/**
 * Material Icons font ships with Expo Go, so the icons never fall back to empty boxes.
 * Nav items use Material Symbols names (`task_alt`); the icon font spells them `task-alt`.
 */
const iconName = (item: NavItem) => item.icon.android.replace(/_/g, '-') as IconName;

/**
 * Phone navigation: Expo Router tabs with a custom bottom bar. The navigator animates tab changes
 * natively ("shift"), which stays smooth even in Expo Go – no JS overlay that could flash.
 * "Poproś o pomoc" sits in the middle as a large warm button.
 */
export default function AppTabs() {
  const { settings } = useAccessibility();

  return (
    <Tabs
      tabBar={(props) => <BottomBar {...props} />}
      screenOptions={{
        headerShown: false,
        animation: settings.reduceMotion ? 'none' : 'shift',
      }}
    />
  );
}

function BottomBar({ state, navigation }: TabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { role } = useSession();
  // Routes hidden for a role stay registered (deep links work) but get no button.
  const items = navItemsFor(role);
  // Requesters get fewer, bigger tabs.
  const simple = role !== 'VOLUNTEER';
  const focusedName = state.routes[state.index]?.name;

  const open = (item: NavItem) => {
    const route = state.routes.find((r) => r.name === item.name);
    if (!route) return;
    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (focusedName !== item.name && !event.defaultPrevented) {
      navigation.navigate(route.name, route.params);
    }
  };

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}>
      {items.map((item) =>
        item.primary ? (
          <AskForHelpButton
            key={item.name}
            item={item}
            focused={focusedName === item.name}
            onPress={() => open(item)}
          />
        ) : (
          <TabButton
            key={item.name}
            item={item}
            simple={simple}
            focused={focusedName === item.name}
            onPress={() => open(item)}
          />
        ),
      )}
    </View>
  );
}

type ButtonProps = { item: NavItem; focused: boolean; simple?: boolean; onPress: () => void };

/** Highlight without a box: coloured icon that grows a little, a bar above it, bold label. */
function TabButton({ item, simple, focused, onPress }: ButtonProps) {
  const theme = useTheme();
  const color = focused ? theme.primary : theme.textSecondary;
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.set(withTiming(focused ? 1 : 0, { duration: Motion.base }));
  }, [focused, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scaleX: interpolate(progress.get(), [0, 1], [0.3, 1]) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.get(), [0, 1], [1, 1.15]) },
      { translateY: interpolate(progress.get(), [0, 1], [0, -1]) },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.label}
      onPress={onPress}
      style={styles.tab}>
      <Animated.View
        style={[styles.indicator, { backgroundColor: theme.primary }, indicatorStyle]}
      />
      <Animated.View style={iconStyle}>
        <MaterialIcons name={iconName(item)} size={simple ? 30 : 26} color={color} />
      </Animated.View>
      <ThemedText
        type={simple ? 'smallBold' : 'caption'}
        style={[{ color }, focused && styles.bold]}
        numberOfLines={1}>
        {item.label}
      </ThemedText>
    </Pressable>
  );
}

function AskForHelpButton({ item, focused, onPress }: ButtonProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={item.label}
      onPress={onPress}
      style={styles.tab}>
      {({ pressed }) => (
        <>
          <View
            style={[
              styles.fab,
              {
                backgroundColor: pressed ? theme.accentStrong : theme.accent,
                borderColor: focused ? theme.accentSoft : theme.backgroundElement,
                transform: [{ scale: pressed ? 0.95 : 1 }],
              },
            ]}>
            <MaterialIcons name={iconName(item)} size={34} color={theme.onAccent} />
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
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    paddingTop: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    minHeight: 52,
  },
  indicator: {
    width: 28,
    height: 3,
    borderRadius: 2,
    marginBottom: Spacing.half,
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
