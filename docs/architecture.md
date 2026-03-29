# Architecture

## Общая схема

Проект построен вокруг одного React-приложения, которое на этапе сборки получает разные платформенные адаптеры.

Схема высокого уровня:

`React UI -> PlatformProvider -> platform services -> desktop/web repositories -> local storage / Hub`

## Boot flow

### 1. Точка входа

Файл `src/main.jsx`:

- монтирует React root;
- при web build лениво подключает `@vercel/analytics`;
- оборачивает приложение в `PlatformProvider`.

### 2. Провайдер платформы

Файлы `src/app/providers/PlatformProvider/*`:

- создают и кэшируют набор platform services;
- делают их доступными во всем приложении;
- позволяют UI не знать, desktop это или web.

### 3. Приложение

Файл `src/app/App.jsx`:

- применяет тему;
- применяет startup accessibility preferences;
- запускает глобальные эффекты уровня приложения;
- рендерит роутер.

### 4. Layout и роутинг

Файлы `src/app/layouts/AppLayout.jsx` и `src/app/router/*`:

- строят shell приложения;
- выбирают маршруты для web и desktop;
- подключают `DesktopTitleBar`, `NavBar`, `PageHeader`;
- подписываются на desktop runtime events;
- регистрируют PWA и прелоад route chunks.

## Маршрутизация

Есть два варианта route tree:

- `src/app/router/routes.web.jsx`
- `src/app/router/routes.desktop.jsx`

Разница:

- у web есть landing page на `/`;
- у desktop корень сразу редиректит в `/app/learn`.

Остальные страницы общие:

- `learn`
- `decks`
- `deck-editor`
- `deck-details`
- `browse`
- `progress`
- `settings`
- `account`

## Platform abstraction

Это самая сильная архитектурная идея проекта.

`src/shared/platform/createPlatformServices.js` выбирает target implementation:

- `src/shared/platform/target/web.js`
- `src/shared/platform/target/desktop.js`

Дальше UI работает только с интерфейсами сервисов:

- `deckRepository`
- `settingsRepository`
- `hubRepository`
- `srsRepository`
- `progressRepository`
- `systemRepository`
- `runtimeGateway`

Именно это позволяет держать один UI-код и не размазывать условные `if (desktop)` по компонентам.

## Слои приложения

Проект внешне разложен по FSD:

- `app`
- `pages`
- `widgets`
- `features`
- `entities`
- `shared`

### Что работает хорошо

- страницы в основном тонкие;
- крупная композиция собрана в `widgets`;
- переиспользуемые примитивы вынесены в `shared/ui`;
- бизнес-логика SRS и import/export лежит в `shared/core/usecases`.

### Где есть отклонения

- нижние слои напрямую зависят от `@app/providers`;
- `shared` знает об `app`, что противоречит FSD-направлению зависимостей;
- нет полноценного lint enforcement для границ слоев;
- есть style coupling между виджетами.

Подробности см. в [code-audit.md](./code-audit.md).

## Потоки данных

### Deck management flow

1. страница рендерит widget;
2. widget вызывает model hook;
3. hook берет `deckRepository` через platform service;
4. repository идёт либо в Electron IPC, либо в IndexedDB;
5. результат нормализуется и возвращается в UI.

### Learn flow

1. `LearnFlashcardsPanel` выбирает колоду;
2. `srsRepository` получает snapshot сессии;
3. UI показывает карточку и доступные рейтинги;
4. при оценке карточки вызывается `gradeSrsCard`;
5. новое состояние возвращается обратно в UI.

### Browse / Hub flow

1. widget вызывает `hubRepository`;
2. web-версия использует Supabase напрямую;
3. desktop-версия использует Electron service;
4. пакет колоды скачивается, валидируется и импортируется локально.

## Архитектурные плюсы

- понятная развязка между UI и storage/runtime;
- shared use cases реально переиспользуются;
- data storage локализован по платформам;
- route-level lazy loading уже включён.

## Архитектурные минусы

- часть логики держится в слишком больших файлах;
- много ответственности внутри widget model hooks;
- нет единого контракта для FSD-boundaries на уровне ESLint;
- desktop bridge и часть platform code дублируются.
