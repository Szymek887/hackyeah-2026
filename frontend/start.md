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
Napisz na czacie, zrób mały osobny commit i od razu go wypchnij.

## Git

Pracujemy bezpośrednio na `main` (bez osobnych gałęzi), więc:

- Przed rozpoczęciem pracy i przed każdym pushem: `git pull --rebase`.
- Commituj często i małymi porcjami – jeden commit = jedna zamknięta rzecz.
- Commity: `feat(map): ...`, `fix(qr): ...`, `chore: ...`.
- Przed pushem: `npm run check` (typecheck + lint). `npm run format` formatuje wszystko.
- Trzymaj się swoich plików (tabela wyżej) – wtedy rebase przechodzi bez konfliktów.

## Biblioteki

- Instalacja zawsze przez `npx expo install <pakiet>` (dobiera wersję do SDK). Na Windows dev-zależności: `npx expo install <pakiet> "--" --dev`.
- `package.json` + `package-lock.json` commituj i wypychaj od razu w osobnym commicie.
- Konflikt w `package-lock.json`: nie rozwiązuj ręcznie – weź wersję z `main` i uruchom ponownie `npx expo install`.
- Przed dodaniem natywnej biblioteki sprawdź, czy działa w Expo Go.
- `react-native-maps` nie działa na webie – dashboard potrzebuje osobnej biblioteki w pliku `.web.tsx`.

## Edytor

Zainstaluj rozszerzenia polecane przez VS Code (Prettier, ESLint, Expo Tools). Formatowanie przy zapisie jest skonfigurowane w `.vscode/settings.json`, końce linii to LF (`.gitattributes`).

## Znane problemy

- **`Unable to resolve module <pakiet>` po `git pull`** – ktoś dodał bibliotekę. Po każdym pullu, który zmienia `package.json`, uruchom `npm install`, potem `npx expo start -c`.
- **Konflikt w `package.json` przy merge/rebase** – zachowaj zależności z OBU stron (nie wybieraj „ours”/„theirs” dla całego pliku), potem `npm install` i commit nowego `package-lock.json`. Po merge sprawdź, czy `npm run check` przechodzi.

- **`package.json does not exist`** – `npx expo start` trzeba uruchamiać w `frontend/hackyeah-2026-app`, nie w katalogu głównym repo.
- **`Unable to resolve module ...` po instalacji pakietu** – zatrzymaj serwer i uruchom z czyszczeniem cache: `npx expo start -c`.
- **`Type '"/"' is not assignable ...` w `npm run check`** – na Windowsie Expo psuje `.expo/types/router.d.ts`, gdy przy działającym serwerze dodajesz nowe pliki. Aplikacji to nie psuje. Naprawa: zatrzymaj serwer, usuń `.expo/types`, uruchom `npx expo start` ponownie.

## Styl wizualny

Clean & casual: białe karty na jasnoniebieskim tle, niebieski akcent (`primary`), granatowy tekst, cienkie obramowania zamiast cieni, bez gradientów i rozmyć. Gotowe klocki w `src/components/ui/`: `Screen`, `Card`, `Button` (`primary` / `secondary` / `outline`), `Badge`, `Input`, `RatingStars`. Nagłówek ekranu: `<ThemedText type="title">`.

## Współpraca z backendem (kontrakt API)

- `src/api/types.ts` to **lustro DTO z backendu** (rekordy z `backend/.../api`). Nazwy pól i kształty 1:1, przy każdym typie podana klasa Javy. Nie dopisujemy tam pól „tylko dla frontu”.
- Gdy backend zmieni DTO: najpierw `types.ts`, potem `npm run check` pokaże ekrany do poprawy.
- Każdy endpoint to jedna funkcja w `src/api/*.ts` (`requests.ts`, `auth.ts`, `dashboard.ts`) wołająca `apiRequest`. Bez `if (USE_MOCKS)` w funkcjach.
- **Mocki = mini-backend** (`src/api/mocks/`): `server.ts` odpowiada na te same ścieżki tym samym JSON-em i kodami błędów (400/401/403/404/409), `db.ts` to ten sam seeder co w Javie (te same konta i id), `classifier.ts` to port `KeywordRequestClassifier`. Zmiana reguły w backendzie = ta sama zmiana w `server.ts`.
- Przełączenie na prawdziwy backend: w `.env.local` ustaw `EXPO_PUBLIC_USE_MOCKS=false` i `EXPO_PUBLIC_API_URL`. Ekrany się nie zmieniają.
- Szczegóły zgłoszenia mają dwa warianty: sprawdzaj `isFull(view)` (`features/requests/view-helpers.ts`). Adres i osoby są tylko w `FULL`. Moją rolę w zgłoszeniu bierz z `view.viewerRole`, nie z roli konta.
- Błędy pokazuj przez `errorMessage(error)` z `src/api/errors.ts` – tłumaczy komunikaty backendu na polski.
- Id z backendu to liczby; parametry tras (`useLocalSearchParams`) zamieniaj `Number(id)` w pliku trasy.

## Logowanie

- Backend ma uwierzytelnianie testowe: użytkownik = nagłówek `X-User-Id` (dodaje go `apiRequest`). Ekran logowania ma dwie zakładki: „Mam konto” (lista rozwijana z `GET /api/users/demo`, nie wpisujemy ID na sztywno) i „Nowe konto” (`POST /api/users`). Logowanie sprawdza konto przez `GET /api/users/me`.
- Konta z seedera: 1 Anna K., 2 Marek S., 3 Ewa P., 4 Zofia M., 5 Jan B., 6 Halina R., 7 Piotr N., 8 Maria T. (potrzebujący), 9 Kuba W., 10 Ola D., 11 Bartek L., 12 Nadia P. (wolontariusze), 13 Miasto Kraków.
- `useSession()` zwraca `{ user: UserProfile, role, signOut, refreshUser, profileDetails }`. `profileDetails` (opis, potrzeby) jest tylko po stronie aplikacji – backend jeszcze tego nie przechowuje.
- Przepływ: OPEN → „Chcę pomóc” (OFFERED) → przyjęcie lub odrzucenie przez zgłaszającego → ACCEPTED → skan QR (COMPLETED) → oceny obu stron (RATED). Zgłaszający może anulować do momentu ACCEPTED włącznie.

## Role i nawigacja

- Zakładki są w `src/components/navigation/nav-items.ts` (wspólne dla telefonu i webu). „Poproś o pomoc” jest zawsze na środku, w kolorze `accent`.
- **Potrzebuję pomocy** (`REQUESTER`): 3 duże zakładki – Moje prośby, Poproś o pomoc, Profil. Bez mapy.
- **Potrzebuję i pomagam** (`VOLUNTEER`): Mapa, Zgłoszenia, Poproś o pomoc, Zadania, Profil. Wolontariusz też może prosić o pomoc (backend na to pozwala, ale nie można zaoferować pomocy przy własnym zgłoszeniu).
- **Urząd miasta** (`CITY_ADMIN`): osobne logowanie i tylko `app/dashboard.tsx` (bez zakładek). Pozostałe role nie mają dostępu do panelu – pilnuje tego `Stack.Protected` w `app/_layout.tsx`.
- Odświeżanie: `<Screen scroll onRefresh={…}>` albo `RefreshControl` + `useRefresh` dla `FlatList`. Zgłoszenia czekające na drugą stronę są odpytywane co 4 s (`useRequest`, `useMyRequests`).

## Do ustalenia z backendem

(Gotowe po stronie backendu: CORS dla wersji webowej i `GET /api/users/demo`.)

- **`POST /api/users`** (zakładanie konta z ekranu logowania) – opisane w `documentation/api-contract.md` §4.2 jako PROPOSED, działa w mockach. Na prawdziwym backendzie ekran pokaże „Serwer nie obsługuje jeszcze zakładania kont”.
- **Ręczny kod QR** – token ma 43 znaki; do wpisywania ręcznego przydałby się krótki kod (np. 6 cyfr).
- **Pola profilu** (opis, potrzeby, dostępność) i **geokodowanie adresu** (teraz każde nowe zgłoszenie dostaje środek Krakowa).
