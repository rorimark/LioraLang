# Контракт web и desktop

[English](architecture-dual-platform.md) | **Русский** | [Polski](architecture-dual-platform.pl.md)

UI работает через одинаковые сервисы на обеих платформах. Различается транспорт: web обращается к браузерным хранилищам, desktop к API Electron. Общие правила остаются в ядре.

## Как подключается платформа

1. Vite выбирает `@platform-target` по режиму сборки.
2. Модуль `platform/target/web.js` или `desktop.js` создаёт набор сервисов.
3. `PlatformProvider` из `@shared/providers` передаёт набор приложению.
4. Модели UI вызывают `usePlatformService("имяСервиса")`.

Основные реализации:

- `packages/shared/src/platform/web/createWebPlatformServices.js`.
- `packages/shared/src/platform/electron/createElectronPlatformServices.js`.
- `packages/shared/src/providers/PlatformProvider/`.

## Доступные сервисы

| Сервис | Назначение |
| --- | --- |
| `authRepository` | Аккаунт и состояние авторизации |
| `deckRepository` | Колоды, записи, импорт и экспорт |
| `mediaRepository` | Изображения и уведомления об их изменении |
| `settingsRepository` | Настройки приложения |
| `hubRepository` | Публичные колоды и публикация |
| `srsRepository` | Очередь и запись оценки |
| `progressRepository` | Статистика и состояние изучения колоды |
| `syncRepository` | Обмен личной библиотекой и прогрессом |
| `systemRepository` | Путь базы, папки и проверка целостности на desktop |
| `wordSuggestRepository` | Подсказки и генерация через сервер |
| `runtimeGateway` | Окно, версия, события среды и обновления |

Не все возможности среды одинаковы. Web не может открыть папку базы, перенести SQLite или установить desktop-обновление. Адаптер возвращает понятное отсутствие возможности; интерфейс должен учитывать это, а не пробовать Electron из браузера.

Auth и ИИ используют общий Supabase API. Текущий Hub-репозиторий использует общую web-реализацию и на desktop. Нельзя считать, что любой сетевой вызов desktop обязательно проходит через IPC.

## Правила изменений

- Не импортируйте `electron/` из `src/` и не вызывайте `window.electronAPI` в компонентах.
- Не обращайтесь к `@shared/api` из страниц, виджетов и фич напрямую.
- Новое правило нормализации, SRS или формата файла сначала добавьте в общее ядро.
- При изменении контракта обновите оба адаптера и проверки сохранения.
- Системную функцию, доступную только на desktop, обозначайте как такую в UI.

Для web запускайте `pnpm dev:web`, для desktop `pnpm dev`. Сборки: `pnpm build:web` и `pnpm build:desktop`. [Подробный запуск](onboarding.ru.md) · [Хранилища](platforms-and-storage.ru.md)
