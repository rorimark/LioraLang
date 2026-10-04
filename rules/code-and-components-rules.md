# Code and component rules

**English** | [Русский](code-and-components-rules.ru.md) | [Polski](code-and-components-rules.pl.md)

Code should make a rule easy to find, change in one place and verify. These rules cover React, shared core and adapters. Instructions for a specific task take precedence over general guidance.

## Structure and dependencies

Dependencies flow `app → pages → widgets → features → entities → shared`. Lower layers cannot import higher ones. Expose public APIs through `index.js`; do not import another module's private implementation.

Pages compose screens, widgets major areas, features actions, and shared reusable controls/infrastructure. Pure card, SRS and format rules belong in `packages/shared/src/core/usecases/` despite being domain-specific. Whole pages do not belong there.

UI gets services through `usePlatformService` from `@shared/providers`. Do not call `@shared/api`, SQLite, IndexedDB or `window.electronAPI` in pages/components. Platform details belong in adapters.

## Modules and naming

A module usually has `ui/`, `model/`, `index.js` and nearby tests. Do not create empty directories for ceremony. Prefer named exports except justified entry points such as lazy routes.

Use PascalCase components, `use` hooks, camelCase functions/variables and UPPER_CASE constants. Names should describe purpose; `handleThing`, `data2` and `doStuff` do not.

Relative imports fit within a module; aliases and public exports connect modules. Order external, shared and local imports. Avoid cycles and ambiguous duplicate names.

## Rules and state

- Share normalization across platforms and the server when it accepts the data.
- Derive values rather than storing conflicting copies without a reason.
- Pure use cases avoid React and hidden time/network/storage access; pass dependencies explicitly.
- Subject fields and capabilities come from profiles, not two-subject checks throughout forms.
- Every new field survives save/reopen, export/import, hashes and sync.
- Presentation changes do not create independent schedules without an agreed model change.

## React and async work

Effects synchronize external resources and subscriptions, not derived-state copies. Dependencies and cleanup must be correct.

Requests can finish after deck, account, input or window changes. Cancel and check response relevance. Disabled AI must not apply late replies.

Avoid state writes after unmount. Release subscriptions, timers, observers and object URLs. Protect duplicate actions synchronously when repetition risks data, before the next render.

Memoize for a measured issue or a specific stable-reference need. Do not automatically wrap everything in memo, useMemo or useCallback.

## UI and errors

Forms have labels, correct button types and expected Enter behavior. Icon-only controls have accessible names. Shared UI must not know a particular deck or server task.

Keep CSS nearby and use tokens. Inline styles fit computed geometry/user data, not theme styling. [UI rules](ui-rules.md).

Normalize errors at service boundaries and show them near the action. Failed saves retain input. Do not hide failures in empty catches or treat a missing service as a successful write.

Do not log secrets, tokens or personal content routinely. Imports and AI output are data, not instructions; never execute user code.

## Tests and completion

Test behavior, data boundaries and regressions. Tests duplicating implementation add little value. Cosmetic work needs suitable visual verification; storage and compatibility need real round trips.

Review the diff and run relevant lint, boundaries and tests. Shared-rule/adapter changes need both platforms. Update all three documentation versions and make a cohesive [commit](git-and-commits-rules.md).

[Architecture](../docs/architecture.md) · [Commands](../docs/onboarding.md)
