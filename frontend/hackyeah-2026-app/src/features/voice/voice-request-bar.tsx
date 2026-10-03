import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useVoiceAssistant } from '@/features/voice/use-voice-assistant';
import { useTheme } from '@/hooks/use-theme';

type VoiceRequestBarProps = {
  onTranscriptReady?: (text: string) => void;
  autoNavigate?: boolean;
};

export function VoiceRequestBar({ onTranscriptReady, autoNavigate = true }: VoiceRequestBarProps) {
  const theme = useTheme();
  const [capturedText, setCapturedText] = useState('');

  const voice = useVoiceAssistant((result) => {
    setCapturedText(result);
    if (onTranscriptReady) {
      onTranscriptReady(result);
    }
  });

  const handleUseText = () => {
    const textToUse = capturedText || voice.transcript;
    if (!textToUse) return;

    if (onTranscriptReady) {
      onTranscriptReady(textToUse);
    }
    if (autoNavigate) {
      router.push({
        pathname: '/new',
        params: { initialVoiceText: encodeURIComponent(textToUse) },
      });
    }
  };

  const handleListenPrompt = () => {
    voice.speak(
      'Witaj w PoDrodze. Naciśnij pomarańczowy przycisk z mikrofonem i powiedz, jakiej pomocy potrzebujesz. Na przykład: proszę o zakup chleba i leków z apteki.',
    );
  };

  return (
    <Card highlighted style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleArea}>
          <ThemedText type="defaultBold">🎙️ Pomoc głosowa dla seniora</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Nie musisz pisać na klawiaturze – powiedz na głos, czego potrzebujesz.
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Odsłuchaj instrukcję na głos"
          onPress={voice.isSpeaking ? voice.stopSpeaking : handleListenPrompt}
          style={[styles.speakIconBtn, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">
            {voice.isSpeaking ? '⏹️ Zatrzymaj' : '🔊 Instrukcja'}
          </ThemedText>
        </Pressable>
      </View>

      {/* Main Microphone Button */}
      <View style={styles.micContainer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={voice.isListening ? 'Zatrzymaj słuchanie' : 'Rozpocznij mówienie'}
          onPress={voice.isListening ? voice.stopListening : voice.startListening}
          style={[
            styles.micButton,
            {
              backgroundColor: voice.isListening ? theme.danger : theme.accent,
              borderColor: voice.isListening ? theme.dangerSoft : theme.accentSoft,
            },
          ]}>
          <ThemedText style={styles.micIconText}>{voice.isListening ? '⏹️' : '🎙️'}</ThemedText>
        </Pressable>

        <ThemedText
          type="smallBold"
          style={voice.isListening ? { color: theme.danger } : undefined}>
          {voice.isListening
            ? 'Słucham… Mów teraz wyraźnie do mikrofonu'
            : 'Dotknij mikrofon, aby mówić'}
        </ThemedText>
      </View>

      {/* Error / Warning info if speech is blocked */}
      {voice.error && (
        <ThemedText type="small" themeColor="danger" style={styles.errorText}>
          {voice.error}
        </ThemedText>
      )}

      {/* Live Transcript / Result */}
      {voice.transcript || capturedText ? (
        <View
          style={[
            styles.transcriptBox,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText type="caption" themeColor="textSecondary">
            Rozpoznany tekst:
          </ThemedText>
          <ThemedText type="defaultBold" style={styles.transcriptText}>
            „{voice.transcript || capturedText}”
          </ThemedText>

          <View style={styles.actionRow}>
            <Button
              title="✨ Utwórz zgłoszenie z tym tekstem"
              size="medium"
              onPress={handleUseText}
            />
            <Button
              title="🔊 Odsłuchaj"
              variant="secondary"
              size="medium"
              onPress={() => voice.speak(voice.transcript || capturedText)}
            />
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.two,
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  titleArea: {
    flex: 1,
    gap: Spacing.half,
  },
  speakIconBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.medium,
  },
  micContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 14px rgba(217, 72, 15, 0.3)',
  },
  micIconText: {
    fontSize: 30,
  },
  errorText: {
    textAlign: 'center',
  },
  transcriptBox: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    gap: Spacing.one,
  },
  transcriptText: {
    marginVertical: Spacing.half,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
