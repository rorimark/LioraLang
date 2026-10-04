# Project guide

**English** | [Русский](PROJECT_DOCUMENTATION.ru.md) | [Polski](PROJECT_DOCUMENTATION.pl.md)

Liora 0.9.1 is a React app with IndexedDB in the browser and SQLite in Electron. Subjects, card content, file formats, SRS and sync rules share common code. Online features use Supabase, and AI calls Gemini through a server function.

## Where to start

| Task | Read first | Main code |
| --- | --- | --- |
| Setup or build failure | [Onboarding](onboarding.md) | `package.json`, `vite.config.js`, `electron/`, `scripts/` |
| New field or subject | [Subjects](learning-objects.md), [file format](deck-format.md) | `packages/shared/src/core/usecases/subjects/`, editor, storage adapters |
| Card or form | [UI rules](../rules/ui-rules.md) | `src/features/flashcard/`, `src/features/subject-fields/`, relevant widget |
| Intervals or queue | [SRS](srs.md) | `packages/shared/src/core/usecases/srs/`, `useSrsSession`, both repositories |
| Generation or suggestions | [AI](word-suggestions.md) | `src/features/word-suggest/`, `src/features/quick-add-words/`, `supabase/functions/suggest-word/` |
| Import or sync | [Storage](platforms-and-storage.md), [format](deck-format.md) | shared core, `packages/shared/src/sync/`, platform repositories |
| Server or Hub | [Supabase](../supabase/README.md) | migrations and Edge Functions |

The [module map](module-catalog.md) lists entry points. [Architecture](architecture.md) explains the layers.

## Behavior to preserve

Language decks remain compatible when they do not need a new feature. Export selects the minimum format version required by content. Unknown subjects and unsupported versions must fail clearly, without losing fields.

One entry has one review schedule. Changing direction or presentation does not create another SRS unit. New subjects get fields and layouts from profiles, rather than checks for subject names throughout the UI.

Local study does not require an account. Saving must work without AI, Hub or a network connection. AI output remains a draft until the user applies it or creates a deck.

## Before finishing

Check the affected platforms, run suitable [checks](onboarding.md), and update the feature document in all three languages. For a release, also check the packaged app and add notes to `docs/releases/`.

The [baseline](baseline.md) belongs to a specific version and does not verify later changes. [Quality notes](code-audit.md) describe known limitations rather than promising no bugs.
