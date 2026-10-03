/**
 * Port of backend `SimpleTranscriptFormatter` (the fallback when the model is unavailable):
 * the transcript without greetings, filler words and stuttered repeats becomes the description,
 * its first sentence the title.
 */
import type { FormattedRequest } from '@/api/types';

const TITLE_MAX = 120;
const DESCRIPTION_MAX = 1000;
const TITLE_WORDS = 8;

/** Spoken greeting at the start that makes a poor title ("dzień dobry, chciałabym…"). */
const OPENERS = /^(dzień dobry|dobry wieczór|halo|cześć|witam|proszę pani|proszę pana)[,.!\s]*/i;

/** Hesitation sounds and spoken fillers that carry no meaning. */
const FILLERS =
  /(?<!\p{L})(y+|e+|m+|hm+|yhm|no|wie pan[i]?|znaczy|tak jakby|po prostu)(?!\p{L}),?/giu;
/** The same word said twice in a row ("żeby żeby", "potrzebuję, potrzebuję"). */
const REPEATED_WORD = /(?<!\p{L})(\p{L}+)(?:,? \1)+(?!\p{L})/giu;

const clean = (text: string) => text.trim().replace(/\s+/g, ' ');

/** Collapses whitespace and the punctuation left over after removing words. */
const tidy = (text: string) =>
  clean(text)
    .replace(/ +([,.!?])/g, '$1')
    .replace(/([,.!?])(?:[ ,]*,)+/g, '$1')
    .replace(/^[,.!? ]+/, '');
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Cuts at the last word boundary that fits, ending with "…". */
function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return (space > 0 ? cut.slice(0, space) : cut).trim() + '…';
}

export function formatTranscript(transcript: string): FormattedRequest {
  let text = tidy(clean(transcript).replace(FILLERS, '').replace(REPEATED_WORD, '$1'));
  for (
    let next = tidy(text.replace(OPENERS, ''));
    next !== text;
    next = tidy(text.replace(OPENERS, ''))
  ) {
    text = next;
  }
  text ||= clean(transcript);
  const description = truncate(capitalize(text), DESCRIPTION_MAX);
  const firstSentence = description.split(/[.!?]/)[0].trim() || description;
  const words = firstSentence.split(' ');
  const title = truncate(
    words.slice(0, TITLE_WORDS).join(' ') + (words.length > TITLE_WORDS ? '…' : ''),
    TITLE_MAX,
  );
  return { title, description, source: 'FALLBACK' };
}
