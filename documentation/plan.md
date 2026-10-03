# Specyfikacja Projektowa & Plan Działań MVP: PoDrodze (Smart City)

> **Dokument operacyjny dla zespołu developerskiego i agentów AI.**  
> Niniejszy dokument stanowi specyfikację funkcjonalną MVP oraz dekompozycję zadań roboczych zoptymalizowaną pod 6-osobowy zespół pracujący w warunkach hackathonowych.

---

## 1. Cel i Zakres Funkcjonalny MVP

Platforma łączy ideę hiperlokalnej pomocy sąsiedzkiej z koncepcją mobilności miejskiej (*Smart City / Commute Matching*). Główny wyróżnik to łączenie potrzebujących z osobami przemieszczającymi się stałymi trasami (uczelnia, praca) bez generowania dodatkowego śladu węglowego, z zachowaniem rygorystycznych zasad prywatności i weryfikacji tożsamości.

### 1.1 Moduły Systemu

1. **Obsługa Zgłoszeń Pomocy (Help Requests):**
   * **Kategorie:** Podstawowe potrzeby (leki/zakupy), pożyczenie sprzętu (drabina/narzędzia), wsparcie domowe (drobne naprawy/awarie), integracja/towarzyskie.
   * **Priorytetyzacja AI:** Klasyfikacja zgłoszenia przez lokalny model LLM (strukturyzowany JSON: kategoria, stopień pilności 1–3, flagi ryzyka, tagi).
   * **Konto użytkownika:** Profil ze statusem weryfikacji (mock mObywatel/Profil Zaufany), deklaracja szczególnych potrzeb / niepełnosprawności podbijająca wagę zgłoszenia, system reputacji (gwiazdki / punkty zaufania).

2. **Silnik Przestrzenny i Prywatność (Geospatial & Privacy):**
   * **Zgłoszenia w promieniu X km:** Filtrowanie wokół aktualnej pozycji użytkownika.
   * **Commute Matching:** Wyszukiwanie zgłoszeń w korytarzu buforowym wzdłuż zadanej polilinii (trasa dom <-> praca/uczelnia).
   * **Maskowanie lokalizacji (Location Obfuscation):** Zgłoszenia publiczne prezentowane wyłącznie jako heksagony/obszary przybliżone (~200–400m). Precyzyjny adres ujawniany wyłącznie wolontariuszowi po obustronnym zatwierdzeniu.

3. **Proces Zlecenia i Bezpieczeństwo (Handshake & QR):**
   * Przepływ statusów: `OPEN` -> `OFFERED` -> `ACCEPTED` (ujawnienie adresu) -> `COMPLETED` (skan kodu QR u odbiorcy) -> `RATED`.
   * Dynamiczny kod QR generowany przez potrzebującego, skanowany z poziomu aplikacji wolontariusza.

4. **Panel Miejsko-Analityczny (City Dashboard):**
   * Widok webowy/desktopowy z mapą cieplną (*Heatmap*) zgłaszanych deficytów (np. skupiska próśb o leki, braki infrastrukturalne, awarie) z perspektywą planowania miejskiego.

---

## 2. Podział Zespołu (6 Osób)

* **Backend Dev 1 (Lead Backend & Data):** Schemat bazy, PostGIS, operacje przestrzenne (promień, bufor trasy), mock danych.
* **Backend Dev 2 (Business Logic & Handshake):** Logika stanów zgłoszeń, generowanie/walidacja kodów QR, mock weryfikacji mObywatel, system ocen/punktów.
* **Backend Dev 3 (AI & Integracje & City Analytics):** Integracja LLM (Ollama/JSON mode), prompt engineering priorytetów, endpointy pod analitykę i heatmapę miejską.
* **Frontend Dev 1 (Lead Mobile - UI & Routing):** Architektura React Native/Expo, nawigacja, formularz tworzenia zgłoszenia, profil użytkownika z gwiazdkami.
* **Frontend Dev 2 (Mobile - Map & Commute Flow):** Obsługa mapy (`react-native-maps`), wizualizacja obszarów rozmytych (heksagony/okręgi), rysowanie i buforowanie tras.
* **Frontend Dev 3 (Mobile - Scanner & City Dashboard):** Obsługa kamery i skanera QR (`expo-camera`), widok handoffu zleceń oraz lekki panel webowy dla miasta (Heatmap Dashboard).

---

## 3. Plan Działań i Etapy Realizacji

### Etap 1: Środowisko, Baza Danych i Podstawowy Szkielet (0h – 6h)

#### Backend
- [ ] **B1.1:** Uruchomienie bazy danych PostgreSQL z rozszerzeniem PostGIS w Docker Compose.
- [ ] **B1.2:** Implementacja encji domenowych: `User` (role, wskaźnik zaufania, flaga weryfikacji tożsamości), `HelpRequest` (tytuł, opis, kategoria, priorytet, punkt geograficzny, status), `Rating`.
- [ ] **B1.3:** Przygotowanie skryptu zasilającego bazę realistycznymi danymi testowymi (*seeder*) dla wybranego miasta/dzielnicy.
- [ ] **B1.4:** Konfiguracja serializacji struktur geometrycznych do formatu GeoJSON.

#### Frontend
- [ ] **F1.1:** Inicjalizacja projektu mobilnego w Expo (React Native, TypeScript, konfiguracja stylów/komponentów).
- [ ] **F1.2:** Przygotowanie szkieletu nawigacji (ekran główny/mapa, lista zgłoszeń, dodawanie zgłoszenia, profil, aktywne zadanie).
- [ ] **F1.3:** Konfiguracja klienta HTTP, unifikacja obsługi endpointów REST i modeli typów TypeScript.
- [ ] **F1.4:** Mock autentykacji: przełącznik profilu („Zgłaszający potrzebę” vs „Pomagający wolontariusz”).

---

### Etap 2: Mechanika Przestrzenna, AI i Obsługa Zgłoszeń (6h – 18h)

#### Backend
- [ ] **B2.1:** Endpoint pobierania zgłoszeń w promieniu X km od zadanego punktu lat/lng (`ST_DWithin`).
- [ ] **B2.2:** Endpoint wyszukiwania zgłoszeń wzdłuż trasy (przyjmujący polilinię/sekwencję punktów trasy i szerokość korytarza buforowego).
- [ ] **B2.3:** Integracja z lokalnym silnikiem LLM:
  - Przygotowanie system promptu do ekstrakcji encji.
  - Wyjście w wymuszonym formacie JSON: kategoria, wyliczona pilność (1–3), tagi, weryfikacja podejrzanych treści (scam detection).
- [ ] **B2.4:** Logika maskowania danych: endpoint publiczny zwraca tylko przybliżony centroid/obszar; precyzyjne współrzędne i numer lokalu zwracane wyłącznie po przejściu do stanu `ACCEPTED`.

#### Frontend
- [ ] **F2.1:** Integracja komponentu mapy: wyświetlanie przybliżonych punktów pomocy z rozróżnieniem kategorii i wag priorytetów (kolorystyka pinezek).
- [ ] **F2.2:** Formularz dodawania prośby o pomoc:
  - Tytuł, opis, wybór kategorii, zaznaczenie opcji wsparcia dla osób z niepełnosprawnością.
  - Podgląd na żywo zaklasyfikowanego przez AI priorytetu i tagów.
- [ ] **F2.3:** Moduł planowania trasy: definiowanie punktu startowego i końcowego (np. dom -> praca) oraz filtracja listy zgłoszeń leżących w korytarzu drogi.
- [ ] **F2.4:** Karty zgłoszeń: widok szczegółów z przyciskiem deklaracji chęci pomocy („Chcę pomóc”).

---

### Etap 3: Bezpieczeństwo, Skaner QR i Zamknięcie Zlecenia (18h – 30h)

#### Backend
- [ ] **B3.1:** Maszyna stanów zgłoszenia: `OPEN` -> `OFFERED` -> `ACCEPTED` -> `COMPLETED` -> `CANCELLED`.
- [ ] **B3.2:** Moduł kryptograficzny / tokenowy do kodu QR:
  - Generowanie jednorazowego tokenu weryfikacyjnego dla potrzebującego po przejściu w stan `ACCEPTED`.
  - Endpoint weryfikujący zeskanowany token przez wolontariusza i zamykający zlecenie.
- [ ] **B3.3:** Obsługa ocen i punktów zaufania: naliczanie gwiazdek i aktualizacja wskaźnika reputacji profilu.
- [ ] **B3.4:** Endpoint agregujący dane dla miasta: zliczanie zgłoszeń pogrupowanych według kategorii i klastrów przestrzennych pod mapę cieplną.

#### Frontend
- [ ] **F3.1:** Ekran generowania kodu QR u zgłaszającego potrzebę (widoczny w fazie finalizacji odbioru).
- [ ] **F3.2:** Integracja aparatu z modułem skanowania kodów QR u wolontariusza.
- [ ] **F3.3:** Ekran podsumowania i oceny: przyznawanie gwiazdek, krótki komentarz, naliczenie miejskich punktów zaangażowania.
- [ ] **F3.4:** Budowa widoku Dashboardu Miejskiego (widok mapy cieplnej pokazujący zagęszczenie potrzeb w poszczególnych kwartałach miasta).

---

### Etap 4: Stabilizacja, Polish & Przygotowanie Demo (30h – 36h)

#### Wspólne zadania zespołu
- [ ] **Integracja End-to-End:** Przetestowanie pełnego scenariusza demo na żywym telefonie:
  1. Senior/osoba potrzebująca dodaje zgłoszenie: *„Skończyły mi się leki na serce, nie mam jak wyjść”*.
  2. Model AI w tle oznacza status jako `CRITICAL` (Priorytet 1) i dodaje tagi.
  3. Na mapie pojawia się rozmyty heksagon/strefa zgłoszenia.
  4. Wolontariusz wpisuje trasę powrotu z uczelni i widzi to zgłoszenie dokładnie na swojej ścieżce.
  5. Wolontariusz akceptuje pomoc -> następuje odblokowanie dokładnego adresu.
  6. Wolontariusz dociera na miejsce -> skanuje kod QR z telefonu potrzebującego.
  7. Zgłoszenie zostaje zamknięte, obie strony przyznają sobie gwiazdki.
  8. Na dashboardzie miejskim odnotowany zostaje zrealizowany wskaźnik pomocy w danej dzielnicy.
- [ ] **Przygotowanie planu awaryjnego (Fail-safe):** Nagranie 60-sekundowego screencastu z działającej aplikacji mobilnej jako backup na wypadek problemów z siecią podczas pitchu.

---

## 4. Wytyczne dla Agentów AI Implementujących Kod

* **Spójność Geograficzna:** Wszystkie zapytania przestrzenne i obiekty JTS muszą operować na układzie współrzędnych **WGS84 (SRID 4326)**.
* **Obsługa Błędów:** API musi zwracać ustandaryzowane komunikaty błędów z kodami HTTP (400 dla niepoprawnych koordynatów, 404 dla braku zgłoszenia, 409 przy próbie przejęcia zlecenia w toku).
* **Format Wyjścia AI:** Model LLM kategoryzujący prośby musi odpowiadać wyłącznie poprawnym ciągiem JSON bez dodatkowych komentarzy markdown w sekcji data.
* **Separacja Prywatności:** Nigdy nie przesyłać numeru lokalu ani nazwiska osoby zgłaszającej w payloadzie listującym zgłoszenia na mapie ogólnej. Dane te mogą trafić wyłącznie do odpowiedzi autoryzowanego endpointu pojedynczego aktywnego zadania.
