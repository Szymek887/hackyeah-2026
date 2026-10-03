# Plan Implementacji Backendu: PoDrodze

> Uzupełnienie `plan.md` (zadania B1.x–B3.x). Dokument opisuje **jak** zbudować backend: stos, architekturę, model danych, API i kolejność prac dla trzech osób backendowych.

## 1. Stan obecny

- Spring Boot 4.1.1 (Java, Maven), pakiet bazowy `com.telecrazy.hackyeah2026backend`.
- Zależności: `data-jpa`, `validation`, `webmvc`, `devtools`, `postgresql`, `lombok`.
- `docker-compose.yml` z PostgreSQL 17 + PostGIS 3.5 (obraz `imresamu/postgis`, multi-arch dla Apple Silicon) – **B1.1 zrobione**.
- Połączenie z bazą w `application.properties`, `ddl-auto=update`.
- `GET /api/health` + żądania IntelliJ w `backend/hackyeah-2026-backend/http/`.
- Encje `AppUser`, `HelpRequest`, `Rating`, repozytoria JPA, geometria `Point` SRID 4326 oraz indeks GiST na `help_requests.location` – **B1.2 zrobione**.
- Podstawowy `DatabaseSeeder` dodaje przykładowych użytkowników i zgłoszenia z lokalizacjami – **B1.3 zrobione w wersji bazowej**.
- GeoJSON DTO dla punktu i zamaskowanego obszaru oraz serializacja JTS `Point` – **B1.4 zrobione w zakresie MVP**.
- Publiczne wyszukiwanie zgłoszeń w promieniu `GET /api/help-requests/nearby` z PostGIS `ST_DWithin` – **B2.1 zrobione**.
- Publiczne wyszukiwanie zgłoszeń wzdłuż trasy `POST /api/help-requests/along-route` z `LINESTRING` i PostGIS `ST_DWithin` – **B2.2 zrobione**.
- Maskowanie lokalizacji dla odpowiedzi publicznych: przybliżony punkt i polygon komórki ok. 300 m, bez dokładnego adresu – **B2.4 częściowo zrobione**.
- Klasyfikacja AI zgłoszeń (pakiet `ai/`, `POST /api/requests/classify`) z fallbackiem regułowym – **B2.3 zrobione** (podpięte do `POST /api/help-requests`). Model: `qwen2.5:7b` w Ollamie.
- Analityka miejska (pakiet `analytics/`, `GET /api/analytics/heatmap`, `GET /api/analytics/summary`) – **B3.4 zrobione (API)**; widok dashboardu na froncie – później.

## 2. Decyzje techniczne

| Obszar | Decyzja | Uzasadnienie |
|---|---|---|
| Geometria | `hibernate-spatial` + JTS (`org.locationtech.jts.geom.Point`), SRID 4326 | Natywne mapowanie na typy PostGIS, zapytania przez JPQL/HQL (`dwithin`, `distance`) lub native SQL. |
| Zapytania przestrzenne | Native query z `ST_DWithin(...::geography, ...)` | Metry zamiast stopni; pewniejsze niż funkcje HQL. |
| Schemat | `ddl-auto=update` na czas hackathonu; `CREATE EXTENSION postgis` w `docker/init.sql` lub przy starcie | Bez Flyway – szybciej. Po MVP można przejść na migracje. |
| GeoJSON | Własne DTO (`GeoJsonPoint`, `GeoJsonFeatureCollection`) mapowane ręcznie z JTS | Unika zależności od bibliotek JTS↔Jackson, które mogą nie wspierać Jackson 3 ze Spring Boot 4. |
| Maskowanie lokalizacji | Przyciągnięcie punktu do siatki (~300 m) + deterministyczny „jitter” oparty na `id` zgłoszenia; opcjonalnie H3 (res. 9) | Prosta, deterministyczna; nie da się odwrócić do dokładnego punktu. |
| Autentykacja | Mock: nagłówek `X-User-Id` rozwiązywany filtrem/argument resolverem do `User` | Zgodne z F1.4 (przełącznik profilu); bez Spring Security. |
| LLM | Ollama (`/api/chat`, `format: "json"`) wywoływana przez `RestClient`, timeout + fallback regułowy | Lokalny model, wymuszony JSON (wytyczne AI). |
| QR | Losowy, jednorazowy token (UUID/32 B base64url) zapisany w bazie z TTL; QR renderowany po stronie aplikacji | Brak potrzeby generowania obrazu na backendzie. |
| Błędy | `@RestControllerAdvice` → `ProblemDetail` (RFC 9457) | Ustandaryzowane 400/404/409. |
| Testy | Testcontainers (PostGIS) dla zapytań przestrzennych, `MockMvc` dla maszyny stanów | Zapytania geo trzeba sprawdzać na prawdziwym PostGIS. |

## 3. Struktura pakietów

Pakiety według funkcji (feature-first):

```
com.telecrazy.hackyeah2026backend
├── common/        # ApiError handler, GeoJSON DTO, GeometryFactory (SRID 4326), CurrentUser
├── user/          # User, UserRepository, UserController (profil, mock weryfikacji)
├── request/       # HelpRequest, kategorie, statusy, repozytorium, kontroler, serwis maszyny stanów
├── geo/           # LocationMasker, zapytania promień/trasa
├── handshake/     # token QR, oferty wolontariuszy
├── rating/        # Rating, naliczanie reputacji
├── ai/            # OllamaClient, RequestClassifier, fallback
├── analytics/     # agregaty i heatmapa
├── seed/          # DataSeeder (profil `dev`)
└── health/        # istniejący HealthController
```

## 4. Model danych

**AppUser** (`app_users`) – `id`, `displayName`, `role` (`REQUESTER` | `VOLUNTEER` | `CITY_ADMIN`), `identityVerified` (bool), `specialNeeds` (bool), `trustScore` (int, 0–100), `ratingCount`. `CITY_ADMIN` widzi analitykę, nie tworzy zgłoszeń (403).

**HelpRequest** (`help_requests`) – `id`, `requester` (FK), `volunteer` (FK, nullable), `title`, `description`, `category` (`MEDICINE`, `GROCERIES`, `EQUIPMENT_LOAN`, `HOME_SUPPORT`, `SOCIAL` – enum `HelpCategory`, wspólny dla encji i klasyfikatora AI), `priority` (1–3, końcowy), `aiPriority` (1–3, wynik AI przed korektą), `tags` (`help_request_tags`), `riskFlags` (`help_request_risk_flags`: `SCAM_SUSPECTED`, `MEDICAL_EMERGENCY`, `PERSONAL_DATA`, `INAPPROPRIATE_CONTENT`), `classificationSource` (`LLM` | `FALLBACK`), `status`, `location` (`Point`, 4326, dokładny), `street`, `buildingNumber`, `apartmentNumber` (adres – tylko w widoku `FULL`), `createdAt`, `updatedAt`, `version` (`@Version`). Indeks GiST na `location`.

**Handshake / QR** – `id`, `request` (FK), `token`, `expiresAt`, `usedAt`.

**Rating** – `id`, `request` (FK), `author`, `target`, `stars` (1–5), `comment`, `createdAt`. Unikalność `(request, author)`.

Kolejność: `OPEN → OFFERED → ACCEPTED → COMPLETED → RATED`, z `CANCELLED` dostępnym z `OPEN/OFFERED/ACCEPTED`. (W `plan.md` `RATED` występuje w 1.1, a `CANCELLED` w B3.1 – obsługujemy oba.)

`UNDER_REVIEW` – stan początkowy zamiast `OPEN`, gdy AI zgłosi `SCAM_SUSPECTED`. Ukryty publicznie (`HelpRequestStatus.HIDDEN_FROM_PUBLIC`): nie ma go w `nearby`/`along-route`, w analityce ani w `GET /{id}` dla innych niż autor. W MVP brak wyjścia z tego stanu (ręczny przegląd poza zakresem, zob. §10); docelowo `UNDER_REVIEW → OPEN` (zatwierdzenie) lub `→ CANCELLED` (odrzucenie).

## 5. API (v1)

Wszystkie ścieżki pod `/api`. Autoryzacja mockiem `X-User-Id`. Zgłoszenia są pod `/api/help-requests` (wyjątek: podgląd klasyfikacji AI pod `/api/requests/classify`).

| Metoda i ścieżka | Opis | Zadanie |
|---|---|---|
| `GET /users/me` | Profil, reputacja, flagi – ✅ zrobione | B1 |
| `POST /users/me/verify` | Mock mObywatel – ustawia `identityVerified` | B3 |
| `POST /help-requests` | Utworzenie zgłoszenia; wywołuje klasyfikację AI – ✅ zrobione | B2 |
| `POST /requests/classify` | Podgląd klasyfikacji AI bez zapisu (F2.2) – ✅ zrobione | B2.3 |
| `GET /help-requests/nearby?lat&lng&radiusKm` | Zgłoszenia w promieniu, **zamaskowane**, GeoJSON – ✅ zrobione | B2.1 |
| `POST /help-requests/along-route` | Body: `points[]` (polilinia), `bufferMeters`; zwraca zgłoszenia w korytarzu – ✅ zrobione | B2.2 |
| `GET /help-requests/{id}` | Szczegóły publiczne (zamaskowane); pełne dane dla zaangażowanych stron po `ACCEPTED` – ✅ zrobione | B2.4 |
| `POST /help-requests/{id}/offer` | Wolontariusz deklaruje pomoc (`OPEN→OFFERED`) | B3.1 |
| `POST /help-requests/{id}/accept` | Zgłaszający akceptuje (`OFFERED→ACCEPTED`), generowany token QR | B3.1/B3.2 |
| `GET /help-requests/{id}/qr` | Token QR dla zgłaszającego (tylko `ACCEPTED`) | B3.2 |
| `POST /help-requests/{id}/complete` | Body: `token`; wolontariusz kończy (`ACCEPTED→COMPLETED`) | B3.2 |
| `POST /help-requests/{id}/cancel` | Anulowanie | B3.1 |
| `POST /help-requests/{id}/ratings` | Ocena drugiej strony; aktualizuje reputację | B3.3 |
| `GET /analytics/heatmap?category&status&from&to&cellSizeMeters` | Heksagony + liczności pod mapę cieplną (GeoJSON) – ✅ zrobione | B3.4 |
| `GET /analytics/summary?category&from&to` | Zliczenia wg statusu, kategorii i priorytetu + wskaźnik realizacji – ✅ zrobione | B3.4 |

Zasady: współrzędne spoza zakresu → **400**; brak zgłoszenia → **404**; nieprawidłowe przejście stanu lub zlecenie już przejęte → **409**; zły/zużyty token → **400/409**; brak uprawnień do akcji → **403**.

### Odpowiedź publiczna zgłoszenia (lista/mapa)

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [19.9449, 50.0647] },
  "properties": {
    "id": 42, "category": "MEDICINE", "priority": 1,
    "tags": ["leki"], "status": "OPEN", "areaRadiusMeters": 300
  }
}
```

Brak numeru lokalu, nazwiska i dokładnych współrzędnych. Pełne dane wyłącznie w `GET /requests/{id}` dla zgłaszającego i przypisanego wolontariusza w stanie `ACCEPTED`+.

## 6. Logika kluczowa

### 6.1 Zapytania przestrzenne (Dev 1)
- ✅ **Promień:** `WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(:lng,:lat),4326)::geography, :meters) AND status = 'OPEN'`, sortowanie po priorytecie i czasie utworzenia.
- ✅ **Trasa:** endpoint buduje WKT `LINESTRING(lng lat, ...)`, a następnie wykonuje `ST_DWithin(location::geography, line::geography, :bufferMeters)`. Walidacja: min. 2 punkty, max 100 punktów, bufor 50–2000 m, zakres lat/lng.
- ✅ Maskowanie wykonywane **po** zapytaniu na dokładnych współrzędnych (filtrowanie po prawdziwej lokalizacji, publikacja zamaskowanej).

### 6.2 Maskowanie (Dev 1/2)
✅ `LocationObfuscationService` zwraca środek komórki siatki ~300 m (`approximateLocation`) i polygon komórki (`maskedArea`). Kolejne ulepszenie: niewielki, deterministyczny jitter zależny od `requestId` oraz test odległości zamaskowanego punktu od oryginału w zakresie 0–400 m.

### 6.3 Maszyna stanów (Dev 2)
`RequestStateService` z jawną tabelą dozwolonych przejść i sprawdzaniem aktora (kto może wykonać przejście). Zmiany pod `@Transactional` z blokadą optymistyczną (`@Version`) – dwa równoczesne `offer` → drugi dostaje **409**.
- ✅ Pola w encjach: `HelpRequest.volunteer`, `updatedAt`, `@Version`; `AppUser.ratingCount` (`trustScore` zostaje `int` 0–100, jak w seederze).
- ✅ Wyjątki domenowe (`exception/`) i mapowanie konfliktu wersji / naruszenia unikalności na **409**.
- ⏳ `RequestStateService` z tabelą przejść i endpointy `offer` / `accept` / `cancel`.

### 6.4 QR (Dev 2)
Token generowany przy `ACCEPTED`, ważny np. 24 h, jednorazowy. `complete` weryfikuje: stan `ACCEPTED`, wywołujący = przypisany wolontariusz, token zgodny, nieużyty, niewygasły. Po sukcesie `usedAt = now`, status `COMPLETED`.

### 6.5 Reputacja (Dev 2)
Po ocenie: `trustScore` = średnia ważona ocen (np. wygładzona średnia bayesowska, by pojedyncza ocena nie dawała skrajności); +bonus za `identityVerified`. Ocena możliwa tylko po `COMPLETED`, raz na stronę; gdy obie strony ocenią → `RATED`.

### 6.6 Priorytet i niepełnosprawność – ✅ zrobione
`finalPriority = max(1, aiPriority − 1)` gdy zgłaszający ma `hasSpecialNeeds` (priorytet 1 = najpilniejszy). Zapis zarówno wyniku AI, jak i końcowego priorytetu.
- ✅ `PriorityPolicy`; `HelpRequest.priority` (końcowy) + `aiPriority` (wynik AI), a także `tags`, `riskFlags`, `classificationSource`.

### 6.6a Widoczność szczegółów i flagi ryzyka (Dev 2) – ✅ zrobione
- ✅ `HelpRequestVisibilityPolicy`: autor zawsze `FULL`; przypisany wolontariusz `FULL` od `ACCEPTED` (`ACCEPTED`/`COMPLETED`/`RATED`); pozostali `PUBLIC` (zamaskowany obszar, bez adresu, dokładnego punktu, zgłaszającego i flag ryzyka). Pole `visibility` w odpowiedzi.
- ✅ `SCAM_SUSPECTED` → status `UNDER_REVIEW`: znika z `nearby`/`along-route` (filtrują po `OPEN`) oraz z całej analityki – heatmapy i `summary` (także przy jawnym `?status=UNDER_REVIEW`, klucz nie pojawia się w `byStatus`); `GET /{id}` zwraca 404 wszystkim poza autorem.
- ✅ `MEDICAL_EMERGENCY` → zgłoszenie zostaje `OPEN`, flaga w `riskFlags` (front pokazuje komunikat o 112).
- ✅ `PERSONAL_DATA` → we wszystkich widokach publicznych (szczegóły, `nearby`, `along-route`) `title` zastąpiony ogólnym tytułem z kategorii, `description = null` (`PublicTextPolicy`). Autor widzi oryginał.
- ✅ `CITY_ADMIN` nie tworzy zgłoszeń (403).
- ✅ `StatusConstraintInitializer` odtwarza przy starcie `CHECK` na `help_requests.status` z enuma (`ddl-auto=update` go nie aktualizuje) – nowe statusy działają bez resetu bazy.
- ⏳ Ręczny przegląd zgłoszeń `UNDER_REVIEW` (np. przez `CITY_ADMIN`) – poza zakresem MVP.

### 6.7 AI (Dev 3) – ✅ zrobione (poza podpięciem do tworzenia zgłoszenia)
- ✅ `LlmRequestClassifier` ładuje prompt systemowy z `prompts/classify-request.txt` (kategorie, priorytet 1–3, tagi, flagi ryzyka) i wywołuje Ollamę (`OllamaClient`, `/api/chat`) ze schematem JSON w polu `format`.
- ✅ Odpowiedź normalizowana do `RequestClassification {category, priority, tags[], riskFlags[], source}`; nieznana kategoria → wyjątek i fallback, priorytet przycinany do 1–3, maks. 5 tagów, nieznane flagi pomijane. `MEDICAL_EMERGENCY` zawsze wymusza priorytet 1.
- ✅ Flagi ryzyka: `SCAM_SUSPECTED`, `MEDICAL_EMERGENCY`, `PERSONAL_DATA`, `INAPPROPRIATE_CONTENT`.
- ✅ **Fallback:** `KeywordRequestClassifier` (polskie rdzenie słów) przy wyłączonym AI (`AI_ENABLED=false`), błędzie połączenia, timeoucie (15 s) lub błędnym JSON-ie. Pole `source` = `LLM` / `FALLBACK`.
- ✅ Konfiguracja `app.ai.*` (`OLLAMA_URL`, `OLLAMA_MODEL`, timeout, `keep-alive` 30 min), testy jednostkowe, żądania `http/classify.http`.
- ✅ Test na prawdziwym modelu (`qwen2.5:7b`, Ollama 0.35): wszystkie przypadki z `http/classify.http` klasyfikowane przez LLM, ~2–2,5 s na zapytanie.
- ✅ **Poprawki po teście na modelu:**
  - Klasyfikator używa `domain.HelpCategory` (`MEDICINE`, `GROCERIES`, …) zamiast osobnego `RequestCategory` (usunięty) – wynik można zapisać wprost w `HelpRequest`.
  - Prompt: kategoria wybierana według faktycznej potrzeby także przy flagach ryzyka (objawy/nagły wypadek → `MEDICINE`, prośba o pieniądze → potrzeba, której dotyczy, dokumenty → `HOME_SUPPORT`, `SOCIAL` tylko dla towarzystwa); doprecyzowane priorytety (brak jedzenia/zakupy na jutro → 2); tagi w mianowniku z przykładami; dane osobowe same w sobie nie są `INAPPROPRIATE_CONTENT`.
  - Walidacja tagów: tylko polskie litery, maks. 3 słowa i 30 znaków; tagi z cyframi odrzucane (ochrona przed wyciekiem PESEL/telefonu). Literówek złożonych z polskich liter (np. „pomoć”) nie da się tak wykryć.
  - Rozgrzewka modelu (`OllamaWarmUp`): po starcie aplikacji w tle wykonywana jest przykładowa klasyfikacja, co ładuje model i cache promptu – pierwsze zapytanie ~2,4 s zamiast ~8,5 s. Błąd rozgrzewki tylko logowany.
  - Fallback: `BASIC_NEEDS` rozdzielone na `MEDICINE` / `GROCERIES`, nagły wypadek → `MEDICINE`; rdzenie słów dopasowywane tylko na początku wyrazu (wcześniej „lek” pasowało do „mleka”); „pożycz” ma pierwszeństwo przed słowami o naprawach.
- ✅ Podpięcie klasyfikacji do `POST /api/help-requests` (Dev 2, `HelpRequestDetailsService`; klasyfikacja poza transakcją).
- ✅ Podejrzenie scamu → status `UNDER_REVIEW`, zgłoszenie nie pojawia się publicznie (Dev 2, zob. 6.6a).
- ⏳ Frontend (`types.ts`) oczekuje kategorii `BASIC_NEEDS` i pola `suspicious: boolean` – do zmiany po stronie frontu (`MEDICINE`/`GROCERIES`; `suspicious` = `riskFlags` zawiera `SCAM_SUSPECTED`) lub dodania pola w backendzie.

### 6.8 Analityka (Dev 3) – ✅ API zrobione
- ✅ **Heatmapa** `GET /api/analytics/heatmap` – grupowanie w heksagony `ST_HexagonGrid` (zamiast `ST_SnapToGrid`/`ST_ClusterDBSCAN`, zgodnie z „heksagonami” z `plan.md`). Heksagon liczony osobno dla każdego zgłoszenia (`LATERAL ... LIMIT 1`), więc koszt rośnie z liczbą zgłoszeń, a nie z obszarem (~70 ms dla 5000 zgłoszeń). Siatka w EPSG:3857, skalowana średnią szerokością geograficzną wszystkich zgłoszeń – heksagony mają rzeczywisty rozmiar w metrach i nie przesuwają się przy zmianie filtrów.
  - Odpowiedź: GeoJSON `FeatureCollection`; każdy `Feature` to środek heksagonu (`Point`) z `properties`: `count`, `weight` (priorytet 1 = 3 pkt, 2 = 2 pkt, 3 = 1 pkt), `byCategory` (wszystkie kategorie, 0 gdy brak), `area` (obrys heksagonu, `Polygon`). Pozwala na warstwę heatmap (punkty z wagą) albo hexbin (wielokąty).
  - Filtry: `category`, `status` (powtarzalny; domyślnie wszystkie oprócz `CANCELLED`), `from`/`to` (ISO-8601, po `created_at`), `cellSizeMeters` (bok heksagonu, 100–5000, domyślnie 500).
- ✅ **Podsumowanie** `GET /api/analytics/summary` – `total`, `open`, `inProgress` (`OFFERED`+`ACCEPTED`), `fulfilled` (`COMPLETED`+`RATED`), `cancelled`, `fulfillmentRate` (`fulfilled / (total − cancelled)`), `byStatus`, `byCategory`, `byPriority`; filtry `category`, `from`, `to`.
- ✅ Prywatność: tylko zagregowane liczności, brak danych osobowych i dokładnych współrzędnych → endpointy publiczne (bez `X-User-Id`).
- ✅ Błędy: zły rozmiar komórki, nieznana kategoria/status, zły format daty, `from` ≥ `to` → **400** (`ProblemDetail`).
- ✅ `AnalyticsRepository` na `NamedParameterJdbcTemplate` (dynamiczne filtry, SQL PostGIS), testy: jednostkowe (agregacja, walidacja), `@WebMvcTest` (bindowanie parametrów), integracyjne na PostGIS z dockera (rollback), żądania `http/analytics.http`.
- ⏳ Liczba zrealizowanych pomocy **per dzielnica** – brak danych o dzielnicach w modelu; heatmapa pokrywa wymiar przestrzenny. Do dodania, jeśli będą granice dzielnic (np. GeoJSON + `ST_Contains`).
- ⏳ Seeder ma tylko 3 zgłoszenia (Warszawa) – heatmapa na demo potrzebuje więcej danych w klastrach (B1.3, Dev 1).
- ⏳ Ewentualny próg anonimowości (ukrywanie heksagonów z 1 zgłoszeniem) – do decyzji; obecnie heksagon 500 m jest grubszy niż maskowanie publiczne (300 m).
- ⏳ Dashboard na froncie (F3.4).

## 7. Seeder (B1.3)

`DataSeeder` (profil `dev`, `CommandLineRunner`), wybrane miasto/dzielnica (np. Kraków – Krowodrza/Stare Miasto). Generuje:
- ~10 użytkowników (zgłaszający, wolontariusze, część zweryfikowana, jeden z `hasSpecialNeeds`),
- ~60–100 zgłoszeń w różnych kategoriach i priorytetach w realistycznych lokalizacjach (klastry pod heatmapę),
- kilka zadań w stanach `ACCEPTED`/`COMPLETED` oraz oceny,
- zgłoszenie z scenariusza demo („Skończyły mi się leki na serce…”) w miejscu leżącym na trasie demonstracyjnej.

Idempotentny (uruchamia się tylko przy pustej tabeli).

## 8. Harmonogram i podział

### Etap 1 (0–6 h)
- **Dev 1:** ✅ dodać `hibernate-spatial`; ✅ encje `AppUser`, `HelpRequest`, `Rating`; ✅ geometrie SRID 4326; ✅ DTO/serializer GeoJSON (**B1.2, B1.4**).
- **Dev 2:** ✅ mock autentykacji (`X-User-Id` → `@CurrentUser AppUser`, brak/nieznany użytkownik → 401), ✅ `GET /users/me`, ✅ `@RestControllerAdvice` z `ProblemDetail`, ✅ pola encji pod maszynę stanów; ⏳ `RequestStateService` (przeniesione do etapu 3).
- **Dev 3:** ✅ prototyp promptu, ✅ `OllamaClient`, ✅ konfiguracja Ollamy lokalnie + test ręczny na prawdziwym modelu.
- **Dev 1 (po encjach):** ✅ podstawowy seeder (**B1.3**); ⏳ rozbudowa seedera pod demo.

### Etap 2 (6–18 h)
- **Dev 1:** ✅ `nearby` i ✅ `along-route` (**B2.1, B2.2**), ✅ maskowanie i odpowiedzi publiczne (**B2.4** częściowo); ⏳ testy integracyjne/Testcontainers.
- **Dev 2:** ✅ `POST /api/help-requests` z klasyfikacją AI i priorytetem, ✅ `GET /api/help-requests/{id}` z widocznością zależną od stanu i roli (**B2.4**), ✅ test „brak wycieku” dla szczegółów, ✅ `http/help-requests-crud.http`.
- **Dev 3:** ✅ `RequestClassifier`, ✅ `POST /requests/classify`, ✅ fallback regułowy; ✅ podpięcie do tworzenia zgłoszenia (**B2.3**, zrobione przez Dev 2).

### Etap 3 (18–30 h)
- **Dev 2:** przejścia stanów, QR, `complete`, oceny i reputacja (**B3.1–B3.3**), mock weryfikacji.
- **Dev 3:** ✅ endpointy analityczne i heatmapa (**B3.4**, API); ⏳ dane demo pod heatmapę, widok na froncie.
- **Dev 1:** wydajność (indeksy GiST, `EXPLAIN`), uzupełnienie seedera o stany/oceny, wsparcie integracji.

### Etap 4 (30–36 h)
- Przejście pełnego scenariusza demo na API (kolekcja `.http` obejmująca cały flow), poprawki błędów, reset danych demo (endpoint/profil `dev`), przygotowanie awaryjnego trybu bez LLM.

## 9. Definicja ukończenia (backend)

- [ ] Cały scenariusz demo przechodzi przez API bez ręcznych zmian w bazie.
- [x] Listy publiczne **nigdy** nie zawierają dokładnych współrzędnych, numeru lokalu ani nazwiska (test automatyczny). – `HelpRequestControllerTest`: szczegóły `PUBLIC` i lista `nearby` (surowy JSON przeszukiwany pod kątem adresu, nazwiska, telefonu i dokładnych współrzędnych); `along-route` używa tego samego mapowania co `nearby`.
- [ ] Wszystkie geometrie w SRID 4326; zapytania odległościowe w metrach (`geography`).
- [x] Błędy zwracają `ProblemDetail` z kodami 400/403/404/409.
- [x] Klasyfikacja AI zwraca poprawny JSON lub włącza fallback w < 10 s.
- [ ] Testy: zapytania geo (Testcontainers), maszyna stanów, token QR (użycie wtórne, wygaśnięcie), maskowanie.
- [ ] Kolekcja żądań `.http` w `backend/hackyeah-2026-backend/http/` dla każdego endpointu. – są: `health`, `users`, `classify`, `help-requests` (nearby, along-route), `help-requests-crud` (create, details), `analytics`; brakuje endpointów etapu 3.

## 10. Ryzyka

| Ryzyko | Mitygacja |
|---|---|
| Ollama niedostępna / wolna na maszynie demo | Fallback regułowy; model mały (np. 3–8B); wcześniejsze „rozgrzanie” modelu. |
| Niezgodność bibliotek JTS/Jackson z Jackson 3 | Własne DTO GeoJSON, brak zależności od zewnętrznych modułów serializacji. |
| Wyścig przy przejmowaniu zlecenia | `@Version` + 409; test współbieżności. |
| Odtworzenie adresu z maskowanych punktów | Deterministyczne maskowanie, brak adresu poza `ACCEPTED+`, brak wysokiej precyzji w żadnym publicznym polu. |
| Zgłoszenie oznaczone przez AI jako scam utyka w `UNDER_REVIEW` (brak ręcznego przeglądu w MVP) – np. fałszywy alarm w scenariuszu demo | Sprawdzić treść zgłoszeń demo na `POST /requests/classify` przed pokazem; w razie potrzeby endpoint przeglądu dla `CITY_ADMIN` (`UNDER_REVIEW → OPEN/CANCELLED`). |
| Test `AnalyticsRepositoryTest` działa na lokalnej bazie deweloperskiej; skala heksagonów zależy od średniej szerokości **wszystkich** zgłoszeń, więc dodatkowe lokalne dane mogą zmienić wynik `largerCellsMergeDistantRequests` | Uruchamiać na bazie z samym seedem albo przenieść test na Testcontainers / liczyć skalę tylko z przefiltrowanych wierszy (Dev 3). |
| Zakres większy niż czas | Priorytet: B2.1 → B2.4 → B3.1/B3.2 → B2.3 → B3.3 → B3.4; ocena i heatmapa mogą być uproszczone. |
