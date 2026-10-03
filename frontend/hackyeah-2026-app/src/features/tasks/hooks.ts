import type { HelpRequestView, RequestStatus } from '@/api/types';
import { useSession } from '@/features/auth/session-context';
import { useMyRequests } from '@/features/requests/hooks';

export type TaskStage = 'pending' | 'inProgress' | 'done';

/** Board columns. A task moves to "done" when the volunteer scans the requester's QR code. */
export const StageByStatus: Record<RequestStatus, TaskStage> = {
  OPEN: 'pending',
  OFFERED: 'pending',
  UNDER_REVIEW: 'pending',
  ACCEPTED: 'inProgress',
  COMPLETED: 'done',
  RATED: 'done',
  CANCELLED: 'done',
};

export const StageLabels: Record<TaskStage, string> = {
  pending: 'Oczekujące',
  inProgress: 'W toku',
  done: 'Zakończone',
};

export const STAGES: TaskStage[] = ['pending', 'inProgress', 'done'];

export function groupByStage(tasks: HelpRequestView[]) {
  const groups: Record<TaskStage, HelpRequestView[]> = { pending: [], inProgress: [], done: [] };
  for (const task of tasks) groups[StageByStatus[task.status]].push(task);
  return groups;
}

/** `GET /api/help-requests/mine` for the logged-in user. */
export function useMyTasks() {
  const { user } = useSession();
  return useMyRequests(user.id);
}
