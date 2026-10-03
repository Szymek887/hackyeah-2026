import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/brand-logo';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { useSession } from '@/features/auth/session-context';
import { useVoiceAssistant } from '@/features/voice/use-voice-assistant';
import { useTheme } from '@/hooks/use-theme';
import { enterScreen } from '@/lib/motion';

/**
 * Minimalist start screen for requesters:
 * 1. Big circular button to ask for help with voice (lights up in real-time to audio volume).
 * 2. Spoken instructions on top.
 * 3. Manual text option and menu below.
 */
export function RequesterStartScreen() {
  const theme = useTheme();
  const { textScale } = useAccessibility();
  const { user } = useSession();
  const firstName = user.displayName.split(' ')[0];
  const size = Math.round(220 * Math.min(textScale, 1.25));

  const [spokenText, setSpokenText] = useState('');

  const voice = useVoiceAssistant((text) => {
    setSpokenText(text);
  });

  const displayText = spokenText || voice.transcript;

  const handleCreateRequest = () => {
    const text = displayText.trim();
    if (!text) return;
    router.push({
      pathname: '/new',
      params: { initialVoiceText: encodeURIComponent(text) },
    });
  };

  const handleListenPrompt = () => {
    if (voice.isSpeaking) {
      voice.stopSpeaking();
    } else {
      voice.speak(
        'Dzień dobry. Dotknij duże koło na środku ekranu i powiedz, w czym sąsiad może Ci pomóc. Na przykład: proszę o zakup chleba i leków z apteki. Możesz też wybrać opcję Wpisz prośbę ręcznie poniżej.',
      );
    }
  };

  // Dynamic glow and scale driven by real-time voice volume
  const glowRadius = voice.isListening ? 18 + Math.round(voice.volumeLevel * 50) : 10;
  const glowOpacity = voice.isListening ? 0.4 + voice.volumeLevel * 0.6 : 0.35;
  const glowScale = voice.isListening ? 1 + voice.volumeLevel * 0.12 : 1;

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

            {/* Instruction button */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                voice.isSpeaking ? 'Zatrzymaj instrukcję głosową' : 'Odsłuchaj instrukcję głosową'
              }
              onPress={handleListenPrompt}
              style={[
                styles.instructionBtn,
                {
                  backgroundColor: voice.isSpeaking
                    ? theme.backgroundSelected
                    : theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}>
              <ThemedText type="smallBold">
                {voice.isSpeaking ? '⏹️ Zatrzymaj lektora' : '🔊 Instrukcja głosowa'}
              </ThemedText>
            </Pressable>
          </View>

          {/* Central Voice Circle with dynamic sound-reactive lighting */}
          <View style={styles.circleWrapper}>
            {voice.isListening && (
              <View
                style={[
                  styles.volumeHalo,
                  {
                    width: size + 34,
                    height: size + 34,
                    borderRadius: (size + 34) / 2,
                    borderColor: theme.accent,
                    transform: [{ scale: glowScale }],
                    opacity: 0.3 + voice.volumeLevel * 0.7,
                  },
                ]}
              />
            )}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                voice.isListening
                  ? 'Zatrzymaj słuchanie'
                  : 'Poproś o pomoc za pomocą głosu. Dotknij, aby mówić'
              }
              onPress={() => {
                if (voice.isListening) {
                  voice.stopListening();
                } else {
                  setSpokenText('');
                  voice.resetTranscript();
                  voice.startListening();
                }
              }}
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
                    backgroundColor: voice.isListening
                      ? theme.danger
                      : state.pressed || hovered
                        ? theme.accentStrong
                        : theme.accent,
                    borderColor: focused
                      ? theme.text
                      : voice.isListening
                        ? theme.dangerSoft
                        : theme.accentSoft,
                    transform: [{ scale: glowScale }],
                    boxShadow: `0 0 ${glowRadius}px rgba(${
                      voice.isListening ? '220, 38, 38' : '217, 72, 15'
                    }, ${glowOpacity})`,
                  },
                ];
              }}>
              <SymbolView
                name={
                  voice.isListening
                    ? { ios: 'waveform', android: 'graphic_eq', web: 'graphic_eq' }
                    : { ios: 'mic.fill', android: 'mic', web: 'mic' }
                }
                size={Math.round(size * 0.28)}
                tintColor={theme.onAccent}
              />
              <ThemedText type="subtitle" style={[styles.center, { color: theme.onAccent }]}>
                {voice.isListening ? 'Słucham Cię…\nMów teraz' : 'Poproś o pomoc\ngłosem'}
              </ThemedText>
            </Pressable>
          </View>

          {/* Voice recording status */}
          {voice.isListening ? (
            <ThemedText type="smallBold" style={[styles.center, { color: theme.danger }]}>
              🔴 Mikrofon aktywny – mów do urządzenia
            </ThemedText>
          ) : voice.error ? (
            <ThemedText type="small" themeColor="danger" style={styles.center}>
              {voice.error}
            </ThemedText>
          ) : null}

          {/* Live Transcript Bubble */}
          {displayText ? (
            <Card highlighted style={styles.transcriptCard}>
              <ThemedText type="caption" themeColor="textSecondary">
                Rozpoznana prośba:
              </ThemedText>
              <ThemedText type="defaultBold" style={styles.transcriptText}>
                „{displayText}”
              </ThemedText>
              <View style={styles.transcriptActions}>
                <Button
                  title="✨ Utwórz zgłoszenie z tym tekstem"
                  size="large"
                  onPress={handleCreateRequest}
                />
                <Button
                  title={voice.isSpeaking ? '⏹️ Zatrzymaj' : '🔊 Odsłuchaj'}
                  variant="secondary"
                  size="medium"
                  onPress={() => {
                    if (voice.isSpeaking) {
                      voice.stopSpeaking();
                    } else {
                      voice.speak(displayText);
                    }
                  }}
                />
                <Button
                  title="Wyczyść"
                  variant="secondary"
                  size="medium"
                  onPress={() => {
                    setSpokenText('');
                    voice.resetTranscript();
                  }}
                />
              </View>
            </Card>
          ) : null}

          {/* Bottom Minimalist Options: Manual input & Menu */}
          <View style={styles.bottomSection}>
            <Button
              title="✏️ Wpisz prośbę ręcznie"
              variant="secondary"
              size="large"
              onPress={() => router.replace('/new')}
            />
            <Button
              title="Moje prośby"
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
  instructionBtn: {
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  circleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: Spacing.two,
  },
  volumeHalo: {
    position: 'absolute',
    borderWidth: 3,
  },
  bigButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderWidth: 6,
    padding: Spacing.three,
  },
  transcriptCard: {
    width: '100%',
    gap: Spacing.two,
  },
  transcriptText: {
    marginVertical: Spacing.half,
  },
  transcriptActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
  bottomSection: {
    width: '100%',
    maxWidth: 320,
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
