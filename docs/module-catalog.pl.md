# Mapa modułów

[English](module-catalog.md) | [Русский](module-catalog.ru.md) | **Polski**

To główne punkty wejścia wersji 0.9.1. Mapa nie wymienia każdego komponentu; zacznij od publicznego `index.js` modułu, sąsiedniego modelu i testów.

## Aplikacja i strony

| Ścieżka | Cel |
| --- | --- |
| `src/main.jsx`, `src/app/App.jsx` | Start i składanie |
| `src/app/layouts/AppLayout.jsx` | Wspólny układ |
| `src/app/router/` | Trasy wspólne, web i desktop |
| `src/app/prerender/landingPrerender.jsx` | SSR strony głównej |
| `src/pages/learn/` | Nauka |
| `src/pages/decks/`, `deck-details/`, `deck-editor/` | Biblioteka i edytor |
| `src/pages/browse/` | Hub |
| `src/pages/progress/` | Postępy i album naklejek |
| `src/pages/account/`, `settings/` | Konto i ustawienia |
| `src/pages/landing/`, `share/` | Publiczne strony web |

Krótsze ścieżki w tej samej komórce mają rodzica `src/pages/`.

## Widgety i działania

| Moduł | Zawartość |
| --- | --- |
| `src/widgets/LearnFlashcardsPanel/` | Sesja, dane Flashcard, timery i oceny |
| `src/widgets/DeckEditorPanel/` | Pola talii i edycja wpisów |
| `src/widgets/DecksOverviewPanel/` | Biblioteka, menu tworzenia i generator |
| `src/widgets/DeckDetailsPanel/` | Lokalna talia |
| `src/widgets/BrowseDecksPanel/`, `BrowseDeckDetailsPanel/` | Lista i szczegóły Huba |
| `src/widgets/ProgressOverviewPanel/` | Dane i UI postępów |
| `src/features/flashcard/` | Fiszka, bloki przedmiotów i style |
| `src/features/subject-fields/` | Pola formularza według profilu |
| `src/features/quick-add-words/` | Szybkie dodawanie i generowanie |
| `src/features/word-suggest/` | Sugestie, żądania i odrzucanie starych odpowiedzi |
| `src/features/srs-rating-controls/` | Przyciski ocen |
| `src/features/deck-import/` | Proces importu |
| `src/features/word-image-field/` | Dodawanie obrazów |
| `src/features/app-preferences/`, `sync-settings/` | Ustawienia aplikacji i wymiany |

`GenerateDeckDialog` jest obecnie zdefiniowany w `src/features/quick-add-words/ui/QuickAddWordsDialog.jsx`. Style są w `GenerateDeckDialog.css`; model używa `useQuickAddWords` w trybie tworzenia. Ta wersja nie ma pliku `GenerateDeckDialog.jsx`.

## Wspólna logika

Poniższe ścieżki zaczynają się w `packages/shared/src/core/usecases/`.

| Katalog | Cel |
| --- | --- |
| `subjects/` | Rejestr, pola, możliwości, układy i technologie |
| `cardContent/` | Treść, obrazy i budowanie prezentacji |
| `srs/` | FSRS-5, odstępy, normalizacja, kolejka i limity |
| `importExport/` | Odczyt i eksport talii, zgodność wpisów i media |
| `sync/` | Tożsamość, hash, profil i stan wymiany |
| `hub/` | Przygotowanie i kontrole publikacji |

Tekst matematyczny: `packages/shared/src/ui/MathFormula/`, w tym `MathText`, `parseMathText`, `MathFormula` i lokalny loader KaTeX.

## Usługi i infrastruktura shared

| Ścieżka w `packages/shared/src/` | Cel |
| --- | --- |
| `providers/PlatformProvider/` | Dostęp UI do usług |
| `platform/target/` | Wybór platformy przy kompilacji |
| `platform/web/` | IndexedDB i adaptery przeglądarki |
| `platform/electron/` | Adaptery API Electron |
| `api/` | Supabase auth, sync, Hub, AI i zgodne API desktop |
| `sync/` | Wymiana biblioteki i obrazów |
| `config/` | Preferencje, języki, trasy, tokeny CSS i funkcje AI |
| `lib/i18n/` | Tłumaczenia i formatowanie |
| `lib/media/` | Przygotowanie obrazów i lokalne URL |
| `ui/` | Wspólne kontrolki |

## Electron i serwer

`electron/main.js` składa aplikację. `electron/main/` obsługuje okna, menu, nawigację, import, kopie, OAuth i aktualizacje. Handlery IPC są w `electron/main/ipc/`; mostem jest `electron/preload.cjs`.

`electron/db/initDb.js` tworzy schemat. `electron/db/services/` zawiera operacje talii, SRS, postępów, ustawień, mediów i wymiany. `electron/services/` obejmuje Hub, integralność, ścieżkę bazy, migrację starej pamięci i zapis tokenów.

`supabase/migrations/` zawiera schemat serwera. `supabase/functions/suggest-word/` obsługuje AI; `delete-account/` usuwa konta. [Dokumentacja serwera](../supabase/README.pl.md).

## Kompilacja i kontrole

`vite.config.js` wybiera platformę, trasy, aliasy i manifest. `scripts/prerender-landing.mjs` tworzy strony statyczne. `public/sw.js` odpowiada za cache web.

`scripts/check-*` sprawdza warstwy, teksty UI i spakowane zależności. `scripts/acceptance/` zawiera scenariusze przeglądarki. `electron/scripts/` zawiera kontrole integracyjne SQLite. `.github/workflows/release.yml` buduje i publikuje wydania desktop.

[Polecenia](onboarding.pl.md) · [Architektura](architecture.pl.md)
