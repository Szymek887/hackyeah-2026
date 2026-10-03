/**
 * Display preferences that make the app easier to read and use. They follow only from the age
 * group – there are no manual contrast / color switches. Client-only and per device: the age group
 * is the first step of the login screen and can be changed in the profile.
 */

export type AgeGroup = 'AGE_18_39' | 'AGE_40_59' | 'AGE_60_74' | 'AGE_75_PLUS';

export type TextSize = 'standard' | 'comfortable' | 'large' | 'xlarge';

/** Color palette: `standard` = brand colors (light/dark), the senior ones are light-only. */
export type ColorPalette = 'standard' | 'senior' | 'seniorPlus';

export type AccessibilitySettings = {
  /** null until the user picks one – the app then uses the standard look. */
  ageGroup: AgeGroup | null;
  textSize: TextSize;
  /** See `SeniorColors` / `SeniorPlusColors` in constants/theme.ts. */
  palette: ColorPalette;
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
      palette: 'standard',
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
      palette: 'standard',
      largeTouchTargets: false,
      reduceMotion: false,
    },
  },
  {
    value: 'AGE_60_74',
    label: '60–74 lata',
    description: 'Duży tekst, wyraźne kolory, większe przyciski',
    preset: {
      textSize: 'large',
      palette: 'senior',
      largeTouchTargets: true,
      reduceMotion: false,
    },
  },
  {
    value: 'AGE_75_PLUS',
    label: '75+ lat',
    description: 'Bardzo duży tekst, najwyższy kontrast, bez animacji',
    preset: {
      textSize: 'xlarge',
      palette: 'seniorPlus',
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
