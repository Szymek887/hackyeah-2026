/** Port of backend `ai/KeywordRequestClassifier.java` (the FALLBACK classifier). Keep in sync. */
import type {
  AiClassification,
  Category,
  ClassifyRequestDto,
  Priority,
  RiskFlag,
} from '@/api/types';

const CATEGORY_KEYWORDS: Record<Category, string[]> = {
  MEDICINE: [
    'lek',
    'apte',
    'recept',
    'tablet',
    'insulin',
    'opatrun',
    'ciśnieni',
    'zdrow',
    'chor',
    'ból',
    'boli',
    'bolą',
    'gorącz',
    'temperatur',
    'przezięb',
    'kaszel',
    'kaszl',
    'gryp',
    'zawrot',
    'słabo',
    'źle się czuję',
    'upad',
    'przewróci',
    'nie mogę wstać',
    'serc',
    'cukrzyc',
    'przychodni',
    'szpital',
    'pielęgniar',
    'zastrzyk',
    'syrop',
    'maść',
    'maści',
    'witamin',
    'termometr',
    'inhalator',
    'plaster',
    'bandaż',
    'okular',
  ],
  GROCERIES: [
    'zakup',
    'kup',
    'jedzeni',
    'jedzeniem',
    'głodn',
    'żywnoś',
    'chleb',
    'bułk',
    'mlek',
    'mleko',
    'masł',
    'jaj',
    'mięs',
    'wędlin',
    'ser ',
    'sera',
    'kasz',
    'makaron',
    'ryż',
    'cukru',
    'cukier',
    'herbat',
    'wod',
    'napoj',
    'picia',
    'karm',
    'sklep',
    'market',
    'biedronk',
    'lidl',
    'obiad',
    'kolacj',
    'śniadani',
    'warzyw',
    'owoc',
    'ziemniak',
    'papier toaletow',
    'proszek do prania',
  ],
  EQUIPMENT_LOAN: [
    'pożycz',
    'drabin',
    'wiertar',
    'wkrętar',
    'narzęd',
    'młot',
    'wózek',
    'wózk',
    'balkonik',
    'chodzik',
    'kule ',
    'sprzęt',
    'odkurzacz',
    'przedłużacz',
  ],
  HOME_SUPPORT: [
    'napraw',
    'awari',
    'zepsu',
    'nie działa',
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
    'dokument',
    'urząd',
    'urzęd',
    'poczt',
    'rachun',
    'opłat',
    'wnieś',
    'wynieś',
    'śmieci',
    'sprząt',
    'posprząt',
    'pranie',
    'węgl',
    'drew',
    'odśnież',
    'mebl',
    'przesun',
    'pies',
    'psa',
    'kot ',
    'kota',
    'telewizor',
    'telefon',
    'komputer',
    'internet',
  ],
  SOCIAL: [
    'spacer',
    'rozmow',
    'samotn',
    'towarzyst',
    'porozmawia',
    'pogada',
    'odwiedzi',
    'odwiedz',
    'smutn',
    'kawę',
    'kawy',
    'planszów',
    'w karty',
    'kościoł',
    'kościel',
    'msz',
    'cmentarz',
    'poczyta',
    'książk',
  ],
};
/** Tie-break order: health first, social last. */
const CATEGORY_ORDER: Category[] = [
  'MEDICINE',
  'GROCERIES',
  'EQUIPMENT_LOAN',
  'HOME_SUPPORT',
  'SOCIAL',
];

const CRITICAL = [
  'serc',
  'insulin',
  'pilne',
  'pilnie',
  'natychmiast',
  'jak najszybciej',
  'nie mam jak wyjść',
  'nie mogę wyjść',
  'nie wychodzę',
  'brak leków',
  'nie mam leków',
  'skończyły mi się leki',
  'nie mam jedzenia',
  'nic do jedzenia',
  'głodn',
  'upad',
  'przewróci',
  'nie mogę wstać',
  'źle się czuję',
  'cukrzyc',
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
  'ból',
  'boli',
  'gorącz',
  'chor',
  'zepsu',
  'nie działa',
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

const TAGS: [string, string[]][] = [
  ['leki', ['lek', 'recept', 'tablet']],
  ['apteka', ['apte']],
  [
    'zdrowie',
    [
      'chor',
      'ból',
      'boli',
      'gorącz',
      'zawrot',
      'źle się czuję',
      'upad',
      'przewróci',
      'serc',
      'cukrzyc',
    ],
  ],
  ['wizyta lekarska', ['przychodni', 'szpital', 'pielęgniar']],
  ['zakupy', ['zakup', 'kup', 'sklep', 'jedzeni', 'żywnoś']],
  ['posiłek', ['obiad', 'kolacj', 'śniadani', 'głodn']],
  ['drabina', ['drabin']],
  ['narzędzia', ['narzęd', 'wiertar', 'wkrętar', 'młot']],
  ['sprzęt rehabilitacyjny', ['wózek', 'wózk', 'balkonik', 'chodzik', 'kule ']],
  ['naprawa', ['napraw', 'awari', 'zepsu', 'nie działa']],
  ['sprzątanie', ['sprząt', 'posprząt', 'śmieci', 'pranie']],
  ['dokumenty', ['wniosek', 'formularz', 'pismo', 'dokument', 'urząd', 'urzęd']],
  ['zwierzęta', ['pies', 'psa', 'kot ', 'kota']],
  ['towarzystwo', ['spacer', 'rozmow', 'towarzyst', 'samotn', 'odwiedz', 'odwiedzi']],
];

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

const score = (text: string, category: Category) =>
  CATEGORY_KEYWORDS[category].filter((k) => atWordStart(text, k)).length;

/**
 * Highest score wins (ties: earlier in CATEGORY_ORDER). Emergencies and critical requests that
 * mention health are MEDICINE; nothing matched = general help at home.
 */
function category(text: string, riskFlags: RiskFlag[], priority: Priority): Category {
  if (riskFlags.includes('MEDICAL_EMERGENCY') || (priority === 1 && score(text, 'MEDICINE') > 0)) {
    return 'MEDICINE';
  }
  let best: Category = 'HOME_SUPPORT';
  let bestScore = 0;
  for (const candidate of CATEGORY_ORDER) {
    const value = score(text, candidate);
    if (value > bestScore) {
      best = candidate;
      bestScore = value;
    }
  }
  return best;
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
  if (containsAny(text, SCAM)) riskFlags.push('SCAM_SUSPECTED');

  const priority: Priority =
    riskFlags.includes('MEDICAL_EMERGENCY') || containsAny(text, CRITICAL)
      ? 1
      : containsAny(text, HIGH)
        ? 2
        : 3;

  const tags = TAGS.filter(([, stems]) => containsAny(text, stems))
    .map(([tag]) => tag)
    .slice(0, MAX_TAGS);

  return {
    category: category(text, riskFlags, priority),
    priority,
    tags,
    riskFlags,
    source: 'FALLBACK',
  };
}
