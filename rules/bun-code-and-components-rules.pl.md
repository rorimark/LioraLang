# Bun i obecne narzędzia

[English](bun-code-and-components-rules.md) | [Русский](bun-code-and-components-rules.ru.md) | **Polski**

Liora używa Node.js, pnpm 10.33.0, Vite i Vitest. Electron ma własny runtime, funkcje Supabase używają Deno. Dokument nie wymaga Bun i nie zastępuje [uruchomienia](../docs/onboarding.pl.md).

Dawne ogólne wskazówki Bun powtarzały zasady komponentów. Wspólne wymagania są teraz w [zasadach kodu](code-and-components-rules.pl.md).

## Możliwa migracja do Bun

Migracja jest osobnym zadaniem z mierzalnym powodem, np. szybkość instalacji lub funkcja serwera. Nie zmieniaj menedżera, lockfile i runnera przy obcej zmianie UI.

Przed migracją sprawdź:

- Vite i skrypty kompilacji;
- Vitest i testy przeglądarki;
- Electron i `better-sqlite3` dla jego ABI;
- electron-builder i zależności `app.asar`;
- GitHub Actions i powtarzalną instalację;
- zgodność Node i osobne środowisko Deno Supabase.

Wybierz jeden główny menedżer i lockfile. Nie utrzymuj rozbieżnych plików jako równych źródeł. Zmień dokumentację i CI razem z rzeczywistym narzędziem.

## Granice runtime

`Bun.file`, `Bun.write` i `Bun.serve` tylko w wybranej infrastrukturze Bun. Przeglądarka, logika i renderer nie zależą od nich. Wspólne kontrakty używają standardowych Web API lub adaptera.

Instalacja Bun nie zmienia runtime Electron ani nie przenosi Deno Edge Functions do Bun. Sprawdź środowisko każdego wykonywanego modułu.
