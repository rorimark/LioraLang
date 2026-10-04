# Smoke checklist

**English** | [Русский](smoke-checklist.ru.md) | [Polski](smoke-checklist.pl.md)

Choose scenarios for the change. Before a release, check everything on a current web build and installed desktop artifacts. Never use your only working deck for deletion or migration tests.

## Startup and shell

- Open web/desktop; check version, navigation and Back.
- Check light/dark, phone, landscape and wide screens.
- Settings list and content scroll separately on wide screens; search and return work on narrow screens.
- Check keyboard, focus, Escape, long labels and no page-wide horizontal overflow.

## Decks and cards

- Create a language deck, add a word/example, edit and reopen.
- Create Programming with arbitrary technology and front/back code; check wrapping and placement.
- Create Mathematics with field and inline formulas, hidden solution and invalid LaTeX.
- Create History with context/date/consequences; answer details reveal only on the back.
- Create a subject deck through Learn quick add; verify subject and language after save.
- Export/import every subject; check images, fields and explicit matching strategy.
- Check ordinary optional images and picture-side decks.

## Study

- Deck names fit; selector keyboard events do not flip cards too.
- Each grade saves once and intervals match previews.
- Write failure keeps the card; double press does not duplicate.
- Empty queue explains due time, limits or absence. Learning returns when due.
- Bonus sessions never take future cards; browsing leaves schedules unchanged.
- Day/focus/sync changes refresh correctly without background loading flashes.

## AI

- Master off blocks everything; re-enabling restores choices.
- Individual off blocks its task and cancels pending results.
- Suggestions preserve user text; language/deck changes discard late responses.
- Generator opens from Decks/Learn with appropriate subject fields.
- Edit a draft and code/formula side, exclude a card; nothing saves before creation.
- Create and reopen with selected cards and answer language intact.
- Check sign-in, offline, quota, errors and cancel. Model quality is separate from fixtures.

## Offline, accounts and Hub

- Cache online, disconnect, reload and open a previously unvisited section.
- Create, save, reopen and grade offline; images and math remain available.
- Sync a deck/image/progress to another device; repeated exchange is idempotent.
- Check account changes, pending operations, concurrent edits and conflict copies.
- Language publishing works; other subjects explain Hub restrictions.
- Reports, account deletion and library deletion use a separate test account.

## Release

Verify tag/package match, macOS/Windows installation, packaged startup, `.lioradeck` import and update metadata. Unsigned macOS updates need manual installation.

[Automated commands](onboarding.md) · [Coverage limits](code-audit.md)
