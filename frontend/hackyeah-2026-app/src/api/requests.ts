import { apiRequest, ApiError } from '@/api/client';
import { USE_MOCKS } from '@/api/config';
import { mockRequests } from '@/api/mocks/data';
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

export async function classifyRequest(dto: ClassifyRequestDto): Promise<AiClassification> {
  if (USE_MOCKS) {
    const urgent = /lek|serce|pilne|ból|awaria/i.test(`${dto.title} ${dto.description}`);
    return mockResponse(
      {
        category: 'BASIC_NEEDS',
        priority: urgent ? 1 : 3,
        tags: urgent ? ['pilne'] : [],
        riskFlags: [],
        suspicious: false,
      },
      800,
    );
  }
  return apiRequest('/api/requests/classify', { method: 'POST', body: dto });
}

export async function createRequest(dto: CreateHelpRequestDto): Promise<HelpRequestDetails> {
  if (USE_MOCKS) {
    const created: HelpRequestDetails = {
      id: `r-${Date.now()}`,
      title: dto.title,
      description: dto.description,
      category: dto.category,
      priority: 2,
      status: 'OPEN',
      tags: [],
      accessibilitySupport: dto.accessibilitySupport,
      area: { center: dto.location, radiusMeters: 300 },
      requester: mockRequests[0].requester,
      createdAt: new Date().toISOString(),
      exactLocation: dto.location,
      address: dto.address,
    };
    mockRequests.unshift(created);
    return mockResponse(created);
  }
  return apiRequest('/api/requests', { method: 'POST', body: dto });
}
