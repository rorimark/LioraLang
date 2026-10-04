# Subjects, fields and card layouts

**English** | [Русский](learning-objects.ru.md) | [Polski](learning-objects.pl.md)

LioraLang supports languages, programming, mathematics and history. The catalog must grow without branches in every form or a table for each subject.

## Common entry

An entry shares `source`, `target`, tags and examples or notes. Language entries also use level, part of speech and a third language. Subject-specific fields live in `subjectFields`.

A deck has `subject` and its own `subjectFields`. An empty subject means language. The historical `words` name in code, API and storage does not restrict entries to vocabulary.

Example deck fields and entry:

```json
{
  "subject": "programming",
  "subjectFields": {
    "technology": "Rust",
    "contentLanguage": "Polish"
  }
}
```

```json
{
  "source": "What is borrowing?",
  "target": "Dostęp do wartości przez referencję bez przenoszenia własności.",
  "subjectFields": {
    "code": "let reference = &value;",
    "codeSide": "back",
    "difficulty": "easy"
  }
}
```

`code` is not a new core column. Programming defines its meaning and constraints. Do not move it to the entry root for one form.

## Profile responsibilities

The catalog is `packages/shared/src/core/usecases/subjects/`. `registry.js` registers profiles; `subjects.js` normalizes fields and resolves appearance. Each profile declares:

- ID and translation keys;
- deck/entry fields, types, choices, lengths and defaults;
- side labels and review directions;
- image support and Hub publishing;
- AI capabilities, language and generation instructions;
- front/back composition from blocks;
- minimum package versions for new capabilities.

The registry checks unique IDs and complete definitions. Import rejects unknown subjects so an older editor cannot erase their fields.

## Current subjects

| Subject | Deck fields | Entry fields | Layout |
| --- | --- | --- | --- |
| Languages | Side languages, third language, learned side, picture side | Word, translation, CEFR, part of speech, examples, tags, image | Familiar language card |
| Programming | `technology`, `contentLanguage` | `code`, `codeSide`, `difficulty`, question, answer, notes | Calm editor and technology tab |
| Mathematics | `area`, `contentLanguage` | `formula`, `formulaSide`, `steps`, `difficulty`, question, answer | Notebook grid, formulas, solution |
| History | `period`, `contentLanguage` | `context`, `date`, `consequences`, `difficulty`, question, answer | Archive card and context |

Entry `difficulty` describes material, not FSRS memory difficulty. Changing it does not rewrite the schedule.

## Programming technologies

Technology is free text. SQL, CSS, PHP, JavaScript, Rust, Java, C++, C and C# all use Programming. `profiles/technologyAppearances.js` selects tabs, accents and details from normalized technology. Unknown technologies use the general design.

Without code, a card shows a large term or question. Code uses a pane with original line numbers and soft wrapping. Wrapping does not alter saved code. Code is never executed.

`codeSide` defaults to `front`. `back` hides code until answer reveal. Placement stays with the code through adding, importing and syncing.

## Mathematics

`formula` is LaTeX without fences. `formulaSide` defaults to `back` to hide a solution. An equation to solve can explicitly go on the front. `steps` contains back-side solution steps.

Questions, answers, notes and steps can mix text and formulas: `$...$`, `\(...\)`, `$$...$$`, `\[...\]`. The parser separates math from prose; local KaTeX works offline after caching. Invalid formulas stay as source text. Code and prices must not be mistaken for math.

Rendering uses `trust: false` and does not run user commands. Valid LaTeX is not proof of a valid solution; authors still check calculations and reasoning.

## History

`period` sets deck context, such as region or era. `context` is visible on the front and must not disclose the answer. `date` and `consequences` appear after the flip. These are distinct fields, not renamed code or formulas.

## Answer language

Non-language decks explicitly choose `contentLanguage` from supported languages. JavaScript does not imply English answers, and interface language does not determine content.

AI receives this choice with profile and context. Language changes cancel stale requests without translating saved entries. Creation and import preserve the value instead of recalculating it from the browser.

## UI and AI

The editor, quick add and generator build fields with `subject-fields`. Supported types are `text`, `multiline`, `code`, `formula`, `choice`. Code/formula placement is attached to its field; switches in different cards must not affect each other.

`buildCardPresentation()` builds profile blocks. Rendering maps block types to components rather than branching by subject ID. Language cards keep their previous path.

Profiles independently declare entry suggestions, topic generation, lists, descriptions and review hints. A generic AI button is not enough to enable every task. Programming, mathematics and history support suggestions and topic decks without language-list completion or language hints.

## Storage and compatibility

Web and SQLite save subject fields with common content. Export, import, hash and sync include nonempty fields. Default fields should not be added to old language packages unnecessarily.

Package versions follow used capabilities. Mathematics/history require format 6; programming may use older formats without newer fields. [Version table](deck-format.md).

One entry remains one SRS unit. Layout, technology and direction changes do not create another log or reset memory. Hub publishing remains language-only, enforced in UI and publishing core.

## Adding a subject

1. Define useful fields, side labels and what stays hidden before reveal.
2. Create and register a profile. Reuse field types and blocks unless a new type is necessary.
3. Give it a profile-driven composition and styles while sharing controls, grades and accessibility.
4. Define language, AI capabilities and instructions; check server schemas and normalization too.
5. Set minimum format versions so older clients clearly reject unsupported content.
6. Add all twelve interface translations.
7. Check both stores, export/import, hashes, private sync and Learn sessions.
8. Check offline creation/grading, mobile, both themes and existing language cards.

New `subjectFields` keys alone do not need tables or server migrations. Server indexes, RLS, contracts or Hub capabilities may require a migration. Not every extension is automatically migration-free.

[Checks](onboarding.md) · [AI](word-suggestions.md) · [UI rules](../rules/ui-rules.md)
