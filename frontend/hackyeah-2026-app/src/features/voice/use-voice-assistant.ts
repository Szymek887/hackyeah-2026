import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type VoiceState = {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
  isSpeaking: boolean;
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  resetTranscript: () => void;
  simulateSpeech: (text: string) => void;
};

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

export function useVoiceAssistant(onResult?: (text: string) => void): VoiceState {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
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

      // Ensure web speech synthesis context is active
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
            // Web fallback
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
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  const simulateSpeech = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      stopListening();
      setError(null);
      setTranscript(clean);
      if (onResult) {
        onResult(clean);
      }
      speak(clean);
    },
    [onResult, speak, stopListening],
  );

  const startListening = useCallback(async () => {
    setError(null);
    stopSpeaking();

    const SpeechRecognitionConstructor = getSpeechRecognition();

    if (!SpeechRecognitionConstructor) {
      setError(
        'Twoja przeglądarka nie obsługuje bezpośredniego nagrywania mowy. Skorzystaj z gotowych próśb poniżej.',
      );
      return;
    }

    // Explicitly prompt for microphone permission in browser if available
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setError(
            'Dostęp do mikrofonu został zablokowany. Kliknij ikonę kłódki przy adresie strony i zezwól na mikrofon.',
          );
          return;
        }
      }
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
        setTranscript(clean);
        if (onResult && clean) {
          onResult(clean);
        }

        // Reset silence timeout on every detected speech snippet
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
        }
        silenceTimerRef.current = setTimeout(() => {
          stopListening();
        }, 4500);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError(
            'Brak dostępu do mikrofonu. Kliknij ikonę kłódki obok adresu strony i zezwól na dostęp.',
          );
        } else if (event.error === 'no-speech') {
          setError('Nie usłyszano głosu. Powiedz głośniej lub wybierz gotową prośbę poniżej.');
        } else if (event.error === 'network') {
          setError(
            'Błąd połączenia z usługą rozpoznawania mowy. Możesz wybrać gotową prośbę poniżej.',
          );
        } else {
          setError(`Komunikat rozpoznawania: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      setError(err?.message || 'Nie udało się uruchomić mikrofonu.');
    }
  }, [onResult, stopListening, stopSpeaking]);

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
      stopSpeaking();
    };
  }, [stopSpeaking]);

  return {
    isListening,
    transcript,
    isSupported,
    error,
    isSpeaking,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetTranscript,
    simulateSpeech,
  };
}
