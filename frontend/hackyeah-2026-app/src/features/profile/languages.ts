import type { LanguageCode } from '@/api/types';

/** Languages offered in the profile editor (most common in Kraków). Any ISO 639-1 code is valid. */
export const COMMON_LANGUAGES: LanguageCode[] = [
  'pl',
  'en',
  'uk',
  'ru',
  'de',
  'be',
  'es',
  'fr',
  'it',
];

const FALLBACK_NAMES: Record<string, string> = {
  pl: 'polski',
  en: 'angielski',
  uk: 'ukraiński',
  ru: 'rosyjski',
  de: 'niemiecki',
  be: 'białoruski',
  es: 'hiszpański',
  fr: 'francuski',
  it: 'włoski',
};

let displayNames: Intl.DisplayNames | null | undefined;

/** Polish name of a language code, e.g. 'uk' → "ukraiński". The backend sends codes only. */
export function languageName(code: LanguageCode): string {
  if (displayNames === undefined) {
    try {
      displayNames = new Intl.DisplayNames(['pl'], { type: 'language' });
    } catch {
      // Intl.DisplayNames is missing on some JS engines.
      displayNames = null;
    }
  }
  return displayNames?.of(code) ?? FALLBACK_NAMES[code] ?? code.toUpperCase();
}
