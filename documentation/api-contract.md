# PoDrodze – API Contract (frontend ⇄ backend)

**This is the single source of truth for the HTTP API.** Code on both sides must match it:

- Backend: Java records in `backend/.../api`, `ai`, `analytics` packages.
- Frontend: wire types in `frontend/hackyeah-2026-app/src/api/types.ts` (the `Backend*` types) and mappers in `src/api/*.ts`.

Every endpoint has a **status**:

| Status | Meaning |
|---|---|
| ✅ `LIVE` | Implemented on the backend, shape below is what it returns today. |
| 🟡 `CHANGE` | Live, but this contract asks for an additive change (marked **[+]**). The frontend must work without the new field until it ships. |
| 🔵 `PROPOSED` | Not implemented yet. Shape agreed here first, then built. Frontend keeps using mocks until it is `LIVE`. |

See [How to change this contract](#how-to-change-this-contract) at the bottom before editing.

---

## 1. Conventions

### 1.1 Base URL and transport

- Base URL: `EXPO_PUBLIC_API_URL` (default `http://localhost:8080`). All paths start with `/api`.
- JSON only: `Content-Type: application/json`, `Accept: application/json`.
- Help-request endpoints live under **`/api/help-requests`**. The only exception is the AI preview `POST /api/requests/classify` (kept for compatibility).
- **CORS** (browser clients only – Expo web, dashboard; native apps are not affected): `/api/**` allows origins matching `CORS_ALLOWED_ORIGIN_PATTERNS` (default `http://localhost:*`, `http://127.0.0.1:*`, `http://192.168.*:*`, `http://10.*:*`, `http://172.*:*`), methods `GET`/`POST`/`PUT`, request headers `Content-Type`, `Accept`, `X-User-Id`; `Location` is exposed. No credentials (no cookies). Error responses carry the CORS headers too, so the browser can read `ProblemDetail`. Other origins get **403** on preflight.

### 1.2 Authentication (mock)

- Header **`X-User-Id: <numeric user id>`** identifies the caller. No passwords, no tokens.
- Missing / non-numeric / unknown id → **401** on endpoints that need a user.
- Public endpoints (no header needed): `GET /api/health`, `GET /api/help-requests/nearby`, `POST /api/help-requests/along-route`, `POST /api/requests/classify`, `GET /api/analytics/*`, `GET /api/users/demo`.

### 1.3 Data formats

| Thing | Format |
|---|---|
| IDs | JSON **numbers** (`Long`). The frontend may convert them to strings in its mappers (route params are strings), but must send numbers back. |
| Timestamps | ISO-8601 UTC strings, e.g. `"2026-10-03T12:34:56.789Z"` (Java `Instant`). |
| Geometry | GeoJSON, WGS84 / SRID 4326, coordinates are **`[lng, lat]`**. |
| Query / body coordinates | Plain `lat`, `lng` numbers (only exception to the GeoJSON rule: flat query params and request bodies). |
| Enums | Upper-case strings, exactly as listed in §2. Unknown values in requests → **400**. |
| Missing optional fields | `null` (backend does not omit them). The frontend must treat `null` and absent the same. |
| Unknown fields in requests | Ignored by the backend (Spring Boot default). Sending extra fields is safe. |

### 1.4 Errors – RFC 9457 `ProblemDetail`

Every error response is `application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "Request validation failed",
  "instance": "/api/help-requests",
  "timestamp": "2026-10-03T12:00:00Z",
  "errors": { "title": "must not be blank" }
}
```

- `detail` – human-readable message (English, not for direct display; the frontend maps status codes to Polish messages).
- `errors` – only on validation failures (400): field name → message. Use it to highlight form fields.

| Code | When |
|---|---|
| 400 | Validation failed, malformed JSON, coordinates out of range, bad enum value, invalid QR token |
| 401 | Missing / unknown `X-User-Id` |
| 403 | User is known but not allowed (e.g. `CITY_ADMIN` creating a request, non-requester accepting an offer) |
| 404 | Resource does not exist **or the caller is not allowed to know it exists** (e.g. `UNDER_REVIEW` for non-authors) |
| 409 | Invalid state transition, request already taken, concurrent modification, QR token already used |

---

## 2. Shared enums

```ts
type HelpCategory = 'MEDICINE' | 'GROCERIES' | 'EQUIPMENT_LOAN' | 'HOME_SUPPORT' | 'SOCIAL';

type HelpRequestStatus =
  | 'OPEN'          // waiting for a volunteer
  | 'OFFERED'       // a volunteer offered help, requester must accept
  | 'ACCEPTED'      // requester accepted, volunteer sees the address, QR token exists
  | 'COMPLETED'     // QR scanned, help delivered
  | 'RATED'         // both sides rated
  | 'CANCELLED'
  | 'UNDER_REVIEW'; // AI flagged as scam; visible only to its author

type UserRole = 'REQUESTER' | 'VOLUNTEER' | 'CITY_ADMIN';

type RiskFlag = 'SCAM_SUSPECTED' | 'MEDICAL_EMERGENCY' | 'PERSONAL_DATA' | 'INAPPROPRIATE_CONTENT';

type ClassificationSource = 'LLM' | 'FALLBACK';

/** 1 = critical, 2 = high, 3 = normal. */
type Priority = 1 | 2 | 3;

/**
 * Lower-case ISO 639-1 code: 'pl', 'en', 'uk', 'ru', 'de', ...
 * Any code from the ISO 639-1 list is valid; the client maps codes to display names
 * (e.g. `new Intl.DisplayNames(['pl'], { type: 'language' }).of('uk')` → "ukraiński").
 */
type LanguageCode = string;
```

> ⚠️ The frontend currently uses `BASIC_NEEDS` instead of `MEDICINE` + `GROCERIES` and lacks `UNDER_REVIEW`. The backend enum wins (data is persisted with it). See the integration plan, step 1.2.

### State machine

```
            offer (VOLUNTEER)        accept (requester)        complete (volunteer + QR)      rate (both sides)
   OPEN ─────────────────────► OFFERED ─────────────────► ACCEPTED ─────────────────────► COMPLETED ─────────► RATED
    ▲                            │
    └──── reject (requester) ────┘

   cancel (requester): OPEN / OFFERED / ACCEPTED / UNDER_REVIEW ──► CANCELLED
   create ──(SCAM_SUSPECTED)──► UNDER_REVIEW
```

---

## 3. Shared objects

### 3.1 `GeoJsonPoint` / `GeoJsonPolygon`

```json
{ "type": "Point", "coordinates": [19.9449, 50.0647] }
{ "type": "Polygon", "coordinates": [[[19.94, 50.06], [19.945, 50.06], [19.945, 50.063], [19.94, 50.063], [19.94, 50.06]]] }
```

### 3.2 `UserSummary` — ✅ `LIVE`

Shown next to a request (requester / volunteer). Never contains surname or address.

```ts
type UserSummary = {
  id: number;
  displayName: string;       // "Anna K."
  trustScore: number;        // 0–100
  identityVerified: boolean;
  ratingAverage: number | null; // 1.0–5.0, null when no ratings yet
  ratingCount: number;
  languages: LanguageCode[];  // spoken languages, sorted alphabetically, may be [] (old accounts)
};
```

### 3.3 `UserProfileResponse` — ✅ `LIVE`

```ts
type UserProfileResponse = {
  id: number;
  displayName: string;
  role: UserRole;
  identityVerified: boolean;
  specialNeeds: boolean;
  trustScore: number;
  ratingCount: number;
  ratingAverage: number | null;
  cityPoints: number;           // engagement points, see §4.8
  languages: LanguageCode[];    // spoken languages, sorted alphabetically, may be []
};
```

Profile "about / district / availability / helpTopics / accessibilityNotes" stay **client-side only** for the MVP (not part of the contract).

### 3.4 `PublicHelpRequestResponse` (list / map item) — 🟡 `CHANGE`

Never contains exact location, address, description or requester identity.

```ts
type PublicHelpRequestResponse = {
  id: number;
  title: string;                       // generic title when PERSONAL_DATA was detected
  category: HelpCategory;
  priority: Priority;
  status: HelpRequestStatus;           // nearby / along-route return OPEN only
  approximateLocation: GeoJsonPoint;   // centre of a ~300 m grid cell
  maskedArea: GeoJsonPolygon;          // that grid cell
  createdAt: string;
  tags: string[];                      // [+]
  accessibilitySupport: boolean;       // [+]
};
```

### 3.5 `HelpRequestView` (single request) — 🟡 `CHANGE`

Discriminated union on **`visibility`**. `viewerRole` is ✅ live; `accessibilitySupport` and `requesterTrust` are still **[+]**.

```ts
type HelpRequestView = FullHelpRequestResponse | PublicHelpRequestDetailsResponse;

/** Who the caller is in this request. */
type ViewerRole = 'REQUESTER' | 'VOLUNTEER' | 'NONE';
```

**`visibility: "FULL"`** – the requester always; the assigned volunteer from `ACCEPTED` on (`ACCEPTED`, `COMPLETED`, `RATED`).

```ts
type FullHelpRequestResponse = {
  visibility: 'FULL';
  viewerRole: ViewerRole;
  id: number;
  title: string;
  description: string;
  category: HelpCategory;
  priority: Priority;                  // final (after special-needs bump)
  aiPriority: number | null;           // what the AI suggested
  status: HelpRequestStatus;
  tags: string[];
  riskFlags: RiskFlag[];
  classificationSource: ClassificationSource | null;
  location: GeoJsonPoint;              // exact
  street: string;
  buildingNumber: string;
  apartmentNumber: string | null;
  accessibilitySupport: boolean;       // [+]
  requester: UserSummary;
  volunteer: UserSummary | null;
  createdAt: string;
  updatedAt: string;
};
```

**`visibility: "PUBLIC"`** – everyone else (including a volunteer in `OFFERED`).

```ts
type PublicHelpRequestDetailsResponse = {
  visibility: 'PUBLIC';
  viewerRole: ViewerRole;              // 'VOLUNTEER' when the caller made the pending offer
  id: number;
  title: string;
  description: string | null;          // null when PERSONAL_DATA was detected
  category: HelpCategory;
  priority: Priority;
  status: HelpRequestStatus;
  tags: string[];
  approximateLocation: GeoJsonPoint;
  maskedArea: GeoJsonPolygon;
  accessibilitySupport: boolean;       // [+]
  requesterTrust: {                    // [+] anonymous trust info, no name / id
    identityVerified: boolean;
    trustScore: number;
    ratingAverage: number | null;
    ratingCount: number;
    languages: LanguageCode[];         // [+] so a volunteer knows if they can communicate
  };
  createdAt: string;
};
```

> Why `viewerRole`: the PUBLIC variant has no `requester`/`volunteer`, so the client cannot compute "is this mine?" by comparing ids. The backend already knows the answer.
>
> Why `requesterTrust`: volunteers decide whether to help based on trust (core feature), but the requester's name must stay hidden until acceptance.

---

## 4. Endpoints

### 4.1 Health

#### `GET /api/health` — ✅ `LIVE`
→ `200 { "status": "UP" }`. Use it on app start (when mocks are off) to show "backend unavailable".

### 4.2 Users

#### `GET /api/users/me` — ✅ `LIVE`
Auth required. → `200 UserProfileResponse`. 401 for unknown id.

#### `GET /api/users/demo` — ✅ `LIVE`
Public. Accounts for the login screen (replaces the hard-coded list whose ids do not match the seeder).
→ `200 UserProfileResponse[]`, ordered: requesters, volunteers, city admin; by `id` within a role.
Ids come from the database (IDENTITY), so the client must use this list instead of hard-coded ids. On a fresh database with the current seeder: Anna K. = 1, Kuba W. (volunteer) = 9, Miasto Kraków (city admin) = 13.

#### `PUT /api/users/me/languages` — ✅ `LIVE`
Auth required. Replaces the whole list of languages the caller speaks (profile edit screen).

Request (`UpdateLanguagesRequest`):
```json
{ "languages": ["pl", "uk", "en"] }
```
| Field | Rules |
|---|---|
| `languages` | required, 1–10 ISO 639-1 codes. Codes are trimmed and lower-cased (`" UK "` → `"uk"`), duplicates are removed. |

→ `200 UserProfileResponse` with `languages` sorted alphabetically.
400 `Request validation failed` with `errors.languages` (missing / empty / too many), or 400 `detail: "Unknown language code: xx"` for a code outside ISO 639-1.

Why codes and not names: names are language-dependent ("ukraiński" / "Ukrainian" / "українська"); the backend stays locale-free and the client renders names in the UI language. Seeded demo users have languages (e.g. Kuba W. `pl, en, uk`, Nadia P. `pl, ru, uk`); accounts created before this change have `[]` until edited.

#### `POST /api/users` — 🔵 `PROPOSED` (frontend: login screen „Nowe konto”, already in mocks)
Public. Creates a new account for the mock login; the client then sends its id as `X-User-Id`.

Request (`CreateUserRequest`):
```json
{ "displayName": "Tomek Z.", "role": "VOLUNTEER", "specialNeeds": false, "languages": ["pl", "en"] }
```
- `displayName` – required, trimmed, 1–60 chars.
- `role` – `REQUESTER` or `VOLUNTEER` (`CITY_ADMIN` → 400).
- `specialNeeds` – optional, default `false`; stored only for `REQUESTER` (ignored for volunteers).
- `languages` – optional, same rules as `PUT /api/users/me/languages`, default `["pl"]`.

→ `201 UserProfileResponse` (+ `Location: /api/users/{id}`), with `identityVerified = false`, `trustScore = 50`, no ratings, 0 city points. The new account appears in `GET /api/users/demo`.
400 `Request validation failed` with `errors.displayName` / `errors.role`.

#### `POST /api/users/me/verify` — 🔵 `PROPOSED` (optional, low priority)
Auth required. Mock mObywatel: sets `identityVerified = true`. No body. → `200 UserProfileResponse`.

### 4.3 AI classification

#### `POST /api/requests/classify` — ✅ `LIVE`
Public. Preview only, nothing is saved. Takes ~2–3 s with LLM, < 50 ms with fallback; client timeout ≥ 20 s.

Request:
```json
{ "title": "Leki z apteki", "description": "Skończyły mi się leki na serce, nie mogę wyjść z domu." }
```
| Field | Rules |
|---|---|
| `title` | required, ≤ 120 chars |
| `description` | required, ≤ 2000 chars (but create allows only 1000 – the form should cap at **1000**) |

Response `200`:
```json
{
  "category": "MEDICINE",
  "priority": 1,
  "tags": ["leki", "serce"],
  "riskFlags": [],
  "source": "LLM"
}
```

UI rules: `MEDICAL_EMERGENCY` → show "call 112" banner; `SCAM_SUSPECTED` → warn that the request will go to review; `PERSONAL_DATA` → ask the user to remove personal data.

### 4.4 Help requests – read

#### `GET /api/help-requests/nearby?lat&lng&radiusKm` — 🟡 `CHANGE` (items get §3.4 `[+]` fields)
Public. Only `OPEN` requests, sorted by priority asc, then newest.

| Param | Rules |
|---|---|
| `lat` | required, −90..90 |
| `lng` | required, −180..180 |
| `radiusKm` | optional, default `3`, `0 < r ≤ 25` |

→ `200 PublicHelpRequestResponse[]`

#### `POST /api/help-requests/along-route` — 🟡 `CHANGE` (items get §3.4 `[+]` fields)
Public. Only `OPEN` requests within `bufferMeters` of the polyline.

```json
{ "points": [{ "lat": 50.0647, "lng": 19.9449 }, { "lat": 50.0686, "lng": 19.9065 }], "bufferMeters": 450 }
```
| Field | Rules |
|---|---|
| `points` | 2–100 points (simplify longer routes on the client) |
| `bufferMeters` | 50–2000 |

→ `200 PublicHelpRequestResponse[]`

#### `GET /api/help-requests/{id}` — 🟡 `CHANGE` (§3.5 `[+]` fields)
Auth required. → `200 HelpRequestView`. 404 when missing, or `UNDER_REVIEW` and caller is not the author.

#### `GET /api/help-requests/mine` — ✅ `LIVE`
Auth required. Requests the caller is involved in, newest first.

| Caller role | Returns |
|---|---|
| `REQUESTER` | requests they created (all statuses, incl. `UNDER_REVIEW`) |
| `VOLUNTEER` | requests where they are the volunteer (`OFFERED` and later; a rejected offer drops out) |
| `CITY_ADMIN` | `[]` |

(Implemented as "requests where the caller is the requester or the volunteer" – no role check needed.)

→ `200 HelpRequestView[]` (each element as `GET /{id}` would return it for the caller).

### 4.5 Help requests – create

#### `POST /api/help-requests` — 🟡 `CHANGE`
Auth required. Runs AI classification server-side (category, priority, tags, risk flags). `CITY_ADMIN` → 403.

For `category: "MEDICINE"` the request uses a privacy-safe preset. The client must not send
free-text `title` or `description`; the backend stores a system title/description and returns
medicine pickup instructions. This prevents accidental storage of e-prescription codes, PESEL,
QR codes, medicine names, dosing or health details.

Request:
```json
{
  "title": "Zakupy spożywcze",
  "description": "Potrzebuję pomocy z zakupami na jutro.",
  "lat": 50.0647,
  "lng": 19.9449,
  "street": "Floriańska",
  "buildingNumber": "15",
  "apartmentNumber": "4",
  "category": "GROCERIES",
  "accessibilitySupport": true
}
```

Medicine preset request:
```json
{
  "lat": 50.0647,
  "lng": 19.9449,
  "street": "Floriańska",
  "buildingNumber": "15",
  "apartmentNumber": "4",
  "category": "MEDICINE"
}
```

| Field | Rules |
|---|---|
| `title` | required for non-`MEDICINE`, ≤ 120. Not accepted for `MEDICINE`. |
| `description` | required for non-`MEDICINE`, ≤ 1000. Not accepted for `MEDICINE`. |
| `lat`, `lng` | required, valid range |
| `street` | required, ≤ 255 |
| `buildingNumber` | required, ≤ 20 |
| `apartmentNumber` | optional, ≤ 20 |
| `category` | **[+]** optional. When present it overrides the AI category (the user picked it in the form). `MEDICINE` enables the safe preset. |
| `accessibilitySupport` | **[+]** optional, default = requester's `specialNeeds`. Today it is ignored. |

Not accepted (the server decides): `priority`, `tags`, `status`. City is always Kraków in the MVP (no `city` field).

→ `201 FullHelpRequestResponse`, `Location: /api/help-requests/{id}`.

`MEDICINE` response fields:

| Field | Value |
|---|---|
| `title` | `Odbiór leków z apteki` |
| `description` | Safe system text; no e-prescription data is stored. |
| `requesterInstructions` | Explains not to enter e-prescription code, PESEL, QR, medicine names or health details in the app. |
| `volunteerInstructions` | Explains pharmacy-only pickup and direct off-app transfer of any required e-prescription data. |

Sending `title` or `description` with `category: "MEDICINE"` → `400`.
If the AI flags a scam, the response has `status: "UNDER_REVIEW"` – the UI must tell the user the request is waiting for review.

### 4.6 Help requests – state transitions — ✅ `LIVE`

All: auth required, no body unless stated, response **`200 HelpRequestView`** as seen by the caller after the change. The request row is locked for the duration of the action, so concurrent actions run one after another: of two simultaneous offers, one wins and the other gets 409.

Checks run in this order: request visible to the caller (else **404**) → caller allowed (else **403**) → status allows it (else **409**).

| Endpoint | Who | From → To | Errors |
|---|---|---|---|
| `POST /api/help-requests/{id}/offer` | `VOLUNTEER`, not the requester | `OPEN → OFFERED`, sets `volunteer` | 403 wrong role, 409 not `OPEN` |
| `POST /api/help-requests/{id}/accept` | requester | `OFFERED → ACCEPTED`, generates QR token | 403 not requester, 409 not `OFFERED` |
| `POST /api/help-requests/{id}/reject` | requester | `OFFERED → OPEN`, clears `volunteer` | 403, 409 |
| `POST /api/help-requests/{id}/cancel` | requester | `OPEN`/`OFFERED`/`ACCEPTED`/`UNDER_REVIEW → CANCELLED`; QR token invalidated | 403, 409 from `COMPLETED`/`RATED`/`CANCELLED` |

### 4.7 QR handoff — ✅ `LIVE`

#### `GET /api/help-requests/{id}/qr`
Requester only, status `ACCEPTED`. Returns the existing token; issues a new one when there is none (e.g. seeded `ACCEPTED` requests) or it has expired. Token: 32 random bytes, base64url (43 chars), valid **24 h**.
```json
{ "requestId": 42, "token": "k3J9...base64url...", "expiresAt": "2026-10-04T12:00:00Z" }
```
403 not requester, 409 not `ACCEPTED`.

#### `POST /api/help-requests/{id}/complete`
Assigned volunteer only. Body `{ "token": "k3J9..." }` (the scanned QR content; whitespace trimmed).
`ACCEPTED → COMPLETED`, token marked used. → `200 HelpRequestView` (FULL).
400 wrong/expired token (`detail`: `"Invalid QR code"` / `"QR code expired, ask the requester to show it again"`), 403 not the assigned volunteer, 409 not `ACCEPTED` or token already used. The token never appears in `HelpRequestView`.

QR payload on the requester's screen = the raw `token` string. (The mock `PODDRODZE-…` format is mock-only.)

### 4.8 Ratings — ✅ `LIVE`

#### `POST /api/help-requests/{id}/ratings`
Requester or assigned volunteer, status `COMPLETED` (or `RATED` is 409). One rating per side; the other side is rated.

```json
{ "stars": 5, "comment": "Bardzo dziękuję!" }
```
| Field | Rules |
|---|---|
| `stars` | required, 1–5 |
| `comment` | optional, ≤ 500 |

→ `201`
```json
{
  "requestStatus": "COMPLETED",
  "ratedUser": { "id": 1, "displayName": "Anna K.", "trustScore": 74, "identityVerified": true, "ratingAverage": 4.8, "ratingCount": 6 },
  "cityPointsAwarded": 25
}
```
`requestStatus` becomes `RATED` once both sides rated. 403 not a party, 409 wrong status or already rated by this side.

Reputation rules (`ReputationPolicy`):
- **Trust score** moves 20% towards the rating mapped to 0–100 (1★ = 0 … 5★ = 100): `new = round(old + (rating − old) × 0.2)`. Example: 90 → 5★ → 92.
- **City points** go to the volunteer only, when the requester rates them: 4★ = 20, 5★ = 25, below 4★ = 0. `cityPointsAwarded` is what the rated user earned with this rating.

### 4.9 City analytics

Public, aggregated data only.

#### `GET /api/analytics/heatmap` — ✅ `LIVE`

| Param | Rules |
|---|---|
| `category` | optional `HelpCategory` |
| `status` | optional, repeatable (`?status=OPEN&status=ACCEPTED`); default: all except `CANCELLED`, `UNDER_REVIEW` |
| `from`, `to` | optional ISO-8601 instants, `from < to` |
| `cellSizeMeters` | hexagon side, 100–5000, default 500 |

→ `200`
```json
{
  "type": "FeatureCollection",
  "cellSizeMeters": 500,
  "totalRequests": 86,
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [19.945, 50.0647] },
      "properties": {
        "count": 7,
        "weight": 15,
        "byCategory": { "MEDICINE": 3, "GROCERIES": 2, "EQUIPMENT_LOAN": 0, "HOME_SUPPORT": 1, "SOCIAL": 1 },
        "area": { "type": "Polygon", "coordinates": [[[...]]] }
      }
    }
  ]
}
```
`weight` = priority-weighted count (P1 = 3, P2 = 2, P3 = 1).

#### `GET /api/analytics/summary` — ✅ `LIVE` (🔵 extra fields proposed)

| Param | Rules |
|---|---|
| `category`, `from`, `to` | as above |

→ `200`
```json
{
  "total": 86,
  "open": 6,
  "inProgress": 9,
  "fulfilled": 71,
  "cancelled": 0,
  "fulfillmentRate": 0.8256,
  "byStatus":   { "OPEN": 6, "OFFERED": 4, "ACCEPTED": 5, "COMPLETED": 40, "RATED": 31, "CANCELLED": 0 },
  "byCategory": { "MEDICINE": 20, "GROCERIES": 18, "EQUIPMENT_LOAN": 14, "HOME_SUPPORT": 23, "SOCIAL": 11 },
  "byPriority": { "1": 30, "2": 31, "3": 25 },
  "activeVolunteers": 42,
  "averageStars": 4.9
}
```
- `fulfillmentRate` is a **fraction 0–1** (multiply by 100 for %).
- `byPriority` keys are JSON strings `"1"`, `"2"`, `"3"`.
- **[+] `activeVolunteers`** – distinct volunteers on non-cancelled requests in the range. **[+] `averageStars`** – average rating, `null` when no ratings. Both proposed; until then the dashboard hides those tiles.
- Not provided by the backend (frontend must hide or label as "demo"): per-district stats, average response time, CO₂ saved.

---

## 5. Frontend mapping cheatsheet

Until the frontend UI models are aligned 1:1 with the wire types, all conversion lives in `src/api/*.ts` mappers. Current differences:

| Frontend model | Wire field | Rule |
|---|---|---|
| `id: string` | `id: number` | `String(id)`; send back `Number(id)` |
| `verified` | `identityVerified` | rename |
| `hasSpecialNeeds` | `specialNeeds` | rename |
| language names | `languages: LanguageCode[]` | display via `Intl.DisplayNames`; send codes back |
| `area.center` | `approximateLocation` | rename |
| `area.polygon` | `maskedArea` | rename |
| `area.radiusMeters` | – | constant `300` (grid cell size) |
| `exactLocation` | `location` (FULL only) | rename |
| `address.{street,building,apartment,city}` | `street`, `buildingNumber`, `apartmentNumber` (FULL only) | build object, `city = 'Kraków'` |
| `requester: UserPublic` | `requester` (FULL) / `requesterTrust` (PUBLIC) | PUBLIC: anonymous user with displayName `"Zgłaszający"` |
| `isOwner` / `isAssigned` | `viewerRole` | use `viewerRole` instead of comparing ids |
| `HeatmapPoint[]` | `features[]` | `{lng,lat} = geometry.coordinates`, `weight = properties.weight / maxWeight`, `category` = argmax of `byCategory` |
| `CityAnalyticsSummary.totalRequests` | `total` | rename; `completedRequests = fulfilled`, `inProgressRequests = inProgress`, `categoryCounts = byCategory` |
| `RatingResult.newTrustScore` | `ratedUser.trustScore` | – |

---

## 6. Open questions

Decide, then update this file (and remove the line):

1. Can a volunteer **withdraw** an offer (`OFFERED → OPEN`) or abandon an accepted task? Proposed: `POST /{id}/withdraw` by the volunteer, `OFFERED`/`ACCEPTED → OPEN`. Not implemented yet.
2. Who reviews `UNDER_REVIEW`? Out of MVP scope; for the demo, make sure demo texts are not flagged. (The author can now cancel it.)

---

## How to change this contract

1. **Edit this file first**, in the same PR as the code change (or a PR before it). Mark new fields with **[+]** and the endpoint with 🟡/🔵 until both sides ship it.
2. **Additive changes** (new optional response field, new endpoint, new optional request field): backend can ship any time; the frontend must tolerate the field being absent.
3. **Breaking changes** (rename, remove, type change, new required request field, new enum value in a response): announce on the team chat, update both sides in coordinated PRs, and add a line to the changelog below. New enum values are breaking for the frontend because of exhaustive `Record<Status, …>` maps.
4. Keep the `.http` files in `backend/hackyeah-2026-backend/http/` in sync – they are the executable examples of this contract.
5. When an endpoint goes live, flip its status to ✅ and drop the **[+]** markers.

### Changelog

| Date | Change | By |
|---|---|---|
| 2026-10-03 | Spoken languages: `languages` (ISO 639-1 codes) on `UserSummary` and `UserProfileResponse`, new `PUT /api/users/me/languages` (live); proposed `languages` in `requesterTrust` and in `POST /api/users`; CORS allows `PUT`. | Backend |
| 2026-10-03 | Proposed `POST /api/users` (create account from the login screen, §4.2). | FE1 |
| 2026-10-03 | Integration phase 0: `GET /api/users/demo` live; CORS for browser clients on `/api/**` (§1.1). | Dev 2 |
| 2026-10-03 | Stage 3 live: offer / accept / reject / cancel, `GET /mine`, QR (`/qr`, `/complete`), ratings. `viewerRole` on request views; `ratingAverage` on `UserSummary` and profile; `cityPoints` on profile. Decided: QR TTL 24 h with automatic reissue, stored city points (4★ = 20, 5★ = 25), requester may cancel `UNDER_REVIEW`. | – |
| 2026-10-03 | Initial contract: documents live endpoints, proposes stage-3 endpoints, `viewerRole`, `requesterTrust`, list `tags`/`accessibilitySupport`, `GET /users/demo`. | – |
