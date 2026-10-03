/**
 * API contract shared by the whole frontend team.
 * Changes here affect everyone: announce them on the team chat and ship them in a small, separate PR.
 * Shapes follow documentation/plan.md; confirm them with the backend team before integration.
 */

// ---------- Geo (GeoJSON, WGS84 / SRID 4326, coordinates are [lng, lat]) ----------

export type LngLat = [lng: number, lat: number];

export type GeoPoint = {
  type: 'Point';
  coordinates: LngLat;
};

export type GeoLineString = {
  type: 'LineString';
  coordinates: LngLat[];
};

export type GeoPolygon = {
  type: 'Polygon';
  coordinates: LngLat[][];
};

// ---------- Enums ----------

export type Category = 'BASIC_NEEDS' | 'EQUIPMENT_LOAN' | 'HOME_SUPPORT' | 'SOCIAL';

/** 1 = critical, 2 = medium, 3 = low. */
export type Priority = 1 | 2 | 3;

/**
 * TODO(backend): plan.md lists both RATED (section 1) and CANCELLED (B3.1), confirm the final list.
 * Flow: OPEN -> OFFERED -> ACCEPTED (address revealed) -> COMPLETED (QR scanned) -> RATED.
 */
export type RequestStatus = 'OPEN' | 'OFFERED' | 'ACCEPTED' | 'COMPLETED' | 'RATED' | 'CANCELLED';

/** Matches backend `UserRole`. CITY_ADMIN only uses the city dashboard. */
export type UserRole = 'REQUESTER' | 'VOLUNTEER' | 'CITY_ADMIN';

// ---------- Users ----------

/** Safe-to-show user data. Never contains surname or address. */
export type UserPublic = {
  id: string;
  displayName: string;
  verified: boolean;
  trustScore: number;
  ratingAverage: number;
  ratingCount: number;
};

/**
 * Self-described profile shown on the profile screen.
 * TODO(backend): not in `UserProfileResponse` yet, kept on the client until the backend adds it.
 */
export type UserProfileDetails = {
  about: string;
  district: string;
  availability: string;
  /** Requester: what they usually need help with. Volunteer: what they can help with. */
  helpTopics: Category[];
  /** Accessibility / special needs details, visible only to the assigned volunteer. */
  accessibilityNotes: string;
};

export type User = UserPublic & {
  role: UserRole;
  hasSpecialNeeds: boolean;
  cityPoints: number;
  profile: UserProfileDetails;
};

/** `GET /api/users/me` response (backend `UserProfileResponse`). */
export type BackendUserProfile = {
  id: number;
  displayName: string;
  role: UserRole;
  identityVerified: boolean;
  specialNeeds: boolean;
  trustScore: number;
  ratingCount: number;
};

// ---------- Help requests ----------

/**
 * Approximate area shown on the public map.
 * TODO(backend): circle vs hexagon (H3), confirm the format.
 */
export type ApproximateArea = {
  center: GeoPoint;
  radiusMeters: number;
  polygon?: GeoPolygon;
};

/** Backend `RiskFlag`. */
export type RiskFlag =
  'SCAM_SUSPECTED' | 'MEDICAL_EMERGENCY' | 'PERSONAL_DATA' | 'INAPPROPRIATE_CONTENT';

/** `POST /api/requests/classify` response (backend `RequestClassification`). */
export type AiClassification = {
  category: Category;
  priority: Priority;
  tags: string[];
  riskFlags: RiskFlag[];
  /** LLM = model answered, FALLBACK = keyword rules (model unavailable). */
  source: 'LLM' | 'FALLBACK';
};

/** Item returned by list / map endpoints. Must never contain the exact location. */
export type HelpRequestPublic = {
  id: string;
  title: string;
  category: Category;
  priority: Priority;
  status: RequestStatus;
  tags: string[];
  accessibilitySupport: boolean;
  area: ApproximateArea;
  requester: UserPublic;
  createdAt: string;
};

export type Address = {
  street: string;
  building: string;
  apartment?: string;
  city: string;
};

/** Single request. `exactLocation` and `address` are present only for the assigned volunteer after ACCEPTED. */
export type HelpRequestDetails = HelpRequestPublic & {
  description: string;
  volunteer?: UserPublic;
  exactLocation?: GeoPoint;
  address?: Address;
};

// ---------- Requests payloads / queries ----------

export type CreateHelpRequestDto = {
  title: string;
  description: string;
  category: Category;
  accessibilitySupport: boolean;
  location: GeoPoint;
  address: Address;
  /** Accepted AI suggestion, the backend re-classifies anyway. */
  priority?: Priority;
  tags?: string[];
};

export type ClassifyRequestDto = {
  title: string;
  description: string;
};

export type NearbyQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
};

export type AlongRouteQuery = {
  route: GeoLineString;
  bufferMeters: number;
};

// ---------- Handoff (QR) & rating ----------

export type HandoffToken = {
  requestId: string;
  token: string;
  expiresAt: string;
};

export type RatingDto = {
  requestId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
};

// ---------- City dashboard ----------

export type HeatmapPoint = {
  lat: number;
  lng: number;
  weight: number;
  category: Category;
};

// ---------- Errors ----------

/** 400 invalid coordinates, 404 request not found, 409 request already taken. */
export type ApiErrorBody = {
  status: number;
  message: string;
  code?: string;
};
