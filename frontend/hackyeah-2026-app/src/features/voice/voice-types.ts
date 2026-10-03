/** Shared contract of the voice hook: `use-voice-assistant.web.ts` (Web Speech API) and
 * `use-voice-assistant.ts` (native speech recognition / keyboard dictation). */
export type VoiceState = {
  isListening: boolean;
  transcript: string;
  isSupported: boolean;
  /**
   * `speech` – the app records and recognises speech itself (waveform, timer).
   * `keyboard` – no speech module (Expo Go): the person dictates with the keyboard microphone.
   */
  inputMode: 'speech' | 'keyboard';
  error: string | null;
  isSpeaking: boolean;
  volumeLevel: number; // 0.0 to 1.0 real-time audio volume
  /** Last few volume samples (0..1, oldest first) for a waveform like a voice message. */
  levels: number[];
  /** Recording time in seconds. */
  elapsedSeconds: number;
  startListening: () => Promise<void>;
  stopListening: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  resetTranscript: () => void;
};

export type VoiceOptions = {
  /** Called once when recognition ends (silence, stop or error) with the final transcript. */
  onEnd?: (transcript: string) => void;
};

export const WAVEFORM_BARS = 28;
export const WAVEFORM_SAMPLE_MS = 90;
export const SILENT_WAVEFORM: number[] = Array.from({ length: WAVEFORM_BARS }, () => 0);
/** Recognition stops after this much silence. */
export const SILENCE_STOP_MS = 5000;
