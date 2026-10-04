# Deck files

**English** | [Русский](deck-format.ru.md) | [Polski](deck-format.pl.md)

A `.lioradeck` file is JSON containing a deck's material. It supports sharing, transfer and a content copy, without personal answer history, account settings or the entire database.

Shared functions are in `packages/shared/src/core/usecases/importExport/deckPackage.js`: `parseDeckPackageFileText`, `validateDeckPackageObject`, `buildExportDeckPackage`. Both platforms use them.

## Structure

```json
{
  "format": "lioralang.deck",
  "version": 1,
  "deck": {
    "name": "Travel words",
    "sourceLanguage": "English",
    "targetLanguage": "Polish",
    "tags": [
      "travel"
    ]
  },
  "words": [
    {
      "id": "ticket",
      "source": "ticket",
      "target": "bilet",
      "level": "A1",
      "part_of_speech": "noun",
      "examples": [
        "I bought a train ticket."
      ],
      "tags": [
        "transport"
      ]
    }
  ]
}
```

Export adds time, hash, sync identity and origin metadata. Let the app compute `contentHash`; the example omits optional metadata.

Import also accepts supported legacy `.lioralang`, `.json` and entry arrays. Field aliases support old files, not the new internal contract. Prefer app export between versions.

## Subjects

`deck.subject` identifies the subject; absent or empty means language. Deck fields live in `deck.subjectFields`, entry fields in `word.subjectFields`.

```json
{
  "format": "lioralang.deck",
  "version": 5,
  "deck": {
    "name": "Rust basics",
    "subject": "programming",
    "subjectFields": {
      "technology": "Rust",
      "contentLanguage": "Polish"
    }
  },
  "words": [
    {
      "id": "borrowing",
      "source": "What is borrowing?",
      "target": "Dostęp przez referencję bez przenoszenia własności.",
      "subjectFields": {
        "code": "let reference = &value;",
        "codeSide": "back",
        "difficulty": "easy"
      }
    }
  ]
}
```

Mathematics and history use format 6. [Fields and defaults](learning-objects.md). JSON strings escape backslashes, for example `"x = \\pm 2"`.

## Mathematics and history examples

A mathematics deck with an answer-side formula:

```json
{
  "format": "lioralang.deck",
  "version": 6,
  "deck": {
    "name": "Square roots",
    "subject": "mathematics",
    "subjectFields": {
      "area": "Algebra",
      "contentLanguage": "English"
    }
  },
  "words": [
    {
      "id": "roots",
      "source": "Solve $x^2 = 4$.",
      "target": "Two roots: $x = 2$ and $x = -2$.",
      "subjectFields": {
        "formula": "x = \\pm 2",
        "formulaSide": "back",
        "steps": "1. Take the square root.\n2. Include both signs.",
        "difficulty": "easy"
      }
    }
  ]
}
```

A history card with date and consequences on the back:

```json
{
  "format": "lioralang.deck",
  "version": 6,
  "deck": {
    "name": "French Revolution",
    "subject": "history",
    "subjectFields": {
      "period": "18th-century France",
      "contentLanguage": "English"
    }
  },
  "words": [
    {
      "id": "bastille",
      "source": "When was the Bastille stormed?",
      "target": "July 14, 1789.",
      "subjectFields": {
        "context": "The start of the French Revolution.",
        "date": "July 14, 1789",
        "consequences": "Became a symbol of the revolution.",
        "difficulty": "easy"
      }
    }
  ]
}
```

Context is visible before the answer: do not put the requested date there. Default fields may be omitted on export, such as `formulaSide: "back"`.

## Versions and compatibility

Current clients read formats 1 through 6. Export chooses the minimum version needed by content. App version and format version differ.

| Format | Capability requiring it |
| --- | --- |
| 1 | Ordinary language decks and legacy picture-side decks |
| 2 | Basic programming decks |
| 3 | Answer-side code |
| 4 | Optional image alongside ordinary language text |
| 5 | Explicit subject answer language |
| 6 | Mathematics and history |

Programming with both answer language and answer-side code exports as 5. Ordinary language decks without new features remain 1.

Older clients reject newer formats to prevent losing code, pictures or language after saving. Do not manually lower the version to bypass protection. Unknown subjects are rejected too.

## Images

Entries hold `image: { assetId, alt }`. `assetId` uses a SHA-256 byte hash. `media` contains referenced images with MIME type and base64 data. Unreferenced files are excluded.

`pictureSide` describes an entire image side. An optional image in a normal word card is a different capability and requires format 4. [Image processing](card-media.md).

## Normalization and limits

| Limit | Value |
| --- | --- |
| Entries | 50,000 |
| Deck or entry tags | 10 |
| Examples per entry | 1,000 |
| Ordinary text field | 500 characters |
| Deck description | 2,000 characters |
| Media files | 10,000 |
| One media file | 3 MiB |

Subject strings have profile-specific limits, such as 4,000 characters of code. Normalization can truncate long text and remove unsupported fields; check results before bulk import. Transport limits belong to each adapter and differ from format limits.

Languages are checked against supported values. Non-language subjects need no language pair. Image sides may have no text; ordinary cards need meaningful content on both sides.

## Matching entries

- `skip`: keep the existing entry.
- `update`: apply imported content to the match.
- `keep_both`: preserve both.

The strategy must be explicit. Import must not silently choose between field loss and duplication. Review matches, images and subject fields before confirming.

## Format-change checks

Check old language files, round trips for every subject, normalized hashes, IndexedDB and SQLite persistence, media transfer and older-client rejection. A unit test building an object alone does not verify persistence.

[Architecture](architecture.md) · [Storage](platforms-and-storage.md) · [Checks](onboarding.md)
