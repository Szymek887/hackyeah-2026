import { useQuery } from '@tanstack/react-query';

import { getMyTasks } from '@/api/tasks';
import type { HelpRequestDetails, RequestStatus } from '@/api/types';
import { useSession } from '@/features/auth/session-context';
import { requestKeys } from '@/features/requests/hooks';

export type TaskStage = 'pending' | 'inProgress' | 'done';

/** Board columns. A task moves to "done" when the volunteer scans the requester's QR code. */
export const StageByStatus: Record<RequestStatus, TaskStage> = {
  OPEN: 'pending',
  OFFERED: 'pending',
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

export function groupByStage(tasks: HelpRequestDetails[]) {
  const groups: Record<TaskStage, HelpRequestDetails[]> = { pending: [], inProgress: [], done: [] };
  for (const task of tasks) groups[StageByStatus[task.status]].push(task);
  return groups;
}

export function useMyTasks() {
  const { user } = useSession();
  // Lives under requestKeys.all, so QR completion / rating invalidations refresh the board too.
  return useQuery({
    queryKey: [...requestKeys.all, 'mine', user.id],
    queryFn: () => getMyTasks(user),
  });
}
