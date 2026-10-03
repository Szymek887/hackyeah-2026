/**
 * Display preferences that make the app easier to read and use. Client-only and per device:
 * they are chosen on the login screen (before anyone is signed in) and can be changed in the profile.
 */

export type AgeGroup = 'AGE_18_39' | 'AGE_40_59' | 'AGE_60_74' | 'AGE_75_PLUS';

export type TextSize = 'standard' | 'comfortable' | 'large' | 'xlarge';

export type AccessibilitySettings = {
  /** null until the user picks one – the app then uses the standard look. */
  ageGroup: AgeGroup | null;
  textSize: TextSize;
  /** Darker text, stronger borders and saturated colors (WCAG AAA-ish contrast). */
  highContrast: boolean;
  /** Bigger buttons, chips and map markers. */
  largeTouchTargets: boolean;
  /** Turns off entrance and press animations. */
  reduceMotion: boolean;
};

type DisplayPreset = Omit<AccessibilitySettings, 'ageGroup'>;

export const TextScale: Record<TextSize, number> = {
  standard: 1,
  comfortable: 1.12,
  large: 1.25,
  xlarge: 1.4,
};

export const TextSizeLabels: Record<TextSize, string> = {
  standard: 'Standardowy',
  comfortable: 'Wygodny',
  large: 'Duży',
  xlarge: 'Bardzo duży',
};

export const AgeGroups: {
  value: AgeGroup;
  label: string;
  description: string;
  preset: DisplayPreset;
}[] = [
  {
    value: 'AGE_18_39',
    label: '18–39 lat',
    description: 'Standardowy wygląd',
    preset: {
      textSize: 'standard',
      highContrast: false,
      largeTouchTargets: false,
      reduceMotion: false,
    },
  },
  {
    value: 'AGE_40_59',
    label: '40–59 lat',
    description: 'Nieco większy tekst',
    preset: {
      textSize: 'comfortable',
      highContrast: false,
      largeTouchTargets: false,
      reduceMotion: false,
    },
  },
  {
    value: 'AGE_60_74',
    label: '60–74 lata',
    description: 'Duży tekst, wyraźny kontrast, większe przyciski',
    preset: {
      textSize: 'large',
      highContrast: true,
      largeTouchTargets: true,
      reduceMotion: false,
    },
  },
  {
    value: 'AGE_75_PLUS',
    label: '75+ lat',
    description: 'Bardzo duży tekst, wysoki kontrast, bez animacji',
    preset: {
      textSize: 'xlarge',
      highContrast: true,
      largeTouchTargets: true,
      reduceMotion: true,
    },
  },
];

export const defaultAccessibilitySettings: AccessibilitySettings = {
  ageGroup: null,
  ...AgeGroups[0].preset,
};

export function settingsForAgeGroup(ageGroup: AgeGroup): AccessibilitySettings {
  const group = AgeGroups.find((g) => g.value === ageGroup) ?? AgeGroups[0];
  return { ageGroup, ...group.preset };
}

// ---------- Disabilities ----------

export type DisabilityType = 'VISION' | 'HEARING' | 'MOBILITY' | 'COGNITIVE' | 'CHRONIC' | 'OTHER';

export const Disabilities: { value: DisabilityType; label: string; hint: string }[] = [
  { value: 'VISION', label: 'Wzrok', hint: 'np. słabo widzę, czytam z lupą' },
  { value: 'HEARING', label: 'Słuch', hint: 'np. nie słyszę dzwonka, wolę SMS' },
  { value: 'MOBILITY', label: 'Poruszanie się', hint: 'np. wózek, kule, nie schodzę po schodach' },
  { value: 'COGNITIVE', label: 'Pamięć i koncentracja', hint: 'np. proszę mówić powoli' },
  { value: 'CHRONIC', label: 'Choroba przewlekła', hint: 'np. cukrzyca, choroba serca' },
  { value: 'OTHER', label: 'Inne', hint: 'opisz poniżej' },
];

export const DisabilityLabels = Object.fromEntries(
  Disabilities.map((d) => [d.value, d.label]),
) as Record<DisabilityType, string>;

const TEXT_SIZE_ORDER: TextSize[] = ['standard', 'comfortable', 'large', 'xlarge'];

const atLeast = (current: TextSize, minimum: TextSize) =>
  TEXT_SIZE_ORDER.indexOf(current) >= TEXT_SIZE_ORDER.indexOf(minimum) ? current : minimum;

/**
 * Display adjustments that follow from the declared needs. Only ever makes the UI more accessible,
 * never less – the user can still turn things off in the profile.
 */
export function adjustForDisabilities(
  settings: AccessibilitySettings,
  disabilities: DisabilityType[],
): AccessibilitySettings {
  let next = settings;
  if (disabilities.includes('VISION')) {
    next = { ...next, textSize: atLeast(next.textSize, 'large'), highContrast: true };
  }
  if (disabilities.includes('MOBILITY')) {
    next = { ...next, largeTouchTargets: true };
  }
  if (disabilities.includes('COGNITIVE')) {
    next = { ...next, reduceMotion: true, largeTouchTargets: true };
  }
  return next;
}
