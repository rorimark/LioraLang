# Uruchomienie, kontrole i wydania

[English](onboarding.md) | [Русский](onboarding.ru.md) | **Polski**

Instrukcja dotyczy Liora 0.9.1. Projekt używa Node.js, pnpm i Vitest. Bun nie jest głównym narzędziem kompilacji ani testów.

## Wymagania

- Node.js od 22.12; Node.js 24 działa. CI wydania używa Node.js 22.
- pnpm 10.33.0, jak w CI.
- Electron potrzebuje środowiska graficznego i kompilacji natywnego `better-sqlite3`, czasem narzędzi systemu.
- Przyjęcie przeglądarkowe wymaga osobnego Playwright i Chromium, poza zależnościami projektu.

W razie potrzeby zainstaluj pnpm przez `npm install --global pnpm@10.33.0`. Nie przepisuj lockfile inną główną wersją menedżera przy okazji.

## Instalacja i start

```sh
git clone https://github.com/rorimark/LioraLang.git
cd LioraLang
pnpm install --frozen-lockfile
pnpm dev:web
```

Web działa pod `http://localhost:5175`. Port jest stały; zwolnij go lub jawnie uruchom Vite na innym. Nie zatrzymuj cudzych procesów ogólnym dopasowaniem nazwy.

Desktop:

```sh
pnpm rebuild:native
pnpm dev
```

`dev` uruchamia renderer i Electron. `dev:renderer` oraz `dev:electron` pomagają debugować osobno. Przebudowa natywna używa wersji Electron z `package.json`. Przy błędzie ABI przebuduj zamiast kopiować dowolny plik binarny.

`setup:web` i `setup:desktop` to skróty instalacji zależności, nie różne konfiguratory.

## Funkcje online

Lokalna edycja i powtórki nie potrzebują Supabase. Dla konta, Huba, synchronizacji i AI utwórz niekommitowany `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
```

To publiczne ustawienia klienta. `VITE_` trafia do build, więc nie umieszczaj tam service role, Gemini ani innych sekretów.

`.env.web` i `.env.desktop` ustawiają `VITE_APP_TARGET`. Po zmianie lokalnego env uruchom Vite ponownie. Skonfiguruj adresy powrotu Auth dla localhost i produkcji. Desktop OAuth używa systemowej przeglądarki i loopback.

[Supabase](../supabase/README.pl.md) opisuje schemat i sekrety. Sama konfiguracja klienta nie konfiguruje funkcji serwerowej.

## Kompilacja

| Polecenie | Wynik |
| --- | --- |
| `pnpm build:web` | Web bundle, SSR, statyczne strony i manifest zasobów |
| `pnpm build:desktop` | Renderer spakowanego Electron |
| `pnpm build` | Alias desktop build |
| `pnpm preview:web` | Nowy web build, potem preview na stałym porcie 4175 |
| `pnpm dist:local:mac` | macOS ARM64 `.dmg` i `.zip` |
| `pnpm dist:local:win` | Windows x64 NSIS |
| `pnpm dist:local` | Oba cele; potrzebne odpowiednie środowisko kompilacji |

Wyniki są w `dist/`, `dist-ssr/`, `release/`. Nie kommituj artefaktów jako źródeł. Build jednej OS nie weryfikuje instalatora drugiej.

## Szybkie kontrole

```sh
pnpm lint
pnpm check:boundaries
pnpm check:layers
pnpm check:i18n
pnpm test:run
```

`test` obserwuje, `test:run` wykonuje raz, `test:coverage` zapisuje pokrycie. Warianty `:verbose` i `:report` zmieniają raport. Testy nie dowodzą dostępności AI ani poprawnej konfiguracji produkcji.

## SQLite i zapis

```sh
pnpm check:srs
pnpm check:persistence
pnpm check:media
pnpm check:subjects
```

Kontrole działają przez Electron na osobnych danych. `check:subjects` obejmuje pola, import/eksport i wpis w sesji. Zmiana zapisu wymaga obu platform, nie tylko testu normalizacji.

## Przyjęcie przeglądarkowe

Skrypty muszą znaleźć Playwright. Przy osobnej instalacji ustaw `NODE_PATH` na katalog modułu. `PLAYWRIGHT_CHROMIUM` może wskazywać plik wykonywalny Chromium. Potrzebne uprawnienia uruchamiania przeglądarki i serwera.

Po `pnpm build:web`:

```sh
pnpm check:offline-programming
pnpm check:offline-knowledge
pnpm check:technology-appearances
```

Offline używa production preview, zapisuje online i odłącza sieć. Technologie sprawdzają warianty wyglądu. Bezpośrednio wcześniej zbuduj web: oba cele nadpisują `dist/`.

Scenariusze AI uruchamiają własny dev server i podstawiają odpowiedzi Supabase:

```sh
pnpm check:subject-assistant
pnpm check:subject-topic
```

Sprawdzają UI, pola, zapis, anulowanie i preferencje bez zużywania limitu. Nie oceniają jakości Gemini. Porty i środowisko są w `scripts/acceptance/`; `ACCEPTANCE_PORT` zmienia zajęty port.

## Debugowanie

| Objaw | Sprawdź |
| --- | --- |
| Błąd strony | Console, Network, model widgetu, RouteErrorBoundary |
| Pole przedmiotu nie zapisuje się | Profil, normalizację, payload `saveDeck`, obie bazy |
| Zła kolejka | Logikę SRS, dziennik, lokalny dzień, revision i profileScope |
| Błąd AI | Wynik funkcji, sesję, flagi, limit, sekret i logi serwera |
| Offline JSON zwraca HTML | Ścieżkę manifestu, `vercel.json`, service worker |
| Desktop po pakowaniu nie startuje | Zależności `app.asar`, SQLite ABI, log main |

Zapisz kroki i status błędu. Usuń tokeny, sekrety i dane osobiste z raportu. Nie czyść bazy użytkownika dla naprawy zapisu bez kopii.

## Wydania desktop

1. Zmień `package.json` i dodaj `docs/releases/vX.Y.Z.md` ze zmianami użytkownika i zgodnością. Dodaj też rosyjski i polski opis.
2. Uruchom odpowiednie kontrole, oba buildy i [listę kontroli](smoke-checklist.pl.md).
3. Użyj Conventional Commits. Wersja pakietu musi zgadzać się z `vX.Y.Z`.
4. Uruchom `.github/workflows/release.yml` tagiem lub workflow_dispatch.
5. Sprawdź macOS/Windows jobs, zależności pakietu i publikację.
6. Sprawdź instalatory, `.blockmap`, `latest-mac.yml` i `latest.yml`.

Workflow używa Node.js 22, pnpm 10.33.0 i frozen lockfile. Ustawienia klienta Supabase pochodzą z secrets `VITE_SUPABASE_URL` i `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. GitHub token daje publikację.

`release:notes` tworzy szkic `release/RELEASE_NOTES.md` z historii Git. `release:publish` publikuje lokalne pliki przez `gh` i zapisuje w GitHub. Preferuj workflow z runnerami OS. Skrypty nie zastępują treści głównego opisu w `docs/releases/`.

Jest workflow wydania, ale nie ma osobnego ogólnego CI całych testów. Udany build nie oznacza wszystkich scenariuszy przyjęcia.

## Web i serwer

`vercel.json` ustawia trasy web. Produkcja podaje bundle, statyczne strony i JSON `/asset-manifest.json`; `/app/` daje powłokę aplikacji. Sprawdź nową wersję i start ze starego cache.

Deployment React nie wdraża Edge Functions ani migracji SQL. Serwer aktualizuj osobno. [Proces serwera](../supabase/README.pl.md) · [Commity](../rules/git-and-commits-rules.pl.md)
