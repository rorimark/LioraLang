# Przewodnik po projekcie

[English](PROJECT_DOCUMENTATION.md) | [Русский](PROJECT_DOCUMENTATION.ru.md) | **Polski**

Liora 0.9.1 to aplikacja React z IndexedDB w przeglądarce i SQLite w Electron. Przedmioty, zawartość fiszek, format plików, SRS i zasady synchronizacji korzystają ze wspólnego kodu. Funkcje online używają Supabase, a AI wywołuje Gemini przez funkcję serwerową.

## Gdzie zacząć

| Zadanie | Najpierw przeczytaj | Główny kod |
| --- | --- | --- |
| Uruchomienie lub błąd kompilacji | [Onboarding](onboarding.pl.md) | `package.json`, `vite.config.js`, `electron/`, `scripts/` |
| Nowe pole lub przedmiot | [Przedmioty](learning-objects.pl.md), [format pliku](deck-format.pl.md) | `packages/shared/src/core/usecases/subjects/`, edytor, adaptery danych |
| Fiszka lub formularz | [Zasady UI](../rules/ui-rules.pl.md) | `src/features/flashcard/`, `src/features/subject-fields/`, odpowiedni widget |
| Odstępy lub kolejka | [SRS](srs.pl.md) | `packages/shared/src/core/usecases/srs/`, `useSrsSession`, oba repozytoria |
| Generowanie lub sugestie | [AI](word-suggestions.pl.md) | `src/features/word-suggest/`, `src/features/quick-add-words/`, `supabase/functions/suggest-word/` |
| Import lub synchronizacja | [Dane](platforms-and-storage.pl.md), [format](deck-format.pl.md) | wspólna logika, `packages/shared/src/sync/`, repozytoria platform |
| Serwer lub Hub | [Supabase](../supabase/README.pl.md) | migracje i Edge Functions |

[Mapa modułów](module-catalog.pl.md) wskazuje punkty wejścia, a [architektura](architecture.pl.md) wyjaśnia warstwy.

## Co trzeba zachować

Talie językowe pozostają zgodne, jeśli nie potrzebują nowej funkcji. Eksport wybiera minimalną wersję formatu wymaganą przez zawartość. Nieznany przedmiot lub nieobsługiwana wersja muszą wywołać czytelny błąd bez utraty pól.

Jeden wpis ma jeden harmonogram powtórek. Zmiana kierunku lub sposobu prezentacji nie tworzy kolejnej jednostki SRS. Nowe przedmioty pobierają pola i układ z profili zamiast warunków z nazwami przedmiotów w całym UI.

Lokalna nauka nie wymaga konta. Zapis musi działać bez AI, Huba i sieci. Wynik AI pozostaje szkicem do zastosowania lub utworzenia talii przez użytkownika.

## Przed zakończeniem

Sprawdź odpowiednie platformy, wykonaj potrzebne [kontrole](onboarding.pl.md) i zaktualizuj dokument funkcji we wszystkich trzech językach. Przed wydaniem sprawdź również spakowaną aplikację i dodaj opis do `docs/releases/`.

[Wyniki bazowe](baseline.pl.md) dotyczą konkretnej wersji i nie weryfikują późniejszych zmian. [Uwagi o jakości](code-audit.pl.md) opisują znane ograniczenia, bez obietnicy braku błędów.
