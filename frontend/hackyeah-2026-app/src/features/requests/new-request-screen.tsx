import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ApiError, errorMessage } from '@/api/errors';
import { geocodeKrakowAddress, reverseGeocode } from '@/api/geocoding';
import type { AiClassification } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { PriorityBadge } from '@/features/requests/components/request-badges';
import { useUserLocation } from '@/features/map/use-user-location';
import { useCreateRequest } from '@/features/requests/hooks';
import { CategoryLabels } from '@/features/requests/labels';
import { parseDraftAi, type VoiceDraftParams } from '@/features/voice/voice-draft';
import { VoiceRequestFlow } from '@/features/voice/voice-request-flow';
import { useTheme } from '@/hooks/use-theme';
import type { RouteCoordinate } from '@/lib/route-matching';
import { enterItem, layoutTransition } from '@/lib/motion';

const TITLE_MAX = 120;
/** Limits of backend `CreateHelpRequestRequest`. */
const DESCRIPTION_MAX = 1000;

type Errors = Partial<Record<'title' | 'description' | 'street' | 'buildingNumber', string>>;

/**
 * F2.2 – new help request form; category and priority are set by the backend AI on save. `draft` =
 * request accepted from speech (title, description and its AI preview already filled in).
 */
export function NewRequestScreen({ draft }: { draft?: VoiceDraftParams }) {
  const theme = useTheme();
  const createMutation = useCreateRequest();

  const [title, setTitle] = useState(draft?.draftTitle ?? '');
  const [description, setDescription] = useState(draft?.draftDescription ?? '');
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [apartment, setApartment] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  /** Where the request is: the GPS position when used, else the city centre (no geocoding of typed addresses yet). */
  const [position, setPosition] = useState<RouteCoordinate | null>(null);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [resolvingAddress, setResolvingAddress] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { locate, isLoading: locating, error: locationError } = useUserLocation();

  const applyMyLocation = async () => {
    setLocationNote(null);
    const coords = await locate();
    if (!coords) return;
    setPosition(coords);
    setResolvingAddress(true);
    try {
      const address = await reverseGeocode(coords);
      if (address.street) setStreet(address.street);
      if (address.buildingNumber) setBuilding(address.buildingNumber);
      setErrors((current) => ({ ...current, street: undefined, buildingNumber: undefined }));
      setLocationNote(
        address.street && address.buildingNumber
          ? `Ustawiono Twoją lokalizację: ${address.street} ${address.buildingNumber}. Sprawdź numer i dopisz mieszkanie.`
          : 'Ustawiono Twoją lokalizację. Nie znaleźliśmy dokładnego adresu – uzupełnij ulicę i numer.',
      );
    } catch {
      setLocationNote(
        'Ustawiono Twoją lokalizację, ale nie udało się odczytać adresu. Wpisz ulicę i numer.',
      );
    } finally {
      setResolvingAddress(false);
    }
  };

  const [classification, setClassification] = useState<AiClassification | null>(() =>
    parseDraftAi(draft?.draftAi),
  );
  // The preview from a voice draft no longer matches once the text is edited; the backend
  // classifies the request again when it is saved anyway.
  const changeTitle = (text: string) => {
    setTitle(text);
    setClassification(null);
  };
  const changeDescription = (text: string) => {
    setDescription(text);
    setClassification(null);
  };
  const changeStreet = (text: string) => {
    setStreet(text);
    setPosition(null);
    setLocationNote(null);
  };
  const changeBuilding = (text: string) => {
    setBuilding(text);
    setPosition(null);
    setLocationNote(null);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setStreet('');
    setBuilding('');
    setApartment('');
    setPosition(null);
    setLocationNote(null);
    setSubmitError(null);
    setClassification(null);
    setErrors({});
  };

  const validate = () => {
    const next: Errors = {};
    if (title.trim().length < 3) next.title = 'Podaj krótki tytuł (min. 3 znaki).';
    if (description.trim().length < 10)
      next.description = 'Opisz, czego potrzebujesz (min. 10 znaków).';
    if (!street.trim()) next.street = 'Podaj ulicę.';
    if (!building.trim()) next.buildingNumber = 'Podaj numer.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitError(null);
    let requestPosition = position;
    if (!requestPosition) {
      try {
        requestPosition = await geocodeKrakowAddress(
          [street.trim(), building.trim(), 'Kraków'].filter(Boolean).join(' '),
        );
      } catch {
        setErrors((current) => ({
          ...current,
          street: 'Nie udało się znaleźć tego adresu w Krakowie. Sprawdź ulicę i numer.',
        }));
        return;
      }
    }

    try {
      // Category, priority and tags are decided by the backend AI from title + description.
      await createMutation.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        lat: requestPosition.latitude,
        lng: requestPosition.longitude,
        street: street.trim(),
        buildingNumber: building.trim(),
        apartmentNumber: apartment.trim() || undefined,
      });
    } catch (err) {
      // 400 "Request validation failed" carries per-field messages.
      if (err instanceof ApiError && err.fieldErrors) {
        setErrors((current) => ({ ...current, ...err.fieldErrors }));
      } else {
        setSubmitError(errorMessage(err));
      }
      return;
    }
    resetForm();
    router.push({ pathname: '/tasks', params: { tab: 'active' } });
  };

  const flags = classification?.riskFlags ?? [];

  return (
    <Screen scroll>
      <View style={styles.header}>
        <ThemedText type="title">Nowe zgłoszenie</ThemedText>
        <ThemedText themeColor="textSecondary">
          Opisz, w czym potrzebujesz pomocy. Sąsiedzi zobaczą tylko przybliżoną okolicę.
        </ThemedText>
      </View>

      <VoiceRequestFlow
        label="Podyktuj prośbę zamiast pisać"
        onAccept={(accepted) => {
          setTitle(accepted.title);
          setDescription(accepted.description);
          setClassification(accepted.classification);
          setErrors({});
        }}
      />

      <Section title="1. Czego potrzebujesz?">
        <Input
          label="Tytuł"
          placeholder="np. Potrzebuję leków z apteki"
          value={title}
          maxLength={TITLE_MAX}
          onChangeText={changeTitle}
          error={errors.title}
        />
        <Input
          label="Opis"
          placeholder="Napisz kilka zdań: co, kiedy i czy coś jest pilne."
          value={description}
          maxLength={DESCRIPTION_MAX}
          multiline
          onChangeText={changeDescription}
          error={errors.description}
        />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.counter}>
          {description.length}/{DESCRIPTION_MAX}
        </ThemedText>

        {!classification && (
          <ThemedText type="small" themeColor="textSecondary">
            Rodzaj pomocy i pilność asystent AI nada automatycznie po dodaniu zgłoszenia.
          </ThemedText>
        )}

        {classification && (
          <Animated.View entering={enterItem()} layout={layoutTransition}>
            <Card highlighted>
              <ThemedText type="smallBold">Rozpoznane z Twojej wypowiedzi</ThemedText>
              <View style={styles.row}>
                <Badge label={CategoryLabels[classification.category]} />
                <PriorityBadge priority={classification.priority} />
                {classification.tags.map((tag) => (
                  <Badge
                    key={tag}
                    label={tag}
                    color={theme.textSecondary}
                    backgroundColor={theme.backgroundElement}
                  />
                ))}
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {classification.source === 'LLM'
                  ? 'Tak zgłoszenie zostanie oznaczone po wysłaniu (ocena modelu AI).'
                  : 'Tak zgłoszenie zostanie oznaczone po wysłaniu (ocena na podstawie słów kluczowych).'}
              </ThemedText>
            </Card>
          </Animated.View>
        )}

        {classification?.category === 'MEDICINE' && (
          <Card style={{ backgroundColor: theme.warningSoft, borderColor: theme.warning }}>
            <ThemedText type="defaultBold" style={{ color: theme.warning }}>
              Szczegóły dotyczące leków przekażesz osobiście
            </ThemedText>
            <ThemedText>
              Ze względów prawnych nie zapisujemy nazw leków ani sposobu ich stosowania. Tytuł i
              opis zostaną zastąpione ogólnym komunikatem, a wolontariuszowi powiesz wszystko na
              miejscu.
            </ThemedText>
          </Card>
        )}
        {flags.includes('MEDICAL_EMERGENCY') && (
          <Card style={{ backgroundColor: theme.dangerSoft, borderColor: theme.danger }}>
            <ThemedText type="defaultBold" themeColor="danger">
              To może być nagły wypadek
            </ThemedText>
            <ThemedText>
              Jeśli zagrożone jest życie lub zdrowie, zadzwoń pod 112. Wolontariusz nie zastąpi
              pogotowia.
            </ThemedText>
          </Card>
        )}
        {flags.includes('SCAM_SUSPECTED') && (
          <Card style={{ backgroundColor: theme.warningSoft, borderColor: theme.warning }}>
            <ThemedText type="defaultBold" style={{ color: theme.warning }}>
              Uwaga na prośby o pieniądze
            </ThemedText>
            <ThemedText>
              Nie podawaj kodów BLIK, numerów kart ani haseł. Takie zgłoszenia są sprawdzane
              ręcznie.
            </ThemedText>
          </Card>
        )}
        {flags.includes('PERSONAL_DATA') && (
          <ThemedText type="small" style={{ color: theme.warning }}>
            Opis zawiera dane osobowe – usuń numer telefonu, PESEL itp. Adres podasz niżej.
          </ThemedText>
        )}
      </Section>

      <Section title="2. Adres">
        <ThemedText type="small" themeColor="textSecondary">
          Dokładny adres zobaczy wyłącznie wolontariusz, którego pomoc zaakceptujesz.
        </ThemedText>
        <Button
          title={
            locating
              ? 'Ustalam Twoją pozycję…'
              : resolvingAddress
                ? 'Szukam adresu…'
                : position
                  ? 'Odśwież moją lokalizację'
                  : 'Użyj mojej aktualnej lokalizacji'
          }
          variant={position ? 'secondary' : 'primary'}
          size="large"
          disabled={locating || resolvingAddress}
          onPress={applyMyLocation}
        />
        {locationError && (
          <ThemedText type="small" themeColor="danger" accessibilityRole="alert">
            {locationError} Możesz też wpisać adres ręcznie.
          </ThemedText>
        )}
        {locationNote && (
          <ThemedText
            type="small"
            accessibilityLiveRegion="polite"
            style={{ color: position ? theme.success : theme.text }}>
            {locationNote}
          </ThemedText>
        )}
        <ThemedText type="small" themeColor="textSecondary">
          albo wpisz adres ręcznie:
        </ThemedText>
        <Input
          label="Ulica"
          placeholder="ul. Długa"
          value={street}
          onChangeText={changeStreet}
          error={errors.street}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Input
              label="Numer domu"
              value={building}
              onChangeText={changeBuilding}
              error={errors.buildingNumber}
            />
          </View>
          <View style={styles.flex}>
            <Input label="Mieszkanie (opcjonalnie)" value={apartment} onChangeText={setApartment} />
          </View>
        </View>
      </Section>

      {(submitError || createMutation.error) && (
        <ThemedText themeColor="danger">
          {submitError ?? errorMessage(createMutation.error)}
        </ThemedText>
      )}

      <Button
        title={createMutation.isPending ? 'Wysyłanie…' : 'Opublikuj zgłoszenie'}
        size="large"
        disabled={createMutation.isPending}
        onPress={handleSubmit}
      />
    </Screen>
  );
}

function Section({
  title,
  error,
  children,
}: {
  title: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <Card style={styles.section}>
      <ThemedText type="subtitle">{title}</ThemedText>
      {children}
      {error && (
        <ThemedText type="caption" themeColor="danger">
          {error}
        </ThemedText>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  flex: {
    flex: 1,
    minWidth: 140,
  },
  counter: {
    alignSelf: 'flex-end',
    marginTop: -Spacing.two,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
