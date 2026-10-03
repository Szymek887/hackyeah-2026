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
