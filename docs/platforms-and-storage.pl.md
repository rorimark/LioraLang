# Platformy, dane i synchronizacja

[English](platforms-and-storage.md) | [Русский](platforms-and-storage.ru.md) | **Polski**

Talie i powtórki zapisują się lokalnie. Konto dodaje wymianę z serwerem bez zastępowania pamięci lokalnej. Web i desktop mają wspólną logikę i różne adaptery.

## Gdzie są dane

| Dane | Web | Desktop |
| --- | --- | --- |
| Talie i wpisy | IndexedDB `decks`, `words` | SQLite `decks`, `words` |
| Harmonogram | `reviewCards` | `review_cards` |
| Dziennik odpowiedzi | `reviewLogs` | `review_logs` |
| Obrazy | Dane binarne w `mediaAssets` | BLOB w `media_assets` |
| Ustawienia | `settings` i preferencje środowiska przeglądarki | Ustawienia aplikacji i bazy |
| Stan wymiany | `syncQueue`, stan w `settings` | Usługa synchronizacji SQLite |

Baza przeglądarki to `lioralang-web`, wersja schematu 4, tworzona w `packages/shared/src/platform/web/db/webDb.js`. SQLite inicjalizuje i migruje `electron/db/initDb.js`. Nie zmieniaj bazy użytkownika na potrzeby rozwoju; kontrole integracyjne używają osobnych danych.

Talia ma `subject` i `subjectFields`, a wpis własne `subjectFields`. SQLite używa `subject_fields_json`. Pusty przedmiot oznacza język, więc stare dane językowe nie wymagają wymuszonego przepisania.

## Praca offline

Edytor, nauka, oceny i statystyki korzystają z danych lokalnych. Desktop zawiera zasoby w instalacji. Web trzeba najpierw odwiedzić online, aby service worker zapisał powłokę, trasy, style, matematykę i fonty.

`public/sw.js` używa `asset-manifest.json` z web build. Zasoby są od katalogu głównego strony. `/app/asset-manifest.json` może zwrócić HTML trasy zamiast JSON, więc nie jest poprawnym adresem manifestu.

Pamięć aplikacji i IndexedDB użytkownika mają różne role. Aktualizacja cache nie może usuwać talii. Wyczyszczenie danych strony, zmiana profilu lub ograniczenia trybu prywatnego mogą spowodować brak biblioteki lokalnej.

## Prywatna synchronizacja

`packages/shared/src/sync/createSyncRepository.js` łączy API Supabase z adapterem kolejki lokalnej platformy.

Talia ma trwały `syncId`, hash zawartości i pochodzenie. Udana wymiana zapisuje ostatni znany stan. Kolejna porównuje go z zawartością lokalną i wersjami serwera, unikając zbędnych nowych wersji.

Odpowiedzi są zdarzeniami z `opId`. Powtórna dostawa nie może liczyć odpowiedzi drugi raz. Zdarzenie zawiera następny stan harmonogramu i pamięć FSRS. Obrazy wysyłane są przed pakietem, który je wskazuje.

Pliki prywatne korzystają z zamkniętego bucket `user-library-decks`. Publiczny Hub używa `decks` i osobnych tabel. Prywatna synchronizacja nie oznacza publikacji.

## Profile i konflikty

Postępy i stan wymiany należą do profilu gościa lub użytkownika. Zmiana konta czyści sesję nauki, aby odpowiedzi nie trafiły do poprzedniego profilu. Sam lokalny identyfikator słowa nie wystarcza do łączenia postępów.

Gdy lokalna i serwerowa zawartość zmieniły się od ostatniej synchronizacji, implementacja zachowuje lokalną kopię konfliktową i stosuje wersję serwera w głównej talii. Usunięcie serwerowe przy lokalnych zmianach również zachowuje kopię. Chroni to materiał, ale nie jest wspólną edycją wierszy.

Usunięcie talii z jednego urządzenia różni się od usunięcia z biblioteki prywatnej. Synchronizacja śledzi lokalne usunięcia, aby nie pobierać talii przy każdej aktualizacji.

Testy obejmują podstawowe przypadki; równoczesna praca rzeczywistych urządzeń wymaga osobnej kontroli. Porównaj kopie konfliktowe przed usunięciem. Wymiana w tle nie powinna stale zastępować fiszki ładowaniem; błędy i ręczna wymiana mają osobny status.

## Obrazy

Obrazy i miniatury są lokalne; wpis wskazuje `assetId`. Pliki w chmurze należą do użytkownika i używają hashy bajtów w ścieżkach. Pobranie sprawdza hash. Brakujący plik daje zastępczy widok bez usuwania odwołania.

Czyszczenie nieużywanych plików jest odroczone, aby chronić zasoby innych urządzeń i pakietów. Zdalne czyszczenie sprawdza aktualne pakiety. [Parametry i format obrazów](card-media.pl.md).

## Konto i tokeny

Klient używa publicznego klucza Supabase. RLS i kontrole serwera chronią cudze dane; klucz publiczny nie jest sekretem administratora.

Desktop zapisuje sesję Supabase przez IPC w `secureStorage.service.js`. Dostępny `safeStorage` Electron szyfruje wartości przez system. Gdy go nie ma, implementacja zapisuje tekst jawny. Nie obiecuj bezwarunkowego szyfrowania tokenów. Web używa domyślnej pamięci sesji Supabase.

Usunięcie konta to funkcja serwerowa z potwierdzeniem e-maila. Usuwa dane serwera, ale lokalne talie pozostają. [Konfiguracja serwera](../supabase/README.pl.md).

## Kopie zapasowe

Eksport `.lioradeck` zawiera treść jednej talii i obrazy, bez pełnego dziennika SRS i konta. Nie jest migawką bazy.

Desktop przenosi bazę i wykonuje kopie według harmonogramu. Kopie są w `backups` obok SQLite; ustawienia określają odstęp i liczbę. Obecna implementacja robi checkpoint WAL i kopiuje plik bazy. Przed przywróceniem lub przeniesieniem zamknij aplikację i zachowaj oryginał do sprawdzenia.

W przeglądarce używaj eksportu talii. Synchronizacja pomaga między urządzeniami, ale nie zastępuje osobnej kopii ważnego materiału.

## Kontrole po zmianie

Sprawdź zapis i ponowne otwarcie obu platform, eksport/import, zmianę profilu, powtórzenie zdarzenia, konflikt edycji, usunięcie i odzyskanie obrazu. Sam obiekt w pamięci nie dowodzi zgodności trwałego zapisu.

[Polecenia](onboarding.pl.md) · [Format talii](deck-format.pl.md) · [Bezpieczeństwo](code-audit.pl.md)
