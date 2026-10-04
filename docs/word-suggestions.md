# AI assistant and deck generation

**English** | [Русский](word-suggestions.ru.md) | [Polski](word-suggestions.pl.md)

AI helps create material without scheduling reviews. Saved cards work locally; suggestions and generation need an account, network and configured server.

The historical name `suggest-word` covers words, subject cards, lists, topics, descriptions and explanations.

## Settings

**Settings → AI assistant** has a master switch and six feature switches:

| Setting | Controls |
| --- | --- |
| Word suggestions | Automatic suggestions for empty language-card fields |
| Explanations after Again | Help after a miss in supported language presentations |
| Card suggestions | Subject suggestions from terms, questions or code |
| List completion | Completing a pasted language list |
| Topic decks | Generating a new deck for a supported subject |
| Deck descriptions | Descriptions and tags for language decks |

The master preference is `appPreferences.aiAssistant.enabled`; individual flags are in `aiFeatures`. Normalization migrates legacy preferences. `deckDefaults.wordSuggestions` is no longer the master source.

Master off blocks requests and cancels pending results, preserving individual choices for re-enabling. A feature switch stops only that function. Late responses must not apply after deck, subject, language or input changes.

Profiles also declare capabilities. Enabling list completion does not make a mathematical problem a language list.

## Functions and tasks

| Task | Available in | Output |
| --- | --- | --- |
| `word` or omitted task | Language editor and quick add | Translation, third language, CEFR, part of speech, examples, tags |
| `list` | Language lists | Batches of up to 30 rows |
| `topic` | Language generator | 10, 20 or 30 words by topic and level |
| `hint` | After Again in language study | Explanation in interface language |
| `deck` | Language decks | Description and tags from up to 40 sample words |
| `concept` | Programming, mathematics, history | Up to three alternative cards |
| `concept-topic` | Subject generator | 5, 10 or 20 cards by topic and difficulty |

Automatic word suggestions start after roughly 350 ms without typing. They suggest empty fields without replacing user input. Apply a field individually, use Tab for the whole suggestion, or Escape to hide it.

Subject suggestions use an explicit button. Requests include the profile, term or question, optional code and deck context. Code is never executed. Responses are validated against the form's profile.

## Dedicated generation window

Open it from New deck in Decks or quick add in Learn. It creates a new deck and has no existing-deck selector or ordinary add tabs.

On wide screens, settings are left and drafts right with independent scrolling. Settings include subject, technology or context, topic, answer language, count and difficulty or CEFR. Mobile uses a vertical form with the create action accessible at the bottom.

Edit name, description, tags and every card field; set code/formula side, exclude or delete drafts. Side switches belong to individual cards. The actual count is shown even for partial model output.

Nothing saves before confirmation. Creation writes the deck and selected cards with one `saveDeck`. Regeneration, settings changes and closing must not apply old responses.

`GenerateDeckDialog` is defined in `src/features/quick-add-words/ui/QuickAddWordsDialog.jsx`, with `GenerateDeckDialog.css`. Its model uses `creationOnly` in `useQuickAddWords`.

## Answer language

Language cards use their side languages. Other subjects use explicit `subjectFields.contentLanguage`. AI receives it with technology, area or period; the server must not trust a conflicting client `writeIn`.

Interface language is not answer language, except for `hint`. Changing the setting does not translate saved cards. Replies to earlier requests in another language are discarded.

## Server and allowance

`supabase/functions/suggest-word/` validates session and request, then calls Gemini. `GEMINI_API_KEY` is server-only. Optional `GEMINI_MODEL` sets a preferred model; otherwise stable available Flash models and fallbacks are selected.

Keep JWT verification enabled. The server also checks the user and allowance. Migrations `0004` and `0007` implement consumption and remaining-count reads. Current allowance: 300 requests per account per UTC day, visible in settings.

Allowance counts function requests, not generated cards. Provider retries and fallback may make multiple model calls within one accepted request. The counter is not a guarantee of fixed cost or free operation.

Client timeouts are 15 seconds for short tasks, 45 for long tasks. Server budgets are about 13 and 42 seconds. Timeout, missing configuration, allowance, network, sign-in and overload must show clear states instead of an endless spinner.

## Data sent to the provider

A task may send words, questions, code, topics, languages, subject context, selected fields and sampled words for descriptions. More than a word and language pair is sent for generation.

Gemini secrets and Supabase administrative keys stay out of web and Electron builds. Requests still contain user material. Avoid secrets in cards you plan to send to AI.

## Response validation

Requests and responses are normalized and constrained by length and allowed values. Topic results use profile fields and remove duplicate or unsuitable entries. Content is rendered as data, without code execution or arbitrary HTML.

Validation checks structure, not facts. Valid-looking formulas, dates and code can still be wrong. Review meaning before saving.

## Code and verification

| Path | Purpose |
| --- | --- |
| `packages/shared/src/config/aiFeatures.js` | Flags and availability |
| `packages/shared/src/api/createSupabaseWordSuggestApi.js` | Requests, timeouts and errors |
| `packages/shared/src/core/usecases/subjects/` | Fields, capabilities, language and instructions |
| `src/features/word-suggest/` | Suggestions and application |
| `src/features/quick-add-words/` | Lists, topics and generation window |
| `supabase/functions/suggest-word/gemini.ts` | Word requests and model selection |
| `supabase/functions/suggest-word/tasks.ts` | Other tasks and structured output |

Run `pnpm test:run`, `pnpm check:subject-assistant` and `pnpm check:subject-topic` as relevant. Browser scenarios mock responses and do not verify real Gemini availability. Test deployed sessions, allowance and sample tasks separately without exposing secrets.

Deployments must include relative shared-profile imports from `packages/shared`. Updating the website does not deploy the Edge Function. [Server setup](../supabase/README.md) · [Environment](onboarding.md)
