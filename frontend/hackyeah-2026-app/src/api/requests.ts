import { apiRequest, ApiError, getApiUserId } from '@/api/client';
import { USE_MOCKS } from '@/api/config';
import { mockRequests, mockUsers } from '@/api/mocks/data';
import { mockResponse } from '@/api/mocks/delay';
import type {
  AiClassification,
  AlongRouteQuery,
  ClassifyRequestDto,
  CreateHelpRequestDto,
  Category,
  GeoPoint,
  GeoPolygon,
  HelpRequestDetails,
  HelpRequestPublic,
  NearbyQuery,
  Priority,
  RequestStatus,
  RiskFlag,
  User,
  UserPublic,
} from '@/api/types';
import { distanceMeters } from '@/lib/geo';
import { filterRequestsAlongRoute, type RouteCoordinate } from '@/lib/route-matching';

type BackendCategory = 'MEDICINE' | 'GROCERIES' | 'EQUIPMENT_LOAN' | 'HOME_SUPPORT' | 'SOCIAL';

type BackendPublicHelpRequest = {
  id: number;
  title: string;
  category: BackendCategory;
  priority: number;
  status: RequestStatus;
  approximateLocation: GeoPoint;
  maskedArea?: GeoPolygon;
  createdAt: string;
};

/** Privacy rule from plan.md: list payloads never carry exact location or address. */
function toPublic({
  description: _d,
  exactLocation: _l,
  address: _a,
  volunteer: _v,
  ...rest
}: HelpRequestDetails): HelpRequestPublic {
  return rest;
}

const toPublicUser = ({
  id,
  displayName,
  verified,
  trustScore,
  ratingAverage,
  ratingCount,
}: User): UserPublic => ({
  id,
  displayName,
  verified,
  trustScore,
  ratingAverage,
  ratingCount,
});

function toCategory(category: BackendCategory): Category {
  if (category === 'MEDICINE' || category === 'GROCERIES') return 'BASIC_NEEDS';
  return category;
}

function toPriority(priority: number): Priority {
  if (priority === 1 || priority === 2 || priority === 3) return priority;
  return 3;
}

function toRouteCoordinates(query: AlongRouteQuery): RouteCoordinate[] {
  return query.route.coordinates.map(([longitude, latitude]) => ({ latitude, longitude }));
}

function fromBackendPublic(request: BackendPublicHelpRequest): HelpRequestPublic {
  return {
    id: String(request.id),
    title: request.title,
    category: toCategory(request.category),
    priority: toPriority(request.priority),
    status: request.status,
    tags: [],
    accessibilitySupport: false,
    area: {
      center: request.approximateLocation,
      radiusMeters: 300,
      polygon: request.maskedArea,
    },
    requester: {
      id: 'backend-requester',
      displayName: 'Zgłaszający',
      verified: true,
      trustScore: 0,
      ratingAverage: 0,
      ratingCount: 0,
    },
    createdAt: request.createdAt,
  };
}

export async function getNearbyRequests(query: NearbyQuery): Promise<HelpRequestPublic[]> {
  if (USE_MOCKS) {
    const nearby = mockRequests.filter(
      (r) =>
        distanceMeters(r.area.center.coordinates, [query.lng, query.lat]) <= query.radiusKm * 1000,
    );
    return mockResponse(nearby.map(toPublic));
  }
  const requests = await apiRequest<BackendPublicHelpRequest[]>('/api/help-requests/nearby', {
    query,
  });
  return requests.map(fromBackendPublic);
}

export async function getRequestsAlongRoute(query: AlongRouteQuery): Promise<HelpRequestPublic[]> {
  if (USE_MOCKS) {
    const publicRequests = mockRequests.map(toPublic);
    return mockResponse(
      filterRequestsAlongRoute(publicRequests, toRouteCoordinates(query), query.bufferMeters),
    );
  }

  const requests = await apiRequest<BackendPublicHelpRequest[]>('/api/help-requests/along-route', {
    method: 'POST',
    body: {
      points: query.route.coordinates.map(([lng, lat]) => ({ lat, lng })),
      bufferMeters: query.bufferMeters,
    },
  });
  return requests.map(fromBackendPublic);
}

export async function getRequest(id: string): Promise<HelpRequestDetails> {
  if (USE_MOCKS) {
    const request = mockRequests.find((r) => r.id === id);
    if (!request) throw new ApiError(404, 'Nie znaleziono zgłoszenia');
    const { exactLocation: _location, address: _address, ...rest } = request;
    // Exact location only after ACCEPTED, mirroring the backend rule.
    return mockResponse(request.status === 'ACCEPTED' ? request : { ...rest });
  }
  return apiRequest(`/api/requests/${id}`);
}

const CATEGORY_KEYWORDS: [Category, RegExp][] = [
  ['BASIC_NEEDS', /lek|aptek|recept|zakup|jedzeni|paczk/i],
  ['EQUIPMENT_LOAN', /pożycz|drabin|wiertark|sprzęt|narzędz|wózek/i],
  ['HOME_SUPPORT', /kran|napraw|żarówk|montaż|złoż|awari|sprząt/i],
  ['SOCIAL', /spacer|towarzyst|rozmow|samotn/i],
];

/** Keyword stand-in for the backend LLM classifier, same response shape. */
function classifyLocally({ title, description }: ClassifyRequestDto): AiClassification {
  const text = `${title} ${description}`;
  const category =
    CATEGORY_KEYWORDS.find(([, pattern]) => pattern.test(text))?.[0] ?? 'HOME_SUPPORT';
  const riskFlags: RiskFlag[] = [];
  if (/blik|przelew|numer karty|pin/i.test(text)) riskFlags.push('SCAM_SUSPECTED');
  if (/duszno|zawał|nieprzytomn|krwaw|udar/i.test(text)) riskFlags.push('MEDICAL_EMERGENCY');
  const priority: Priority = /lek|serce|pilne|ból|awari|zalew/i.test(text)
    ? 1
    : /dziś|szybko|jak najszybciej/i.test(text)
      ? 2
      : 3;
  const tags =
    text
      .toLowerCase()
      .match(/[a-ząćęłńóśźż]{5,}/g)
      ?.filter((word, index, all) => all.indexOf(word) === index)
      .slice(0, 3) ?? [];
  return { category, priority, tags, riskFlags, source: 'FALLBACK' };
}

export async function classifyRequest(dto: ClassifyRequestDto): Promise<AiClassification> {
  if (USE_MOCKS) return mockResponse(classifyLocally(dto), 800);
  const result = await apiRequest<Omit<AiClassification, 'priority'> & { priority: number }>(
    '/api/requests/classify',
    { method: 'POST', body: dto },
  );
  return { ...result, priority: toPriority(result.priority) };
}

export async function createRequest(dto: CreateHelpRequestDto): Promise<HelpRequestDetails> {
  if (USE_MOCKS) {
    const created: HelpRequestDetails = {
      id: `r-${Date.now()}`,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      priority: dto.priority ?? 2,
      status: 'OPEN',
      tags: dto.tags ?? [],
      accessibilitySupport: dto.accessibilitySupport,
      area: { center: dto.location, radiusMeters: 300 },
      requester: toPublicUser(mockUsers.find((u) => u.id === getApiUserId()) ?? mockUsers[0]),
      createdAt: new Date().toISOString(),
      exactLocation: dto.location,
      address: dto.address,
    };
    mockRequests.unshift(created);
    return mockResponse(created);
  }
  // TODO(backend): create endpoint not available yet.
  return apiRequest('/api/help-requests', { method: 'POST', body: dto });
}

function findMockRequest(id: string) {
  const request = mockRequests.find((r) => r.id === id);
  if (!request) throw new ApiError(404, 'Nie znaleziono zgłoszenia');
  return request;
}

/**
 * Volunteer offers help: OPEN -> OFFERED.
 * TODO(backend): state machine endpoints are planned for stage 3, paths to confirm.
 */
export async function offerHelp(id: string): Promise<HelpRequestDetails> {
  if (USE_MOCKS) {
    const request = findMockRequest(id);
    const volunteer = mockUsers.find((u) => u.id === getApiUserId());
    if (request.status !== 'OPEN') throw new ApiError(409, 'Ktoś już zgłosił się do pomocy');
    if (!volunteer) throw new ApiError(401, 'Zaloguj się ponownie');
    request.status = 'OFFERED';
    request.volunteer = toPublicUser(volunteer);
    return mockResponse({ ...request });
  }
  return apiRequest(`/api/help-requests/${id}/offer`, { method: 'POST' });
}

/** Requester accepts the offer: OFFERED -> ACCEPTED, the volunteer now sees the exact address. */
export async function acceptOffer(id: string): Promise<HelpRequestDetails> {
  if (USE_MOCKS) {
    const request = findMockRequest(id);
    if (request.status !== 'OFFERED') throw new ApiError(409, 'Brak oferty do zaakceptowania');
    request.status = 'ACCEPTED';
    return mockResponse({ ...request });
  }
  return apiRequest(`/api/help-requests/${id}/accept`, { method: 'POST' });
}
