import { useQuery } from '@tanstack/react-query';

import { getMe } from '@/api/auth';
import type { HelpRequestView, RequestStatus } from '@/api/types';
import { useSession } from '@/features/auth/session-context';
import { useMyRequests } from '@/features/requests/hooks';

/** Tabs of "Moje zadania". */
export type TaskTab = 'active' | 'done' | 'ratings';

export const TaskTabLabels: Record<TaskTab, string> = {
  active: 'W trakcie',
  done: 'Zakończone',
  ratings: 'Oceny',
};

export const TASK_TABS: TaskTab[] = ['active', 'done', 'ratings'];

/** A task is finished once the volunteer scans the requester's QR code (or it was cancelled). */
const FINISHED: RequestStatus[] = ['COMPLETED', 'RATED', 'CANCELLED'];

export const isFinished = (status: RequestStatus) => FINISHED.includes(status);

export function groupTasks(tasks: HelpRequestView[]) {
  return {
    active: tasks.filter((task) => !isFinished(task.status)),
    done: tasks.filter((task) => isFinished(task.status)),
    // COMPLETED = at least one side has not rated yet (RATED once both did).
    toRate: tasks.filter((task) => task.status === 'COMPLETED'),
    rated: tasks.filter((task) => task.status === 'RATED'),
  };
}

/** `GET /api/help-requests/mine` for the logged-in user. */
export function useMyTasks() {
  const { user } = useSession();
  return useMyRequests(user.id);
}

/** Fresh `/users/me` – ratings from the other side change trust score and city points. */
export function useMyReputation() {
  const { user } = useSession();
  return useQuery({
    queryKey: ['users', 'me', user.id],
    queryFn: () => getMe(user.id),
    placeholderData: user,
  });
}

/**
 * A volunteer works on one request at a time (backend `VOLUNTEER_ACTIVE_STATUSES`): an offer
 * waiting for acceptance or an accepted request.
 */
export const VOLUNTEER_ACTIVE_STATUSES: RequestStatus[] = ['OFFERED', 'ACCEPTED'];

/** The volunteer's current task, if any – while it exists they cannot offer help elsewhere. */
export function useActiveVolunteerTask(): HelpRequestView | null {
  const { data } = useMyTasks();
  return (
    data?.find(
      (task) => task.viewerRole === 'VOLUNTEER' && VOLUNTEER_ACTIVE_STATUSES.includes(task.status),
    ) ?? null
  );
}

/**
 * Whose move it is: `you` – the logged-in user has something to do; `other` – waiting for the
 * other side (or for the review); `none` – nothing left to do.
 */
export type Turn = 'you' | 'other' | 'none';

export function turnOf(task: HelpRequestView): Turn {
  const volunteer = task.viewerRole === 'VOLUNTEER';
  switch (task.status) {
    case 'OPEN':
    case 'UNDER_REVIEW':
      return 'other';
    case 'OFFERED':
      // The volunteer waits for the requester to accept.
      return volunteer ? 'other' : 'you';
    case 'ACCEPTED':
      // The volunteer goes to help and scans the QR code; the requester waits for them.
      return volunteer ? 'you' : 'other';
    case 'COMPLETED':
      // Either side may still have to rate (RATED once both did).
      return 'you';
    default:
      return 'none';
  }
}

/** Short call to action / waiting reason shown on the task card. */
export function turnLabel(task: HelpRequestView): string {
  const volunteer = task.viewerRole === 'VOLUNTEER';
  switch (task.status) {
    case 'OPEN':
      return 'Czekasz, aż zgłosi się wolontariusz';
    case 'UNDER_REVIEW':
      return 'Czekasz na sprawdzenie zgłoszenia';
    case 'OFFERED':
      return volunteer
        ? 'Czekasz, aż osoba potrzebująca przyjmie Twoją pomoc'
        : 'Ktoś chce Ci pomóc – przyjmij lub odrzuć';
    case 'ACCEPTED':
      return volunteer
        ? 'Pojedź z pomocą i zeskanuj kod QR na miejscu'
        : 'Wolontariusz jest w drodze – przygotuj kod QR';
    case 'COMPLETED':
      return 'Oceń, jak przebiegła pomoc';
    case 'RATED':
      return 'Zakończone i ocenione';
    case 'CANCELLED':
      return 'Zgłoszenie anulowane';
  }
}
