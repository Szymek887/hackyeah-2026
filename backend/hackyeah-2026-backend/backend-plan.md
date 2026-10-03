# Plan Implementacji Backendu: PoDrodze

> Uzupełnienie `plan.md` (zadania B1.x–B3.x). Dokument opisuje **jak** zbudować backend: stos, architekturę, model danych, API i kolejność prac dla trzech osób backendowych.

## 1. Stan obecny

- Spring Boot 4.1.1 (Java, Maven), pakiet bazowy `com.telecrazy.hackyeah2026backend`.
- Zależności: `data-jpa`, `validation`, `webmvc`, `devtools`, `postgresql`, `lombok`.
- `docker-compose.yml` z PostgreSQL 17 + PostGIS 3.5 (obraz `imresamu/postgis`, multi-arch dla Apple Silicon) – **B1.1 zrobione**.
- Połączenie z bazą w `application.properties`, `ddl-auto=update`.
- `GET /api/health` + żądania IntelliJ w `backend/hackyeah-2026-backend/http/`.

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

**User** – `id`, `displayName`, `role` (`REQUESTER` | `VOLUNTEER`), `identityVerified` (bool), `hasSpecialNeeds` (bool), `trustScore` (double), `ratingCount`, `createdAt`.

**HelpRequest** – `id`, `requester` (FK), `volunteer` (FK, nullable), `title`, `description`, `category` (`BASIC_NEEDS`, `EQUIPMENT_LOAN`, `HOME_SUPPORT`, `SOCIAL`), `priority` (1–3), `tags` (lista), `riskFlags` (lista), `status`, `location` (`Point`, 4326, dokładny), `addressDetails` (ulica, nr lokalu – tylko dla `ACCEPTED+`), `specialNeeds` (bool), `createdAt`, `updatedAt`. Indeks GiST na `location`.

**Handshake / QR** – `id`, `request` (FK), `token`, `expiresAt`, `usedAt`.

**Rating** – `id`, `request` (FK), `author`, `target`, `stars` (1–5), `comment`, `createdAt`. Unikalność `(request, author)`.

Kolejność: `OPEN → OFFERED → ACCEPTED → COMPLETED → RATED`, z `CANCELLED` dostępnym z `OPEN/OFFERED/ACCEPTED`. (W `plan.md` `RATED` występuje w 1.1, a `CANCELLED` w B3.1 – obsługujemy oba.)

## 5. API (v1)

Wszystkie ścieżki pod `/api`. Autoryzacja mockiem `X-User-Id`.

| Metoda i ścieżka | Opis | Zadanie |
|---|---|---|
| `GET /users/me` | Profil, reputacja, flagi | B1 |
| `POST /users/me/verify` | Mock mObywatel – ustawia `identityVerified` | B3 |
| `POST /requests` | Utworzenie zgłoszenia; wywołuje klasyfikację AI | B2 |
| `POST /requests/classify` | Podgląd klasyfikacji AI bez zapisu (F2.2) | B2.3 |
| `GET /requests/nearby?lat&lng&radiusKm` | Zgłoszenia w promieniu, **zamaskowane**, GeoJSON | B2.1 |
| `POST /requests/along-route` | Body: `points[]` (polilinia), `bufferMeters`; zwraca zgłoszenia w korytarzu | B2.2 |
| `GET /requests/{id}` | Szczegóły publiczne (zamaskowane); pełne dane dla zaangażowanych stron po `ACCEPTED` | B2.4 |
| `POST /requests/{id}/offer` | Wolontariusz deklaruje pomoc (`OPEN→OFFERED`) | B3.1 |
| `POST /requests/{id}/accept` | Zgłaszający akceptuje (`OFFERED→ACCEPTED`), generowany token QR | B3.1/B3.2 |
| `GET /requests/{id}/qr` | Token QR dla zgłaszającego (tylko `ACCEPTED`) | B3.2 |
| `POST /requests/{id}/complete` | Body: `token`; wolontariusz kończy (`ACCEPTED→COMPLETED`) | B3.2 |
| `POST /requests/{id}/cancel` | Anulowanie | B3.1 |
| `POST /requests/{id}/ratings` | Ocena drugiej strony; aktualizuje reputację | B3.3 |
| `GET /analytics/heatmap?category&from&to` | Klastry + liczności pod mapę cieplną | B3.4 |
| `GET /analytics/summary` | Zliczenia wg kategorii i statusu (zrealizowane pomoce) | B3.4 |

Zasady: współrzędne spoza zakresu → **400**; brak zgłoszenia → **404**; nieprawidłowe przejście stanu lub zlecenie już przejęte → **409**; zły/zużyty token → **400/409**; brak uprawnień do akcji → **403**.

### Odpowiedź publiczna zgłoszenia (lista/mapa)

```json
{
  "type": "Feature",
  "geometry": { "type": "Point", "coordinates": [19.9449, 50.0647] },
  "properties": {
    "id": 42, "category": "BASIC_NEEDS", "priority": 1,
    "tags": ["leki"], "status": "OPEN", "areaRadiusMeters": 300
  }
}
```

Brak numeru lokalu, nazwiska i dokładnych współrzędnych. Pełne dane wyłącznie w `GET /requests/{id}` dla zgłaszającego i przypisanego wolontariusza w stanie `ACCEPTED`+.

## 6. Logika kluczowa

### 6.1 Zapytania przestrzenne (Dev 1)
- **Promień:** `WHERE ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(:lng,:lat),4326)::geography, :meters) AND status = 'OPEN'`, sortowanie po priorytecie i odległości.
- **Trasa:** z polilinii zbudować `LineString` (4326), a następnie `ST_DWithin(location::geography, line::geography, :bufferMeters)`. Walidacja: min. 2 punkty, limit liczby punktów i szerokości bufora.
- Maskowanie wykonywane **po** zapytaniu na dokładnych współrzędnych (filtrowanie po prawdziwej lokalizacji, publikacja zamaskowanej).

### 6.2 Maskowanie (Dev 1/2)
`LocationMasker.mask(Point exact, long requestId)` → środek komórki siatki ~300 m z niewielkim, deterministycznym przesunięciem zależnym od `requestId`. Ten sam wynik przy każdym wywołaniu (brak „triangulacji” przez wielokrotne zapytania). Testy: odległość zamaskowanego punktu od oryginału w zakresie 0–400 m.

### 6.3 Maszyna stanów (Dev 2)
`RequestStateService` z jawną tabelą dozwolonych przejść i sprawdzaniem aktora (kto może wykonać przejście). Zmiany pod `@Transactional` z blokadą optymistyczną (`@Version`) – dwa równoczesne `offer` → drugi dostaje **409**.

### 6.4 QR (Dev 2)
Token generowany przy `ACCEPTED`, ważny np. 24 h, jednorazowy. `complete` weryfikuje: stan `ACCEPTED`, wywołujący = przypisany wolontariusz, token zgodny, nieużyty, niewygasły. Po sukcesie `usedAt = now`, status `COMPLETED`.

### 6.5 Reputacja (Dev 2)
Po ocenie: `trustScore` = średnia ważona ocen (np. wygładzona średnia bayesowska, by pojedyncza ocena nie dawała skrajności); +bonus za `identityVerified`. Ocena możliwa tylko po `COMPLETED`, raz na stronę; gdy obie strony ocenią → `RATED`.

### 6.6 Priorytet i niepełnosprawność
`finalPriority = max(1, aiPriority − 1)` gdy zgłaszający ma `hasSpecialNeeds` (priorytet 1 = najpilniejszy). Zapis zarówno wyniku AI, jak i końcowego priorytetu.

### 6.7 AI (Dev 3)
- `RequestClassifier` buduje prompt systemowy (kategorie, skala pilności 1–3, flagi ryzyka, wykrywanie oszustw) i wywołuje Ollamę z `format: json`.
- Odpowiedź parsowana do rekordu `{category, urgency, tags[], riskFlags[], scamSuspected}`; wartości spoza dozwolonych zbiorów odrzucane/korygowane.
- **Fallback:** timeout (np. 8 s) lub błąd parsowania → klasyfikacja regułowa po słowach kluczowych („leki”, „serce”, „zakupy”…), aby demo nie zależało od LLM.
- Podejrzenie scamu → flaga `riskFlags` i zgłoszenie nie pojawia się publicznie do ręcznego przeglądu (lub oznaczone).

### 6.8 Analityka (Dev 3)
Heatmapa: grupowanie po siatce (`ST_SnapToGrid` lub `ST_ClusterDBSCAN`) i kategorii, zwrot środków komórek + liczności (dane już zagregowane, bez danych osobowych). Podsumowanie: liczba zgłoszeń wg kategorii/statusu i liczba zrealizowanych pomocy per dzielnica.

## 7. Seeder (B1.3)

`DataSeeder` (profil `dev`, `CommandLineRunner`), wybrane miasto/dzielnica (np. Kraków – Krowodrza/Stare Miasto). Generuje:
- ~10 użytkowników (zgłaszający, wolontariusze, część zweryfikowana, jeden z `hasSpecialNeeds`),
- ~60–100 zgłoszeń w różnych kategoriach i priorytetach w realistycznych lokalizacjach (klastry pod heatmapę),
- kilka zadań w stanach `ACCEPTED`/`COMPLETED` oraz oceny,
- zgłoszenie z scenariusza demo („Skończyły mi się leki na serce…”) w miejscu leżącym na trasie demonstracyjnej.

Idempotentny (uruchamia się tylko przy pustej tabeli).

## 8. Harmonogram i podział

### Etap 1 (0–6 h)
- **Dev 1:** dodać `hibernate-spatial`; encje `User`, `HelpRequest`, `Rating`; `GeometryFactory` SRID 4326; init `postgis`; DTO GeoJSON (**B1.2, B1.4**).
- **Dev 2:** mock autentykacji (`X-User-Id`), `GET /users/me`, `@RestControllerAdvice` z `ProblemDetail`; szkielet enumów i maszyny stanów.
- **Dev 3:** konfiguracja Ollamy lokalnie, prototyp promptu, `OllamaClient` + test ręczny.
- **Dev 1 (po encjach):** seeder (**B1.3**).

### Etap 2 (6–18 h)
- **Dev 1:** `nearby` i `along-route` + testy Testcontainers (**B2.1, B2.2**), `LocationMasker` i odpowiedzi publiczne (**B2.4** wspólnie z Dev 2).
- **Dev 2:** `POST /requests`, `GET /requests/{id}` z widocznością zależną od stanu i roli (**B2.4**).
- **Dev 3:** `RequestClassifier`, `POST /requests/classify`, fallback regułowy, podpięcie do tworzenia zgłoszenia (**B2.3**).

### Etap 3 (18–30 h)
- **Dev 2:** przejścia stanów, QR, `complete`, oceny i reputacja (**B3.1–B3.3**), mock weryfikacji.
- **Dev 3:** endpointy analityczne i heatmapa (**B3.4**).
- **Dev 1:** wydajność (indeksy GiST, `EXPLAIN`), uzupełnienie seedera o stany/oceny, wsparcie integracji.

### Etap 4 (30–36 h)
- Przejście pełnego scenariusza demo na API (kolekcja `.http` obejmująca cały flow), poprawki błędów, reset danych demo (endpoint/profil `dev`), przygotowanie awaryjnego trybu bez LLM.

## 9. Definicja ukończenia (backend)

- [ ] Cały scenariusz demo przechodzi przez API bez ręcznych zmian w bazie.
- [ ] Listy publiczne **nigdy** nie zawierają dokładnych współrzędnych, numeru lokalu ani nazwiska (test automatyczny).
- [ ] Wszystkie geometrie w SRID 4326; zapytania odległościowe w metrach (`geography`).
- [ ] Błędy zwracają `ProblemDetail` z kodami 400/403/404/409.
- [ ] Klasyfikacja AI zwraca poprawny JSON lub włącza fallback w < 10 s.
- [ ] Testy: zapytania geo (Testcontainers), maszyna stanów, token QR (użycie wtórne, wygaśnięcie), maskowanie.
- [ ] Kolekcja żądań `.http` w `backend/hackyeah-2026-backend/http/` dla każdego endpointu.

## 10. Ryzyka

| Ryzyko | Mitygacja |
|---|---|
| Ollama niedostępna / wolna na maszynie demo | Fallback regułowy; model mały (np. 3–8B); wcześniejsze „rozgrzanie” modelu. |
| Niezgodność bibliotek JTS/Jackson z Jackson 3 | Własne DTO GeoJSON, brak zależności od zewnętrznych modułów serializacji. |
| Wyścig przy przejmowaniu zlecenia | `@Version` + 409; test współbieżności. |
| Odtworzenie adresu z maskowanych punktów | Deterministyczne maskowanie, brak adresu poza `ACCEPTED+`, brak wysokiej precyzji w żadnym publicznym polu. |
| Zakres większy niż czas | Priorytet: B2.1 → B2.4 → B3.1/B3.2 → B2.3 → B3.3 → B3.4; ocena i heatmapa mogą być uproszczone. |
