# Kontrole jakości i znane ograniczenia

[English](code-audit.md) | [Русский](code-audit.ru.md) | **Polski**

Stan 0.9.1 z 4 października 2026 r. To uwagi o implementacji i weryfikacji, nie niezależny audyt bezpieczeństwa ani obietnica braku błędów. Dawne oceny i opisy atrap nie dotyczą obecnej aplikacji.

## Spójne podstawy

- Web i desktop mają wspólne SRS, import, hashe i zasady przedmiotów.
- Ocena sprawdza revision i profil, zapisując harmonogram i dziennik transakcyjnie.
- Profile określają pola, układ, język i AI współdzielone z serwerem.
- Nieobsługiwany format jest odrzucany, aby stary klient nie zgubił pól.
- Synchronizacja ma stan profilu, kolejkę i kopie konfliktowe; jest zaimplementowana.
- Generator pokazuje edytowalne szkice i zapisuje po potwierdzeniu.
- Obrazy mają sprawdzany hash i osobny zapis lokalny.
- Klient nie zawiera sekretu Gemini ani service role Supabase.

## Zakres automatyzacji

| Kontrola | Potwierdza | Nie potwierdza |
| --- | --- | --- |
| Vitest | Kontrakty, normalizację, kolejki, wyścigi i komponenty | Każdego działania użytkownika |
| SQLite | Zapis, dziennik, media i pola przedmiotów | Każdej migracji danych użytkownika |
| Przeglądarka | Offline, układy i podstawione generowanie | Faktów Gemini i rzeczywistego limitu |
| Lint i granice | Błędy kodu i zabronione importy | Pełnej poprawności architektury |
| `app.asar` | Obecność i rozwiązanie zależności | Każdej funkcji na każdej OS |

Przed 0.9.1 przeszły 544 testy w 77 plikach. [Onboarding](onboarding.pl.md) opisuje polecenia i środowisko; [wyniki bazowe](baseline.pl.md) zapisują stan. Nowe zachowanie potrzebuje własnych kontroli.

## Kwestie wymagające uwagi

### Sesje desktop

`electron/services/secureStorage.service.js` używa `safeStorage` systemu lub zapisu `plain`. Fallback powinien być jawny; sprawdź odtworzenie sesji na obsługiwanych OS. Nie gwarantuj szyfrowania każdego tokena.

### Nawigacja Electron

Okno ma izolację kontekstu, brak Node integration, CSP i kontrolę devtools. `windowLifecycle.js` nie ustawia jawnego `setWindowOpenHandler` ani ogólnego `will-navigate`. Przed dodaniem linków sprawdź dozwolone adresy i otwieranie systemową przeglądarką.

### Zdalny import

`importWorkflow.js` dopuszcza HTTP/HTTPS, potem sprawdza `isTrustedHubStorageUrl`. Ustawiony origin wymaga zgodności; fallback wymaga HTTPS i domeny Supabase. Nie oznacza to dowolnych pobrań HTTP, ale konfiguracja i przekierowania potrzebują kontroli przed nowymi źródłami.

### Kopie SQLite

Backup robi checkpoint WAL i kopiuje bazę. Checkpoint jest best effort, więc nie dowodzi spójności przy każdym równoległym dostępie. Zmiana kopii lub migracji wymaga testu przywrócenia osobnej bazy.

### Równoczesne urządzenia

Zdarzenia mają ID, konflikty treści zachowują kopie. Testy nie zastępują dwóch urządzeń, przerwania wymiany, zmiany konta i usunięcia. Sprawdź je przed zmianą push/pull.

### Jakość AI

Walidacja sprawdza strukturę, długości i pola, nie kod, fakty i rozwiązania. Przeglądarka używa fixture, nie dostawcy. Timeout lub przeciążenie mogą wystąpić mimo limitu.

### Publiczny Hub

Hub obsługuje języki z obrazami. Inne przedmioty blokuje UI i logika do rozbudowy publikacji. Ukrycie przycisku nie jest ochroną serwera; dostęp określają RLS i RPC.

### Wydania i CI

Buildy są niepodpisane, macOS aktualizuje się ręcznie. Istnieje CI wydania, bez ogólnego workflow gwarantującego wszystkie kontrole każdego push. Sam renderer nie weryfikuje zależności pakietu.

## Bezpieczne zmiany

Zmieniaj zasady we właściwej warstwie. Nie duplikuj SRS w adapterze, profilu w komponencie ani normalizacji serwera. Błąd zapisu nie może przewijać fiszki, a czyszczenie danych nie naprawia testu.

Mierz wydajność: rozmiar i ładowanie bundle, żądania, listy, obliczenia i pamięć obrazów. Memo, cache i abstrakcje dodawaj dla wykazanej potrzeby.

[Lista kontroli](smoke-checklist.pl.md) · [Architektura](architecture.pl.md) · [Zasady kodu](../rules/code-and-components-rules.pl.md)
