# PoDrodze – Frontend ⇄ Backend Integration Plan

Companion to [`api-contract.md`](./api-contract.md) (what the API looks like) – this file says **what is missing and in which order to connect it**. Owners follow `frontend/start.md` (FE1–FE3) and `backend-plan.md` (Dev 1–3).

## 1. Where we are (2026-10-03)

The frontend has a clean seam for integration: every call goes through `src/api/*.ts`, each function has a mock branch and a real branch switched by `EXPO_PUBLIC_USE_MOCKS`. **But the real branches were written against a guessed API**, so turning mocks off today breaks most screens.

| Feature | Backend | Frontend real branch | Works with `USE_MOCKS=false`? |
|---|---|---|---|
| Health | ✅ `GET /api/health` | not called | – |
| Login / profile | ✅ `GET /api/users/me` | ✅ calls it, maps fields | ⚠️ **wrong user ids** – demo list (1–5) does not match the seeder (see §2.1) |
| Map – nearby | ✅ | ✅ mapped | ⚠️ yes, but no tags / requester / accessibility; `MEDICINE`/`GROCERIES` collapsed to `BASIC_NEEDS` |
| Route planner – along route | ✅ | ✅ mapped | ⚠️ same as above |
| AI classify preview | ✅ | ⚠️ called, response not mapped | ❌ `MEDICINE`/`GROCERIES` not in frontend `Category` → broken chips/colors |
| Request details | ✅ `GET /api/help-requests/{id}` | ❌ calls `/api/requests/{id}`, no mapping | ❌ 404; and FULL/PUBLIC shape differs completely |
| Create request | ✅ `POST /api/help-requests` | ❌ sends nested `location`/`address` | ❌ 400 (backend expects flat `lat`, `lng`, `street`, `buildingNumber`) |
| Offer / accept | ❌ not implemented | calls `/api/help-requests/{id}/offer|accept` | ❌ |
| Cancel | ❌ | no UI | – |
| My tasks board | ❌ no `/mine` | calls `/api/help-requests/mine` | ❌ |
| QR token / complete | ❌ | calls `/api/requests/{id}/qr|complete` (wrong prefix) | ❌ |
| Rating | ❌ | calls `/api/requests/{id}/ratings` (wrong prefix) | ❌ |
| Dashboard heatmap | ✅ GeoJSON FeatureCollection | expects flat `HeatmapPoint[]` | ❌ shape mismatch; `?category=BASIC_NEEDS` → 400 |
| Dashboard summary | ✅ | expects different field names + fields that don't exist | ❌ (renders zeros / fallbacks) |
| Identity verification | ❌ | no UI | – |

## 2. Gaps found

### 2.1 Blockers (nothing works end-to-end without these)

1. **User ids don't match.** `src/api/mocks/data.ts` hard-codes users 1–5 (`4 = Kuba W. VOLUNTEER`, `5 = Miasto Warszawa CITY_ADMIN`). The seeder creates 8 requesters first, so id 4 is *Zofia M. REQUESTER*, Kuba is **9**, the city admin ("Miasto Kraków") is **13**. Logging in as the "volunteer" in real mode gives a requester. Ids also depend on a fresh database (IDENTITY columns). Backend side fixed: `GET /api/users/demo` is live (step 0.2) – the login screen still has to use it (step 0.3, FE1).
2. ✅ ~~**No CORS config.**~~ Fixed (step 0.1). Native (Expo Go) was never affected; the **web build** (`localhost:8081`, dashboard, laptop demos) can now call the API.
3. **Category enum mismatch.** Frontend: `BASIC_NEEDS | EQUIPMENT_LOAN | HOME_SUPPORT | SOCIAL`. Backend: `MEDICINE | GROCERIES | EQUIPMENT_LOAN | HOME_SUPPORT | SOCIAL`. Backend values are persisted and returned by classify/heatmap/summary, so the frontend must adopt them.
4. **Status enum.** Frontend lacks `UNDER_REVIEW`. `StageByStatus: Record<RequestStatus, …>` will crash (`undefined` stage) when the backend returns it for a scam-flagged request in "my tasks".
5. **Path prefix.** Frontend mixes `/api/requests/…` and `/api/help-requests/…`. Contract: everything under `/api/help-requests`, except `/api/requests/classify`.
6. **Stage-3 backend endpoints missing:** offer, accept, reject, cancel, `mine`, QR, complete, ratings. The whole volunteer flow (the demo scenario) depends on them.

### 2.2 Shape mismatches (fixable in frontend mappers)

- Request details is a `visibility` union (`FULL` / `PUBLIC`); frontend expects one `HelpRequestDetails` with optional `exactLocation`/`address`.
- Create payload: flat fields vs nested `location` + `address`; `city` doesn't exist on backend.
- Heatmap: FeatureCollection vs `HeatmapPoint[]`.
- Summary: `total/fulfilled/inProgress/byCategory/fulfillmentRate (0–1)` vs `totalRequests/completedRequests/inProgressRequests/categoryCounts/satisfactionRate (%)`.
- Error body: frontend already reads `detail` ✅; `errors` (field validation map) not used yet.

### 2.3 Missing data (needs a backend change – all additive, see contract **[+]**)

| Frontend shows | Missing on backend | Proposal |
|---|---|---|
| Requester name / trust on cards and details | public list/details have no requester at all (by design) | `requesterTrust` (anonymous) on PUBLIC details; cards drop the name |
| "Is this my request / my offer?" | PUBLIC view has no ids | `viewerRole` on both views |
| Tags on map/list | not in list items | add `tags` to `PublicHelpRequestResponse` |
| Accessibility badge | no field anywhere | `accessibilitySupport` on entity, create body, responses |
| Star rating (`ratingAverage`) | only `ratingCount` | add `ratingAverage` to `UserSummary` and profile |
| City points on profile | none | `cityPoints` on profile (awarded with ratings) |
| User-picked category in form | backend ignores it, always uses AI | optional `category` override on create |
| Dashboard: active volunteers, satisfaction | none | `activeVolunteers`, `averageStars` on summary |
| Dashboard: districts, response time, CO₂ | none | **not planned** – hide or label as demo data |

### 2.4 Other issues spotted

- **Create form sends the city centre as location for every request** (`TODO(geocoding)` in `new-request-screen.tsx`). All created requests land on one point → map and heatmap look wrong in the demo. Use the device location (`expo-location`) or a "pick on map" pin; geocoding is optional.
- **Validation limits differ:** classify allows a 2000-char description, create allows 1000. Cap the form at 1000 and show `errors` from 400 responses next to fields.
- **Classify latency** is 2–3 s (LLM) and up to 15 s before fallback. Debounce the live preview (≥ 800 ms) and don't block submit on it – the server re-classifies anyway.
- **`along-route` accepts ≤ 100 points**; today the route is a static constant, but any real routing result must be simplified before sending.
- **Volunteer in `OFFERED` gets the PUBLIC view** (correct for privacy) – the task board must render PUBLIC items (no address, no requester name).
- **Demo text safety:** a request auto-flagged as `SCAM_SUSPECTED` becomes `UNDER_REVIEW` and disappears from the map with no way back. Run all demo texts through `/api/requests/classify` before the presentation.
- **Seed data:** heatmap and route demo need enough requests along `KRAKOW_COMMUTE_ROUTE`, plus a few in `ACCEPTED`/`COMPLETED` for the volunteer demo account.
- **`frontend/start.md` contains unresolved merge-conflict markers** (`<<<<<<< HEAD` … `>>>>>>>`) in the Git and libraries sections.
- **Phone networking:** `EXPO_PUBLIC_API_URL` must be the laptop's LAN IP (Expo Go on a phone), `10.0.2.2` on the Android emulator, `localhost` on iOS simulator / web. Check the macOS firewall allows port 8080.

## 3. Plan

Each step is a small PR. ⏱ = rough estimate. Steps within a phase can run in parallel.

### Phase 0 – Make real mode reachable (⏱ ~1–2 h)

| # | Task | Owner | Done when |
|---|---|---|---|
| 0.1 | ✅ CORS: `WebMvcConfigurer.addCorsMappings("/api/**")`, allowed origin patterns from env `CORS_ALLOWED_ORIGIN_PATTERNS` (default `http://localhost:*`, `http://127.0.0.1:*`, `http://192.168.*:*`, `http://10.*:*`, `http://172.*:*`), methods GET/POST, header `X-User-Id`, expose `Location` | Dev 2 | Expo web calls `/api/health` without CORS error |
| 0.2 | ✅ `GET /api/users/demo` (contract §4.2) | Dev 2 | returns the seeded users |
| 0.3 | Login screen loads demo accounts from 0.2 when mocks are off (keep mock list for mock mode) | FE1 | logging in as the volunteer in real mode gives `role: VOLUNTEER` |
| 0.4 | Call `/api/health` on startup in real mode; show a banner/toast "Brak połączenia z serwerem" when it fails | FE1 | – |
| 0.5 | Document local setup: `docker compose up`, `ollama pull qwen2.5:7b` (or `AI_ENABLED=false`), `./mvnw spring-boot:run`, `.env.local` values per device type. Fix conflict markers in `start.md` | FE1 + Dev 1 | a new person runs both sides in 10 minutes |

### Phase 1 – Align the contract on the frontend, read paths (⏱ ~3–4 h)

All backend endpoints here are already live, so this is frontend-only work against a running backend.

| # | Task | Owner |
|---|---|---|
| 1.1 | Split `src/api/types.ts` into **wire types** (`Backend*`, 1:1 with the contract) and **UI models**. Put all `fromBackend*` / `toBackend*` functions in `src/api/mappers.ts` so contract changes touch one file. | FE1 (announce on chat – shared file) |
| 1.2 | Switch `Category` to `MEDICINE | GROCERIES | EQUIPMENT_LOAN | HOME_SUPPORT | SOCIAL`; update `labels.ts`, `CategoryColors` in `theme.ts`, mocks, dashboard. Add `UNDER_REVIEW` to `RequestStatus` + `StageByStatus` + labels. Delete `toCategory` collapsing. | FE1 (+ FE3 for dashboard) |
| 1.3 | `getRequest`: fix path to `/api/help-requests/{id}`, map the `FULL` / `PUBLIC` union (handle `description: null` → "Opis ukryty – zawiera dane osobowe"). | FE1 |
| 1.4 | `classifyRequest`: map response with the new categories; debounce; show banners for `MEDICAL_EMERGENCY` (112), `SCAM_SUSPECTED`, `PERSONAL_DATA`. | FE1 |
| 1.5 | Nearby / along-route: keep mappers, remove fake `requester` – cards show trust only when available. | FE2 |
| 1.6 | Dashboard: map heatmap FeatureCollection → points (or render `properties.area` hexagons directly – better fit for the "hexagons" requirement); map summary fields; hide tiles with no backend data (districts, response time, CO₂) or mark them "dane demonstracyjne". | FE3 |
| 1.7 | Error handling: surface `ProblemDetail.errors` on forms; map 401 → logout, 404/409 → Polish messages in one helper. | FE1 |

**Exit check:** with `USE_MOCKS=false`, map, route planner, request details (as requester and as stranger), classify preview and dashboard all render real data.

### Phase 2 – Create a request (⏱ ~2 h)

| # | Task | Owner |
|---|---|---|
| 2.1 | `createRequest`: send the flat body from contract §4.5 (`lat`, `lng`, `street`, `buildingNumber`, `apartmentNumber`, plus `category`, `accessibilitySupport` – ignored until 2.3). Drop `city`, `priority`, `tags`. | FE1 |
| 2.2 | Real location: device location via `expo-location` with "pick on map" fallback; city centre only as last resort. | FE1 + FE2 |
| 2.3 | Backend: optional `category` override and `accessibilitySupport` on create + entity + responses; `tags` + `accessibilitySupport` in list items. | Dev 2 (create) / Dev 1 (list) |
| 2.4 | Handle `status: UNDER_REVIEW` in the create response ("Twoje zgłoszenie czeka na weryfikację"). | FE1 |

### Phase 3 – Volunteer flow: state machine, QR, ratings (⏱ ~6–8 h, critical path for the demo)

Backend and frontend run in parallel – the frontend keeps mocks for each call until the endpoint is merged, then flips that single function to real.

| # | Task | Owner |
|---|---|---|
| 3.1 | `RequestStateService` with transition table + actor checks; endpoints `offer`, `accept`, `reject`, `cancel` (contract §4.6). Add `viewerRole` to both detail views. | Dev 2 |
| 3.2 | `GET /api/help-requests/mine` | Dev 2 (or Dev 1) |
| 3.3 | QR token entity (token, expiresAt, usedAt), generated on `accept`; `GET /{id}/qr`, `POST /{id}/complete` (§4.7) | Dev 2 |
| 3.4 | Ratings `POST /{id}/ratings`, trust score + `ratingAverage` + `cityPoints` update, `RATED` when both rated (§4.8) | Dev 2 / Dev 3 |
| 3.5 | `.http` collection for the full flow (create → offer → accept → qr → complete → rate ×2) | Dev 2 |
| 3.6 | Frontend: offer/accept/reject/cancel buttons driven by `viewerRole` + `status` instead of comparing ids; task board on `/mine` rendering both views | FE1 |
| 3.7 | Frontend: fix QR/complete/rating paths to `/api/help-requests/…`, QR shows raw token, scanner sends raw token, rating maps the new response | FE3 |
| 3.8 | Backend: `activeVolunteers`, `averageStars` in summary; `ratingAverage`/`cityPoints` in `UserSummary` and profile | Dev 3 |

### Phase 4 – Demo hardening (⏱ ~2–3 h)

| # | Task | Owner |
|---|---|---|
| 4.1 | Seeder: requests clustered along `KRAKOW_COMMUTE_ROUTE`, the demo request ("Skończyły mi się leki na serce…") on the route, a few `ACCEPTED`/`COMPLETED` tasks for the volunteer account, ratings. | Dev 1 |
| 4.2 | Demo reset: `POST /api/dev/reset` (profile `dev` only) or a documented `docker compose down -v`. | Dev 1 |
| 4.3 | Run all demo texts through classify – no false `SCAM_SUSPECTED`. Prepare `AI_ENABLED=false` fallback mode. | Dev 3 |
| 4.4 | Full scenario on two phones (requester + volunteer) + dashboard on laptop web, mocks off. Write down every glitch. | everyone |
| 4.5 | Keep mocks working as the offline fallback for the presentation. | FE1 |

## 4. Working rules during integration

- **Contract first:** any API change starts with an edit to `api-contract.md` (see "How to change this contract" there).
- **Flip one function at a time:** a real branch in `src/api/*.ts` is switched on only when its endpoint is ✅ `LIVE` in the contract. Never delete a mock branch.
- **Per-endpoint override (optional, recommended):** extend `config.ts` so `EXPO_PUBLIC_USE_MOCKS` can also be a list (`offer,qr`) of features still mocked. Lets people test finished parts against the real backend while Phase 3 is in progress.
- **One person owns the wire types** (FE1) and **one owns the DTOs** (Dev 2); both review contract PRs.
- **Privacy tests stay green:** any new public field goes through the "no leak" test in `HelpRequestControllerTest`.

## 5. Critical path

```
0.1 CORS ─┐
0.2/0.3 ids ─┼─► 1.1 wire types ─► 1.2 enums ─► 1.3 details ─► 3.6 FE flow ─► 4.4 rehearsal
          │                                         ▲
          └─► 3.1 state machine ─► 3.3 QR ─► 3.4 ratings ─┘
```

The backend stage-3 work (3.1–3.4) is the longest chain and blocks the demo scenario – start it immediately, in parallel with Phase 0–1 on the frontend.
