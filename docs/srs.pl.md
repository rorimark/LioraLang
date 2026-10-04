# Powtórki rozłożone w czasie

[English](srs.md) | [Русский](srs.ru.md) | **Polski**

SRS określa, którą fiszkę pokazać i kiedy do niej wrócić. Web i desktop mają wspólną logikę FSRS-5; repozytoria czytają dane i zapisują wynik transakcyjnie.

Fiszka oznacza tu jeden wpis talii. Ma jeden harmonogram niezależnie od przedmiotu, kierunku tłumaczenia i prezentacji obrazkowej.

## Obliczanie odstępu

`fsrs.js` przechowuje stabilność i trudność pamięci. Stabilność to liczba dni do spadku prawdopodobieństwa przypomnienia do 90%. Trudność od 1 do 10 opisuje pamięć użytkownika, nie trudność materiału ustawioną na fiszce.

Ocena aktualizuje pamięć z uwzględnieniem czasu. Powtórka wcześniejsza, terminowa i spóźniona może dać inny odstęp. Nie ma jednego stałego mnożnika.

`desiredRetention` określa cel przypomnienia: domyślnie 0.9, od 0.70 do 0.97. Wyższy cel zwykle oznacza częstsze powtórki.

Domyślne odstępy nowej fiszki:

| Ocena | Następna powtórka |
| --- | --- |
| Again | 10 minut, krok nauki |
| Hard | 1 dzień |
| Good | 3 dni |
| Easy | 16 dni |

Przybliżona sekwencja terminowych Good to 3, 11, 35, 101, 269 dni. Ustawienia, czas odpowiedzi i rozrzut dat wpływają na wynik.

## Ustawienia i dodatkowe zasady

- `maximumIntervalDays` ogranicza odstęp, domyślnie do 365 dni. Opcja bez ograniczenia używa technicznego pułapu 36 500 dni.
- `learningSteps` określa kroki w minutach. Terminowych kroków nauki i ponownej nauki nie blokują limity dzienne.
- Again na powtarzanej karcie dodaje zapomnienie i uruchamia relearning. Domyślny krok to 10 minut; wcześniejsza powtórka zapomnianych skraca go do minuty.
- Dla jednego stanu Hard jest nie później niż Good, a Good nie później niż Easy. Na pułapie wartości mogą być równe.
- Rozrzut dat rozkłada karty na dni. Jest deterministyczny według wpisu i liczby odpowiedzi, więc podgląd przycisku zgadza się z zapisem.
- Stare `easyBonus` i `lapsePenalty` są odczytywane dla zgodności, ale nie sterują harmonogramem.

Zmiana ustawień nie przelicza wszystkich istniejących terminów. Stosują się przy następnej ocenie. Ustawienia zalecane zmieniają preferencje, nie przypisane daty.

## Kolejka

Najpierw są terminowe learning/relearning, potem najstarsze terminowe review, na końcu nowe karty. Losowanie dotyczy nowych kart, nie odstępów.

`newCardsPerDay` i `maxReviewsPerDay` liczą unikalne wpisy wybranej talii w lokalnym dniu kalendarzowym. Zero jest poprawnym limitem. Cel dzienny to wskazówka; wszystkie odpowiedzi liczone są osobno w `answersToday`.

Dodatkowa sesja pomija limity bez pobierania przyszłych kart. Kończy się przy braku dostępnych. Swobodne przeglądanie nie zmienia terminów.

Pusta kolejka odróżnia brak kart, limit, oczekiwanie na krok i brak terminowych powtórek. Migawka ma najbliższy termin. UI odświeża się po timerze, zmianie dnia, fokusu, synchronizacji i konta.

Zapisana kolejka sessionStorage nie jest źródłem prawdy. Powrót do nauki ponownie sprawdza dane. Odświeżanie w tle nie powinno stale ukrywać fiszki za informacją budowania kolejki.

## Zapis oceny

1. UI blokuje powtórne naciśnięcie przed następnym renderem.
2. Repozytorium weryfikuje profil i revision harmonogramu.
3. Jedna transakcja zapisuje stan i dziennik powtórki.
4. UI przechodzi dalej po udanym zapisie.

Stara ocena nie nadpisuje nowszego stanu. Błąd zapisu pozostawia fiszkę. Wynik z poprzedniej talii lub zamkniętej strony nie zastępuje nowej sesji.

## Starsze dane i synchronizacja

Daty SM-2 pozostają bez zmian. Brak pamięci FSRS jest uzupełniany z dawnego odstępu i ease przy następnej ocenie przez `memoryFromSm2`. `intervalDays` i `easeFactor` pozostają dla zgodności i statystyk.

SQLite i IndexedDB zapisują stabilność, trudność i czas odpowiedzi. Synchronizacja wysyła stan w `payload.nextCard`. Stare zdarzenie bez pamięci jest przyjmowane, a pamięć wyliczana przy kolejnej ocenie. Serwer nie oblicza odstępów.

## Kod i kontrole

| Ścieżka | Cel |
| --- | --- |
| `packages/shared/src/core/usecases/srs/fsrs.js` | Model pamięci FSRS-5 |
| `packages/shared/src/core/usecases/srs/srsScheduler.js` | Kroki, pułapy, rozrzut, podgląd i revision |
| `packages/shared/src/core/usecases/srs/srsSession.js` | Kolejka i limity |
| `electron/db/services/srs.services.js` | Zapis SQLite |
| `packages/shared/src/platform/web/model/createWebSrsRepository.js` | Zapis IndexedDB |
| `src/widgets/LearnFlashcardsPanel/model/useSrsSession.js` | Sesja UI, timery i ochrona przed wyścigami |

Testy porównują wzory z `ts-fsrs` w 2000 losowych przypadkach z tolerancją poniżej `1e-6`. Testy jednostkowe obejmują kolejkę i migrację; SQLite transakcje i zapis; web używa fake-indexeddb. Nie weryfikuje to całej równoczesnej pracy prawdziwych urządzeń.

Uruchom `pnpm test:run`, `pnpm check:srs` i `pnpm check:persistence`. Zmiana UI wymaga też [listy kontroli](smoke-checklist.pl.md). [Środowisko](onboarding.pl.md).
