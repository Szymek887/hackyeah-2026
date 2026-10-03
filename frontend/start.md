# Frontend – start i zasady pracy

Aplikacja: `frontend/hackyeah-2026-app` (Expo SDK 57, Expo Router, TypeScript strict).

## Uruchomienie

```bash
cd frontend/hackyeah-2026-app
npm install
cp .env.example .env.local   # domyślnie mocki włączone
npx expo start               # telefon: Expo Go, przeglądarka: klawisz w
```

## Kto za co odpowiada

| Osoba | Obszar | Pliki |
|---|---|---|
| FE1 | UI, routing, formularz, profil, API | `src/app/_layout.tsx`, `src/app/(tabs)/{requests,new,profile}.tsx`, `src/app/request/`, `src/api/`, `src/components/ui/`, `src/features/{requests,profile,auth}/` |
| FE2 | Mapa i trasy | `src/app/(tabs)/index.tsx`, `src/app/route-planner.tsx`, `src/features/{map,commute}/` |
| FE3 | QR, ocena, panel miasta | `src/app/{task,rate}/`, `src/app/scan.tsx`, `src/app/dashboard.tsx`, `src/features/{handoff,dashboard}/` |

Każdy ekran ma na razie placeholder z nazwą właściciela i numerami zadań z `documentation/plan.md`.

## Struktura

- `src/app/` – tylko trasy (cienkie pliki). Logika i komponenty ekranu w `src/features/<obszar>/`.
- `src/api/types.ts` – kontrakt z backendem (GeoJSON, `[lng, lat]`, WGS84).
- `src/api/*.ts` – funkcje API; przy `EXPO_PUBLIC_USE_MOCKS=true` zwracają dane z `src/api/mocks/`.
- `src/features/*/hooks.ts` – hooki TanStack Query (`useQuery`/`useMutation`), z nich korzystają ekrany.
- `src/components/ui/` – wspólne komponenty (`Screen`, `Button`, ...).
- `src/constants/theme.ts` – kolory (`Colors`, `CategoryColors`, `PriorityColors`) i odstępy (`Spacing`). Nie wpisuj kolorów na sztywno.

## Pliki wspólne – zmieniaj po uzgodnieniu

`src/app/_layout.tsx`, `src/components/app-tabs*.tsx`, `src/api/types.ts`, `src/constants/theme.ts`, `package.json`.
Napisz na czacie, zrób mały osobny PR i zmerguj go szybko.

## Git

- Gałęzie: `fe/<obszar>-<opis>`, np. `fe/map-hexagons`, `fe/qr-scanner`.
- Jeden PR = jedno zadanie z planu. Przed PR: `git pull --rebase origin main`.
- Commity: `feat(map): ...`, `fix(qr): ...`, `chore: ...`.
- Merge do `main` przez squash, po szybkim przejrzeniu przez drugą osobę.
- Przed PR: `npm run check` (typecheck + lint). `npm run format` formatuje wszystko.

## Biblioteki

- Instalacja zawsze przez `npx expo install <pakiet>` (dobiera wersję do SDK). Na Windows dev-zależności: `npx expo install <pakiet> "--" --dev`.
- `package.json` + `package-lock.json` commituj od razu w osobnym PR.
- Konflikt w `package-lock.json`: nie rozwiązuj ręcznie – weź wersję z `main` i uruchom ponownie `npx expo install`.
- Przed dodaniem natywnej biblioteki sprawdź, czy działa w Expo Go.
- `react-native-maps` nie działa na webie – dashboard potrzebuje osobnej biblioteki w pliku `.web.tsx`.

## Edytor

Zainstaluj rozszerzenia polecane przez VS Code (Prettier, ESLint, Expo Tools). Formatowanie przy zapisie jest skonfigurowane w `.vscode/settings.json`, końce linii to LF (`.gitattributes`).

## Do ustalenia z backendem

- Lista statusów (`RATED` vs `CANCELLED`) – patrz `RequestStatus` w `src/api/types.ts`.
- Format obszaru przybliżonego (okrąg czy heksagon H3).
- Ścieżki endpointów (w `src/api/requests.ts` są tymczasowe) i adres API widoczny z telefonu (`EXPO_PUBLIC_API_URL`, IP komputera w sieci lokalnej).
