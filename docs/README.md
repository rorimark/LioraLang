# LioraLang documentation

**English** | [Русский](README.ru.md) | [Polski](README.pl.md)

For version 0.9.1. Last updated: October 4, 2026.

Start with the [README](../README.md) if you are new to the project. These documents cover everyday use and development. They describe the current app; release history is kept separately. English is the primary version. Every document also has Russian and Polish versions, linked below its title.

## For users

- [User guide](user-guide.md): decks, imports, reviews, AI and offline use.
- [Subjects and cards](learning-objects.md): languages, programming, mathematics and history.
- [SRS](srs.md): intervals, ratings, limits and the queue.
- [AI assistant](word-suggestions.md): features, settings, data and limitations.
- [Deck files](deck-format.md): transfer, format versions and examples.
- [Images](card-media.md): adding, storing and transferring pictures.

## For developers

- [Project guide](PROJECT_DOCUMENTATION.md): where to start a particular task.
- [Product overview](project-overview.md): what the app currently supports.
- [Setup and builds](onboarding.md): environment, commands, debugging and releases.
- [Architecture](architecture.md): layers, shared core and data flow.
- [Two-platform contract](architecture-dual-platform.md): services for web and Electron.
- [Storage and sync](platforms-and-storage.md): IndexedDB, SQLite, accounts and Hub.
- [Module map](module-catalog.md): where to find each feature.
- [Checks and limitations](code-audit.md): test coverage and areas needing attention.
- [Smoke checklist](smoke-checklist.md) and [verification baseline](baseline.md).
- [Supabase](../supabase/README.md): migrations, functions and moderation.

## Rules and history

- [Code and components](../rules/code-and-components-rules.md).
- [Interface](../rules/ui-rules.md).
- [Git and commits](../rules/git-and-commits-rules.md).
- [Bun status](../rules/bun-code-and-components-rules.md).
- [Release notes](releases/README.md).

When changing a feature, update its main document, affected setup instructions and all three language versions. Link to shared explanations instead of repeating them across technical documents.
