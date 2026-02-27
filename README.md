# LioraLang

> Languages: **English (default)** | [Русский](README.ru.md) | [Polski](README.pl.md)

Stop collecting random words you never remember.

**LioraLang is the language app that finally sticks.**
It turns your real vocabulary into a daily learning loop you can actually maintain: custom decks, powerful flashcards, spaced repetition, and full offline ownership.

If you are serious about speaking, writing, and thinking faster in another language, this becomes your daily tool, not another abandoned app.

## Why You Won't Want to Learn Without It

- You learn **your words**, not generic textbook filler.
- You keep everything local: no forced cloud, no account lock-in, no dependency on servers.
- You build decks for real goals: jobs, interviews, travel, exams, relocation, hobbies.
- You review with large, immersive flip cards designed to keep momentum.
- You can import/export decks and share them with friends, students, or communities.

## What Makes LioraLang Different

- `Learn` mode with full-screen style flashcards and smooth flip interaction.
- `Decks` system: create, edit, rename, delete, import, export.
- Deck detail pages with filtering and pagination for fast navigation.
- Deck editor with languages, description, tags, and full words table.
- `Progress` section with modern visual analytics.
- Light and dark themes.
- Desktop-first experience with local SQLite storage.

## Who This Is Built For

- Learners tired of one-size-fits-all apps.
- People who want controlled, high-quality vocabulary growth.
- Users who value privacy and local-first data ownership.
- Anyone who wants a system they can trust for months and years.

## Typical Flow

1. Create a deck for a real objective.
2. Add words, meanings, tags, and examples from your real life.
3. Review daily in `Learn` mode.
4. Refine, export, and share decks.
5. Repeat until your vocabulary becomes automatic.

## Import/Export Format

LioraLang supports deck package import/export with metadata + words.
Minimum required word field: `source`.

```json
{
  "format": "lioralang.deck",
  "version": 1,
  "deck": {
    "name": "Travel Basics",
    "description": "Core words for travel",
    "sourceLanguage": "English",
    "targetLanguage": "Polish",
    "tertiaryLanguage": "Russian",
    "tags": ["travel", "starter"]
  },
  "words": [
    {
      "id": "w1",
      "source": "apple",
      "target": "jablko",
      "tertiary": "яблоко",
      "level": "A1",
      "part_of_speech": "noun",
      "tags": ["food", "basic"],
      "examples": ["I eat an apple."]
    }
  ]
}
```

## Optional: Build It Yourself

### Requirements

- Node.js 20+
- pnpm 10+

### Install

```bash
pnpm install
```

### Run

```bash
pnpm run dev
```

### Build installers

```bash
pnpm run build
pnpm run dist:test
```

Installer artifacts are generated in `release/`.

## Troubleshooting

### Electron failed to install correctly

```bash
pnpm approve-builds
pnpm install
```

### better-sqlite3 NODE_MODULE_VERSION mismatch

```bash
pnpm run rebuild:native
```

### White screen in packaged app (`index-*.js/css` not found)

```bash
pnpm run build
pnpm run dist:test
```
