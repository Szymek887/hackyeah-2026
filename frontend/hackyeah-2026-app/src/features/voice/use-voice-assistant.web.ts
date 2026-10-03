/** Web: speech recognition with the browser Web Speech API (Chrome, Edge). */
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

function getSpeechRecognition(): any {
  if (typeof window === 'undefined') return null;
  const win = window as any;
  return (
    win.SpeechRecognition ||
    win.webkitSpeechRecognition ||
    win.mozSpeechRecognition ||
    win.msSpeechRecognition ||
    null
  );
}

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
  const startedAtRef = useRef(0);
  const lastSampleRef = useRef(0);
  const transcriptRef = useRef('');
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  });

  const recognitionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<any>(null);

  const isSupported =
    Platform.OS === 'web' && typeof window !== 'undefined' && !!getSpeechRecognition();

  const stopSpeaking = useCallback(() => {
    try {
      Speech.stop();
    } catch {
      // Ignored
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignored
      }
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      const cleanText = text.trim();
      if (!cleanText) return;

      stopSpeaking();

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.resume();
        } catch {
          // Ignored
        }
      }

      setIsSpeaking(true);

      try {
        Speech.speak(cleanText, {
          language: 'pl-PL',
          rate: 0.92,
          pitch: 1.0,
          onStart: () => setIsSpeaking(true),
          onDone: () => setIsSpeaking(false),
          onStopped: () => setIsSpeaking(false),
          onError: () => {
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
              try {
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'pl-PL';
                utterance.rate = 0.92;
                utterance.onend = () => setIsSpeaking(false);
                utterance.onerror = () => setIsSpeaking(false);
                window.speechSynthesis.speak(utterance);
              } catch {
                setIsSpeaking(false);
              }
            } else {
              setIsSpeaking(false);
            }
          },
        });
      } catch {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'pl-PL';
            utterance.rate = 0.92;
            utterance.onend = () => setIsSpeaking(false);
            utterance.onerror = () => setIsSpeaking(false);
            window.speechSynthesis.speak(utterance);
          } catch {
            setIsSpeaking(false);
          }
        } else {
          setIsSpeaking(false);
        }
      }
    },
    [stopSpeaking],
  );

  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // Ignored
      }
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // Ignored
      }
      mediaStreamRef.current = null;
    }
    setVolumeLevel(0);
    setLevels(SILENT_WAVEFORM);
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
      recognitionRef.current = null;
    }
    cleanupAudio();
    setIsListening(false);
  }, [cleanupAudio]);

  const resetTranscript = useCallback(() => {
    transcriptRef.current = '';
    setTranscript('');
    setError(null);
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    stopSpeaking();
    transcriptRef.current = '';
    startedAtRef.current = Date.now();
    setElapsedSeconds(0);

    const SpeechRecognitionConstructor = getSpeechRecognition();

    let stream: MediaStream | null = null;

    // Start AudioContext & Analyser for real-time volume reactivity
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.3;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);

          const updateVolume = () => {
            if (!analyser) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            // Map 0..255 to normalized 0.0..1.0
            const level = Math.min(1, Math.max(0, (average - 6) / 45));
            setVolumeLevel(level);
            const now = Date.now();
            if (now - lastSampleRef.current >= WAVEFORM_SAMPLE_MS) {
              lastSampleRef.current = now;
              setLevels((current) => [...current.slice(1), level]);
              setElapsedSeconds(Math.floor((now - startedAtRef.current) / 1000));
            }
            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };

          updateVolume();
        }
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(
            'Dostęp do mikrofonu został zablokowany. Kliknij ikonę kłódki przy pasku adresu i zezwól na mikrofon.',
          );
          return;
        }
      }
    }

    if (!SpeechRecognitionConstructor) {
      setError(
        Platform.OS === 'web'
          ? 'Ta przeglądarka nie rozpoznaje mowy. Użyj Chrome lub Edge albo wybierz „Wpisz ręcznie”.'
          : 'Prośbę głosem przygotujesz na razie w przeglądarce (Chrome lub Edge). Na telefonie wybierz „Wpisz ręcznie”.',
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignored
        }
      }

      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = 'pl-PL';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let fullText = '';
        for (let i = 0; i < event.results.length; ++i) {
          fullText += event.results[i][0].transcript;
        }
        const clean = fullText.trim();
        if (clean) {
          transcriptRef.current = clean;
          setTranscript(clean);
          if (onResult) {
            onResult(clean);
          }
        }

        // Keep listening active while speaking
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
        }, SILENCE_STOP_MS);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setError(
            'Brak dostępu do mikrofonu. Kliknij ikonę kłódki przy adresie strony i zezwól na mikrofon.',
          );
          stopListening();
        } else if (event.error === 'no-speech') {
          // Keep listening
        } else if (event.error === 'network') {
          setError('Błąd sieci rozpoznawania mowy. Upewnij się, że masz połączenie z internetem.');
          stopListening();
        } else {
          setError(`Komunikat rozpoznawania: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        cleanupAudio();
        onEndRef.current?.(transcriptRef.current);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      cleanupAudio();
      setError(err?.message || 'Nie udało się uruchomić rozpoznawania mowy.');
    }
  }, [cleanupAudio, onResult, stopListening, stopSpeaking]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Ignored
        }
      }
      cleanupAudio();
      stopSpeaking();
    };
  }, [cleanupAudio, stopSpeaking]);

  return {
    isListening,
    transcript,
    isSupported,
    inputMode: 'speech',
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
