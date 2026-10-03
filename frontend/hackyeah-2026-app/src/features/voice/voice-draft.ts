import { classifyRequest } from '@/api/requests';
import type { AiClassification } from '@/api/types';

/** Request prepared from speech, shown to the person for acceptance before the address step. */
export type VoiceDraft = {
  title: string;
  description: string;
  /** Category, priority, keywords (tags) and risk flags from `POST /api/requests/classify`. */
  classification: AiClassification;
};

/** Limits of backend `CreateHelpRequestRequest`. */
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000;
const TITLE_WORDS = 8;

/** Spoken filler at the start that makes a poor title ("dzień dobry, chciałabym…"). */
const OPENERS = /^(dzień dobry|dobry wieczór|halo|cześć|witam|proszę pani|proszę pana)[,.!\s]*/i;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Short title from the first sentence of the transcript, cut at a word boundary. */
export function draftTitle(transcript: string) {
  const firstSentence = transcript.replace(OPENERS, '').split(/[.!?]/)[0].trim() || transcript;
  const words = firstSentence.split(/\s+/);
  const short = words.slice(0, TITLE_WORDS).join(' ');
  return capitalize(short.slice(0, TITLE_MAX - 1)) + (words.length > TITLE_WORDS ? '…' : '');
}

/**
 * AI analysis of what the person said: the backend model (or its keyword fallback) picks the
 * category, urgency and keywords. Nothing is saved yet.
 */
export async function analyzeSpeech(transcript: string): Promise<VoiceDraft> {
  const description = capitalize(transcript.trim()).slice(0, DESCRIPTION_MAX);
  const title = draftTitle(description);
  const classification = await classifyRequest({ title, description });
  return { title, description, classification };
}

/** Route params of the request form when it starts from an accepted voice draft. */
export type VoiceDraftParams = {
  draftId?: string;
  draftTitle?: string;
  draftDescription?: string;
  /** JSON of `AiClassification`. */
  draftAi?: string;
};

export function toDraftParams(draft: VoiceDraft): Required<VoiceDraftParams> {
  return {
    // New id each time, so the (already mounted) form tab starts over with this draft.
    draftId: String(Date.now()),
    draftTitle: draft.title,
    draftDescription: draft.description,
    draftAi: JSON.stringify(draft.classification),
  };
}

export function parseDraftAi(json: string | undefined): AiClassification | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as AiClassification;
  } catch {
    return null;
  }
}
