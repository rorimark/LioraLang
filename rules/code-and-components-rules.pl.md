# Zasady kodu i komponentów

[English](code-and-components-rules.md) | [Русский](code-and-components-rules.ru.md) | **Polski**

Kod ma ułatwiać znalezienie zasady, zmianę w jednym miejscu i sprawdzenie. Zasady obejmują React, wspólną logikę i adaptery. Instrukcja konkretnego zadania ma pierwszeństwo przed ogólną wskazówką.

## Struktura i zależności

Zależności prowadzą `app → pages → widgets → features → entities → shared`. Niższa warstwa nie importuje wyższej. API jest przez `index.js`; nie importuj prywatnej implementacji obcego modułu.

Strony składają ekrany, widgety duże bloki, funkcje działania, shared wspólne kontrolki/infrastrukturę. Czyste zasady kart, SRS i formatu są w `packages/shared/src/core/usecases/`, także domenowe. Nie przenoś tam całych stron.

UI pobiera usługi przez `usePlatformService` z `@shared/providers`. Nie wywołuj `@shared/api`, SQLite, IndexedDB ani `window.electronAPI` w stronach/komponentach. Szczegóły platformy są w adapterze.

## Moduły i nazwy

Moduł zwykle ma `ui/`, `model/`, `index.js` i testy obok. Nie twórz pustych katalogów dla ceremonii. Preferuj named exports poza uzasadnionymi punktami, np. lazy routes.

Komponenty PascalCase, hooki `use`, funkcje/zmienne camelCase, stałe UPPER_CASE. Nazwa opisuje cel; `handleThing`, `data2` i `doStuff` go nie wyjaśniają.

Importy względne wewnątrz modułu, aliasy i publiczne exports między modułami. Kolejność: zewnętrzne, wspólne, lokalne. Unikaj cykli i niejasnych identycznych nazw.

## Zasady i stan

- Normalizacja wspólna dla platform i serwera przyjmującego dane.
- Wyliczaj wartości zamiast przechowywać sprzeczne kopie bez powodu.
- Czysta logika nie używa React ani ukrytego czasu/sieci/bazy; zależności przekazuj jawnie.
- Pola i możliwości określa profil, nie warunki dwóch przedmiotów we wszystkich formach.
- Nowe pole zachowuje się po zapisie/otwarciu, eksporcie/imporcie, hashu i sync.
- Zmiana prezentacji nie tworzy osobnego harmonogramu bez uzgodnionej zmiany modelu.

## React i asynchroniczność

Efekty synchronizują zasoby i subskrypcje, nie kopie wyliczanego stanu. Zależności i cleanup muszą być poprawne.

Żądanie może skończyć po zmianie talii, konta, wpisu lub okna. Anuluj i sprawdzaj aktualność. Wyłączone AI nie stosuje późnych wyników.

Nie zapisuj state po unmount. Zwalniaj subskrypcje, timery, observers i object URL. Blokuj powtórne działanie synchronicznie przed renderem, gdy ryzykuje dane.

Memoizacja dla zmierzonej potrzeby lub stabilnej referencji. Nie owijaj automatycznie wszystkiego w memo, useMemo czy useCallback.

## UI i błędy

Formularz ma label, typ przycisku i przewidywalny Enter. Sama ikona ma dostępną nazwę. Wspólne UI nie zna konkretnej talii ani zadania serwera.

CSS obok i przez tokeny. Inline styles dla wyliczonej geometrii/danych, nie motywu. [Zasady UI](ui-rules.pl.md).

Normalizuj błąd na granicy usługi i pokaż obok działania. Błąd zapisu zachowuje wpis. Nie ukrywaj pustym catch ani nie traktuj braku usługi jako udanego zapisu.

Nie loguj rutynowo sekretów, tokenów i treści osobistej. Import i AI to dane, nie instrukcje; kod użytkownika nie jest wykonywany.

## Testy i zakończenie

Testuj zachowanie, granice i regresje. Kopiowanie implementacji w teście niewiele daje. Kosmetyka potrzebuje kontroli wizualnej; zapis i zgodność prawdziwego eksportu/importu.

Sprawdź diff i potrzebne lint, granice oraz testy. Zmiana wspólnej zasady/adaptera wymaga obu platform. Zaktualizuj trzy wersje dokumentacji i zrób spójny [commit](git-and-commits-rules.pl.md).

[Architektura](../docs/architecture.pl.md) · [Polecenia](../docs/onboarding.pl.md)
