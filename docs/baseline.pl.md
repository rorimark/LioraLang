# Wyniki bazowe

[English](baseline.md) | [Русский](baseline.ru.md) | **Polski**

Baza funkcjonalna: 0.9.1 przygotowana 4 października 2026 r. Wyniki zapisują przygotowanie wydania, nie ponowne wykonanie wszystkich poleceń po każdej zmianie dokumentacji.

## Wyniki przed wydaniem

| Kontrola | Wynik |
| --- | --- |
| `test:run` | 544 testy w 77 plikach przeszły |
| `lint`, `check:boundaries`, `check:layers`, `check:i18n` | Przeszły |
| `check:subjects` | SQLite zapisuje fiszki przedmiotów |
| `check:subject-assistant` | Sugestie i ustawienia przeszły |
| `check:subject-topic` | Generacja, edycja, zapis, anulowanie i telefon przeszły |
| `check:offline-knowledge` | Tworzenie i ocena offline po cache przeszły |
| `build:web`, `build:desktop` | Skompilowane |
| Workflow desktop | macOS ARM64 i Windows x64 opublikowane |

AI używało kontrolowanych odpowiedzi bez prawdziwego limitu i oceny jakości modelu. Offline potwierdza wybrane scenariusze, nie każdą konfigurację przeglądarki.

Wydanie: [v0.9.1](https://github.com/rorimark/LioraLang/releases/tag/v0.9.1).

## Poprzednia kontrola dokumentacji 4 października

Poprzednia aktualizacja sprawdziła 36 dokumentów, 160 linków lokalnych, 104 ścieżki kodu, 46 poleceń pnpm i sześć bloków JSON. Nie było długich myślników, otwartych bloków kodu ani końcowych spacji.

Przykłady językowe, programistyczne, matematyczne i historyczne przeszły odczyt, eksport i import z zachowaniem pól. Eksport wybrał formaty 1, 5, 6 i 6.

Skrypty platform i warstw przeszły przez Bash i Node.js, także `git diff --check`. Testów funkcjonalnych i buildów nie powtarzano tylko dla Markdown.

## Sprawdzenie trzech wersji językowych 4 października

Wszystkie 34 dokumenty mają pełne wersje angielską, rosyjską i polską: 102 pliki Markdown. Angielska jest główna. Nawigacja zmienia język, a linki do treści pozostają w wybranym języku.

Sprawdzono 594 lokalne linki, 312 odwołań do ścieżek kodu, 120 odwołań do poleceń pnpm i 18 bloków JSON. Nie ma długich myślników, końcowych spacji ani niezamkniętych bloków kodu.

Wszystkie 12 pełnych przykładów talii przeszło odczyt, eksport i ponowny import z zachowaniem tekstu i znormalizowanych pól przedmiotów. Przykłady każdego języka eksportują formaty 1, 5, 6 i 6. Trzy przykłady matematyczne wyświetlił też lokalny KaTeX z włączonym zgłaszaniem błędów.

Sprawdzanie granic platform i warstw oraz `git diff --check` przeszły. Testów aplikacji i kompilacji nie powtarzano dla zmiany samej dokumentacji.

## Nowa baza wyników

Po zmianie zachowania zapisz wersję lub commit, środowisko, polecenia, wyniki i zakres. Zachowaj też błędy z poprawką lub znaną przyczyną.

Stare nazwy i rozmiary chunków nie są aktualną metryką. Mierz konkretny build, rozróżniaj raw/gzip i tę samą platformę. Web i desktop nadpisują `dist/`.

Dokumentacja wymaga kontroli linków, poleceń, ścieżek, przykładów i formatowania. Zachowanie wymaga [kontroli onboarding](onboarding.pl.md) oraz [scenariuszy](smoke-checklist.pl.md).

## Kontekst historyczny

Dawny dokument zapisywał migrację wspólnej logiki i adapterów w marcu 2026 r. Te rozmiary i wnioski nie są dzisiejszą bazą. Zobacz [architekturę](architecture.pl.md) i [wydania](releases/README.pl.md).
