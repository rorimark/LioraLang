# Platforms And Storage

## Сравнение платформ

| Область | Desktop | Web |
| --- | --- | --- |
| Shell | Electron | Browser / PWA |
| Local storage | SQLite (`better-sqlite3`) | IndexedDB |
| Renderer | React + Vite | React + Vite |
| Platform bridge | `preload.cjs` + IPC | browser repositories |
| Updates | `electron-updater` | нет |
| DB relocation | да | нет |
| Integrity repair | да | нет |
| Offline support | локальная БД | service worker + IndexedDB |
| Root route | `/ -> /app/learn` | `/ -> landing` |

## Desktop

### Главные файлы

- `electron/main.js` - окно, меню, CSP, auto-update, IPC, import/export, системные команды.
- `electron/preload.cjs` - безопасный мост `window.electronAPI`.
- `electron/db/*` - инициализация SQLite, schema/bootstrap и доменные DB services.
- `electron/services/*` - Hub, integrity, legacy migration, db path.

### Как работает desktop renderer

1. Renderer вызывает `usePlatformService(...)`.
2. `createElectronPlatformServices()` отдаёт repository/gateway-объекты.
3. Эти объекты вызывают методы `window.electronAPI`.
4. `preload.cjs` пробрасывает вызов в `ipcMain.handle(...)`.
5. Main process обращается к БД, файловой системе или Hub.

### Desktop storage

SQLite хранит:

- decks;
- words;
- review cards;
- review logs;
- app settings;
- служебные данные.

### Desktop strengths

- правильный preload bridge;
- `contextIsolation: true`;
- `nodeIntegration: false`;
- полноценная локальная БД;
- integrity и migration слой уже заложены.

### Desktop risks

- `electron/main.js` стал слишком большим;
- импорт удалённых пакетов допускает `http`, а не только `https`;
- отсутствует явная блокировка `will-navigate` и `setWindowOpenHandler`;
- auth storage Hub пишется в обычный JSON-файл в userData.

## Web

### Главные файлы

- `src/shared/platform/web/createWebPlatformServices.js`
- `src/shared/platform/web/model/createWebDeckRepository.js`
- `src/shared/platform/web/model/createWebSettingsRepository.js`
- `src/shared/platform/web/model/createWebSrsRepository.js`
- `src/shared/platform/web/model/createWebProgressRepository.js`
- `src/shared/platform/web/model/createWebHubRepository.js`
- `src/shared/platform/web/db/webDb.js`
- `public/sw.js`

### Web storage

IndexedDB stores:

- `decks`
- `words`
- `reviewCards`
- `reviewLogs`
- `settings`
- `syncQueue`

### PWA / offline

`public/sw.js`:

- кэширует app shell и статические assets;
- поддерживает offline navigation fallback;
- подкачивает build assets из manifest.

### Web strengths

- браузерная версия не зависит от Electron;
- есть отдельные IndexedDB repositories;
- SRS и progress грузятся лениво;
- Hub-код вынесен в отдельный chunk.

### Web limits

- нет desktop-утилит;
- часть runtime API превращается в `disabled` или `throw`;
- offline sync queue пока подготовлен, но не выглядит как полностью реализованный sync-движок.

## Hub

Hub работает через Supabase и используется в обеих платформах:

- web напрямую через `src/shared/api/hubDecksApi.js`;
- desktop через `electron/services/hub.service.js`.

Функции Hub:

- список публичных колод;
- карточка колоды по slug;
- signed download URL;
- публикация локальной колоды;
- счётчик скачиваний;
- удаление опубликованной колоды.

## Общие доменные данные

Независимо от платформы проект работает примерно с одними и теми же сущностями:

- `deck`
- `word`
- `reviewCard`
- `reviewLog`
- `settings`
- `deck package`

## Import / export

Общий use case лежит в:

- `src/shared/core/usecases/importExport/deckPackage.js`
- desktop-эквивалент и DB-связка - `electron/db/services/import-export.js`

Поддерживаются:

- `json`
- `lioradeck`
- legacy import extension `.lioralang`

Пайплайн импорта:

1. чтение файла или текста;
2. разбор пакета;
3. валидация формата и языков;
4. нормализация слов;
5. разрешение стратегии дублей;
6. запись в локальное хранилище.
