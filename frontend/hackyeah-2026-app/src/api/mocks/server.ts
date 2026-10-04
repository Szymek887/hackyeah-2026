/**
 * Mock backend. Answers the same requests as the Spring app, with the same JSON and the same
 * status codes (400 / 401 / 403 / 404 / 409), by porting its rules:
 * HelpRequestWorkflowService, HelpRequestVisibilityPolicy, PublicTextPolicy, PriorityPolicy,
 * ReputationPolicy, LocationObfuscationService.
 *
 * When the backend changes a rule, change it here too – screens must not depend on mock-only behavior.
 */
import type { ApiRequest } from '@/api/client';
import { ApiError } from '@/api/errors';
import {
  classify as classifyRequest,
  MEDICINE_DESCRIPTION,
  MEDICINE_TITLE,
  SPECIAL_PRIORITY,
} from '@/api/mocks/classifier';
import { formatTranscript } from '@/api/mocks/transcript';
import { newRequestId, ratings, requests, users, type MockHelpRequest } from '@/api/mocks/db';
import type {
  AnalyticsSummary,
  Category,
  ClassifyRequestDto,
  CreateHelpRequestDto,
  CreateUserDto,
  DisabilityType,
  FormatTranscriptDto,
  GeoPoint,
  GeoPolygon,
  HandoffToken,
  HeatmapResponse,
  HelpRequestFull,
  HelpRequestListItem,
  HelpRequestView,
  Priority,
  RatingDto,
  RatingResult,
  RequestStatus,
  UserProfile,
  UpdateDisabilitiesDto,
  UpdateLanguagesDto,
  UpdateSpecialNeedsConsentDto,
  UserSummary,
  ViewerRole,
} from '@/api/types';
import { distanceMeters } from '@/lib/geo';
import { distanceToRouteMeters } from '@/lib/route-matching';

const LATENCY_MS = 350;
const HANDOFF_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const METERS_PER_LAT_DEGREE = 111_320;
const CATEGORIES: Category[] = [
  'MEDICINE',
  'GROCERIES',
  'EQUIPMENT_LOAN',
  'HOME_SUPPORT',
  'SOCIAL',
];
const STATUSES: RequestStatus[] = [
  'OPEN',
  'OFFERED',
  'ACCEPTED',
  'COMPLETED',
  'CANCELLED',
  'RATED',
  'UNDER_REVIEW',
];

const badRequest = (detail: string) => new ApiError(400, detail);
const unauthorized = (detail: string) => new ApiError(401, detail);
const forbidden = (detail: string) => new ApiError(403, detail);
const notFound = (detail: string) => new ApiError(404, detail);
const conflict = (detail: string) => new ApiError(409, detail);

// ---------- Router ----------

type Handler = (ctx: { params: string[]; req: ApiRequest }) => unknown;

const routes: [ApiRequest['method'], RegExp, Handler][] = [
  ['GET', /^\/api\/users\/demo$/, () => demoAccounts()],
  ['POST', /^\/api\/users$/, ({ req }) => createUser(req.body as CreateUserDto)],
  ['GET', /^\/api\/users\/me$/, ({ req }) => currentUser(req)],
  [
    'PUT',
    /^\/api\/users\/me\/languages$/,
    ({ req }) => updateLanguages(currentUser(req), req.body as UpdateLanguagesDto),
  ],
  [
    'PUT',
    /^\/api\/users\/me\/special-needs-consent$/,
    ({ req }) =>
      updateSpecialNeedsConsent(currentUser(req), req.body as UpdateSpecialNeedsConsentDto),
  ],
  [
    'PUT',
    /^\/api\/users\/me\/disabilities$/,
    ({ req }) => updateDisabilities(currentUser(req), req.body as UpdateDisabilitiesDto),
  ],
  ['GET', /^\/api\/help-requests\/nearby$/, ({ req }) => nearby(req.query)],
  ['POST', /^\/api\/help-requests\/along-route$/, ({ req }) => alongRoute(req.body)],
  [
    'POST',
    /^\/api\/help-requests$/,
    ({ req }) => create(req.body as CreateHelpRequestDto, currentUser(req)),
  ],
  ['GET', /^\/api\/help-requests\/mine$/, ({ req }) => mine(currentUser(req))],
  [
    'GET',
    /^\/api\/help-requests\/(\d+)$/,
    ({ params, req }) => details(Number(params[0]), currentUser(req)),
  ],
  [
    'POST',
    /^\/api\/help-requests\/(\d+)\/offer$/,
    ({ params, req }) => offer(Number(params[0]), currentUser(req)),
  ],
  [
    'POST',
    /^\/api\/help-requests\/(\d+)\/accept$/,
    ({ params, req }) => accept(Number(params[0]), currentUser(req)),
  ],
  [
    'POST',
    /^\/api\/help-requests\/(\d+)\/reject$/,
    ({ params, req }) => reject(Number(params[0]), currentUser(req)),
  ],
  [
    'POST',
    /^\/api\/help-requests\/(\d+)\/cancel$/,
    ({ params, req }) => cancel(Number(params[0]), currentUser(req)),
  ],
  [
    'GET',
    /^\/api\/help-requests\/(\d+)\/qr$/,
    ({ params, req }) => handoffToken(Number(params[0]), currentUser(req)),
  ],
  [
    'POST',
    /^\/api\/help-requests\/(\d+)\/complete$/,
    ({ params, req }) =>
      complete(Number(params[0]), (req.body as { token?: string })?.token, currentUser(req)),
  ],
  [
    'POST',
    /^\/api\/help-requests\/(\d+)\/ratings$/,
    ({ params, req }) => rate(Number(params[0]), req.body as RatingDto, currentUser(req)),
  ],
  ['POST', /^\/api\/requests\/classify$/, ({ req }) => classify(req.body as ClassifyRequestDto)],
  [
    'POST',
    /^\/api\/requests\/format-transcript$/,
    ({ req }) => formatTranscriptRequest(req.body as FormatTranscriptDto),
  ],
  ['GET', /^\/api\/analytics\/heatmap$/, ({ req }) => heatmap(req.query)],
  ['GET', /^\/api\/analytics\/summary$/, ({ req }) => summary(req.query)],
];

export async function handleMockRequest<T>(req: ApiRequest): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));
  for (const [method, pattern, handler] of routes) {
    const match = req.method === method ? pattern.exec(req.path) : null;
    if (match) {
      // Deep copy, like JSON over the wire: screens can never mutate the mock database.
      return JSON.parse(JSON.stringify(handler({ params: match.slice(1), req }))) as T;
    }
  }
  throw notFound(`No mock for ${req.method} ${req.path}`);
}

// ---------- Auth (CurrentUserArgumentResolver) ----------

function currentUser(req: ApiRequest): UserProfile {
  if (req.userId === undefined) throw unauthorized('Missing X-User-Id header');
  const user = users.find((u) => u.id === req.userId);
  if (!user) throw unauthorized(`Unknown user ${req.userId}`);
  return user;
}

// UserController.demo: role order (enum ordinal), then id. Public, no X-User-Id needed.
const ROLE_ORDER: UserProfile['role'][] = ['REQUESTER', 'VOLUNTEER', 'CITY_ADMIN'];
// UserProfileResponse.forDemoList: the public list never carries disabilities (health data).
const demoAccounts = () =>
  [...users]
    .sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.id - b.id)
    .map((user) => ({ ...user, disabilities: [] }));

// Proposed UserController.create: new accounts start unverified with a neutral trust score.
const NEW_USER_TRUST = 50;
const DISPLAY_NAME_MAX = 60;

function createUser(body: CreateUserDto): UserProfile {
  const errors: Record<string, string> = {};
  const displayName = body?.displayName?.trim() ?? '';
  if (!displayName) errors.displayName = 'must not be blank';
  else if (displayName.length > DISPLAY_NAME_MAX)
    errors.displayName = `size must be between 0 and ${DISPLAY_NAME_MAX}`;
  if (body?.role !== 'REQUESTER' && body?.role !== 'VOLUNTEER')
    errors.role = 'must be REQUESTER or VOLUNTEER';
  if (Object.keys(errors).length) throw new ApiError(400, 'Request validation failed', errors);

  // Special needs are stored only with the consent for at least one disability, which the client gives
  // right after creating the account (PUT /special-needs-consent), so a new account starts without them.
  const user: UserProfile = {
    id: Math.max(...users.map((u) => u.id)) + 1,
    displayName,
    role: body.role,
    identityVerified: false,
    specialNeeds: false,
    specialNeedsConsent: false,
    specialNeedsConsentGrantedAt: null,
    disabilities: [],
    trustScore: NEW_USER_TRUST,
    ratingCount: 0,
    ratingAverage: null,
    cityPoints: 0,
    languages: body.languages ? normalizeLanguages(body.languages) : ['pl'],
  };
  users.push(user);
  return user;
}

// SpokenLanguages.normalize: trimmed, lower-case, de-duplicated 2-letter codes, max 10.
const MAX_LANGUAGES = 10;

function normalizeLanguages(codes: string[]) {
  const normalized = [...new Set(codes.map((code) => (code ?? '').trim().toLowerCase()))];
  const unknown = normalized.find((code) => !/^[a-z]{2}$/.test(code));
  if (unknown !== undefined) throw badRequest(`Unknown language code: ${unknown}`);
  if (normalized.length > MAX_LANGUAGES)
    throw badRequest(`At most ${MAX_LANGUAGES} languages are allowed`);
  return normalized.sort();
}

function updateLanguages(user: UserProfile, body: UpdateLanguagesDto) {
  const languages = body?.languages;
  if (!Array.isArray(languages) || languages.length < 1 || languages.length > MAX_LANGUAGES)
    throw new ApiError(400, 'Request validation failed', {
      languages: `size must be between 1 and ${MAX_LANGUAGES}`,
    });
  user.languages = normalizeLanguages(languages);
  return user;
}

// SpecialNeedsService.updateConsent: requesters only. Granting needs at least one disability and stores
// them with the consent; withdrawing deletes the consent record and all special-needs information.
function updateSpecialNeedsConsent(user: UserProfile, body: UpdateSpecialNeedsConsentDto) {
  if (user.role !== 'REQUESTER')
    throw forbidden('Only requesters can manage special-needs consent');
  if (typeof body?.consent !== 'boolean')
    throw new ApiError(400, 'Request validation failed', { consent: 'must not be null' });
  if (body.consent) {
    const disabilities = validDisabilities(body.disabilities ?? []);
    if (disabilities.length === 0) throw badRequest('Choose at least one kind of disability');
    user.specialNeedsConsentGrantedAt ??= new Date().toISOString();
    user.specialNeedsConsent = true;
    user.specialNeeds = true;
    user.disabilities = disabilities;
  } else {
    user.specialNeedsConsent = false;
    user.specialNeedsConsentGrantedAt = null;
    user.specialNeeds = false;
    user.disabilities = [];
  }
  return user;
}

const DISABILITY_TYPES: DisabilityType[] = [
  'VISION',
  'HEARING',
  'MOBILITY',
  'COGNITIVE',
  'CHRONIC',
  'OTHER',
];

/** Known kinds only (400 otherwise), de-duplicated, in enum order like the backend. */
function validDisabilities(disabilities: DisabilityType[]) {
  if (!Array.isArray(disabilities) || disabilities.length > DISABILITY_TYPES.length)
    throw new ApiError(400, 'Request validation failed', {
      disabilities: 'size must be at most 6',
    });
  if (disabilities.some((d) => !DISABILITY_TYPES.includes(d)))
    throw badRequest('Malformed request body');
  return DISABILITY_TYPES.filter((d) => disabilities.includes(d));
}

// SpecialNeedsService.updateDisabilities: requesters with the consent only; replaces the list, which
// must keep at least one kind (removing all of them = withdrawing the consent).
function updateDisabilities(user: UserProfile, body: UpdateDisabilitiesDto) {
  if (user.role !== 'REQUESTER') throw forbidden('Only requesters can store disabilities');
  const disabilities = validDisabilities(body?.disabilities);
  if (disabilities.length === 0)
    throw new ApiError(400, 'Request validation failed', {
      disabilities: 'size must be between 1 and 6',
    });
  if (!user.specialNeedsConsent)
    throw conflict('Give the special-needs consent before storing disabilities');
  user.disabilities = disabilities;
  return user;
}

/** AppUser.sharesSpecialNeeds: true only with special needs AND a consent record. */
function sharesSpecialNeeds(userId: number) {
  const user = users.find((u) => u.id === userId);
  return Boolean(user?.specialNeeds && user.specialNeedsConsent);
}

// ---------- Views (HelpRequestViewMapper + policies) ----------

const isRequester = (r: MockHelpRequest, u: UserProfile) => r.requesterId === u.id;
const isVolunteer = (r: MockHelpRequest, u: UserProfile) => r.volunteerId === u.id;
const canSee = (r: MockHelpRequest, u: UserProfile) =>
  r.status !== 'UNDER_REVIEW' || isRequester(r, u);
const canSeeFull = (r: MockHelpRequest, u: UserProfile) =>
  isRequester(r, u) || (isVolunteer(r, u) && ['ACCEPTED', 'COMPLETED', 'RATED'].includes(r.status));
const viewerRole = (r: MockHelpRequest, u: UserProfile): ViewerRole =>
  isRequester(r, u) ? 'REQUESTER' : isVolunteer(r, u) ? 'VOLUNTEER' : 'NONE';

const GENERIC_TITLES: Record<Category, string> = {
  MEDICINE: MEDICINE_TITLE,
  GROCERIES: 'Prośba o pomoc z zakupami',
  EQUIPMENT_LOAN: 'Prośba o pożyczenie sprzętu',
  HOME_SUPPORT: 'Prośba o pomoc w domu',
  SOCIAL: 'Prośba o towarzystwo',
};
const hasPersonalData = (r: MockHelpRequest) => r.riskFlags.includes('PERSONAL_DATA');
const publicTitle = (r: MockHelpRequest) =>
  hasPersonalData(r) ? GENERIC_TITLES[r.category] : r.title;

function summaryOf(userId: number | null): UserSummary | null {
  const user = users.find((u) => u.id === userId);
  if (!user) return null;
  const { id, displayName, trustScore, identityVerified, ratingAverage, ratingCount, languages } =
    user;
  return { id, displayName, trustScore, identityVerified, ratingAverage, ratingCount, languages };
}

/** LocationObfuscationService: 300 m grid cell containing the point. */
function maskedCell(lat: number, lng: number) {
  const latSize = 300 / METERS_PER_LAT_DEGREE;
  const lngSize = 300 / Math.max(METERS_PER_LAT_DEGREE * Math.cos((lat * Math.PI) / 180), 1);
  const south = Math.floor(lat / latSize) * latSize;
  const west = Math.floor(lng / lngSize) * lngSize;
  return { south, west, north: south + latSize, east: west + lngSize };
}

const point = (lng: number, lat: number): GeoPoint => ({ type: 'Point', coordinates: [lng, lat] });

function approximate(r: MockHelpRequest): GeoPoint {
  const c = maskedCell(r.lat, r.lng);
  return point((c.west + c.east) / 2, (c.south + c.north) / 2);
}

function rectangle(south: number, west: number, north: number, east: number): GeoPolygon {
  return {
    type: 'Polygon',
    coordinates: [
      [
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ],
    ],
  };
}

function maskedArea(r: MockHelpRequest): GeoPolygon {
  const c = maskedCell(r.lat, r.lng);
  return rectangle(c.south, c.west, c.north, c.east);
}

function toFull(r: MockHelpRequest, u: UserProfile): HelpRequestFull {
  return {
    visibility: 'FULL',
    id: r.id,
    title: r.title,
    description: r.description,
    category: r.category,
    priority: r.priority,
    aiPriority: r.aiPriority,
    status: r.status,
    tags: r.tags,
    riskFlags: r.riskFlags,
    classificationSource: r.classificationSource,
    location: point(r.lng, r.lat),
    street: r.street,
    buildingNumber: r.buildingNumber,
    apartmentNumber: r.apartmentNumber,
    requester: summaryOf(r.requesterId)!,
    // FULL goes only to the requester and the volunteer from ACCEPTED on (canSeeFull).
    requesterSpecialNeeds: sharesSpecialNeeds(r.requesterId),
    volunteer: summaryOf(r.volunteerId),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    viewerRole: viewerRole(r, u),
  };
}

function toView(r: MockHelpRequest, u: UserProfile): HelpRequestView {
  if (canSeeFull(r, u)) return toFull(r, u);
  return {
    visibility: 'PUBLIC',
    id: r.id,
    title: publicTitle(r),
    description: hasPersonalData(r) ? null : r.description,
    category: r.category,
    priority: r.priority,
    status: r.status,
    tags: r.tags,
    approximateLocation: approximate(r),
    maskedArea: maskedArea(r),
    createdAt: r.createdAt,
    viewerRole: viewerRole(r, u),
  };
}

function toListItem(r: MockHelpRequest): HelpRequestListItem {
  return {
    id: r.id,
    title: publicTitle(r),
    category: r.category,
    priority: r.priority,
    status: r.status,
    approximateLocation: approximate(r),
    maskedArea: maskedArea(r),
    createdAt: r.createdAt,
  };
}

/** ORDER BY priority ASC, created_at DESC */
const byPriorityThenNewest = (a: MockHelpRequest, b: MockHelpRequest) =>
  a.priority - b.priority || b.createdAt.localeCompare(a.createdAt);

// ---------- Search (HelpRequestService) ----------

function validateCoordinates(lat: number, lng: number) {
  if (!(lat >= -90 && lat <= 90)) throw badRequest('lat must be between -90 and 90');
  if (!(lng >= -180 && lng <= 180)) throw badRequest('lng must be between -180 and 180');
}

function nearby(query: Record<string, string>) {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  const radiusKm = query.radiusKm === undefined ? 3 : Number(query.radiusKm);
  validateCoordinates(lat, lng);
  if (!(radiusKm > 0 && radiusKm <= 25)) throw badRequest('radiusKm must be between 0 and 25');
  return requests
    .filter(
      (r) => r.status === 'OPEN' && distanceMeters([r.lng, r.lat], [lng, lat]) <= radiusKm * 1000,
    )
    .sort(byPriorityThenNewest)
    .map(toListItem);
}

function alongRoute(body: unknown) {
  const { points, bufferMeters } = (body ?? {}) as {
    points?: { lat: number; lng: number }[];
    bufferMeters?: number;
  };
  if (!points) throw badRequest('points are required');
  if (points.length < 2) throw badRequest('route must contain at least 2 points');
  if (points.length > 100) throw badRequest('route cannot contain more than 100 points');
  if (!(bufferMeters !== undefined && bufferMeters >= 50 && bufferMeters <= 2000)) {
    throw badRequest('bufferMeters must be between 50 and 2000');
  }
  points.forEach((p) => validateCoordinates(p.lat, p.lng));
  const route = points.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  return requests
    .filter(
      (r) => r.status === 'OPEN' && distanceToRouteMeters([r.lng, r.lat], route) <= bufferMeters,
    )
    .sort(byPriorityThenNewest)
    .map(toListItem);
}

// ---------- Create / details (HelpRequestDetailsService) ----------

function classify(body: ClassifyRequestDto) {
  if (!body?.title?.trim() || !body?.description?.trim())
    throw badRequest('Request validation failed');
  return classifyRequest(body);
}

function formatTranscriptRequest(body: FormatTranscriptDto) {
  if (!body?.transcript?.trim()) throw badRequest('Request validation failed');
  return formatTranscript(body.transcript);
}

function create(body: CreateHelpRequestDto, user: UserProfile) {
  if (user.role === 'CITY_ADMIN')
    throw forbidden('City administrators cannot create help requests');
  const errors: Record<string, string> = {};
  if (!body?.title?.trim()) errors.title = 'must not be blank';
  else if (body.title.length > 120) errors.title = 'size must be between 0 and 120';
  if (!body?.description?.trim()) errors.description = 'must not be blank';
  else if (body.description.length > 1000) errors.description = 'size must be between 0 and 1000';
  if (!body?.street?.trim()) errors.street = 'must not be blank';
  if (!body?.buildingNumber?.trim()) errors.buildingNumber = 'must not be blank';
  if (typeof body?.lat !== 'number') errors.lat = 'must not be null';
  if (typeof body?.lng !== 'number') errors.lng = 'must not be null';
  if (Object.keys(errors).length) throw new ApiError(400, 'Request validation failed', errors);

  const classification = classifyRequest(body);
  // PriorityPolicy: special needs bump one level, never above 1; the special medicine priority stays.
  const priority = (
    classification.priority === SPECIAL_PRIORITY
      ? SPECIAL_PRIORITY
      : // Only consented special needs count, like HelpRequestDetailsService (sharesSpecialNeeds).
        Math.max(1, classification.priority - (sharesSpecialNeeds(user.id) ? 1 : 0))
  ) as Priority;
  // MedicineRedaction: medicine names and usage are not stored, details are given in person.
  const redact = classification.category === 'MEDICINE';
  const createdAt = new Date().toISOString();
  const request: MockHelpRequest = {
    id: newRequestId(),
    requesterId: user.id,
    volunteerId: null,
    title: redact ? MEDICINE_TITLE : body.title.trim(),
    description: redact ? MEDICINE_DESCRIPTION : body.description.trim(),
    category: classification.category,
    priority,
    aiPriority: classification.priority,
    status: classification.riskFlags.includes('SCAM_SUSPECTED') ? 'UNDER_REVIEW' : 'OPEN',
    tags: classification.tags,
    riskFlags: classification.riskFlags,
    classificationSource: classification.source,
    lat: body.lat,
    lng: body.lng,
    street: body.street.trim(),
    buildingNumber: body.buildingNumber.trim(),
    apartmentNumber: body.apartmentNumber?.trim() || null,
    createdAt,
    updatedAt: createdAt,
    handoffToken: null,
    handoffTokenExpiresAt: null,
    handoffTokenUsedAt: null,
  };
  requests.push(request);
  return toFull(request, user);
}

function load(id: number, user: UserProfile) {
  const request = requests.find((r) => r.id === id);
  if (!request || !canSee(request, user)) throw notFound(`Help request ${id} not found`);
  return request;
}

function details(id: number, user: UserProfile) {
  return toView(load(id, user), user);
}

// ---------- Workflow (HelpRequestWorkflowService) ----------

function mine(user: UserProfile) {
  return requests
    .filter((r) => isRequester(r, user) || isVolunteer(r, user))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => toView(r, user));
}

function requireStatus(r: MockHelpRequest, expected: RequestStatus, detail: string) {
  if (r.status !== expected) throw conflict(detail);
}

function requireRequester(r: MockHelpRequest, u: UserProfile, detail: string) {
  if (!isRequester(r, u)) throw forbidden(detail);
}

function save(r: MockHelpRequest, u: UserProfile) {
  r.updatedAt = new Date().toISOString();
  return toView(r, u);
}

function issueHandoffToken(r: MockHelpRequest) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  r.handoffToken = Array.from({ length: 43 }, () => alphabet[Math.floor(Math.random() * 64)]).join(
    '',
  );
  r.handoffTokenExpiresAt = new Date(Date.now() + HANDOFF_TOKEN_TTL_MS).toISOString();
  r.handoffTokenUsedAt = null;
}

const isExpired = (r: MockHelpRequest) =>
  !r.handoffTokenExpiresAt || Date.now() >= Date.parse(r.handoffTokenExpiresAt);

function offer(id: number, user: UserProfile) {
  const r = load(id, user);
  if (user.role !== 'VOLUNTEER' || isRequester(r, user))
    throw forbidden('Only volunteers can offer help');
  requireStatus(r, 'OPEN', 'Help request is no longer open');
  r.volunteerId = user.id;
  r.status = 'OFFERED';
  return save(r, user);
}

function accept(id: number, user: UserProfile) {
  const r = load(id, user);
  requireRequester(r, user, 'Only the requester can accept an offer');
  requireStatus(r, 'OFFERED', 'Help request has no pending offer');
  r.status = 'ACCEPTED';
  issueHandoffToken(r);
  return save(r, user);
}

function reject(id: number, user: UserProfile) {
  const r = load(id, user);
  requireRequester(r, user, 'Only the requester can reject an offer');
  requireStatus(r, 'OFFERED', 'Help request has no pending offer');
  r.volunteerId = null;
  r.status = 'OPEN';
  return save(r, user);
}

function cancel(id: number, user: UserProfile) {
  const r = load(id, user);
  requireRequester(r, user, 'Only the requester can cancel a help request');
  if (!['OPEN', 'OFFERED', 'ACCEPTED', 'UNDER_REVIEW'].includes(r.status)) {
    throw conflict(`Help request in status ${r.status} cannot be cancelled`);
  }
  r.status = 'CANCELLED';
  r.handoffToken = null;
  r.handoffTokenExpiresAt = null;
  return save(r, user);
}

function handoffToken(id: number, user: UserProfile): HandoffToken {
  const r = load(id, user);
  requireRequester(r, user, 'Only the requester can show the QR code');
  requireStatus(r, 'ACCEPTED', 'QR code is available only for accepted requests');
  if (!r.handoffToken || isExpired(r)) issueHandoffToken(r);
  return { requestId: r.id, token: r.handoffToken!, expiresAt: r.handoffTokenExpiresAt! };
}

function complete(id: number, token: string | undefined, user: UserProfile) {
  if (!token?.trim())
    throw new ApiError(400, 'Request validation failed', { token: 'must not be blank' });
  const r = load(id, user);
  if (!isVolunteer(r, user))
    throw forbidden('Only the assigned volunteer can complete a help request');
  requireStatus(r, 'ACCEPTED', 'Help request is not in progress');
  if (r.handoffTokenUsedAt) throw conflict('QR code was already used');
  if (!r.handoffToken || r.handoffToken !== token.trim()) throw badRequest('Invalid QR code');
  if (isExpired(r)) throw badRequest('QR code expired, ask the requester to show it again');
  r.handoffTokenUsedAt = new Date().toISOString();
  r.status = 'COMPLETED';
  return save(r, user);
}

function rate(id: number, body: RatingDto, user: UserProfile): RatingResult {
  if (!body || !Number.isInteger(body.stars) || body.stars < 1 || body.stars > 5) {
    throw new ApiError(400, 'Request validation failed', { stars: 'must be between 1 and 5' });
  }
  const r = load(id, user);
  const byRequester = isRequester(r, user);
  if (!byRequester && !isVolunteer(r, user)) {
    throw forbidden('Only the requester and the volunteer can rate each other');
  }
  requireStatus(r, 'COMPLETED', 'Only completed help requests can be rated');
  if (ratings.some((x) => x.requestId === r.id && x.fromUserId === user.id)) {
    throw conflict('You have already rated this help request');
  }

  const rated = users.find((u) => u.id === (byRequester ? r.volunteerId : r.requesterId))!;
  ratings.push({
    requestId: r.id,
    fromUserId: user.id,
    toUserId: rated.id,
    stars: body.stars,
    comment: body.comment?.trim() || null,
  });
  // AppUser.addRating + ReputationPolicy
  const total = (rated.ratingAverage ?? 0) * rated.ratingCount + body.stars;
  rated.ratingCount += 1;
  rated.ratingAverage = total / rated.ratingCount;
  const ratingScore = (body.stars - 1) * 25;
  rated.trustScore = Math.min(
    100,
    Math.max(0, Math.round(rated.trustScore + (ratingScore - rated.trustScore) * 0.2)),
  );
  const cityPointsAwarded = byRequester && body.stars >= 4 ? body.stars * 5 : 0;
  rated.cityPoints += cityPointsAwarded;

  if (ratings.some((x) => x.requestId === r.id && x.fromUserId === rated.id)) r.status = 'RATED';
  r.updatedAt = new Date().toISOString();
  return { requestStatus: r.status, ratedUser: summaryOf(rated.id)!, cityPointsAwarded };
}

// ---------- Analytics (AnalyticsService) ----------

function filtered(query: Record<string, string>, statuses: RequestStatus[]) {
  const from = query.from ? Date.parse(query.from) : -Infinity;
  const to = query.to ? Date.parse(query.to) : Infinity;
  return requests.filter((r) => {
    const created = Date.parse(r.createdAt);
    return (
      (!query.category || r.category === query.category) &&
      statuses.includes(r.status) &&
      created >= from &&
      created < to
    );
  });
}

const countBy = <K extends string>(keys: K[], values: K[]) =>
  Object.fromEntries(keys.map((key) => [key, values.filter((v) => v === key).length])) as Record<
    K,
    number
  >;

function heatmap(query: Record<string, string>): HeatmapResponse {
  const cellSizeMeters = query.cellSizeMeters ? Number(query.cellSizeMeters) : 500;
  if (!(cellSizeMeters >= 100 && cellSizeMeters <= 5000)) {
    throw badRequest('cellSizeMeters must be between 100 and 5000');
  }
  // Backend uses hexagons; the mock uses square cells of the same size – same response shape.
  const visible = filtered(query, ['OPEN', 'OFFERED', 'ACCEPTED', 'COMPLETED', 'RATED']);
  const cells = new Map<string, MockHelpRequest[]>();
  const latSize = cellSizeMeters / METERS_PER_LAT_DEGREE;
  const lngSize = cellSizeMeters / (METERS_PER_LAT_DEGREE * Math.cos((50.06 * Math.PI) / 180));
  for (const r of visible) {
    const key = `${Math.floor(r.lat / latSize)}:${Math.floor(r.lng / lngSize)}`;
    cells.set(key, [...(cells.get(key) ?? []), r]);
  }
  const features = [...cells.entries()].map(([key, items]) => {
    const [row, col] = key.split(':').map(Number);
    const south = row * latSize;
    const west = col * lngSize;
    return {
      type: 'Feature' as const,
      geometry: point(west + lngSize / 2, south + latSize / 2),
      properties: {
        count: items.length,
        weight: items.reduce((sum, r) => sum + (4 - r.priority), 0),
        byCategory: countBy(
          CATEGORIES,
          items.map((r) => r.category),
        ),
        area: rectangle(south, west, south + latSize, west + lngSize),
      },
    };
  });
  return { type: 'FeatureCollection', cellSizeMeters, totalRequests: visible.length, features };
}

function summary(query: Record<string, string>): AnalyticsSummary {
  const publicStatuses = STATUSES.filter((s) => s !== 'UNDER_REVIEW') as Exclude<
    RequestStatus,
    'UNDER_REVIEW'
  >[];
  const all = filtered(query, publicStatuses);
  const byStatus = countBy(
    publicStatuses,
    all.map((r) => r.status as Exclude<RequestStatus, 'UNDER_REVIEW'>),
  );
  const fulfilled = byStatus.COMPLETED + byStatus.RATED;
  const base = all.length - byStatus.CANCELLED;
  return {
    total: all.length,
    open: byStatus.OPEN,
    inProgress: byStatus.OFFERED + byStatus.ACCEPTED,
    fulfilled,
    cancelled: byStatus.CANCELLED,
    fulfillmentRate: base > 0 ? fulfilled / base : 0,
    byStatus,
    byCategory: countBy(
      CATEGORIES,
      all.map((r) => r.category),
    ),
    byPriority: countBy(
      ['0', '1', '2', '3'],
      all.map((r) => String(r.priority) as '0' | '1' | '2' | '3'),
    ),
  };
}
