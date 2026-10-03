import { Platform, RefreshControl, ScrollView, StyleSheet, type ViewProps } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useRefresh } from '@/hooks/use-refresh';
import { useTheme } from '@/hooks/use-theme';
import { enterScreen } from '@/lib/motion';

type ScreenProps = ViewProps & {
  scroll?: boolean;
  /** Pull-to-refresh on phones (scroll screens only). Resolve when the data is fresh. */
  onRefresh?: () => Promise<unknown>;
};

/** Base wrapper for every screen: safe area, white background, max width on web, fade-in. */
export function Screen({ scroll = false, onRefresh, style, children, ...rest }: ScreenProps) {
  const theme = useTheme();
  const refresh = useRefresh(onRefresh ?? (() => Promise.resolve()));
  const content = (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <Animated.View
        entering={enterScreen}
        style={[styles.content, { backgroundColor: theme.background }, style]}
        {...rest}>
        {children}
      </Animated.View>
    </SafeAreaView>
  );

  return (
    <ThemedView style={styles.root}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refresh.refreshing}
                onRefresh={refresh.onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            ) : undefined
          }>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
    paddingBottom: Platform.OS === 'web' ? Spacing.five : Spacing.three,
    gap: Spacing.three,
  },
});
