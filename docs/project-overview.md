# Product overview

**English** | [Русский](project-overview.ru.md) | [Polski](project-overview.pl.md)

LioraLang helps people remember their own material with flashcards and spaced repetition. The basic loop is to add material, recall an answer, rate it, and return when it is due.

It supports words and expressions, programming, mathematical rules and problems, historical events and causal relationships. Users choose their material or review drafts suggested by AI.

## Features in 0.9.1

- Deck creation, editing, quick add, import and export.
- Four subjects with their own fields and layouts: languages, programming, mathematics and history.
- FSRS-5, daily limits, session settings, free browsing and bonus sessions.
- Images on language cards and decks with an entire picture side.
- LaTeX in mathematical text and a separate formula field.
- AI for language suggestions, non-language cards and editable deck generation.
- Progress, an activity calendar and achievement stickers.
- Optional accounts, private sync, device management and a public Hub for language decks.
- A web app with offline caching, desktop releases for macOS Apple Silicon and Windows x64.
- Light and dark themes, responsive navigation and twelve interface languages.

## How subjects differ

Language cards focus on words and translations. Programming uses a term, question and optional code in a calm editor pane. Mathematics shows formulas and solution steps. History uses context, dates and consequences.

The subject defines the editor and card composition. A technology changes programming appearance without making SQL, PHP or Rust a separate subject. Arbitrary technologies use the general Programming profile.

Interface language does not determine the answer language. Non-language decks have a separate content language that AI follows. [Subject details](learning-objects.md).

## Local and online features

Editing, browsing, reviews, statistics and deck files work locally. Web uses IndexedDB, desktop uses SQLite. The web app needs an initial online visit to cache its resources.

Accounts, sync, Hub and AI use the server. AI sends the relevant material to its provider and needs a connection. Private sync supports all current subjects; public Hub currently supports languages.

## Product limits

Card code is not executed, and formulas are not solved automatically. AI can be wrong, so drafts need review. There is no built-in local model, image generation, complete PDF import or automatic extraction from arbitrary websites.

Clearing browser data can erase the local library. A deck export is not an account backup. Concurrent editing can create conflict copies. Desktop builds are unsigned, and macOS updates are installed manually.

## Adding features

Add a subject when it has useful differences in fields or recall. Its profile should describe these differences, work offline and survive export, import and sync. Services and the scheduler remain shared.

Implementation steps are in [architecture](architecture.md) and [subjects](learning-objects.md). The [user guide](user-guide.md) describes everyday use.
