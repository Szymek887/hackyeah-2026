/**
 * Help requests: `HelpRequestController` + `HelpRequestWorkflowController` + `ClassificationController`.
 * One function per endpoint, no logic – shapes are in api/types.ts, mocks in api/mocks/server.ts.
 */
import { apiRequest } from '@/api/client';
import type {
  AiClassification,
  AlongRouteQuery,
  ClassifyRequestDto,
  CreateHelpRequestDto,
  HandoffToken,
  HelpRequestFull,
  HelpRequestListItem,
  HelpRequestView,
  NearbyQuery,
  RatingDto,
  RatingResult,
} from '@/api/types';

const BASE = '/api/help-requests';

/** OPEN requests within the radius, most urgent first. */
export const getNearbyRequests = (query: NearbyQuery) =>
  apiRequest<HelpRequestListItem[]>(`${BASE}/nearby`, { query });

/** OPEN requests within `bufferMeters` of the route (50–2000 m, 2–100 points). */
export const getRequestsAlongRoute = ({ route, bufferMeters }: AlongRouteQuery) =>
  apiRequest<HelpRequestListItem[]>(`${BASE}/along-route`, {
    method: 'POST',
    body: { points: route.coordinates.map(([lng, lat]) => ({ lat, lng })), bufferMeters },
  });

/** FULL for the requester / accepted volunteer, PUBLIC for everyone else. */
export const getRequest = (id: number) => apiRequest<HelpRequestView>(`${BASE}/${id}`);

/** Requests the user created or volunteers on, newest first. */
export const getMyRequests = () => apiRequest<HelpRequestView[]>(`${BASE}/mine`);

/** AI preview for the form; nothing is saved. */
export const classifyRequest = (dto: ClassifyRequestDto) =>
  apiRequest<AiClassification>('/api/requests/classify', { method: 'POST', body: dto });

/** Category, priority and tags are set by the backend. Suspected scams start as UNDER_REVIEW. */
export const createRequest = (dto: CreateHelpRequestDto) =>
  apiRequest<HelpRequestFull>(BASE, { method: 'POST', body: dto });

// ---------- Workflow: each action returns the request as the caller sees it afterwards ----------

const action = (id: number, name: 'offer' | 'accept' | 'reject' | 'cancel') =>
  apiRequest<HelpRequestView>(`${BASE}/${id}/${name}`, { method: 'POST' });

/** Volunteer: OPEN -> OFFERED. */
export const offerHelp = (id: number) => action(id, 'offer');
/** Requester: OFFERED -> ACCEPTED (volunteer now sees the address). */
export const acceptOffer = (id: number) => action(id, 'accept');
/** Requester: OFFERED -> OPEN. */
export const rejectOffer = (id: number) => action(id, 'reject');
/** Requester: OPEN / OFFERED / ACCEPTED / UNDER_REVIEW -> CANCELLED. */
export const cancelRequest = (id: number) => action(id, 'cancel');

/** Requester of an ACCEPTED request: token to show as a QR code. */
export const getHandoffToken = (id: number) => apiRequest<HandoffToken>(`${BASE}/${id}/qr`);

/** Assigned volunteer after scanning the QR: ACCEPTED -> COMPLETED. */
export const completeRequest = (id: number, token: string) =>
  apiRequest<HelpRequestView>(`${BASE}/${id}/complete`, { method: 'POST', body: { token } });

/** Both sides rate each other once; after the second rating the request is RATED. */
export const rateRequest = (id: number, dto: RatingDto) =>
  apiRequest<RatingResult>(`${BASE}/${id}/ratings`, { method: 'POST', body: dto });
