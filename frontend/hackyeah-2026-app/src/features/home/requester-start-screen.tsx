import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Radius, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useSession } from '@/features/auth/session-context';
import { toDraftParams } from '@/features/voice/voice-draft';
import { VoiceRequestFlow } from '@/features/voice/voice-request-flow';
import { useTheme } from '@/hooks/use-theme';
import { enterScreen } from '@/lib/motion';

/**
 * First screen of a person who needs help, top to bottom:
 * 0. a top bar with the logo and "Wyloguj" (this screen has no tab bar or web nav),
 * 1. the large orange "Potrzebuję pomocy" button,
 * 2. asking by voice (AI turns the speech into a request preview to accept),
 * 3. two tiles side by side: type the request by hand / my requests.
 */
export function RequesterStartScreen() {
  const theme = useTheme();
  const { textScale } = useAccessibility();
  const { user, signOut } = useSession();
  const firstName = user.displayName.split(' ')[0];
  const size = Math.round(200 * Math.min(textScale, 1.25));

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View
        accessibilityRole="header"
        style={[
          styles.topBar,
          { backgroundColor: theme.backgroundElement, borderBottomColor: theme.border },
        ]}>
        <View style={styles.topBarInner}>
          <BrandLogo />
          <Button
            title="Wyloguj"
            variant="secondary"
            inline
            accessibilityLabel={`Wyloguj się z konta ${user.displayName}`}
            onPress={signOut}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View entering={enterScreen} style={styles.content}>
          <View style={styles.header}>
            <ThemedText type="title" accessibilityRole="header" style={styles.center}>
              Dzień dobry, {firstName}!
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.center}>
              Zakupy, leki albo drobna pomoc w domu – sąsiedzi zrobią to po drodze.
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Potrzebuję pomocy"
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
              size={Math.round(size * 0.26)}
              tintColor={theme.onAccent}
            />
            <ThemedText type="subtitle" style={[styles.center, { color: theme.onAccent }]}>
              Potrzebuję pomocy
            </ThemedText>
          </Pressable>

          <View style={styles.voice}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
              albo powiedz, czego potrzebujesz – przygotujemy zgłoszenie za Ciebie
            </ThemedText>
            <VoiceRequestFlow
              onAccept={(draft) =>
                router.replace({ pathname: '/new', params: toDraftParams(draft) })
              }
            />
          </View>

          <View style={styles.tiles}>
            <Tile
              title="Wpisz ręcznie"
              description="Napisz prośbę w formularzu"
              onPress={() => router.replace('/new')}
            />
            <Tile
              title="Moje zgłoszenia"
              description="Sprawdź, kto Ci pomaga"
              onPress={() => router.replace('/tasks')}
            />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

type TileProps = {
  title: string;
  description: string;
  onPress: () => void;
};

function Tile({ title, description, onPress }: TileProps) {
  const theme = useTheme();
  const { minTouchSize } = useAccessibility();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      style={(state) => {
        const { hovered, focused } = state as typeof state & {
          hovered?: boolean;
          focused?: boolean;
        };
        return [
          styles.tile,
          {
            minHeight: minTouchSize * 2,
            borderColor: focused || hovered ? theme.primary : theme.border,
            borderWidth: focused ? 2.5 : 1.5,
            backgroundColor:
              state.pressed || hovered ? theme.backgroundMuted : theme.backgroundElement,
          },
        ];
      }}>
      <ThemedText type="defaultBold" themeColor="primary">
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {description}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  topBarInner: {
    width: '100%',
    maxWidth: 1120,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
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
  bigButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 6,
    padding: Spacing.three,
    boxShadow: '0 8px 24px rgba(217, 72, 15, 0.3)',
  },
  voice: {
    width: '100%',
    gap: Spacing.two,
  },
  tiles: {
    width: '100%',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  tile: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
});
