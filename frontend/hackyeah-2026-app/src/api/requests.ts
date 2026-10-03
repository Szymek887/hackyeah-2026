import { apiRequest, ApiError } from '@/api/client';
import { USE_MOCKS } from '@/api/config';
import { mockRequests } from '@/api/mocks/data';
import { mockResponse } from '@/api/mocks/delay';
import type {
  AiClassification,
  ClassifyRequestDto,
  CreateHelpRequestDto,
  HelpRequestDetails,
  HelpRequestPublic,
  NearbyQuery,
} from '@/api/types';
import { distanceMeters } from '@/lib/geo';

// TODO(backend): endpoint paths are placeholders until the backend publishes its routes.

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

export async function getNearbyRequests(query: NearbyQuery): Promise<HelpRequestPublic[]> {
  if (USE_MOCKS) {
    const nearby = mockRequests.filter(
      (r) =>
        distanceMeters(r.area.center.coordinates, [query.lng, query.lat]) <= query.radiusKm * 1000,
    );
    return mockResponse(nearby.map(toPublic));
  }
  return apiRequest('/api/requests/nearby', { query });
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
