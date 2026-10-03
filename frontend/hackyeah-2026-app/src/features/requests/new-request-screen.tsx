import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { classifyRequest } from '@/api/requests';
import type { AiClassification, Category } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { PriorityBadge } from '@/features/requests/components/request-badges';
import { useCreateRequest } from '@/features/requests/hooks';
import { CategoryLabels } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_CENTER, point } from '@/lib/geo';
import { enterItem, layoutTransition } from '@/lib/motion';

const CATEGORIES = Object.keys(CategoryLabels) as Category[];
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 2000;

type Errors = Partial<Record<'title' | 'description' | 'category' | 'street' | 'building', string>>;

/** F2.2 – new help request form with AI classification preview. */
export function NewRequestScreen() {
  const theme = useTheme();
  const { user } = useSession();
  const createMutation = useCreateRequest();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [street, setStreet] = useState('');
  const [building, setBuilding] = useState('');
  const [apartment, setApartment] = useState('');
  const [city, setCity] = useState('Kraków');
  const [accessibilitySupport, setAccessibilitySupport] = useState(user.hasSpecialNeeds);
  const [errors, setErrors] = useState<Errors>({});

  const [classification, setClassification] = useState<AiClassification | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyError, setClassifyError] = useState<string | null>(null);

  const canClassify = title.trim().length >= 3 && description.trim().length >= 10;

  const handleClassify = async () => {
    setClassifying(true);
    setClassifyError(null);
    try {
      const result = await classifyRequest({
        title: title.trim(),
        description: description.trim(),
      });
      setClassification(result);
      setCategory((current) => current ?? result.category);
    } catch (err) {
      setClassifyError(err instanceof Error ? err.message : 'Nie udało się przeanalizować opisu.');
    } finally {
      setClassifying(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory(null);
    setStreet('');
    setBuilding('');
    setApartment('');
    setClassification(null);
    setErrors({});
  };

  const validate = () => {
    const next: Errors = {};
    if (title.trim().length < 3) next.title = 'Podaj krótki tytuł (min. 3 znaki).';
    if (description.trim().length < 10)
      next.description = 'Opisz, czego potrzebujesz (min. 10 znaków).';
    if (!category) next.category = 'Wybierz kategorię.';
    if (!street.trim()) next.street = 'Podaj ulicę.';
    if (!building.trim()) next.building = 'Podaj numer.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !category) return;
    await createMutation.mutateAsync({
      title: title.trim(),
      description: description.trim(),
      category,
      accessibilitySupport,
      // TODO(geocoding): convert the address to coordinates; city center until then.
      location: point(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng),
      address: {
        street: street.trim(),
        building: building.trim(),
        apartment: apartment.trim() || undefined,
        city: city.trim() || 'Kraków',
      },
      priority: classification?.priority,
      tags: classification?.tags,
    });
    resetForm();
    router.push({ pathname: '/tasks', params: { stage: 'pending' } });
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

      <Section title="1. Czego potrzebujesz?">
        <Input
          label="Tytuł"
          placeholder="np. Potrzebuję leków z apteki"
          value={title}
          maxLength={TITLE_MAX}
          onChangeText={setTitle}
          error={errors.title}
        />
        <Input
          label="Opis"
          placeholder="Napisz kilka zdań: co, kiedy i czy coś jest pilne."
          value={description}
          maxLength={DESCRIPTION_MAX}
          multiline
          onChangeText={setDescription}
          error={errors.description}
        />
        <ThemedText type="caption" themeColor="textSecondary" style={styles.counter}>
          {description.length}/{DESCRIPTION_MAX}
        </ThemedText>

        <Button
          title={classifying ? 'Analizuję opis…' : 'Zaproponuj kategorię (AI)'}
          variant="secondary"
          inline
          disabled={!canClassify || classifying}
          onPress={handleClassify}
        />
        {classifyError && <ThemedText themeColor="danger">{classifyError}</ThemedText>}

        {classification && (
          <Animated.View entering={enterItem()} layout={layoutTransition}>
            <Card highlighted>
              <ThemedText type="smallBold">Propozycja asystenta</ThemedText>
              <View style={styles.row}>
                <Badge label={CategoryLabels[classification.category]} />
                <PriorityBadge priority={classification.priority} />
                {classification.tags.map((tag) => (
                  <Badge
                    key={tag}
                    label={`#${tag}`}
                    color={theme.textSecondary}
                    backgroundColor={theme.backgroundElement}
                  />
                ))}
              </View>
              <ThemedText type="caption" themeColor="textSecondary">
                {classification.source === 'LLM'
                  ? 'Ocena modelu AI – możesz ją zmienić poniżej.'
                  : 'Ocena na podstawie słów kluczowych – możesz ją zmienić poniżej.'}
              </ThemedText>
            </Card>
          </Animated.View>
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

      <Section title="2. Kategoria" error={errors.category}>
        <View style={styles.row}>
          {CATEGORIES.map((value) => (
            <Chip
              key={value}
              label={CategoryLabels[value]}
              selected={category === value}
              hint={classification?.category === value ? 'AI' : undefined}
              onPress={() => setCategory(value)}
            />
          ))}
        </View>
      </Section>

      <Section title="3. Adres">
        <ThemedText type="small" themeColor="textSecondary">
          Dokładny adres zobaczy wyłącznie wolontariusz, którego pomoc zaakceptujesz.
        </ThemedText>
        <Input
          label="Ulica"
          placeholder="ul. Długa"
          value={street}
          onChangeText={setStreet}
          error={errors.street}
        />
        <View style={styles.row}>
          <View style={styles.flex}>
            <Input
              label="Numer domu"
              value={building}
              onChangeText={setBuilding}
              error={errors.building}
            />
          </View>
          <View style={styles.flex}>
            <Input label="Mieszkanie (opcjonalnie)" value={apartment} onChangeText={setApartment} />
          </View>
        </View>
        <Input label="Miasto" value={city} onChangeText={setCity} />
      </Section>

      <Section title="4. Dodatkowe informacje">
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <ThemedText type="defaultBold">Potrzebuję wsparcia w dostępności</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Np. trudności z poruszaniem się, słabszy wzrok lub słuch.
            </ThemedText>
          </View>
          <Switch
            value={accessibilitySupport}
            onValueChange={setAccessibilitySupport}
            trackColor={{ true: theme.primary, false: theme.border }}
            thumbColor={theme.backgroundElement}
            accessibilityLabel="Potrzebuję wsparcia w dostępności"
          />
        </View>
      </Section>

      {createMutation.error && (
        <ThemedText themeColor="danger">{createMutation.error.message}</ThemedText>
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
