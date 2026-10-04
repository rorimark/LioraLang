# Kontrakt web i desktop

[English](architecture-dual-platform.md) | [Русский](architecture-dual-platform.ru.md) | **Polski**

UI używa tych samych usług na obu platformach. Transport jest inny: web korzysta z pamięci przeglądarki, desktop z API Electron. Zasady domeny pozostają wspólne.

## Składanie platformy

1. Vite wybiera `@platform-target` dla trybu kompilacji.
2. `platform/target/web.js` lub `desktop.js` tworzy usługi.
3. `PlatformProvider` z `@shared/providers` przekazuje je aplikacji.
4. Modele UI wywołują `usePlatformService("serviceName")`.

Implementacje:

- `packages/shared/src/platform/web/createWebPlatformServices.js`.
- `packages/shared/src/platform/electron/createElectronPlatformServices.js`.
- `packages/shared/src/providers/PlatformProvider/`.

## Dostępne usługi

| Usługa | Cel |
| --- | --- |
| `authRepository` | Konto i stan autoryzacji |
| `deckRepository` | Talie, wpisy, import i eksport |
| `mediaRepository` | Obrazy i powiadomienia o zmianach |
| `settingsRepository` | Ustawienia aplikacji |
| `hubRepository` | Publiczne talie i publikowanie |
| `srsRepository` | Kolejka i zapis ocen |
| `progressRepository` | Statystyki i stan nauki talii |
| `syncRepository` | Wymiana prywatnej biblioteki i postępów |
| `systemRepository` | Ścieżka bazy, foldery i integralność na desktop |
| `wordSuggestRepository` | Sugestie i generowanie na serwerze |
| `runtimeGateway` | Okno, wersja, zdarzenia środowiska i aktualizacje |

Web nie otworzy folderu bazy, nie przeniesie SQLite i nie zainstaluje aktualizacji desktop. Adapter czytelnie zgłasza brak możliwości; UI powinno to obsłużyć zamiast wywoływać Electron w przeglądarce.

Auth i AI korzystają ze wspólnych API Supabase. Hub obecnie korzysta z implementacji web także na desktop. Nie każde żądanie sieciowe desktop przechodzi przez IPC.

## Zasady zmian

- Nie importuj `electron/` z `src/` ani nie wywołuj `window.electronAPI` w komponentach.
- Nie wywołuj `@shared/api` bezpośrednio ze stron, widgetów i funkcji UI.
- Nowe zasady normalizacji, SRS i formatu najpierw umieszczaj we wspólnej logice.
- Zmiana kontraktu wymaga obu adapterów i kontroli zapisu.
- Funkcje tylko dla desktop odpowiednio oznacz w UI.

Uruchamiaj `pnpm dev:web` dla web i `pnpm dev` dla desktop. Kompiluj przez `pnpm build:web` i `pnpm build:desktop`. [Uruchomienie](onboarding.pl.md) · [Dane](platforms-and-storage.pl.md)
