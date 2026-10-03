import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export type VoiceState = {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  error: string | null;
  isSpeaking: boolean;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  resetTranscript: () => void;
};

// Cross-browser SpeechRecognition types
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useVoiceAssistant(onResult?: (text: string) => void): VoiceState {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    !!(
      (window as IWindowWithSpeech).SpeechRecognition ||
      (window as IWindowWithSpeech).webkitSpeechRecognition
    );

  const stopSpeaking = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (
        Platform.OS !== 'web' ||
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        return;
      }
      stopSpeaking();
      const cleanText = text.trim();
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'pl-PL';
      utterance.rate = 0.95; // Przyjazne, spokojne tempo dla seniorów

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [stopSpeaking],
  );

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
    }
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    stopSpeaking();

    if (!isSupported) {
      setError('Twoja przeglądarka nie wspiera bezpośredniego rozpoznawania mowy.');
      return;
    }

    try {
      const SpeechRecognitionConstructor =
        (window as IWindowWithSpeech).SpeechRecognition ||
        (window as IWindowWithSpeech).webkitSpeechRecognition;

      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = 'pl-PL';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setTranscript('');
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        const text = finalTranscript.trim();
        setTranscript(text);
        if (onResult && text) {
          onResult(text);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setError('Dostęp do mikrofonu został zablokowany. Zezwól w przeglądarce.');
        } else if (event.error === 'no-speech') {
          setError('Nie usłyszano głosu. Spróbuj mówić bliżej mikrofonu.');
        } else {
          setError(`Błąd rozpoznawania: ${event.error}`);
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
  }, [isSupported, onResult, stopSpeaking]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
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
  };
}
