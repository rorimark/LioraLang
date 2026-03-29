# Onboarding

## Что нужно знать перед стартом

LioraLang - это не два разных приложения, а один React-код с двумя платформенными рантаймами.

Главная мысль для нового разработчика:

- UI и доменная логика в `src`;
- Electron shell и SQLite - в `electron`;
- web persistence - в `src/shared/platform/web`;
- общий контракт между ними - platform services.

## Быстрый старт

### Требования

- Node.js 20+
- pnpm 10+

### Установка

```bash
pnpm install
```

### Запуск

Desktop development:

```bash
pnpm dev
```

Web development:

```bash
pnpm dev:web
```

### Проверки

```bash
pnpm lint
pnpm check:boundaries
pnpm check:persistence
```

### Сборки

Web production build:

```bash
pnpm build:web
```

Desktop renderer build:

```bash
pnpm build:desktop
```

Локальные installer builds:

```bash
pnpm dist:local
pnpm dist:local:mac
pnpm dist:local:win
```

## Как читать проект

### Если нужно понять UI

Смотри в таком порядке:

1. `src/main.jsx`
2. `src/app/App.jsx`
3. `src/app/layouts/AppLayout.jsx`
4. `src/app/router/*`
5. нужную страницу в `src/pages/*`
6. соответствующий widget
7. model hook widget-а

### Если нужно понять storage

Desktop:

1. `electron/preload.cjs`
2. `src/shared/platform/electron/createElectronPlatformServices.js`
3. `electron/main.js`
4. `electron/db/services/*`

Web:

1. `src/shared/platform/web/createWebPlatformServices.js`
2. `src/shared/platform/web/model/*`
3. `src/shared/platform/web/db/webDb.js`

### Если нужно понять доменную логику

Смотри:

- `src/shared/core/usecases/srs/srsEngine.js`
- `src/shared/core/usecases/importExport/deckPackage.js`
- `src/shared/core/usecases/progress/buildProgressOverview.js`

## Как правильно добавлять новый код

### Новая страница

1. создать `src/pages/<page-name>`;
2. держать страницу тонкой;
3. собирать экран из widget-ов;
4. зарегистрировать route.

### Новый widget

Подходит, когда нужен крупный экранный блок с собственной model/ui-логикой.

Ожидаемая структура:

- `index.js`
- `model/*`
- `ui/*`

### Новая feature

Подходит для изолированного пользовательского сценария:

- modal;
- toolbar controls;
- form section;
- independent filters/pagination.

### Новый shared module

Нужно убедиться, что модуль действительно универсален и не зависит от `app/pages/widgets/features/entities`.

Если модуль знает о конкретном route flow или об app-specific context, это уже плохой кандидат для `shared`.

## Что важно не ломать

1. Renderer не должен лезть в Electron напрямую в обход platform layer.
2. Web и desktop должны продолжать использовать один UI-код.
3. Изменения в storage contracts нужно проверять на обеих платформах.
4. Любой новый крупный hook лучше сразу дробить, а не выращивать ещё один монолит.

## Что особенно стоит покрыть тестами в будущем

- SRS scheduling;
- import/export package validation;
- duplication strategy при импорте;
- platform service contracts;
- integrity repair;
- migration paths.

## Полезные документы после onboarding

- [project-overview.md](./project-overview.md)
- [architecture.md](./architecture.md)
- [platforms-and-storage.md](./platforms-and-storage.md)
- [module-catalog.md](./module-catalog.md)
- [code-audit.md](./code-audit.md)
