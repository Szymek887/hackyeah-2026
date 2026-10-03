/**
 * API contract – a 1:1 mirror of the backend DTOs (backend/hackyeah-2026-backend, package `api`).
 *
 * Rules for the whole frontend team:
 * - Field names and shapes here MUST match the Java records named in the comments. When the backend
 *   changes a DTO, change it here first, then fix the screens (`npm run check` shows where).
 * - Do not add frontend-only fields to these types. Screen-only data lives next to the screen.
 * - Mocks (src/api/mocks) return exactly these shapes, so switching EXPO_PUBLIC_USE_MOCKS changes nothing
 *   in the UI.
 */

// ---------- Geo (GeoJSON, WGS84, coordinates are [lng, lat]) ----------

export type LngLat = [lng: number, lat: number];

/** `GeoJsonPoint` */
export type GeoPoint = {
  type: 'Point';
  coordinates: LngLat;
};

/** `GeoJsonPolygon` */
export type GeoPolygon = {
  type: 'Polygon';
  coordinates: LngLat[][];
};

/** Frontend helper for routes; sent to the backend as `RouteSearchRequest.points`. */
export type GeoLineString = {
  type: 'LineString';
  coordinates: LngLat[];
};

// ---------- Enums ----------

/** `HelpCategory` */
export type Category = 'MEDICINE' | 'GROCERIES' | 'EQUIPMENT_LOAN' | 'HOME_SUPPORT' | 'SOCIAL';

/** 1 = critical, 2 = high, 3 = normal. */
export type Priority = 1 | 2 | 3;

/**
 * `HelpRequestStatus`
 * OPEN -offer-> OFFERED -accept-> ACCEPTED -complete (QR)-> COMPLETED -both rated-> RATED.
 * OFFERED -reject-> OPEN. CANCELLED by the requester. UNDER_REVIEW = suspected scam, visible only
 * to the requester.
 */
export type RequestStatus =
  'OPEN' | 'OFFERED' | 'ACCEPTED' | 'COMPLETED' | 'CANCELLED' | 'RATED' | 'UNDER_REVIEW';

/** `UserRole` */
export type UserRole = 'REQUESTER' | 'VOLUNTEER' | 'CITY_ADMIN';

/** `RiskFlag` */
export type RiskFlag =
  'SCAM_SUSPECTED' | 'MEDICAL_EMERGENCY' | 'PERSONAL_DATA' | 'INAPPROPRIATE_CONTENT';

/** `ClassificationSource`: LLM = model answered, FALLBACK = keyword rules. */
export type ClassificationSource = 'LLM' | 'FALLBACK';

/** `HelpRequestView.ViewerRole` – the caller's part in a request. */
export type ViewerRole = 'REQUESTER' | 'VOLUNTEER' | 'NONE';

// ---------- Users ----------

/** `UserProfileResponse` – `GET /api/users/me`. */
export type UserProfile = {
  id: number;
  displayName: string;
  role: UserRole;
  identityVerified: boolean;
  specialNeeds: boolean;
  trustScore: number;
  ratingCount: number;
  /** null until the user is rated. */
  ratingAverage: number | null;
  cityPoints: number;
};

/** `UserSummary` – the other side of a request. */
export type UserSummary = {
  id: number;
  displayName: string;
  trustScore: number;
  identityVerified: boolean;
  ratingAverage: number | null;
  ratingCount: number;
};

// ---------- Help requests ----------

/** `PublicHelpRequestResponse` – items of `/nearby` and `/along-route`. Never exact location. */
export type HelpRequestListItem = {
  id: number;
  title: string;
  category: Category;
  priority: Priority;
  status: RequestStatus;
  approximateLocation: GeoPoint;
  maskedArea: GeoPolygon;
  createdAt: string;
};

/**
 * `FullHelpRequestResponse` – the requester, or the assigned volunteer from ACCEPTED on.
 * Discriminated by `visibility`.
 */
export type HelpRequestFull = {
  visibility: 'FULL';
  id: number;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  aiPriority: number | null;
  status: RequestStatus;
  tags: string[];
  riskFlags: RiskFlag[];
  classificationSource: ClassificationSource | null;
  location: GeoPoint;
  street: string;
  buildingNumber: string;
  apartmentNumber: string | null;
  requester: UserSummary;
  volunteer: UserSummary | null;
  createdAt: string;
  updatedAt: string;
  viewerRole: ViewerRole;
};

/**
 * `PublicHelpRequestDetailsResponse` – everyone else. No address, no requester identity.
 * `description` is null when the AI found personal data (the title is then a generic one).
 */
export type HelpRequestPublic = {
  visibility: 'PUBLIC';
  id: number;
  title: string;
  description: string | null;
  category: Category;
  priority: Priority;
  status: RequestStatus;
  tags: string[];
  approximateLocation: GeoPoint;
  maskedArea: GeoPolygon;
  createdAt: string;
  viewerRole: ViewerRole;
};

/** `HelpRequestView` – `GET /{id}`, `/mine` and every workflow action. Check `visibility`. */
export type HelpRequestView = HelpRequestFull | HelpRequestPublic;

// ---------- Payloads ----------

/** `CreateHelpRequestRequest` – category, priority and tags are set by the backend AI. */
export type CreateHelpRequestDto = {
  title: string;
  description: string;
  lat: number;
  lng: number;
  street: string;
  buildingNumber: string;
  apartmentNumber?: string;
};

/** `ClassificationInput` */
export type ClassifyRequestDto = {
  title: string;
  description: string;
};

/** `RequestClassification` – `POST /api/requests/classify` (preview, nothing is saved). */
export type AiClassification = {
  category: Category;
  priority: Priority;
  tags: string[];
  riskFlags: RiskFlag[];
  source: ClassificationSource;
};

/** Query of `GET /nearby`. */
export type NearbyQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
};

/** Frontend form of `RouteSearchRequest` (converted to `{ points: {lat,lng}[], bufferMeters }`). */
export type AlongRouteQuery = {
  route: GeoLineString;
  bufferMeters: number;
};

// ---------- Handoff (QR) & rating ----------

/** `HandoffTokenResponse` – the QR code encodes `token` as is. */
export type HandoffToken = {
  requestId: number;
  token: string;
  expiresAt: string;
};

/** `CreateRatingRequest` */
export type RatingDto = {
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
};

/** `RatingResponse` */
export type RatingResult = {
  /** RATED once both sides rated, COMPLETED before that. */
  requestStatus: RequestStatus;
  ratedUser: UserSummary;
  cityPointsAwarded: number;
};

// ---------- City analytics ----------

/** `HeatmapResponse` – GeoJSON FeatureCollection, one point per non-empty hexagon. */
export type HeatmapResponse = {
  type: 'FeatureCollection';
  cellSizeMeters: number;
  totalRequests: number;
  features: {
    type: 'Feature';
    geometry: GeoPoint;
    properties: {
      count: number;
      /** priority 1 counts 3, priority 2 counts 2, priority 3 counts 1 */
      weight: number;
      byCategory: Record<Category, number>;
      area: GeoPolygon;
    };
  }[];
};

/** `SummaryResponse` – every map contains all keys. */
export type AnalyticsSummary = {
  total: number;
  open: number;
  inProgress: number;
  fulfilled: number;
  cancelled: number;
  fulfillmentRate: number;
  /** UNDER_REVIEW is never included. */
  byStatus: Record<Exclude<RequestStatus, 'UNDER_REVIEW'>, number>;
  byCategory: Record<Category, number>;
  byPriority: Record<'1' | '2' | '3', number>;
};

/** Query of the analytics endpoints. */
export type AnalyticsQuery = {
  category?: Category;
  from?: string;
  to?: string;
};

// ---------- Errors ----------

/** RFC 9457 ProblemDetail from `GlobalExceptionHandler`. */
export type ProblemDetail = {
  status: number;
  title?: string;
  detail?: string;
  /** Field errors on 400 "Request validation failed". */
  errors?: Record<string, string>;
};
