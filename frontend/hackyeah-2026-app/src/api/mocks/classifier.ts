/** Port of backend `ai/KeywordRequestClassifier.java` (the FALLBACK classifier). Keep in sync. */
import type {
  AiClassification,
  Category,
  ClassifyRequestDto,
  Priority,
  RiskFlag,
} from '@/api/types';

const CATEGORY_KEYWORDS: [Category, string[]][] = [
  ['MEDICINE', ['lek', 'apte', 'recept', 'tablet', 'insulin', 'opatrun', 'ciśnieni']],
  [
    'GROCERIES',
    ['zakup', 'jedzeni', 'żywnoś', 'chleb', 'mlek', 'sklep', 'obiad', 'warzyw', 'owoc'],
  ],
  [
    'EQUIPMENT_LOAN',
    ['pożycz', 'drabin', 'wiertar', 'narzęd', 'młot', 'wózek', 'wózk', 'kule ', 'sprzęt'],
  ],
  [
    'HOME_SUPPORT',
    [
      'napraw',
      'awari',
      'kran',
      'cieknie',
      'przecie',
      'zalan',
      'prąd',
      'żarówk',
      'zamek',
      'drzwi',
      'okno',
      'ogrzewani',
      'kaloryfer',
      'wniosek',
      'formularz',
      'pismo',
    ],
  ],
  [
    'SOCIAL',
    [
      'spacer',
      'rozmow',
      'samotn',
      'towarzyst',
      'porozmawia',
      'kawę',
      'kawy',
      'planszów',
      'w karty',
    ],
  ],
];

const CRITICAL = [
  'serc',
  'insulin',
  'pilne',
  'natychmiast',
  'nie mam jak wyjść',
  'nie mogę wyjść',
  'nie wychodzę',
  'brak leków',
];
const HIGH = [
  'dziś',
  'dzisiaj',
  'jutro',
  'szybko',
  'awari',
  'zalan',
  'cieknie',
  'brak prądu',
  'ogrzewani',
];
const EMERGENCY = [
  'nie mogę oddychać',
  'duszno',
  'duszę się',
  'ból w klatce',
  'zawał',
  'udar',
  'omdla',
  'stracił przytomność',
  'krwotok',
];
const SCAM = [
  'przelew',
  'blik',
  'numer karty',
  'dane karty',
  'hasło',
  'kod sms',
  'wyślij pieniądze',
  'przelać',
  'pożyczk',
];
const MAX_TAGS = 5;

const isLetter = (char: string) => char.toLowerCase() !== char.toUpperCase();

/** Stems match only at the start of a word, so "lek" matches "leki" but not "mleka". */
function atWordStart(text: string, keyword: string) {
  for (let index = text.indexOf(keyword); index >= 0; index = text.indexOf(keyword, index + 1)) {
    if (index === 0 || !isLetter(text[index - 1])) return true;
  }
  return false;
}

const containsAny = (text: string, keywords: string[]) =>
  keywords.some((k) => atWordStart(text, k));

function tags(text: string) {
  const result = new Set<string>();
  if (containsAny(text, ['lek', 'recept'])) result.add('leki');
  if (atWordStart(text, 'apte')) result.add('apteka');
  if (containsAny(text, ['zakup', 'sklep', 'jedzeni', 'żywnoś'])) result.add('zakupy');
  if (atWordStart(text, 'drabin')) result.add('drabina');
  if (containsAny(text, ['narzęd', 'wiertar', 'młot'])) result.add('narzędzia');
  if (containsAny(text, ['napraw', 'awari'])) result.add('naprawa');
  if (containsAny(text, ['wniosek', 'formularz', 'pismo'])) result.add('dokumenty');
  if (containsAny(text, ['spacer', 'rozmow', 'towarzyst', 'samotn'])) result.add('towarzystwo');
  return [...result].slice(0, MAX_TAGS);
}

/** Port of backend `ai/MedicineRedaction.java`: no medicine names or usage are stored. */
export const MEDICINE_TITLE = 'Prośba o pomoc z lekami';
export const MEDICINE_DESCRIPTION = 'Prośba dotyczy leków. Szczegóły zostaną przekazane osobiście.';
export const SPECIAL_PRIORITY = 0;
const MEDICINE_TAGS = ['leki', 'apteka'];

/** `RequestClassificationService`: medicine requests get the special priority and only generic tags. */
export function classify(input: ClassifyRequestDto): AiClassification {
  const result = classifyByKeywords(input);
  if (result.category !== 'MEDICINE') return result;
  const tags = result.tags.filter((tag) => MEDICINE_TAGS.includes(tag));
  return { ...result, priority: SPECIAL_PRIORITY, tags: tags.length ? tags : ['leki'] };
}

function classifyByKeywords({ title, description }: ClassifyRequestDto): AiClassification {
  const text = `${title} ${description}`.toLocaleLowerCase('pl');
  const riskFlags: RiskFlag[] = [];
  if (containsAny(text, EMERGENCY)) riskFlags.push('MEDICAL_EMERGENCY');

  // Unmatched requests default to groceries, the most common basic need.
  const category: Category = riskFlags.includes('MEDICAL_EMERGENCY')
    ? 'MEDICINE'
    : (CATEGORY_KEYWORDS.find(([, keywords]) => containsAny(text, keywords))?.[0] ?? 'GROCERIES');

  if (containsAny(text, SCAM)) riskFlags.push('SCAM_SUSPECTED');

  const priority: Priority =
    riskFlags.includes('MEDICAL_EMERGENCY') || containsAny(text, CRITICAL)
      ? 1
      : containsAny(text, HIGH)
        ? 2
        : 3;

  return { category, priority, tags: tags(text), riskFlags, source: 'FALLBACK' };
}
