# LioraLang

**English** | [Русский](README.ru.md) | [Polski](README.pl.md)

LioraLang helps you learn from your own flashcards. Create a deck, add what you want to remember, and review it when it is due. It runs in a browser and as a desktop app. Local study works without an account.

[Open the web app](https://liora-lang.vercel.app/app/learn) · [Download the desktop app](https://github.com/rorimark/LioraLang/releases/latest) · [Documentation](docs/README.md)

## What you can learn

| Subject | What a card contains |
| --- | --- |
| Languages | A word, translation, optional third language, examples, CEFR level, part of speech, tags and pictures |
| Programming | A term or question, answer, optional code, difficulty and notes |
| Mathematics | A problem or rule, answer, LaTeX formulas and solution steps |
| History | A question, background, answer, date and consequences |

Each subject has its own editor fields and card layout. Programming uses a calm editor design with technology tabs for SQL, CSS, PHP, JavaScript, Rust, Java, C++, C and C#. You can enter other technologies too.

Math renders in questions, answers and explanations as well as in the formula field. Code is displayed, never executed. Code and formulas can belong to the question or the answer, so a solution can stay hidden until you reveal it.

## Everyday use

1. Create or import a deck in **Decks**. Choose its subject and, for non-language subjects, the answer language.
2. Add cards in the editor or from **Learn**. Language decks also accept pasted word lists.
3. Reveal the answer and choose Again, Hard, Good or Easy. FSRS-5 schedules the next review.
4. Use **Progress** to see activity, upcoming reviews and earned stickers.
5. Export a `.lioradeck` file when you want to share a deck or keep a copy.

AI can suggest a card or generate a whole deck in a separate window. Review and edit the drafts before saving. A master switch and six separate function switches are in **Settings → AI assistant**. AI requires an account, an internet connection and remaining daily allowance. The current server allowance is 300 requests per account per UTC day; provider availability can impose additional limits.

## Local data and online features

The web app stores decks, review history and images in IndexedDB. Visit it online first to cache the app for offline use. Clearing browser site data can erase local decks, so keep exports of important material.

The desktop app uses SQLite. Current release builds are available for macOS on Apple Silicon and Windows x64. They are not code-signed. macOS releases need to be downloaded manually because automatic installation requires signing.

An optional account syncs your library and review progress between devices. The public Hub currently accepts language decks, including picture decks. Programming, Mathematics and History decks can be exported and synced privately, but cannot yet be published to the Hub.

The interface supports English, Ukrainian, Russian, Polish, German, Spanish, French, Italian, Portuguese, Turkish, Czech and Japanese. Interface language, answer language and programming technology are separate choices.

## Run the project

Use Node.js 22.12 or newer and pnpm 10.33.0. Node.js 24 also works.

```sh
git clone https://github.com/rorimark/LioraLang.git
cd LioraLang
pnpm install --frozen-lockfile
pnpm dev:web
```

Open `http://localhost:5175`. For the Electron app, run `pnpm dev`. If the native SQLite module needs rebuilding, run `pnpm rebuild:native` first.

Local editing and review do not require Supabase credentials. Authentication, Hub, sync and AI do. Configuration, checks and release instructions are in the [developer guide](docs/onboarding.md).

## Find the right document

Every document has complete English, Russian and Polish versions. English is primary.

- [User guide](docs/user-guide.md): creating decks, studying, AI and common problems.
- [Architecture](docs/architecture.md): React, shared domain logic and platform services.
- [Subjects and card layouts](docs/learning-objects.md): adding new subjects without hardcoding two deck types.
- [Deck file format](docs/deck-format.md): compatibility, examples and import limits.
- [SRS](docs/srs.md), [images](docs/card-media.md), [AI](docs/word-suggestions.md) and [storage and sync](docs/platforms-and-storage.md).
- [Release notes](docs/releases/README.md) and [contribution rules](rules/code-and-components-rules.md).

This documentation describes version 0.9.1. Release notes describe the behavior of each older version.
