# Code Audit

## Executive summary

Проект производит хорошее впечатление по архитектурной идее и product direction, но в текущем виде он еще нельзя назвать максимально простым, полностью оптимизированным и строго безопасным.

Общий вердикт:

- архитектура: `7/10`
- простота кода: `5/10`
- оптимизация: `7/10`
- безопасность: `6/10`
- соблюдение FSD: `5/10`

## Что уже сделано хорошо

### 1. Платформенная абстракция

Самая сильная сторона проекта - separation между UI и платформой.

Плюсы:

- web и desktop обслуживаются одним React-кодом;
- storage/runtime differences скрыты за repository/gateway-слоем;
- большая часть UI не знает о конкретной платформе.

### 2. Shared use cases

Вынесены полезные platform-agnostic модули:

- SRS engine;
- import/export deck package;
- progress aggregation;
- hub publish helpers.

Это хороший фундамент и для тестов, и для будущего рефакторинга.

### 3. Базовая оптимизация уже есть

На `pnpm build:web` проект собрался успешно.

Хорошие сигналы:

- ленивые routes работают;
- Hub уже уехал в отдельный chunk;
- SRS и progress для web тоже грузятся лениво;
- CSS разложен по экранным чанкам.

Снимок тяжёлых чанков:

| Chunk | Размер | gzip |
| --- | ---: | ---: |
| `dist/assets/index-*.js` | 211.12 kB | 66.52 kB |
| `dist/assets/hubDecksApi-*.js` | 175.31 kB | 46.28 kB |
| `dist/assets/routes-*.js` | 93.70 kB | 31.06 kB |
| `dist/assets/SettingsDatabasePanel-*.js` | 34.18 kB | 8.07 kB |
| `dist/assets/BrowsePage-*.js` | 23.81 kB | 6.55 kB |

Для приложения такого класса это не катастрофа, но уже есть зоны, где стоит дробить код дальше.

## Главные проблемы

### 1. Security: desktop remote import принимает `http`

Файл: `electron/main.js`

Проблема:

- `resolveRemoteImportUrl()` принимает и `https`, и `http`;
- дальше desktop app скачивает пакет и импортирует его как локальные данные.

Почему это риск:

- при `http` пакет может быть подменён по дороге;
- для desktop app это особенно нежелательно, потому что файл сохраняется во временную директорию и затем импортируется в локальную БД.

Где смотреть:

- `electron/main.js:669`
- `electron/main.js:683`
- `electron/main.js:717`

Рекомендация:

- разрешать только `https`;
- если нужны dev/test URL, делать отдельный opt-in флаг только для development.

### 2. Security: Hub auth storage пишется в plain JSON

Файл: `electron/services/hub.service.js`

Проблема:

- storage для Supabase auth складывается в обычный JSON-файл внутри userData.

Почему это риск:

- токены не защищены OS keychain/credential storage;
- любое локальное ПО с доступом к профилю пользователя сможет их читать.

Где смотреть:

- `electron/services/hub.service.js:90`
- `electron/services/hub.service.js:97`
- `electron/services/hub.service.js:128`
- `electron/services/hub.service.js:131`

Рекомендация:

- хранить чувствительные токены через системный keychain;
- если сейчас используются только anonymous sessions, все равно стоит явно задокументировать это ограничение.

### 3. FSD соблюдается частично, но не enforce-ится

Файлы:

- `eslint.config.js`
- `src/shared/lib/appPreferences/useStartupPreferences.js`
- `src/shared/lib/appPreferences/useAppPreferences.js`
- `src/entities/deck/model/useDecks.js`

Проблема:

- в ESLint нет boundary rules для FSD;
- нижние слои тянут `@app/providers`.

Почему это важно:

- `shared` и `entities` начинают зависеть от `app`;
- направления зависимостей размываются;
- любой дальнейший рост проекта будет сильнее сцеплять слои.

Где смотреть:

- `eslint.config.js:1`
- `src/shared/lib/appPreferences/useStartupPreferences.js:2`
- `src/shared/lib/appPreferences/useAppPreferences.js:2`
- `src/entities/deck/model/useDecks.js:2`

Рекомендация:

- вынести platform access hook в слой, который может быть законно импортирован нижними слоями;
- включить `eslint-plugin-boundaries` или аналогичный слой правил для FSD.

### 4. Дублирование desktop API слоя

Файлы:

- `src/shared/api/desktopApi.js`
- `src/shared/platform/electron/createElectronPlatformServices.js`

Проблема:

- в проекте живет большой `desktopApi.js`, который по структуре и смыслу дублирует bridge/runtime-логику из `createElectronPlatformServices.js`;
- при этом `desktopApi` больше нигде не используется.

Почему это важно:

- дублирование резко увеличивает цену изменений;
- возникает ложное ощущение нескольких "правильных" путей к Electron API;
- код поддерживать сложнее, чем нужно.

Где смотреть:

- `src/shared/api/desktopApi.js:1`
- `src/shared/api/desktopApi.js:475`
- `src/shared/platform/electron/createElectronPlatformServices.js:1`
- `src/shared/platform/electron/createElectronPlatformServices.js:566`

Рекомендация:

- удалить или архивировать `desktopApi`, если он действительно не нужен;
- оставить один canonical desktop adapter.

### 5. Качество snapshot-а: lint уже красный

Результат `pnpm lint`:

- `src/widgets/BrowseDeckDetailsPanel/ui/BrowseDeckDetailsPanel.jsx:96` - unused variable
- `src/widgets/ProgressOverviewPanel/ui/ProgressOverviewPanel.jsx:55` - unused variable
- `src/widgets/ProgressOverviewPanel/ui/ProgressOverviewPanel.jsx:56` - unused variable
- `src/widgets/DesktopTitleBar/model/useDesktopTitleBar.js:215` - missing effect dependency warning

Это не критические runtime-bugs, но это явный сигнал, что качество сборки нельзя считать зелёным.

## Монолитные файлы и кандидаты на декомпозицию

### Самые тяжёлые файлы по размеру

| Файл | Строк |
| --- | ---: |
| `electron/main.js` | 3180 |
| `electron/db/services/srs.services.js` | 1387 |
| `src/shared/platform/web/model/createWebDeckRepository.js` | 1061 |
| `src/widgets/LearnFlashcardsPanel/model/useLearnFlashcardsPanel.js` | 1039 |
| `src/shared/core/usecases/srs/srsEngine.js` | 961 |
| `src/shared/api/desktopApi.js` | 954 |
| `electron/services/hub.service.js` | 835 |
| `electron/db/services/db.services.js` | 828 |
| `src/widgets/DeckEditorPanel/model/useDeckEditorPanel.js` | 696 |
| `src/shared/core/usecases/importExport/deckPackage.js` | 633 |

### Что вынести в отдельные модули в первую очередь

#### `electron/main.js`

Стоит разделить минимум на:

- `window/bootstrap`
- `menu`
- `csp`
- `updater`
- `deck-import`
- `runtime-error`
- `ipc/decks`
- `ipc/settings`
- `ipc/hub`
- `ipc/window`

#### `useLearnFlashcardsPanel`

Стоит разрезать на:

- `useLearnSessionCache`
- `useLearnKeyboardShortcuts`
- `useLearnDeckSelection`
- `useLearnBrowseMode`
- `useLearnSrsSession`

#### `createWebDeckRepository`

Стоит вынести:

- CRUD deck operations;
- import/export browser flow;
- file/url download helpers;
- normalization helpers.

#### `useDeckEditorPanel`

Стоит вынести:

- `useDeckForm`
- `useDeckWordDraft`
- `useDeckWordPagination`
- `useDeckEditorPersistence`

#### `SettingsDatabasePanel` и `AppPreferencesSection`

Сейчас это хорошие кандидаты на smaller section components.

Сигналы:

- большой destructuring state;
- длинные условные блоки JSX;
- несколько логически независимых секций в одном файле.

Где смотреть:

- `src/widgets/SettingsDatabasePanel/ui/SettingsDatabasePanel.jsx:44`
- `src/features/app-preferences/ui/AppPreferencesSection/AppPreferencesSection.jsx:47`

#### `BrowseDeckDetailsPanel`

Сейчас виджет уже переиспользует визуальные стили других widget-ов напрямую:

- `src/widgets/BrowseDeckDetailsPanel/ui/BrowseDeckDetailsPanel.jsx:12`
- `src/widgets/BrowseDeckDetailsPanel/ui/BrowseDeckDetailsPanel.jsx:13`

Это знак, что нужна общая card/layout abstraction, а не cross-import CSS между widget-слоями.

## Простота кода

### Что хорошо

- названия функций и модулей в целом понятные;
- в проекте много нормализации входных данных;
- у большинства экранов предсказуемая структура `page -> widget -> model/ui`.

### Что ухудшает простоту

- слишком длинные hooks и repositories;
- много локальных helper-функций внутри одного файла;
- есть no-op и недоведённые до конца абстракции.

Примеры:

- `src/shared/hooks/useThrottleDebounce.js:1` - `useThrottle` пустой;
- `src/shared/lib/theme/theme.js:44` и `src/shared/lib/theme/theme.js:96` - `saveThemeMode` и `saveTheme` пустые;
- `src/main.jsx:18` - `StrictMode` закомментирован.

Это не ломает приложение напрямую, но создаёт ощущение незавершённого слоя и усложняет понимание того, что реально является production API.

## Оптимизация

### Уже хорошо

- route-level code splitting;
- lazy import analytics;
- lazy loading web SRS/progress repositories;
- PWA asset prefetch;
- chunking по страницам и большим widgets.

### Что можно улучшить

1. Отложить загрузку всех Hub-частей ещё сильнее.
2. Дробить settings-экран по вкладкам не только визуально, но и по import boundary.
3. Вынести тяжёлые нормализаторы import/export из always-on чанков.
4. Добавить bundle analysis в CI.
5. При росте таблиц слов подумать о virtualization.

## Безопасность

### Уже хорошо

- `contextIsolation: true`;
- `nodeIntegration: false`;
- preload bridge вместо прямого доступа к Node;
- есть CSP;
- import/export проходят через валидацию и ограничения размера.

### Чего не хватает

1. Явных `will-navigate` и `setWindowOpenHandler` ограничений в main process.
2. Только `https` для remote import.
3. Более безопасного хранения auth session.
4. Явного audit trail для sensitive IPC handlers.

## FSD verdict

### Что соблюдается

- слои названы правильно;
- pages остаются тонкими;
- widgets обычно агрегируют features/entities/shared;
- shared UI и shared config используются централизованно.

### Что нарушено

- `shared` и `entities` зависят от `app`;
- нет автоматического контроля зависимостей между слоями;
- некоторые widgets делят CSS напрямую.

Итог:

FSD в проекте скорее используется как directory convention, чем как жестко соблюдаемая dependency architecture.

## Сильные стороны проекта

- сильная продуктовая идея и понятный use case;
- хороший offline-first фундамент;
- реально удачная dual-platform архитектура;
- полезные shared use cases;
- аккуратный UI skeleton и page composition.

## Слабые стороны проекта

- слишком большие файлы;
- частичное нарушение FSD;
- дублирование desktop adapter logic;
- незавершённые abstraction-и;
- текущий lint snapshot не зелёный;
- security hardening desktop-версии ещё не завершён.

## Что улучшать в первую очередь

### Приоритет P1

1. Запретить `http` remote import.
2. Добавить navigation/window hardening для Electron.
3. Починить lint до зелёного состояния.
4. Удалить или объединить `desktopApi`.

### Приоритет P2

1. Разрезать `electron/main.js`.
2. Разрезать `useLearnFlashcardsPanel`.
3. Ввести FSD boundary rules в ESLint/CI.
4. Упростить `SettingsDatabasePanel` и `AppPreferencesSection`.

### Приоритет P3

1. Ввести TypeScript или хотя бы JSDoc contracts на platform services.
2. Добавить тесты на SRS/import-export.
3. Добавить bundle budget и perf monitoring.
4. Подготовить account/sync слой без разрушения текущей offline-first модели.
