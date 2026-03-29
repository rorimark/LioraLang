# Module Catalog

## Общая карта проекта

На момент аудита в `src`, `electron`, `public` и `scripts` находится `319` файлов.

Распределение по ключевым зонам:

| Папка | Назначение | Файлов |
| --- | --- | ---: |
| `src/app` | вход приложения, layout, роутинг, провайдеры | 16 |
| `src/pages` | маршрутные страницы | 20 |
| `src/widgets` | крупные экранные блоки | 72 |
| `src/features` | отдельные пользовательские фичи | 61 |
| `src/entities` | доменные сущности | 13 |
| `src/shared` | общие UI/lib/config/platform/core модули | 95 |
| `electron` | main/preload/SQLite/services | 28 |
| `public` | manifest, offline page, icons, sw | 9 |
| `scripts` | release и boundary scripts | 3 |

## Root files

| Файл | Роль |
| --- | --- |
| `package.json` | скрипты, зависимости, electron-builder config |
| `vite.config.js` | alias-ы, platform target switching, build define |
| `eslint.config.js` | базовый ESLint для JS/JSX |
| `vercel.json` | настройки деплоя web-версии |
| `README.md` / `README.ru.md` / `README.pl.md` | продуктовые readme |

## `src/app`

| Файл/папка | Роль |
| --- | --- |
| `App.jsx` | глобальные эффекты приложения: тема, accessibility, router |
| `providers/PlatformProvider/*` | доступ к platform services |
| `router/routes.base.jsx` | общая маршрутная схема |
| `router/routes.web.jsx` | web routing, landing на `/` |
| `router/routes.desktop.jsx` | desktop routing, redirect в learn |
| `router/router.jsx` | создание browser router |
| `router/preloadRoutesForOffline.js` | прелоад lazy routes |
| `layouts/AppLayout.jsx` | shell приложения |

## `src/pages`

Все страницы intentionally thin и обычно только подключают один widget.

| Страница | Что рендерит |
| --- | --- |
| `landing` | `LandingMockPanel` |
| `learn` | `LearnFlashcardsPanel` |
| `decks` | `DecksOverviewPanel` |
| `deck-editor` | `DeckEditorPanel` |
| `deck-details` | `DeckDetailsPanel` |
| `browse` | `BrowseDecksPanel` или `BrowseDeckDetailsPanel` |
| `progress` | `ProgressOverviewPanel` |
| `settings` | `SettingsDatabasePanel` |
| `account` | `AccountHubPanel` |

## `src/widgets`

### Главные widgets

| Widget | Роль |
| --- | --- |
| `LearnFlashcardsPanel` | основной экран обучения и SRS-сессии |
| `DecksOverviewPanel` | библиотека локальных колод |
| `DeckEditorPanel` | форма создания/редактирования колоды |
| `DeckDetailsPanel` | просмотр колоды и слов |
| `BrowseDecksPanel` | список публичных колод Hub |
| `BrowseDeckDetailsPanel` | детали публичной колоды и импорт |
| `ProgressOverviewPanel` | аналитика обучения |
| `SettingsDatabasePanel` | все настройки и desktop utilities |
| `DesktopTitleBar` | desktop-only title bar layer |
| `NavbBar` | боковая и mobile navigation |
| `PageHeader` | заголовок текущей страницы |
| `LandingMockPanel` | маркетинговый landing block |
| `AccountHubPanel` | заглушка под будущий account/sync слой |

### Что обычно лежит внутри widget

- `ui/*` - JSX и CSS;
- `model/*` - hook или context;
- `index.js` - public API.

## `src/features`

| Feature | Роль |
| --- | --- |
| `deck-import` | импорт из файла, текста и пакета |
| `deck-delete` | удаление колоды |
| `deck-rename` | переименование колоды |
| `flashcard` | UI одной карточки |
| `srs-rating-controls` | кнопки рейтинга карточки |
| `card-catalog` | фильтры, сортировка, пагинация слов |
| `theme-switch` | переключение темы |
| `shortcut-settings` | настройки клавиатурных shortcut-ов |
| `app-preferences` | большие формы настроек приложения |
| `runtime-error` | показ runtime error modal |
| `integrity-repair` | запуск repair flow для БД |

## `src/entities`

### Deck

| Файл | Роль |
| --- | --- |
| `model/useDecks.js` | загрузка списка колод |
| `model/useDeckWords.js` | слова конкретной колоды |
| `model/useDeckTagsPopover.js` | локальная UI-логика тегов |
| `ui/DecksTable/*` | таблица колод |

### Word

| Файл | Роль |
| --- | --- |
| `model/useWords.js` | загрузка списка слов |
| `model/useWordsTable.js` | табличная логика слова |
| `ui/WordsTable/*` | таблица слов |
| `api/wordsApi.js` | получение fallback words |
| `lib/wordsStorage.js` | утилиты вокруг локальных слов |

## `src/shared`

### `shared/ui`

Переиспользуемые UI primitives:

- `Button`
- `TextInput`
- `Tabs`
- `Panel`
- `SectionHeader`
- `InlineAlert`
- `ActionModal`
- `ToastViewport`
- `NavTab`
- `MetaBadge`
- `RouteErrorBoundary`
- `RouteHydrateFallback`

### `shared/config`

| Файл | Роль |
| --- | --- |
| `routes.js` | route constants и page meta |
| `languages.js` | языки по умолчанию и список опций |
| `settingsTabs.js` | tab keys и section ids |
| `externalLinks.js` | внешние ссылки |
| `variables.css` | theme tokens |

### `shared/lib`

Основные зоны:

- `appPreferences` - нормализация и хуки пользовательских настроек;
- `shortcutSettings` - shortcut schema и hooks;
- `theme` - применение темы и desktop title bar sync;
- `pwa` - регистрация service worker и asset prefetch;
- `seo` - мета-теги страницы;
- `a11y` - dialog a11y и pointer focus guard;
- `toast`, `clipboard`, `date`, `word`, `debug`.

### `shared/core/usecases`

Здесь лежит самая полезная platform-agnostic бизнес-логика:

- `srs/srsEngine.js`
- `importExport/deckPackage.js`
- `progress/buildProgressOverview.js`
- `hub/publishDeck.js`

### `shared/platform`

| Файл | Роль |
| --- | --- |
| `createPlatformServices.js` | выбор платформенного набора сервисов |
| `electron/createElectronPlatformServices.js` | desktop repositories/gateways |
| `web/createWebPlatformServices.js` | web repositories/gateways |
| `web/model/*` | IndexedDB repositories |
| `web/db/webDb.js` | IndexedDB schema и transaction helpers |

## `electron`

### Ключевые файлы

| Файл | Роль |
| --- | --- |
| `main.js` | основной Electron runtime |
| `preload.cjs` | безопасный bridge в renderer |
| `db/db.js` | открытие и закрытие SQLite |
| `db/initDb.js` | инициализация БД |
| `db/services/db.services.js` | CRUD колод и слов |
| `db/services/srs.services.js` | SRS snapshot и grading |
| `db/services/progress.services.js` | сводка прогресса |
| `db/services/settings.services.js` | app settings |
| `db/services/import-export.js` | deck package import/export |
| `services/hub.service.js` | работа с Supabase из main process |
| `services/integrity.service.js` | integrity verify/repair |
| `services/dbPath.service.js` | смена пути БД |
| `services/legacyStorageMigration.service.js` | перенос старых данных |

## `public`

| Файл | Роль |
| --- | --- |
| `manifest.webmanifest` | PWA manifest |
| `sw.js` | service worker |
| `offline.html` | offline fallback |
| `icons/*` | иконки PWA |
| `data/words.json` | fallback deck dataset |

## `scripts`

| Файл | Роль |
| --- | --- |
| `release-notes.mjs` | генерация release notes |
| `release-publish.mjs` | release publish flow |
| `check-no-electron-imports.sh` | проверка, что renderer не ходит в Electron напрямую |

## Где лежат самые важные публичные API проекта

Если нужно понять проект быстро, полезнее всего открыть именно эти файлы:

1. `src/main.jsx`
2. `src/app/App.jsx`
3. `src/app/layouts/AppLayout.jsx`
4. `src/app/router/routes.base.jsx`
5. `src/shared/platform/createPlatformServices.js`
6. `src/shared/platform/web/createWebPlatformServices.js`
7. `src/shared/platform/electron/createElectronPlatformServices.js`
8. `src/shared/core/usecases/srs/srsEngine.js`
9. `src/shared/core/usecases/importExport/deckPackage.js`
10. `electron/main.js`
11. `electron/preload.cjs`
12. `electron/db/services/*.js`
