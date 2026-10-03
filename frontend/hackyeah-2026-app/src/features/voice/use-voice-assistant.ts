/**
 * Native (Android / iOS): speech recognition with `expo-speech-recognition`.
 *
 * The module is native code, so it exists only in a development / production build. In Expo Go
 * it is missing – then the hook switches to `inputMode: 'keyboard'` and the person dictates with
 * the keyboard microphone (Gboard / iOS dictation); the AI analysis and preview work the same.
 * The web version is `use-voice-assistant.web.ts`.
 */
import { requireOptionalNativeModule } from 'expo';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import {
  SILENCE_STOP_MS,
  SILENT_WAVEFORM,
  WAVEFORM_SAMPLE_MS,
  type VoiceOptions,
  type VoiceState,
} from '@/features/voice/voice-types';

export type { VoiceState } from '@/features/voice/voice-types';

type Subscription = { remove: () => void };

/** The part of `ExpoSpeechRecognitionModule` this app uses (see the package README). */
type SpeechRecognitionModule = {
  start: (options: {
    lang: string;
    interimResults: boolean;
    continuous: boolean;
    addsPunctuation?: boolean;
    volumeChangeEventOptions?: { enabled: boolean; intervalMillis?: number };
  }) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  isRecognitionAvailable: () => boolean;
  addListener: (event: string, listener: (event: any) => void) => Subscription;
};

/** `null` in Expo Go (no native module) – loaded optionally so the app does not crash there. */
const recognizer = requireOptionalNativeModule<SpeechRecognitionModule>('ExpoSpeechRecognition');

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed':
    'Brak zgody na mikrofon. Zezwól aplikacji na mikrofon i rozpoznawanie mowy w ustawieniach telefonu.',
  'service-not-allowed':
    'Rozpoznawanie mowy jest wyłączone na tym telefonie. Włącz je w ustawieniach albo wpisz prośbę ręcznie.',
  network: 'Brak połączenia z internetem – rozpoznawanie mowy go potrzebuje.',
  'language-not-supported': 'Telefon nie rozpoznaje mowy po polsku. Wpisz prośbę ręcznie.',
  'audio-capture': 'Nie udało się użyć mikrofonu. Sprawdź, czy inna aplikacja go nie zajmuje.',
};

export function useVoiceAssistant(
  onResult?: (text: string) => void,
  { onEnd }: VoiceOptions = {},
): VoiceState {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [levels, setLevels] = useState<number[]>(SILENT_WAVEFORM);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const transcriptRef = useRef('');
  /** Android (continuous) sends each finished phrase separately; they are joined here. */
  const finishedRef = useRef('');
  const startedAtRef = useRef(0);
  const lastSampleRef = useRef(0);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onResultRef = useRef(onResult);
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onResultRef.current = onResult;
    onEndRef.current = onEnd;
  });

  const isSupported = recognizer !== null;

  const clearTimers = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (clockRef.current) clearInterval(clockRef.current);
    silenceTimerRef.current = null;
    clockRef.current = null;
  };

  const stopListening = useCallback(() => {
    clearTimers();
    // `end` follows and reports the final transcript.
    recognizer?.stop();
  }, []);

  useEffect(() => {
    if (!recognizer) return;
    const subscriptions = [
      recognizer.addListener('start', () => {
        setIsListening(true);
        setError(null);
      }),
      recognizer.addListener('result', (event) => {
        const text: string = event.results?.[0]?.transcript ?? '';
        let full: string;
        if (Platform.OS === 'android') {
          full = `${finishedRef.current} ${text}`.trim();
          if (event.isFinal) finishedRef.current = full;
        } else {
          // iOS keeps the whole utterance in one growing transcript.
          full = text.trim();
        }
        if (full) {
          transcriptRef.current = full;
          setTranscript(full);
          onResultRef.current?.(full);
        }
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = setTimeout(() => recognizer.stop(), SILENCE_STOP_MS);
      }),
      recognizer.addListener('volumechange', (event) => {
        // -2..10, below 0 is inaudible.
        const level = Math.min(1, Math.max(0, (event.value ?? -2) / 10));
        setVolumeLevel(level);
        const now = Date.now();
        if (now - lastSampleRef.current >= WAVEFORM_SAMPLE_MS) {
          lastSampleRef.current = now;
          setLevels((current) => [...current.slice(1), level]);
        }
      }),
      recognizer.addListener('error', (event) => {
        // "no-speech" / "aborted" just end the recording; `end` handles it.
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        setError(
          ERROR_MESSAGES[event.error] ?? `Rozpoznawanie mowy: ${event.message ?? event.error}`,
        );
      }),
      recognizer.addListener('end', () => {
        clearTimers();
        setIsListening(false);
        setVolumeLevel(0);
        setLevels(SILENT_WAVEFORM);
        onEndRef.current?.(transcriptRef.current);
      }),
    ];
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      clearTimers();
      recognizer.abort();
    };
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    Speech.stop();
    transcriptRef.current = '';
    finishedRef.current = '';
    setTranscript('');
    setElapsedSeconds(0);
    setLevels(SILENT_WAVEFORM);

    // Expo Go: the keyboard microphone is used instead (see `inputMode`).
    if (!recognizer) return;

    const permission = await recognizer.requestPermissionsAsync();
    if (!permission.granted) {
      setError(ERROR_MESSAGES['not-allowed']);
      return;
    }
    if (!recognizer.isRecognitionAvailable()) {
      setError(ERROR_MESSAGES['service-not-allowed']);
      return;
    }

    startedAtRef.current = Date.now();
    clockRef.current = setInterval(
      () => setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000)),
      500,
    );
    recognizer.start({
      lang: 'pl-PL',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      volumeChangeEventOptions: { enabled: true, intervalMillis: WAVEFORM_SAMPLE_MS },
    });
  }, []);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    finishedRef.current = '';
    setTranscript('');
    setError(null);
  }, []);

  const stopSpeaking = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    Speech.stop();
    setIsSpeaking(true);
    Speech.speak(clean, {
      language: 'pl-PL',
      rate: 0.92,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    inputMode: isSupported ? 'speech' : 'keyboard',
    error,
    isSpeaking,
    volumeLevel,
    levels,
    elapsedSeconds,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetTranscript,
  };
}
