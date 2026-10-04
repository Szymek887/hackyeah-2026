# PoDrodze – City Dashboard & Admin View Plan

Companion to [`integration-plan.md`](./integration-plan.md). This file lists the improvements to the city dashboard (`/api/analytics/*`, `src/features/dashboard/`) and the city admin role, **in priority order**.

## Priorities

| Priority | Meaning |
|---|---|
| **P0** | Must fix before the demo: a bug or a claim in the pitch that the app breaks |
| **P1** | Biggest demo impact: turns the dashboard into a tool the city would use |
| **P2** | Strong extra if there is time |
| **P3** | Polish |

## Overview

| # | Task | Priority | Area | Estimate |
|---|---|---|---|---|
| 1 | ✅ Close the heatmap privacy leak (min cell size + k-anonymity) | P0 | BE + mock | 45 min |
| 2 | ✅ Fix misleading KPIs and make the category filter apply to the whole dashboard | P0 | FE | 30 min |
| 3 | ✅ Stop the full-screen spinner on every filter change | P0 | FE | 10 min |
| 4 | ✅ Draw real hexagons instead of circles | P1 | FE (web + native) | 1–1.5 h |
| 5 | ✅ Useful cell popups (counts + category breakdown) | P1 | FE | 30 min |
| 6 | ✅ Moderation queue for requests flagged by the AI (`UNDER_REVIEW`) | P1 | BE + FE + mock | 3–4 h |
| 7 | ✅ "Unmet need" view: open vs fulfilled toggle | P1 | FE | 45 min |
| 8 | Time dimension: backdated seed data + time range filter | P2 | BE + FE | 1.5–2 h |
| 9 | Trend per category (this period vs previous) | P2 | BE + FE | 1.5 h |
| 10 | ✅ Require `CITY_ADMIN` for analytics endpoints | P3 | BE + FE | 30 min |
| 11 | Map clean-up: district labels, legend, colour scale | P3 | FE | 45 min |

Suggested order for a short time budget: **1 → 3 → 2 → 4 → 5 → 6**. Tasks 1–5 are about 3.5 h in total; task 6 is the largest single item.

---

## P0 – Must fix

### 1. Close the heatmap privacy leak — ✅ Done (2026-10-04)

> **Implemented.** `MIN_CELL_SIZE_METERS = 500`; hexagons with fewer than `app.analytics.min-cell-count` (default 3, env `ANALYTICS_MIN_CELL_COUNT`) requests are dropped after filtering; `HeatmapResponse.suppressedCells` added. The mock server follows the same rules, and the dashboard shows a note when areas are hidden. `AnalyticsRepositoryTest` runs with the threshold set to 1 so it still checks the SQL grouping on small fixtures; suppression is covered in `AnalyticsServiceTest`. Docs updated: README privacy section, `api-contract.md`, `http/analytics.http`.

**Problem.** `GET /api/analytics/heatmap` is public and accepts `cellSizeMeters=100`, while the public map masks locations to 300 m (`LocationObfuscationService.CELL_SIZE_METERS`). `?category=MEDICINE&cellSizeMeters=100` returns ~100 m hexagons with `count: 1`, which points at individual people who need medicine. This contradicts the "privacy by design" claim.

**Changes.**
- `AnalyticsService`: raise `MIN_CELL_SIZE_METERS` from 100 to 500 (at least the masking size; 500 is the current default).
- `AnalyticsService.toFeatures`: drop hexagons whose `count` is below `MIN_CELL_COUNT = 3` (k-anonymity). Apply it **after** filters, so a category filter cannot isolate one request.
- `HeatmapResponse`: add `suppressedCells` (number of hidden cells), so the UI can say "N areas with fewer than 3 requests are hidden for privacy". `totalRequests` stays the sum of the cells shown.
- Decision: `byCategory` inside a visible cell can still show `1` for one category. Acceptable for the MVP (the cell has at least 3 requests); note it in the README privacy section.
- Mock server (`src/api/mocks/server.ts` `heatmap()`): same minimum and same suppression, so the two modes behave alike.

**Tests.** `AnalyticsServiceTest`: a cell with 2 requests is removed, a cell with 3 stays, `suppressedCells` is counted. `AnalyticsControllerTest`: `cellSizeMeters=100` → 400.

**Done when** no combination of parameters returns a cell with fewer than 3 requests or a cell smaller than 500 m.

### 2. Fix misleading KPIs and the category filter — ✅ Done (2026-10-04)

> **Implemented.** `SummaryResponse.openUrgent` (backend + mock) feeds the "Czeka na pomoc" card as "W tym pilnych". `useCitySummary(category)` sends the selected category, so the KPI cards follow the filter (dimmed while loading). The filter pills moved above the KPI cards and say they filter the whole panel. The "by category" bars are hidden while one category is selected.

**Problems** (`city-dashboard.tsx`):
- The "Czeka na pomoc" card shows `Pilnych: byPriority['1']`: urgent requests across **all** statuses, without priority 0 (medicine).
- The category pills filter only the map. KPI cards and category bars always show citywide totals.

**Changes.**
- Backend `SummaryResponse`: add `openUrgent` = `OPEN` requests with priority 0 or 1 (one extra aggregate in `toSummary`; `SummaryRow` already has status and priority).
- Use `openUrgent` in the "Czeka na pomoc" card.
- `useCitySummary(category)`: pass the selected category (the endpoint already supports it) and add it to the query key.
- Hide or dim the "by category" bars when a category is selected, as they only show one bar then.
- Mock server: add `openUrgent` to `summary()`.

**Done when** every number on screen matches the selected filter, and "Pilnych" counts only requests that are still waiting.

### 3. No full-screen spinner on filter change — ✅ Done (2026-10-04)

> **Implemented.** Both dashboard queries use `placeholderData: keepPreviousData`, so `isPending` is true only on the first load. While a new category loads, the previous map stays visible at 60% opacity with a small spinner next to the map title (`isPlaceholderData`). The summary query already keeps its data too, ready for task 2 adding the category to its key.

**Problem.** A new category creates a new query key → `isPending` → the whole dashboard is replaced by a spinner.

**Changes.**
- `hooks.ts`: `placeholderData: keepPreviousData` in `useHeatmapData` and `useCitySummary`.
- `city-dashboard.tsx`: show the full-screen spinner only on the very first load; during refetches show a small indicator on the map card (`isFetching`).

---

## P1 – Biggest demo impact

### 4. Draw real hexagons — ✅ Done (2026-10-04)

> **Implemented.** Both maps draw `properties.area` as polygons (Leaflet `L.polygon` on web, `react-native-maps` `Polygon` on native) with a 2 px white gap between cells. Colour comes from fixed count bins in `features/dashboard/heatmap-scale.ts` (3–4 / 5–7 / 8–11 / 12–19 / 20+, chosen to spread the seeded data). The scale is one blue hue (`HeatmapScaleColors` in `theme.ts`, validated as an ordinal ramp). The colours don't change in dark mode because the map tiles stay light. On web, hovering a cell highlights it and shows "N zgłoszeń". The category legend under the map is replaced by the count scale. Circles, markers and the `dominantCategory` colouring are gone. Native has no tap details yet; that comes with task 5.

**Problem.** The README promises a hexagon heatmap and the API returns each hexagon outline in `properties.area`, but both map components draw two blurred circles + a marker per cell. The circle radii (170–430 m) do not match the 500 m cells.

**Changes.**
- `city-heatmap-map.web.tsx`: `L.geoJSON(point.area, { style })` per cell. Fill colour from a **single sequential scale** based on `count` (e.g. 5 steps from light to dark), thin white border, hover highlight. Remove the circles and circle markers.
- `city-heatmap-map.tsx` (native): `<Polygon coordinates={…}>` from `react-native-maps`, same colour scale. Convert GeoJSON `[lng, lat]` to `{ latitude, longitude }` (`features/map/area-geometry.ts` may already have a helper).
- Move the shared `HeatmapPointItem` type and the colour scale into one file (e.g. `features/dashboard/heatmap-scale.ts`) instead of duplicating them in both components.
- `city-dashboard.tsx`: pass `count`, `byCategory` and `area` per cell; remove the `dominantCategory` colouring (category is chosen with the filter pills instead).
- Replace the category legend under the map with a colour-scale legend ("1–2 … 20+ zgłoszeń").

**Done when** the map shows a grid of hexagons that line up with each other and get darker where there are more requests, on web and native.

### 5. Useful cell popups — ✅ Done (2026-10-04)

> **Implemented.** New per-hexagon `open` count in the heatmap API (`count(*) FILTER (WHERE status = 'OPEN')` in the same query, so it is not hidden by the k-anonymity rule the way a second `status=OPEN` query would be); mock and types follow. Web: hovering a hexagon shows a tooltip with the total, "Czeka na pomoc: N" and the categories present, most requested first. Native: hexagons are tappable and open a card at the bottom of the map with the same content (`heatmap-cell-card.tsx`), closed with "Zamknij". The percentage and `totalInCell` are gone.

**Problem.** The popup shows "Wskaźnik zapotrzebowania: 73%", relative to the busiest cell, which means nothing to an official. `totalInCell` is set to `weight`, not to the count.

**Changes.**
- Popup / callout content: total requests in the area, number still open (needs task 7 data or a second query with `status=OPEN`), and a per-category list with coloured dots, sorted by count.
- Remove `totalInCell` and the percentage.

### 6. Moderation queue for flagged requests — ✅ Done (2026-10-04)

> **Implemented.** Backend: `ModerationService` + `AdminController` (`GET /api/admin/review-queue`, `POST /api/admin/help-requests/{id}/approve|dismiss`, CITY_ADMIN only), `ModerationItem` DTO with original text and masked area only, `reviewedBy`/`reviewedAt` on `HelpRequest`, 3 seeded flagged requests (2 scams, 1 false alarm), `http/admin.http`, `ModerationServiceTest` + `AdminControllerTest`. Frontend: `src/api/admin.ts`, mock endpoints and seeds, `RiskFlagLabels`, `review-queue.tsx` at the top of the dashboard (polled every 20 s, dismiss asks for confirmation, decisions refresh the KPIs and map). Checked end to end against the real database. Deviation from the plan: the requester's side was left as is; a dismissed request shows as "Anulowane".

**Problem.** When the AI suspects a scam, `HelpRequestDetailsService` puts the request in `UNDER_REVIEW`. Nothing can move it out except the requester cancelling it. The pitch says "held back for review", but nobody reviews.

**Backend.**
- `HelpRequestStatus`/workflow: new transitions `UNDER_REVIEW --approve--> OPEN` and `UNDER_REVIEW --dismiss--> CANCELLED`. Update the state diagram in `HelpRequestWorkflowService`.
- New `AdminController` under `/api/admin`, all endpoints require `UserRole.CITY_ADMIN` (else 403 `ForbiddenException`):
  - `GET /api/admin/review-queue`: `UNDER_REVIEW` requests, oldest first. Each item: id, title, description, category, priority, `riskFlags`, `createdAt`, requester display name + trust score, and the **masked** area (not the address; the admin does not need it to judge a scam).
  - `POST /api/admin/help-requests/{id}/approve` → `OPEN` (now visible on the map and to volunteers).
  - `POST /api/admin/help-requests/{id}/dismiss` → `CANCELLED`.
  - Wrong status → 409, as for other workflow actions.
- `HelpRequestVisibilityPolicy`: a `CITY_ADMIN` can see `UNDER_REVIEW` requests (only through the admin endpoints).
- Seeder: add 2–3 `UNDER_REVIEW` requests with realistic risk flags (e.g. asks for money upfront, asks for a bank card PIN), so the queue is not empty in the demo.
- `http/admin.http` with the new requests; tests in `AdminControllerTest` and `HelpRequestWorkflowServiceTest` (approve/dismiss, 403 for non-admins, 409 for wrong status).

**Frontend.**
- `src/api/admin.ts` + types; mock branch in `mocks/server.ts` with the same rules.
- `features/dashboard/review-queue.tsx`: a card on the dashboard above the map: "Do weryfikacji (N)", each item shows the text, risk flags as chips (Polish labels), requester trust score, and **Zatwierdź** / **Odrzuć** buttons. Confirm before dismissing. On success, invalidate the queue, summary and heatmap queries.
- Empty state: "Brak zgłoszeń do weryfikacji".
- Requester side: `features/tasks/hooks.ts` already handles `UNDER_REVIEW`; check that the text says the request is being checked by the city, and that an approved request shows up as open.

**Demo moment.** Create a scam-like request on the phone → it appears in the admin queue with the AI's risk flags → admin approves or rejects → the map updates.

### 7. "Unmet need" view — ✅ Done (2026-10-04)

> **Implemented.** `SegmentedControl` above the map: **Czeka na pomoc** (default) · **W toku** · **Zrealizowane** · **Wszystkie**, defined in `HEATMAP_VIEWS` (`heatmap-scale.ts`). Statuses go as one comma-separated `status` value (Spring binds it like repeated keys; covered by `AnalyticsControllerTest`), so `apiRequest` stays single-valued; the mock now honours `status` too. The map title became "Mapa potrzeb" with a one-line description of the view. When every area is under the privacy threshold (today: *W toku* and *Zrealizowane* on the seed data), the map shows an explanation instead of looking broken; task 8's richer seed fills these views.

**Problem.** The heatmap mixes fulfilled and open requests. A planner needs to see where help is **not** arriving.

**Changes.**
- Segmented control above the map: **Czeka na pomoc** (`status=OPEN`) · **W toku** (`OFFERED`, `ACCEPTED`) · **Zrealizowane** (`COMPLETED`, `RATED`) · **Wszystkie**. Default: *Czeka na pomoc*.
- `getHeatmap` / `useHeatmapData`: pass `status` (repeatable query param; check that `apiRequest` serialises arrays as repeated keys, e.g. `status=OFFERED&status=ACCEPTED`) and include it in the query key.
- Map card subtitle explains the current view in one sentence.

---

## P2 – If there is time

### 8. Time dimension

**Problem.** `HelpRequest` sets `createdAt = Instant.now()` in its constructor, so all seeded data has the same timestamp and the `from`/`to` filters have nothing to show.

**Changes.**
- `HelpRequest`: allow the seeder to set `createdAt` (package-private setter or constructor overload, used only by `DatabaseSeeder`).
- `DatabaseSeeder.seedCluster`: spread requests over the last 30 days, with different patterns per district (e.g. groceries growing in one district) so task 9 has a story. Older requests should more often be completed than recent ones.
- Dashboard: time range chips **7 dni / 30 dni / Wszystko**, passed as `from` to both heatmap and summary.
- Mock DB: same backdating.

### 9. Trend per category

- Backend: `GET /api/analytics/trend?days=30&bucket=day` returning counts per day per category (one `GROUP BY date_trunc('day', created_at), category` query; same hidden-status rule as other analytics).
- Dashboard: in the "Zgłoszenia według kategorii" section, add the change against the previous period (e.g. "+40% vs poprzednie 7 dni") and a small sparkline per category. Use the `dataviz` skill guidance for the sparkline.

---

## P3 – Polish

### 10. Analytics only for `CITY_ADMIN` — ✅ Done (2026-10-04)

> **Implemented.** `AnalyticsController` takes `@CurrentUser` and checks `CityAdminPolicy.requireCityAdmin` (new shared policy, also used by `ModerationService`): 401 without a user, 403 for other roles. Tests, `http/analytics.http` (admin header + a 403 case), the mock server, `api-contract.md` (changelog: breaking) and the README are updated. The `AnalyticsService` privacy rules from task 1 stay, as defence in depth.

After task 1 the data is safe to keep public, so this is optional. If done: `AnalyticsController` takes `@CurrentUser` and returns 403 for other roles; update `AnalyticsControllerTest`, the `.http` files, `api-contract.md` and the README ("public" → "city admin only").

### 11. Map clean-up — 🟡 Partly done (2026-10-04)

> **Done:** the hard-coded district labels (web badges, Android badges, iOS red pins) are removed from the heatmap; the OpenStreetMap tiles already name the districts. **Open:** the items below except the first.

- Native: the six district markers are standard red pins that compete with the data. Replace them with text labels or remove them (web already uses text badges).
- Optionally use real district boundaries (GeoJSON of the 18 Kraków districts) as a thin outline layer, instead of 6 hard-coded points.
- Make sure the colour scale works in dark mode and is readable for colour-blind users (sequential single hue, not red/green).
- Remove unused `districtFooter` style and rename `district*` styles in `city-dashboard.tsx` (they are category items).

---

## Docs to update when done

- `README.md`: City dashboard row (hexagons, k-anonymity, moderation queue), demo scenario step 8.
- `documentation/api-contract.md`: new admin endpoints, `suppressedCells`, `openUrgent`, new minimum `cellSizeMeters`, trend endpoint.
- `backend/hackyeah-2026-backend/http/`: new `admin.http`, updated `analytics.http`.
