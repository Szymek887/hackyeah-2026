import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

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

const SAMPLE_REQUESTS = [
  {
    icon: '💊',
    title: 'Leki z apteki',
    text: 'Proszę o wykupienie leków na receptę w najbliższej aptece.',
  },
  {
    icon: '🍞',
    title: 'Zakupy spożywcze',
    text: 'Potrzebuję zakupu pieczywa, mleka i wody w pobliskiej Biedronce.',
  },
  {
    icon: '📦',
    title: 'Wniesienie paczki',
    text: 'Proszę o pomoc z wniesieniem ciężkiej paczki na 3. piętro bez windy.',
  },
  {
    icon: '🐕',
    title: 'Wyprowadzenie psa',
    text: 'Szukam kogoś, kto pomoże mi wyprowadzić małego pieska w Parku Jordana.',
  },
];

export function VoiceRequestBar({ onTranscriptReady, autoNavigate = true }: VoiceRequestBarProps) {
  const theme = useTheme();
  const [capturedText, setCapturedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [manualText, setManualText] = useState('');

  const voice = useVoiceAssistant((result) => {
    setCapturedText(result);
    setManualText(result);
    if (onTranscriptReady) {
      onTranscriptReady(result);
    }
  });

  const activeText = manualText || capturedText || voice.transcript;

  const handleUseText = () => {
    const textToUse = activeText.trim();
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
      'Witaj w asystencie głosowym PoDrodze. Naciśnij pomarańczowy mikrofon i powiedz, w czym sąsiad może Ci pomóc. Możesz też wybrać jedną z gotowych prośb poniżej.',
    );
  };

  const handleSampleClick = (sample: (typeof SAMPLE_REQUESTS)[number]) => {
    setCapturedText(sample.text);
    setManualText(sample.text);
    voice.simulateSpeech(sample.text);
    if (onTranscriptReady) {
      onTranscriptReady(sample.text);
    }
  };

  const handleClear = () => {
    setCapturedText('');
    setManualText('');
    setIsEditing(false);
    voice.resetTranscript();
    voice.stopSpeaking();
  };

  return (
    <Card highlighted style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleArea}>
          <ThemedText type="defaultBold">🎙️ Asystent głosowy</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Mów na głos do mikrofonu lub wybierz gotową prośbę.
          </ThemedText>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            voice.isSpeaking ? 'Zatrzymaj odczytywanie' : 'Odsłuchaj instrukcję głosową'
          }
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
          accessibilityLabel={
            voice.isListening ? 'Zatrzymaj słuchanie' : 'Rozpocznij mówienie do mikrofonu'
          }
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
            ? '🔴 Słucham Cię... Mów teraz do mikrofonu'
            : 'Dotknij mikrofon, aby mówić'}
        </ThemedText>
      </View>

      {/* Error / Warning Notice */}
      {voice.error && (
        <View style={[styles.noticeBox, { backgroundColor: theme.dangerSoft }]}>
          <ThemedText type="small" themeColor="danger" style={styles.errorText}>
            {voice.error}
          </ThemedText>
        </View>
      )}

      {/* Sample Spoken Requests (quick test / dictation fallback) */}
      <View style={styles.sampleSection}>
        <ThemedText type="caption" themeColor="textSecondary">
          Przykładowe prośby (kliknij, aby przetestować):
        </ThemedText>
        <View style={styles.sampleChips}>
          {SAMPLE_REQUESTS.map((sample) => (
            <Pressable
              key={sample.title}
              accessibilityRole="button"
              accessibilityLabel={`Wybierz przykładową prośbę: ${sample.title}`}
              onPress={() => handleSampleClick(sample)}
              style={[
                styles.sampleChip,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText type="small">
                {sample.icon} {sample.title}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Live Transcript / Result / Editing */}
      {activeText ? (
        <View
          style={[
            styles.transcriptBox,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <View style={styles.transcriptHeader}>
            <ThemedText type="caption" themeColor="textSecondary">
              Rozpoznany tekst:
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isEditing ? 'Zapisz tekst' : 'Edytuj tekst'}
              onPress={() => setIsEditing(!isEditing)}>
              <ThemedText type="caption" themeColor="primary">
                {isEditing ? '✓ Zakończ edycję' : '✏️ Edytuj'}
              </ThemedText>
            </Pressable>
          </View>

          {isEditing ? (
            <TextInput
              value={manualText}
              onChangeText={(text) => {
                setManualText(text);
                if (onTranscriptReady) onTranscriptReady(text);
              }}
              multiline
              style={[
                styles.editInput,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.background },
              ]}
              placeholder="Wpisz lub popraw tekst..."
              placeholderTextColor={theme.textSecondary}
            />
          ) : (
            <ThemedText type="defaultBold" style={styles.transcriptText}>
              „{activeText}”
            </ThemedText>
          )}

          <View style={styles.actionRow}>
            <Button
              title="✨ Utwórz zgłoszenie z tym tekstem"
              size="medium"
              onPress={handleUseText}
            />
            <Button
              title={voice.isSpeaking ? '⏹️ Zatrzymaj' : '🔊 Odsłuchaj'}
              variant="secondary"
              size="medium"
              onPress={() => {
                if (voice.isSpeaking) {
                  voice.stopSpeaking();
                } else {
                  voice.speak(activeText);
                }
              }}
            />
            <Button title="Wyczyść" variant="secondary" size="medium" onPress={handleClear} />
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
  noticeBox: {
    padding: Spacing.two,
    borderRadius: Radius.medium,
  },
  errorText: {
    textAlign: 'center',
  },
  sampleSection: {
    gap: Spacing.one,
  },
  sampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  sampleChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  transcriptBox: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    gap: Spacing.one,
  },
  transcriptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transcriptText: {
    marginVertical: Spacing.half,
  },
  editInput: {
    borderWidth: 1,
    borderRadius: Radius.small,
    padding: Spacing.two,
    fontSize: 16,
    minHeight: 60,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
  },
});
