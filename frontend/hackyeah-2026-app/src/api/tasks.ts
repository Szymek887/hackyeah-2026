import { apiRequest } from '@/api/client';
import { USE_MOCKS } from '@/api/config';
import { mockRequests } from '@/api/mocks/data';
import { mockResponse } from '@/api/mocks/delay';
import type { HelpRequestDetails, User } from '@/api/types';

/**
 * Requests the user is involved in: own requests (requester) or assigned / offered ones (volunteer).
 * TODO(backend): no endpoint yet – proposed `GET /api/help-requests/mine` (uses `X-User-Id`).
 */
export async function getMyTasks(user: User): Promise<HelpRequestDetails[]> {
  if (USE_MOCKS) {
    const mine = mockRequests.filter((request) =>
      user.role === 'VOLUNTEER'
        ? request.volunteer?.id === user.id
        : request.requester.id === user.id,
    );
    return mockResponse(mine);
  }
  return apiRequest<HelpRequestDetails[]>('/api/help-requests/mine');
}
