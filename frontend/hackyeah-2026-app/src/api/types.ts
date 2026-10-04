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

/** 0 = special (medicine, details given in person), 1 = critical, 2 = high, 3 = normal. */
export type Priority = 0 | 1 | 2 | 3;

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

/** Lower-case ISO 639-1 code (`SpokenLanguages`): 'pl', 'en', 'uk', … Display via `languageName`. */
export type LanguageCode = string;

/** `UserProfileResponse` – `GET /api/users/me`. */
export type UserProfile = {
  id: number;
  displayName: string;
  role: UserRole;
  identityVerified: boolean;
  /**
   * Marked as disabled (health data): true only with the consent AND at least one declared
   * disability (contract §3.6). Raises request priority.
   */
  specialNeeds: boolean;
  /** A consent record exists: disabilities may be stored and shown to the accepted volunteer. */
  specialNeedsConsent: boolean;
  /** When the consent was given (ISO-8601), null without consent. */
  specialNeedsConsentGrantedAt: string | null;
  /**
   * Declared kinds of disability, sorted. Stored only with the consent; besides the user themselves only
   * the accepted volunteer sees them (`HelpRequestFull.requesterDisabilities`). Always [] in
   * `GET /api/users/demo`.
   */
  disabilities: DisabilityType[];
  /**
   * Special needs in the user's own words, extending the disabilities (e.g. "Nie słyszę pukania"), in
   * the user's order. Same rules as `disabilities`: only with the consent, [] in `/users/demo`.
   */
  specialNeedNotes: string[];
  trustScore: number;
  ratingCount: number;
  /** null until the user is rated. */
  ratingAverage: number | null;
  cityPoints: number;
  /** Spoken languages, sorted alphabetically; may be [] for old accounts. */
  languages: LanguageCode[];
};

/** `UserSummary` – the other side of a request. */
export type UserSummary = {
  id: number;
  displayName: string;
  trustScore: number;
  identityVerified: boolean;
  ratingAverage: number | null;
  ratingCount: number;
  /** Spoken languages, sorted alphabetically. */
  languages: LanguageCode[];
};

/** Backend `DisabilityType` (health data, contract §3.6). */
export type DisabilityType = 'VISION' | 'HEARING' | 'MOBILITY' | 'COGNITIVE' | 'CHRONIC' | 'OTHER';

/**
 * `UpdateDisabilitiesRequest` – `PUT /api/users/me/disabilities`, requesters with consent only,
 * replaces the list. A non-empty list marks the user as disabled, [] removes the marking.
 */
export type UpdateDisabilitiesDto = {
  disabilities: DisabilityType[];
};

/**
 * `UpdateSpecialNeedNotesRequest` – `PUT /api/users/me/special-need-notes`, requesters with consent
 * only, replaces the list ([] clears it). Max 10 notes, 200 chars each; trimmed, blanks and
 * duplicates dropped. Notes do not mark the user as disabled.
 */
export type UpdateSpecialNeedNotesDto = {
  notes: string[];
};

/** `UpdateLanguagesRequest` – `PUT /api/users/me/languages`, 1–10 codes, replaces the list. */
export type UpdateLanguagesDto = {
  languages: LanguageCode[];
};

/**
 * `UpdateSpecialNeedsConsentRequest` – `PUT /api/users/me/special-needs-consent` (profile checkbox).
 * true creates the consent record (disabilities are declared afterwards); false deletes the record,
 * the disabilities and the special-needs marking.
 */
export type UpdateSpecialNeedsConsentDto = {
  consent: boolean;
};

/**
 * `CreateUserRequest` – `POST /api/users` (🔵 PROPOSED in documentation/api-contract.md §4.2).
 * City admin accounts cannot be created from the app.
 */
export type CreateUserDto = {
  displayName: string;
  role: Exclude<UserRole, 'CITY_ADMIN'>;
  /**
   * Requesters only: consent to store and share disabilities, given at sign-up. The disabilities
   * themselves follow via `PUT /api/users/me/disabilities`.
   */
  specialNeedsConsent: boolean;
  /** Optional (🔵 PROPOSED), default `['pl']`. */
  languages?: LanguageCode[];
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
  /**
   * true only when the requester consented AND declared at least one disability; false does not say
   * which of the two is missing. Never present in PUBLIC views.
   */
  requesterSpecialNeeds: boolean;
  /**
   * The requester's disabilities, sorted; [] unless `requesterSpecialNeeds`. Like the exact address,
   * the volunteer gets them only from ACCEPTED on.
   */
  requesterDisabilities: DisabilityType[];
  /** The requester's special needs in their own words; [] without the consent. Same visibility. */
  requesterSpecialNeedNotes: string[];
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

/** `TranscriptInput` – raw speech-to-text of a dictated request. */
export type FormatTranscriptDto = {
  transcript: string;
};

/** `FormattedRequest` – `POST /api/requests/format-transcript` (nothing is saved). */
export type FormattedRequest = {
  title: string;
  description: string;
  source: ClassificationSource;
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
  /** requests in the cells shown (suppressed cells not included) */
  totalRequests: number;
  /** cells hidden because they have fewer than 3 requests (k-anonymity) */
  suppressedCells: number;
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
  /** OPEN requests with priority 0 (special, medicine) or 1 (critical) */
  openUrgent: number;
  inProgress: number;
  fulfilled: number;
  cancelled: number;
  fulfillmentRate: number;
  /** UNDER_REVIEW is never included. */
  byStatus: Record<Exclude<RequestStatus, 'UNDER_REVIEW'>, number>;
  byCategory: Record<Category, number>;
  byPriority: Record<'0' | '1' | '2' | '3', number>;
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
