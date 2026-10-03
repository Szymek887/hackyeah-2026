import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Motion, Radius, Spacing } from '@/constants/theme';
import type { AppNotification } from '@/features/notifications/notifications-context';
import { useTheme } from '@/hooks/use-theme';

/** How long a banner stays on screen before it hides itself. */
const VISIBLE_MS = 6000;

type NotificationBannerProps = {
  notification: AppNotification;
  onDismiss: (id: number) => void;
};

/** Looks like a system notification: slides in from the top, tap opens the request. */
export function NotificationBanner({ notification, onDismiss }: NotificationBannerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id, title, body, target } = notification;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [id, onDismiss]);

  const open = () => {
    onDismiss(id);
    if (target) router.push(target);
  };

  return (
    <Animated.View
      entering={SlideInUp.duration(Motion.base)}
      exiting={SlideOutUp.duration(Motion.base)}
      style={[styles.container, { top: insets.top + Spacing.two }]}
      pointerEvents="box-none">
      <Pressable
        onPress={open}
        accessibilityRole="alert"
        accessibilityLabel={`${title}. ${body}`}
        accessibilityHint={target ? 'Otwiera zgłoszenie' : undefined}
        style={({ pressed }) => [
          styles.banner,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
            opacity: pressed ? 0.85 : 1,
          },
        ]}>
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <SymbolView
            name={{ ios: 'bell.fill', android: 'notifications', web: 'notifications' }}
            size={20}
            tintColor={theme.primary}
          />
        </View>

        <View style={styles.text}>
          <ThemedText type="caption" themeColor="textSecondary">
            PoDrodze · teraz
          </ThemedText>
          <ThemedText type="smallBold" numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {body}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => onDismiss(id)}
          accessibilityRole="button"
          accessibilityLabel="Zamknij powiadomienie"
          hitSlop={Spacing.two}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={16}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.three,
    right: Spacing.three,
    alignItems: 'center',
    zIndex: 1000,
  },
  banner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: StyleSheet.hairlineWidth * 2,
    boxShadow: '0 6px 20px rgba(18, 38, 63, 0.18)',
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    flex: 1,
    gap: Spacing.half,
  },
});
