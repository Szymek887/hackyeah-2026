import { useEffect, useRef } from 'react';

import type { HelpRequestListItem, HelpRequestView, RequestStatus } from '@/api/types';
import { useSession } from '@/features/auth/session-context';
import {
  useNotifications,
  type AppNotification,
} from '@/features/notifications/notifications-context';
import { useMyRequests, useNearbyRequests } from '@/features/requests/hooks';
import { CategoryLabels, PriorityLabels } from '@/features/requests/labels';
import { DEFAULT_CENTER } from '@/lib/geo';

/** Same area as the "Zgłoszenia" list, so both share one cached query. */
const NEARBY_QUERY = { ...DEFAULT_CENTER, radiusKm: 5 };
/** Mock push: how often a volunteer checks for new requests nearby. */
const NEARBY_POLL_MS = 10_000;

/**
 * Turns polled data into mock notifications:
 * - volunteers: a new OPEN request appeared nearby,
 * - requesters: someone offered to help (OPEN → OFFERED),
 * - volunteers: the requester accepted their offer (→ ACCEPTED) or cancelled the request.
 * `/mine` already polls while a request waits for the other side (see `useMyRequests`).
 */
export function useRequestAlerts() {
  const { user, role } = useSession();
  const { notify } = useNotifications();
  const nearby = useNearbyRequests(NEARBY_QUERY, {
    enabled: role === 'VOLUNTEER',
    refetchInterval: NEARBY_POLL_MS,
  });
  const mine = useMyRequests(user.id);

  const seenNearby = useRef<Set<number> | null>(null);
  const lastStatuses = useRef<Map<number, RequestStatus> | null>(null);

  useEffect(() => {
    // Wait for a settled `/mine`, so the user's own new request is not announced to them.
    if (!nearby.data || !mine.data || mine.isFetching) return;
    if (!seenNearby.current) {
      // Requests that were already there when the app started are not "new".
      seenNearby.current = new Set(nearby.data.map((item) => item.id));
      return;
    }
    const ownIds = new Set(mine.data.map((request) => request.id));
    for (const item of nearby.data) {
      if (seenNearby.current.has(item.id)) continue;
      seenNearby.current.add(item.id);
      if (!ownIds.has(item.id)) notify(nearbyAlert(item));
    }
  }, [nearby.data, mine.data, mine.isFetching, notify]);

  useEffect(() => {
    if (!mine.data) return;
    const previous = lastStatuses.current;
    lastStatuses.current = new Map(mine.data.map((request) => [request.id, request.status]));
    if (!previous) return;
    for (const request of mine.data) {
      const before = previous.get(request.id);
      // A request new to `/mine` was created or offered by this user – nothing to announce.
      if (!before || before === request.status) continue;
      const alert = statusAlert(request);
      if (alert) notify(alert);
    }
  }, [mine.data, notify]);
}

type Alert = Omit<AppNotification, 'id'>;

function nearbyAlert(item: HelpRequestListItem): Alert {
  return {
    title: 'Nowa prośba o pomoc w pobliżu',
    body: `„${item.title}” · ${CategoryLabels[item.category]} · ${PriorityLabels[item.priority]}`,
    target: { pathname: '/request/[id]', params: { id: item.id } },
  };
}

/** Only changes made by the other side; the user's own actions are never announced. */
function statusAlert(request: HelpRequestView): Alert | null {
  const target = { pathname: '/request/[id]', params: { id: request.id } } as const;

  if (request.viewerRole === 'REQUESTER' && request.status === 'OFFERED') {
    const volunteer =
      request.visibility === 'FULL' && request.volunteer
        ? request.volunteer.displayName
        : 'Wolontariusz';
    return {
      title: 'Ktoś chce Ci pomóc',
      body: `${volunteer} oferuje pomoc: „${request.title}”. Zaakceptuj lub odrzuć ofertę.`,
      target,
    };
  }

  if (request.viewerRole === 'VOLUNTEER' && request.status === 'ACCEPTED') {
    return {
      title: 'Twoja oferta została przyjęta',
      body: `„${request.title}” – możesz ruszać z pomocą.`,
      target: { pathname: '/task/[id]', params: { id: request.id } },
    };
  }

  if (request.viewerRole === 'VOLUNTEER' && request.status === 'CANCELLED') {
    return {
      title: 'Prośba została anulowana',
      body: `„${request.title}” – osoba potrzebująca odwołała prośbę.`,
      target,
    };
  }

  return null;
}

/** Mount once for a signed-in resident; renders nothing. */
export function RequestAlerts() {
  useRequestAlerts();
  return null;
}
