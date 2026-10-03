import { apiRequest, ApiError } from '@/api/client';
import { USE_MOCKS } from '@/api/config';
import { mockRequests } from '@/api/mocks/data';
import { mockResponse } from '@/api/mocks/delay';
import type { HandoffToken, HelpRequestDetails, RatingDto } from '@/api/types';

export type RatingResult = {
  success: boolean;
  newTrustScore: number;
  cityPointsAwarded: number;
};

const mockTokenFor = (requestId: string) =>
  `PODDRODZE-${requestId.toUpperCase().replace(/[^A-Z0-9]/g, '')}-77A2`;

/** Get or generate a single-use QR handoff token for the requester. */
export async function getHandoffToken(requestId: string): Promise<HandoffToken> {
  if (USE_MOCKS) {
    const request = mockRequests.find((r) => r.id === requestId);
    if (!request) throw new ApiError(404, 'Nie znaleziono zgłoszenia');
    const token = mockTokenFor(requestId);
    return mockResponse({
      requestId,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  return apiRequest<HandoffToken>(`/api/requests/${requestId}/qr`);
}

/** Complete a request by submitting the QR token scanned by the volunteer. */
export async function completeRequest(
  requestId: string,
  token: string,
): Promise<HelpRequestDetails> {
  if (USE_MOCKS) {
    const request = mockRequests.find((r) => r.id === requestId);
    if (!request) throw new ApiError(404, 'Nie znaleziono zgłoszenia');
    // Mirror backend rules: only an ACCEPTED request can be closed, and only with its own token.
    if (request.status !== 'ACCEPTED') {
      throw new ApiError(409, 'Zlecenie nie jest w trakcie realizacji');
    }
    if (token.trim().toUpperCase() !== mockTokenFor(requestId)) {
      throw new ApiError(400, 'Nieprawidłowy kod weryfikacyjny');
    }
    request.status = 'COMPLETED';
    return mockResponse({ ...request });
  }
  return apiRequest<HelpRequestDetails>(`/api/requests/${requestId}/complete`, {
    method: 'POST',
    body: { token },
  });
}

/** Submit a rating and comment after a completed task. */
export async function submitRating(dto: RatingDto): Promise<RatingResult> {
  if (USE_MOCKS) {
    const request = mockRequests.find((r) => r.id === dto.requestId);
    if (request) {
      request.status = 'RATED';
    }
    return mockResponse({
      success: true,
      newTrustScore: 94,
      cityPointsAwarded: 25,
    });
  }
  return apiRequest<RatingResult>(`/api/requests/${dto.requestId}/ratings`, {
    method: 'POST',
    body: dto,
  });
}
