import { classifyRequest, formatTranscript } from '@/api/requests';
import type { AiClassification, ClassificationSource } from '@/api/types';

/** Request prepared from speech, shown to the person for acceptance before the address step. */
export type VoiceDraft = {
  title: string;
  description: string;
  /** LLM = the model rewrote what was said; FALLBACK = only greetings and fillers were removed. */
  formattedBy: ClassificationSource;
  /** Category, priority, keywords (tags) and risk flags from `POST /api/requests/classify`. */
  classification: AiClassification;
};

/**
 * AI analysis of what the person said: the backend model (or its fallback rules) first rewrites the
 * spoken, often rambling transcript into a short title and a clear description, then picks the
 * category, urgency and keywords from that text. Nothing is saved yet.
 */
export async function analyzeSpeech(transcript: string): Promise<VoiceDraft> {
  const { title, description, source } = await formatTranscript({ transcript });
  const classification = await classifyRequest({ title, description });
  return { title, description, formattedBy: source, classification };
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
