# Где искать код

[English](module-catalog.md) | **Русский** | [Polski](module-catalog.pl.md)

Эта карта показывает основные точки входа версии 0.9.1. Она не перечисляет каждый компонент: для конкретной задачи ищите публичный `index.js`, соседнюю модель и тесты.

## Приложение и страницы

| Путь | Назначение |
| --- | --- |
| `src/main.jsx`, `src/app/App.jsx` | Запуск и подключение приложения |
| `src/app/layouts/AppLayout.jsx` | Общий layout |
| `src/app/router/` | Общие, web и desktop маршруты |
| `src/app/prerender/landingPrerender.jsx` | SSR лендинга |
| `src/pages/learn/` | Обучение |
| `src/pages/decks/`, `deck-details/`, `deck-editor/` | Библиотека и редактор |
| `src/pages/browse/` | Hub |
| `src/pages/progress/` | Прогресс и альбом стикеров |
| `src/pages/account/`, `settings/` | Аккаунт и настройки |
| `src/pages/landing/`, `share/` | Публичные web-страницы |

Сокращённые пути в одной ячейке относятся к одному родителю `src/pages/`.

## Виджеты и действия

| Модуль | Что смотреть |
| --- | --- |
| `src/widgets/LearnFlashcardsPanel/` | Сессия, данные для Flashcard, таймеры и оценки |
| `src/widgets/DeckEditorPanel/` | Поля колоды, создание и редактирование записей |
| `src/widgets/DecksOverviewPanel/` | Список, меню создания и переход к генерации |
| `src/widgets/DeckDetailsPanel/` | Страница локальной колоды |
| `src/widgets/BrowseDecksPanel/`, `BrowseDeckDetailsPanel/` | Список и карточка Hub |
| `src/widgets/ProgressOverviewPanel/` | Данные и UI прогресса |
| `src/features/flashcard/` | Карточка, блоки предметов и стили |
| `src/features/subject-fields/` | Поля формы по профилю предмета |
| `src/features/quick-add-words/` | Быстрое добавление и генерация колоды |
| `src/features/word-suggest/` | Подсказки, концепты, запросы и защита от устаревших ответов |
| `src/features/srs-rating-controls/` | Кнопки оценок |
| `src/features/deck-import/` | Пользовательский процесс импорта |
| `src/features/word-image-field/` | Добавление изображения |
| `src/features/app-preferences/`, `sync-settings/` | Настройки приложения и обмена |

Отдельное окно `GenerateDeckDialog` сейчас объявлено в `src/features/quick-add-words/ui/QuickAddWordsDialog.jsx`. Его стили находятся в `GenerateDeckDialog.css`; модель использует `useQuickAddWords` в режиме создания. Файла `GenerateDeckDialog.jsx` в этой версии нет.

## Общее ядро

Все пути ниже начинаются с `packages/shared/src/core/usecases/`.

| Каталог | Назначение |
| --- | --- |
| `subjects/` | Реестр предметов, поля, возможности, композиции и технологии |
| `cardContent/` | Содержимое карточки, изображения и построение представления |
| `srs/` | FSRS-5, интервалы, нормализация, очередь и лимиты |
| `importExport/` | Чтение и создание файлов колод, совпадения и медиа |
| `sync/` | Идентичность колоды, хэш, профиль и состояние обмена |
| `hub/` | Подготовка и проверка публикации |

Для математического текста смотрите `packages/shared/src/ui/MathFormula/`: `MathText`, `parseMathText`, `MathFormula` и локальный загрузчик KaTeX.

## Сервисы и инфраструктура shared

| Путь в `packages/shared/src/` | Назначение |
| --- | --- |
| `providers/PlatformProvider/` | Доступ UI к сервисам |
| `platform/target/` | Выбор web или desktop при сборке |
| `platform/web/` | IndexedDB и браузерные адаптеры |
| `platform/electron/` | Адаптеры API Electron |
| `api/` | Supabase auth, sync, Hub и ИИ; совместимый desktop API |
| `sync/` | Общий обмен библиотекой и изображениями |
| `config/` | Предпочтения, языки, маршруты, токены CSS и возможности ИИ |
| `lib/i18n/` | Переводы и форматирование |
| `lib/media/` | Подготовка изображений и URL локальных файлов |
| `ui/` | Общие элементы интерфейса |

## Electron и сервер

`electron/main.js` собирает приложение. Модули `electron/main/` отвечают за окно, меню, навигацию, импорт, резервные копии, OAuth и обновления. Обработчики IPC находятся в `electron/main/ipc/`, мост в `electron/preload.cjs`.

`electron/db/initDb.js` создаёт схему. `electron/db/services/` содержит операции колод, SRS, статистики, настроек, медиа и обмена. `electron/services/` содержит Hub, проверку целостности, путь базы, миграцию старого хранилища и сохранение токенов.

`supabase/migrations/` хранит серверную схему. `supabase/functions/suggest-word/` содержит ИИ, `delete-account/` удаление аккаунта. [Описание сервера](../supabase/README.ru.md).

## Сборка и проверки

`vite.config.js` выбирает target, маршруты, алиасы и манифест ресурсов. `scripts/prerender-landing.mjs` создаёт статические страницы. `public/sw.js` отвечает за web-кэш.

`scripts/check-*` проверяют слои, строки UI и упакованные зависимости. `scripts/acceptance/` содержит браузерные сценарии. `electron/scripts/` содержит интеграционные проверки SQLite. `.github/workflows/release.yml` собирает и публикует desktop-релиз.

[Полный список команд](onboarding.ru.md) · [Архитектура](architecture.ru.md)
