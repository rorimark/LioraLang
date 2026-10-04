# User guide

**English** | [Русский](user-guide.ru.md) | [Polski](user-guide.pl.md)

LioraLang stores material in decks and schedules each card for review. Local study needs no registration. An account enables sync, Hub publishing and AI.

## Create a deck

Open **Decks → New deck** and choose a subject in the editor. Subject selection is also available when creating a deck from **Learn** quick add. All subjects use one creation form; there is no separate Programming menu item.

For languages, select the languages of each side and an optional third language. For programming, set a technology and answer language; for mathematics, an area and answer language; for history, a period or region and answer language. Technology can be anything, such as Rust, Python or SQL.

Answer language determines explanations, including AI suggestions. It is independent of interface language. Changing it does not translate existing cards.

Give the deck a useful name. Description and tags help you find it. Create a new deck explicitly. Existing deck edits save automatically; check the save state before closing.

## Add cards

Fill in the question and answer. Other fields depend on the subject:

- Languages: translation, examples, level, part of speech, tags and image.
- Programming: optional code, code side, difficulty and notes.
- Mathematics: formula, formula side, solution steps and difficulty.
- History: context on the front, date and consequences on the back.

Answer-side code and formulas stay hidden until reveal. Avoid putting the solution into the question or historical context if you want to test recall.

Quick add also opens from Learn. Language decks accept pasted lists with a preview before adding. Enter inserts a line in multiline fields; Ctrl/Command + Enter adds a card. The language form supports fast adding with Enter.

## Formulas in text

Mathematical cards can mix prose and LaTeX:

```text
Solve $x^2 = 4$.
Answer: \(x = \pm 2\).
General formula:
$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$
```

Use LaTeX without `$` in the formula field. In prose, use `$...$` or `\(...\)` inline, and `$$...$$` or `\[...\]` for a block. Invalid notation remains visible text you can edit. Formulas are not calculated automatically.

## Study and review

Choose a deck in **Learn**, read the question, and try to recall the answer before revealing it. Rate the result:

| Rating | When to use it |
| --- | --- |
| Again | You forgot or answered incorrectly |
| Hard | You recalled it with great effort |
| Good | You recalled it normally |
| Easy | The answer was obvious |

The buttons show planned review intervals. A rating applies to one card even if you change translation direction or switch between text and image presentation.

Session settings control directions and presentations supported by the subject. Learning settings set daily new-card and review limits. The daily goal is guidance and does not block learning steps. A bonus session bypasses daily limits without pulling future cards.

Free browsing does not change the schedule. [SRS details](srs.md).

## Generate a deck

Open **Decks → New deck → Collect a deck with AI**. In Learn, use quick add and its generate-deck action. Button names follow the interface language.

1. Choose the subject, topic, answer language and deck context.
2. Set the card count and available level or difficulty.
3. Start generation.
4. Check questions, answers and extra fields. Correct mistakes, exclude or remove unwanted drafts.
5. Create the deck. Drafts are not saved to the library before this action.

Programming, mathematics and history offer 5, 10 or 20 cards; languages offer 10, 20 or 30 words. The model may return fewer, and the window shows the actual count. Check accuracy and duplicates.

**Settings → AI assistant** has a master switch. When it is on, separate controls enable word suggestions, explanations after Again, card suggestions, list completion, topic decks and deck descriptions. Some features support only languages. [AI details](word-suggestions.md).

## Import, export and Hub

Import accepts `.lioradeck`, legacy `.lioralang` and supported JSON files. For matching entries, choose skip, update or keep both. Check the subject, languages and matching strategy before confirming.

Export includes deck material and included images. It is useful for sharing, but is not a complete backup of the account or review history. [Format and compatibility](deck-format.md).

Hub contains public language decks. Preview a deck, add it and report unsuitable material. Programming, mathematics and history cannot be published yet.

## Offline and multiple devices

Visit the web app online first to cache resources. Decks, cards, images and ratings are stored on the device. Desktop also uses a local database. AI, Hub downloads, sign-in and account exchange need a connection.

An account syncs decks and progress. Offline changes wait for the next exchange. Concurrent editing can create a conflict copy; compare it with the main deck before deleting it. Sync does not replace exports of important material.

## Troubleshooting

| Problem | Check |
| --- | --- |
| No queued cards | Does the deck contain cards, are any due, and is a daily limit reached? |
| AI does not respond | Account, connection, master and feature switches, remaining allowance |
| Old desktop cannot import | Update the app; newer formats protect fields from older editors |
| Local web decks disappeared | Was site data cleared, or are you in another browser profile? |
| macOS cannot install an update | Download the release manually; automatic installation requires signing |

For a recurring issue, record exact steps, version, platform and error text. Do not include account tokens, secret keys or personal decks unnecessarily.
