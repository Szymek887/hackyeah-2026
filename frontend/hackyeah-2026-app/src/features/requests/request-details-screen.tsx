import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { errorMessage } from '@/api/errors';
import type { HelpRequestView, UserSummary } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RatingStars } from '@/components/ui/rating-stars';
import { Screen } from '@/components/ui/screen';
import { Radius, Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { ActiveTaskNotice } from '@/features/tasks/components/active-task-notice';
import { useActiveVolunteerTask } from '@/features/tasks/hooks';
import { CategoryBadge, PriorityBadge } from '@/features/requests/components/request-badges';
import { RequesterNeeds } from '@/features/requests/components/requester-needs';
import {
  useAcceptOffer,
  useCancelRequest,
  useOfferHelp,
  useRejectOffer,
  useRequest,
} from '@/features/requests/hooks';
import { CategoryLabels, StatusLabels, timeAgo } from '@/features/requests/labels';
import { formatAddress, isFull } from '@/features/requests/view-helpers';
import { useVoiceAssistant } from '@/features/voice/use-voice-assistant';
import { useTheme } from '@/hooks/use-theme';

/** F2.4 – `GET /api/help-requests/{id}` with the offer / accept / reject / cancel actions. */
export function RequestDetailsScreen({ id }: { id: number }) {
  const theme = useTheme();
  const voice = useVoiceAssistant();
  const { data: request, isPending, error, refetch } = useRequest(id);

  if (isPending) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator color={theme.primary} />
      </Screen>
    );
  }

  if (error || !request) {
    return (
      <Screen>
        <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>
        <Button title="Wróć" variant="secondary" inline onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll onRefresh={refetch}>
      <View style={styles.block}>
        <View style={styles.badges}>
          <PriorityBadge priority={request.priority} />
          <CategoryBadge category={request.category} />
          <Badge
            label={StatusLabels[request.status]}
            color={theme.textSecondary}
            backgroundColor={theme.backgroundSelected}
          />
        </View>
        <ThemedText type="title">{request.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Dodano {timeAgo(request.createdAt)}
        </ThemedText>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            voice.isSpeaking ? 'Zatrzymaj czytanie na głos' : 'Odsłuchaj treść zgłoszenia na głos'
          }
          onPress={() => {
            if (voice.isSpeaking) {
              voice.stopSpeaking();
            } else {
              const parts = [
                `Zgłoszenie: ${request.title}.`,
                request.description ? `Opis: ${request.description}.` : '',
                `Kategoria: ${CategoryLabels[request.category]}.`,
                isFull(request) ? `Adres: ${formatAddress(request)}.` : '',
              ].filter(Boolean);
              voice.speak(parts.join(' '));
            }
          }}
          style={[styles.listenBtn, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">
            {voice.isSpeaking ? 'Zatrzymaj czytanie' : 'Przeczytaj na głos'}
          </ThemedText>
        </Pressable>
      </View>

      <Card>
        {request.description ? (
          <ThemedText>{request.description}</ThemedText>
        ) : (
          <ThemedText themeColor="textSecondary">
            Opis widzą tylko osoby biorące udział w zgłoszeniu, bo zawiera dane osobowe.
          </ThemedText>
        )}
        {request.tags.length > 0 && (
          <View style={styles.badges}>
            {request.tags.map((tag) => (
              <Badge
                key={tag}
                label={`#${tag}`}
                color={theme.textSecondary}
                backgroundColor={theme.backgroundSelected}
              />
            ))}
          </View>
        )}
      </Card>

      {isFull(request) ? (
        <>
          <Card highlighted>
            <ThemedText type="smallBold">Adres</ThemedText>
            <ThemedText>{formatAddress(request)}</ThemedText>
          </Card>
          <Person title="Prosi o pomoc" person={request.requester}>
            <RequesterNeeds request={request} />
          </Person>
          {request.volunteer && (
            <Person
              title={request.status === 'OFFERED' ? 'Chce pomóc' : 'Pomaga'}
              person={request.volunteer}
            />
          )}
        </>
      ) : (
        <Card highlighted>
          <ThemedText type="smallBold">Lokalizacja</ThemedText>
          <ThemedText type="small">
            Widoczna jest tylko okolica (ok. 300 m). Dokładny adres zobaczysz, gdy osoba
            potrzebująca przyjmie Twoją pomoc.
          </ThemedText>
        </Card>
      )}

      <RequestActions request={request} />
    </Screen>
  );
}

function Person({
  title,
  person,
  children,
}: {
  title: string;
  person: UserSummary;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="defaultBold">{person.displayName}</ThemedText>
      {person.ratingAverage !== null && (
        <RatingStars value={person.ratingAverage} count={person.ratingCount} />
      )}
      <ThemedText type="small" themeColor="textSecondary">
        {person.identityVerified ? 'Tożsamość potwierdzona' : 'Tożsamość niepotwierdzona'}, zaufanie{' '}
        {person.trustScore}%
      </ThemedText>
      {children}
    </Card>
  );
}

/** Buttons follow the backend rules: who may do what in which status (else 403 / 409). */
function RequestActions({ request }: { request: HelpRequestView }) {
  const { role } = useSession();
  const activeTask = useActiveVolunteerTask();
  const offer = useOfferHelp();
  const accept = useAcceptOffer();
  const reject = useRejectOffer();
  const cancel = useCancelRequest();
  const error = offer.error ?? accept.error ?? reject.error ?? cancel.error;
  const busy = offer.isPending || accept.isPending || reject.isPending || cancel.isPending;

  const isRequester = request.viewerRole === 'REQUESTER';
  const isVolunteer = request.viewerRole === 'VOLUNTEER';
  const { status } = request;
  const goTo = (pathname: '/task/[id]' | '/rate/[id]') =>
    router.push({ pathname, params: { id: request.id } });

  const buttons: React.ReactNode[] = [];

  if (status === 'OPEN' && request.viewerRole === 'NONE' && role === 'VOLUNTEER' && activeTask) {
    buttons.push(<ActiveTaskNotice key="busy" task={activeTask} />);
  } else if (status === 'OPEN' && request.viewerRole === 'NONE' && role === 'VOLUNTEER') {
    buttons.push(
      <Button
        key="offer"
        title="Chcę pomóc"
        size="large"
        disabled={busy}
        onPress={() => offer.mutate(request.id)}
      />,
    );
  }
  if (status === 'OFFERED' && isVolunteer) {
    buttons.push(
      <Card key="waiting" highlighted>
        <ThemedText>
          Zgłosiłeś się do pomocy. Czekasz, aż osoba potrzebująca to potwierdzi.
        </ThemedText>
      </Card>,
    );
  }
  if (status === 'OFFERED' && isRequester) {
    buttons.push(
      <Button
        key="accept"
        title="Przyjmij pomoc"
        size="large"
        disabled={busy}
        onPress={() => accept.mutate(request.id, { onSuccess: () => goTo('/task/[id]') })}
      />,
      <Button
        key="reject"
        title="Odrzuć ofertę"
        variant="secondary"
        disabled={busy}
        onPress={() => reject.mutate(request.id)}
      />,
    );
  }
  if (status === 'ACCEPTED' && (isRequester || isVolunteer)) {
    buttons.push(
      <Button key="task" title="Otwórz zadanie" size="large" onPress={() => goTo('/task/[id]')} />,
    );
  }
  if (status === 'COMPLETED' && (isRequester || isVolunteer)) {
    buttons.push(
      <Button key="rate" title="Oceń pomoc" size="large" onPress={() => goTo('/rate/[id]')} />,
    );
  }
  if (status === 'UNDER_REVIEW' && isRequester) {
    buttons.push(
      <Card key="review" highlighted>
        <ThemedText>
          Zgłoszenie czeka na sprawdzenie, bo opis przypominał prośbę o pieniądze. Do tego czasu nie
          widzą go inni.
        </ThemedText>
      </Card>,
    );
  }
  if (isRequester && ['OPEN', 'OFFERED', 'ACCEPTED', 'UNDER_REVIEW'].includes(status)) {
    buttons.push(
      <Button
        key="cancel"
        title="Anuluj zgłoszenie"
        variant="danger"
        disabled={busy}
        onPress={() => cancel.mutate(request.id)}
      />,
    );
  }

  return (
    <View style={styles.block}>
      {buttons}
      {error && <ThemedText themeColor="danger">{errorMessage(error)}</ThemedText>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: {
    gap: Spacing.two,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  listenBtn: {
    alignSelf: 'flex-start',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.medium,
  },
});
