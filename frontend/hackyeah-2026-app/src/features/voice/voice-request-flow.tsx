import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { errorMessage } from '@/api/errors';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Radius, Spacing } from '@/constants/theme';
import { useAccessibility } from '@/features/accessibility/accessibility-store';
import { PriorityBadge } from '@/features/requests/components/request-badges';
import { CategoryLabels } from '@/features/requests/labels';
import { useVoiceAssistant } from '@/features/voice/use-voice-assistant';
import { analyzeSpeech, type VoiceDraft } from '@/features/voice/voice-draft';
import { useTheme } from '@/hooks/use-theme';
import { enterScreen } from '@/lib/motion';

type Phase = 'idle' | 'recording' | 'analyzing' | 'preview';

type VoiceRequestFlowProps = {
  /** The person accepted the AI preview; the address is added in the next step. */
  onAccept: (draft: VoiceDraft) => void;
  /** Label of the idle button. */
  label?: string;
};

const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Ask for help by voice:
 * 1. a button, which while recording turns into a voice-message bar (like Messenger): cancel,
 *    red dot, live waveform, timer and send,
 * 2. the speech is analysed by AI (category, urgency, keywords),
 * 3. a preview of the request to accept, edit or record again.
 */
export function VoiceRequestFlow({
  onAccept,
  label = 'Powiedz, czego potrzebujesz',
}: VoiceRequestFlowProps) {
  const theme = useTheme();
  const { minTouchSize } = useAccessibility();
  const [phase, setPhase] = useState<Phase>('idle');
  const [draft, setDraft] = useState<VoiceDraft | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  /** Set when the person cancels, so the end of recognition does not start the analysis. */
  const cancelledRef = useRef(false);

  const analyze = async (transcript: string) => {
    const text = transcript.trim();
    if (text.length < 3) {
      setPhase('idle');
      setProblem('Nic nie usłyszałem. Dotknij przycisk i powiedz, w czym potrzebujesz pomocy.');
      return;
    }
    setPhase('analyzing');
    try {
      setDraft(await analyzeSpeech(text));
      setPhase('preview');
    } catch (err) {
      setProblem(`Nie udało się przeanalizować prośby: ${errorMessage(err)}`);
      setPhase('idle');
    }
  };

  const voice = useVoiceAssistant(undefined, {
    onEnd: (transcript) => {
      if (cancelledRef.current) return;
      analyze(transcript);
    },
  });

  const start = () => {
    cancelledRef.current = false;
    setProblem(null);
    setDraft(null);
    voice.resetTranscript();
    setPhase('recording');
    voice.startListening();
  };

  const cancel = () => {
    cancelledRef.current = true;
    voice.stopListening();
    voice.resetTranscript();
    setPhase('idle');
  };

  // Stopping ends recognition; `onEnd` then runs the analysis with the final transcript.
  const send = () => voice.stopListening();

  const error = voice.error ?? problem;
  const recording = phase === 'recording';
  // Mic permission denied or no speech API: recording ends before it started.
  const stalled = recording && !voice.isListening && voice.error !== null;

  if (phase === 'preview' && draft) {
    return (
      <Preview
        draft={draft}
        onAccept={() => onAccept(draft)}
        onRetry={start}
        onCancel={() => {
          setDraft(null);
          setPhase('idle');
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      {recording && !stalled ? (
        <Animated.View
          entering={enterScreen}
          accessibilityLiveRegion="polite"
          accessibilityLabel={`Nagrywanie, ${voice.elapsedSeconds} sekund`}
          style={[
            styles.recorder,
            { minHeight: minTouchSize + 16, backgroundColor: theme.accent },
          ]}>
          <RoundButton
            label="Anuluj nagrywanie"
            icon={{ ios: 'xmark', android: 'close', web: 'close' }}
            background={theme.onAccent}
            color={theme.accent}
            onPress={cancel}
          />
          <View style={styles.recorderMiddle}>
            <View style={[styles.recDot, { backgroundColor: theme.onAccent }]} />
            <View style={styles.waveform}>
              {voice.levels.map((level, index) => (
                <View
                  key={index}
                  style={[
                    styles.waveBar,
                    {
                      height: 4 + Math.round(level * 26),
                      backgroundColor: theme.onAccent,
                      opacity: 0.55 + level * 0.45,
                    },
                  ]}
                />
              ))}
            </View>
            <ThemedText type="smallBold" style={{ color: theme.onAccent }}>
              {formatTime(voice.elapsedSeconds)}
            </ThemedText>
          </View>
          <RoundButton
            label="Zakończ i wyślij do analizy"
            icon={{ ios: 'arrow.up', android: 'send', web: 'send' }}
            background={theme.onAccent}
            color={theme.accent}
            onPress={send}
          />
        </Animated.View>
      ) : phase === 'analyzing' ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.recorder,
            styles.analyzing,
            { minHeight: minTouchSize + 16, backgroundColor: theme.backgroundMuted },
          ]}>
          <ActivityIndicator color={theme.primary} />
          <ThemedText type="defaultBold">Analizuję Twoją prośbę…</ThemedText>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}. Nagraj prośbę głosem`}
          onPress={start}
          style={(state) => {
            const { hovered, focused } = state as typeof state & {
              hovered?: boolean;
              focused?: boolean;
            };
            return [
              styles.idleButton,
              {
                minHeight: minTouchSize + 16,
                borderColor: focused ? theme.text : theme.accent,
                backgroundColor:
                  state.pressed || hovered ? theme.accentSoft : theme.backgroundElement,
              },
            ];
          }}>
          <View style={[styles.micCircle, { backgroundColor: theme.accent }]}>
            <SymbolView
              name={{ ios: 'mic.fill', android: 'mic', web: 'mic' }}
              size={24}
              tintColor={theme.onAccent}
            />
          </View>
          <ThemedText type="defaultBold" style={[styles.flex, { color: theme.accent }]}>
            {label}
          </ThemedText>
        </Pressable>
      )}

      {recording && voice.transcript ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Słyszę: „{voice.transcript}”
        </ThemedText>
      ) : null}
      {recording && !voice.transcript && !stalled ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Mów teraz. Gdy skończysz, dotknij strzałkę.
        </ThemedText>
      ) : null}
      {error && (phase === 'idle' || stalled) ? (
        <ThemedText
          type="small"
          themeColor="danger"
          accessibilityRole="alert"
          style={styles.center}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

type RoundButtonProps = {
  label: string;
  icon: React.ComponentProps<typeof SymbolView>['name'];
  background: string;
  color: string;
  onPress: () => void;
};

function RoundButton({ label, icon, background, color, onPress }: RoundButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundButton,
        { backgroundColor: background, opacity: pressed ? 0.8 : 1 },
      ]}>
      <SymbolView name={icon} size={22} tintColor={color} weight="bold" />
    </Pressable>
  );
}

type PreviewProps = {
  draft: VoiceDraft;
  onAccept: () => void;
  onRetry: () => void;
  onCancel: () => void;
};

/** What the AI understood, for the person to accept before the address step. */
function Preview({ draft, onAccept, onRetry, onCancel }: PreviewProps) {
  const theme = useTheme();
  const { classification } = draft;
  const flags = classification.riskFlags;

  return (
    <Animated.View entering={enterScreen} style={styles.fullWidth}>
      <Card highlighted style={styles.preview}>
        <ThemedText type="subtitle" accessibilityRole="header">
          Podgląd zgłoszenia
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {classification.source === 'LLM'
            ? 'Asystent AI przeanalizował Twoją wypowiedź. Sprawdź, czy wszystko się zgadza.'
            : 'Rozpoznaliśmy słowa kluczowe w Twojej wypowiedzi. Sprawdź, czy wszystko się zgadza.'}
        </ThemedText>

        <View style={styles.field}>
          <ThemedText type="smallBold">Tytuł</ThemedText>
          <ThemedText type="defaultBold">{draft.title}</ThemedText>
        </View>
        <View style={styles.field}>
          <ThemedText type="smallBold">Opis</ThemedText>
          <ThemedText>{draft.description}</ThemedText>
        </View>
        <View style={styles.field}>
          <ThemedText type="smallBold">Rodzaj pomocy i pilność</ThemedText>
          <View style={styles.badges}>
            <Badge label={CategoryLabels[classification.category]} />
            <PriorityBadge priority={classification.priority} />
          </View>
        </View>
        {classification.tags.length > 0 && (
          <View style={styles.field}>
            <ThemedText type="smallBold">Słowa kluczowe</ThemedText>
            <View style={styles.badges}>
              {classification.tags.map((tag) => (
                <Badge
                  key={tag}
                  label={tag}
                  color={theme.text}
                  backgroundColor={theme.backgroundMuted}
                />
              ))}
            </View>
          </View>
        )}

        {flags.includes('MEDICAL_EMERGENCY') && (
          <View style={[styles.notice, { backgroundColor: theme.dangerSoft }]}>
            <ThemedText type="defaultBold" themeColor="danger">
              To może być nagły wypadek
            </ThemedText>
            <ThemedText>Jeśli zagrożone jest życie lub zdrowie, zadzwoń pod 112.</ThemedText>
          </View>
        )}
        {flags.includes('SCAM_SUSPECTED') && (
          <View style={[styles.notice, { backgroundColor: theme.warningSoft }]}>
            <ThemedText type="defaultBold" style={{ color: theme.warning }}>
              Uwaga na prośby o pieniądze
            </ThemedText>
            <ThemedText>Nie podawaj kodów BLIK, numerów kart ani haseł.</ThemedText>
          </View>
        )}

        <View style={styles.previewActions}>
          <Button title="Akceptuję – dalej do adresu" size="large" onPress={onAccept} />
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button title="Nagraj ponownie" variant="secondary" onPress={onRetry} />
            </View>
            <View style={styles.flex}>
              <Button title="Anuluj" variant="ghost" onPress={onCancel} />
            </View>
          </View>
        </View>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: Spacing.two,
  },
  fullWidth: {
    width: '100%',
  },
  flex: {
    flex: 1,
  },
  center: {
    textAlign: 'center',
  },
  idleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.two,
    paddingRight: Spacing.four,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  micCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recorder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  analyzing: {
    justifyContent: 'center',
    gap: Spacing.three,
  },
  recorderMiddle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  waveform: {
    flex: 1,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.one,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  notice: {
    gap: Spacing.half,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  previewActions: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
});
