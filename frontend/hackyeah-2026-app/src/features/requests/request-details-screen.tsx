import { router } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import type { HelpRequestDetails, User } from '@/api/types';
import { ThemedText } from '@/components/themed-text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RatingStars } from '@/components/ui/rating-stars';
import { Screen } from '@/components/ui/screen';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/session-context';
import { CategoryBadge, PriorityBadge } from '@/features/requests/components/request-badges';
import { useAcceptOffer, useOfferHelp, useRequest } from '@/features/requests/hooks';
import { StatusLabels, timeAgo } from '@/features/requests/labels';
import { useTheme } from '@/hooks/use-theme';
import { enterItem } from '@/lib/motion';

/** F2.4 – request details with the "Chcę pomóc" / "Zaakceptuj" flow. */
export function RequestDetailsScreen({ id }: { id: string }) {
  const theme = useTheme();
  const { user } = useSession();
  const { data: request, isPending, error } = useRequest(id);

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
        <ThemedText themeColor="danger">{error?.message ?? 'Nie znaleziono zgłoszenia'}</ThemedText>
        <Button title="Wróć" variant="secondary" inline onPress={() => router.back()} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Animated.View entering={enterItem(0)} style={styles.block}>
        <View style={styles.badges}>
          <PriorityBadge priority={request.priority} />
          <CategoryBadge category={request.category} />
          <Badge
            label={StatusLabels[request.status]}
            color={theme.textSecondary}
            backgroundColor={theme.backgroundMuted}
          />
        </View>
        <ThemedText type="title">{request.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Dodano {timeAgo(request.createdAt)}
        </ThemedText>
      </Animated.View>

      <Animated.View entering={enterItem(1)}>
        <Card>
          <ThemedText type="subtitle">Opis</ThemedText>
          <ThemedText>{request.description}</ThemedText>
          {request.tags.length > 0 && (
            <View style={styles.badges}>
              {request.tags.map((tag) => (
                <Badge
                  key={tag}
                  label={`#${tag}`}
                  color={theme.textSecondary}
                  backgroundColor={theme.backgroundMuted}
                />
              ))}
            </View>
          )}
          {request.accessibilitySupport && <Badge label="Potrzebne wsparcie dostępności" />}
        </Card>
      </Animated.View>

      <Animated.View entering={enterItem(2)}>
        <Card>
          <ThemedText type="subtitle">Zgłaszający</ThemedText>
          <ThemedText type="defaultBold">{request.requester.displayName}</ThemedText>
          <RatingStars
            value={request.requester.ratingAverage}
            count={request.requester.ratingCount}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {request.requester.verified ? 'Tożsamość zweryfikowana' : 'Tożsamość niezweryfikowana'}{' '}
            · zaufanie {request.requester.trustScore}%
          </ThemedText>
        </Card>
      </Animated.View>

      <Animated.View entering={enterItem(3)}>
        <Card highlighted>
          <ThemedText type="smallBold">Lokalizacja</ThemedText>
          <ThemedText type="small">
            {request.address
              ? `${request.address.street} ${request.address.building}${
                  request.address.apartment ? ` / ${request.address.apartment}` : ''
                }, ${request.address.city}`
              : `Przybliżona okolica (~${request.area.radiusMeters} m). Dokładny adres pojawi się po akceptacji pomocy.`}
          </ThemedText>
        </Card>
      </Animated.View>

      <Animated.View entering={enterItem(4)}>
        <RequestActions request={request} user={user} />
      </Animated.View>
    </Screen>
  );
}

function RequestActions({ request, user }: { request: HelpRequestDetails; user: User }) {
  const offerMutation = useOfferHelp();
  const acceptMutation = useAcceptOffer();
  const isOwner = request.requester.id === user.id;
  const isAssigned = request.volunteer?.id === user.id;
  const error = offerMutation.error ?? acceptMutation.error;

  const openTask = () => router.push({ pathname: '/task/[id]', params: { id: request.id } });

  let content: React.ReactNode = null;

  if (request.status === 'ACCEPTED' && (isOwner || isAssigned)) {
    content = <Button title="Otwórz aktywne zadanie" size="large" onPress={openTask} />;
  } else if (user.role === 'VOLUNTEER' && request.status === 'OPEN') {
    content = (
      <Button
        title={offerMutation.isPending ? 'Wysyłanie…' : 'Chcę pomóc'}
        size="large"
        disabled={offerMutation.isPending}
        onPress={() => offerMutation.mutate(request.id)}
      />
    );
  } else if (isAssigned && request.status === 'OFFERED') {
    content = (
      <Card highlighted>
        <ThemedText>
          Zgłosiłeś chęć pomocy. Czekasz na akceptację – zadanie jest w zakładce „Oczekujące”.
        </ThemedText>
      </Card>
    );
  } else if (isOwner && request.status === 'OFFERED') {
    content = (
      <Card highlighted>
        <ThemedText>
          <ThemedText type="defaultBold">{request.volunteer?.displayName}</ThemedText> chce Ci
          pomóc. Po akceptacji zobaczy Twój dokładny adres.
        </ThemedText>
        <Button
          title={acceptMutation.isPending ? 'Akceptowanie…' : 'Zaakceptuj pomoc'}
          disabled={acceptMutation.isPending}
          onPress={() => acceptMutation.mutate(request.id, { onSuccess: openTask })}
        />
      </Card>
    );
  }

  return (
    <View style={styles.block}>
      {content}
      {error && <ThemedText themeColor="danger">{error.message}</ThemedText>}
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
});
