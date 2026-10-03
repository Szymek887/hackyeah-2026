import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useSession } from '@/features/auth/session-context';
import { VoiceRequestBar } from '@/features/voice/voice-request-bar';
import { useTheme } from '@/hooks/use-theme';
import { enterScreen } from '@/lib/motion';

/**
 * First screen of a person who needs help: voice assistant and one large, warm "Poproś o pomoc"
 * button in the middle. Both actions lead into the regular flow.
 */
export function RequesterStartScreen() {
  const theme = useTheme();
  const { textScale } = useAccessibility();
  const { user } = useSession();
  const firstName = user.displayName.split(' ')[0];
  const size = Math.round(180 * Math.min(textScale, 1.2));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View entering={enterScreen} style={styles.content}>
          <View style={styles.header}>
            <BrandLogo />
            <ThemedText type="title" accessibilityRole="header" style={styles.center}>
              Dzień dobry, {firstName}!
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Zakupy, leki albo drobna pomoc w domu – sąsiedzi zrobią to po drodze.
            </ThemedText>
          </View>

          {/* Voice Assistant - voice input for seniors */}
          <View style={styles.voiceSection}>
            <VoiceRequestBar />
          </View>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <ThemedText type="caption" themeColor="textSecondary">
              LUB WYBIERZ RĘCZNIE
            </ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Poproś o pomoc"
            accessibilityHint="Otwiera formularz prośby o pomoc"
            onPress={() => router.replace('/new')}
            style={(state) => {
              const { hovered, focused } = state as typeof state & {
                hovered?: boolean;
                focused?: boolean;
              };
              return [
                styles.bigButton,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: state.pressed || hovered ? theme.accentStrong : theme.accent,
                  borderColor: focused ? theme.text : theme.accentSoft,
                },
              ];
            }}>
            <SymbolView
              name={{ ios: 'hand.raised.fill', android: 'front_hand', web: 'front_hand' }}
              size={Math.round(size * 0.28)}
              tintColor={theme.onAccent}
            />
            <ThemedText type="subtitle" style={[styles.center, { color: theme.onAccent }]}>
              Poproś o pomoc
            </ThemedText>
          </Pressable>

          <View style={styles.menuButton}>
            <Button
              title="Przejdź do moich próśb"
              variant="secondary"
              size="large"
              onPress={() => router.replace('/tasks')}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  content: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.four,
  },
  header: {
    width: '100%',
    alignItems: 'center',
    gap: Spacing.two,
  },
  center: {
    textAlign: 'center',
  },
  voiceSection: {
    width: '100%',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: Spacing.two,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  bigButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 6,
    padding: Spacing.three,
    boxShadow: '0 8px 24px rgba(217, 72, 15, 0.35)',
  },
  menuButton: {
    width: '100%',
    maxWidth: 320,
  },
});
