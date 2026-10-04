# Spaced repetition

**English** | [Русский](srs.ru.md) | [Polski](srs.pl.md)

SRS decides which card to show and when to return it. Web and desktop share an FSRS-5 engine; repositories read data and persist results transactionally.

Here, a card is one deck entry. It has one schedule across subjects, translation directions and image presentations.

## Interval calculation

`fsrs.js` stores memory stability and difficulty. Stability is the number of days until recall probability falls to 90%. Difficulty ranges from 1 to 10 and describes the learner's memory, not the subject card's material difficulty.

A grade updates memory using elapsed time. Early, on-time and late reviews may produce different intervals. There is no universal constant multiplier.

`desiredRetention` is the target recall probability: 0.9 by default, from 0.70 to 0.97. Higher targets generally mean more frequent reviews.

Default intervals for a new card:

| Grade | Next review |
| --- | --- |
| Again | 10 minutes, a learning step |
| Hard | 1 day |
| Good | 3 days |
| Easy | 16 days |

An approximate sequence of on-time Good answers is 3, 11, 35, 101, 269 days. Settings, review time and date fuzz affect the actual schedule.

## Settings and extra rules

- `maximumIntervalDays` caps intervals at 365 days by default. The UI's unlimited option uses a technical ceiling of 36,500 days.
- `learningSteps` sets steps in minutes. Due learning and relearning are not blocked by daily limits.
- Again on a reviewed card adds a lapse and starts relearning. The default step is 10 minutes; earlier-forgotten-review settings shorten it to one minute.
- For the same state, Hard is no later than Good, and Good no later than Easy. Values can coincide at the ceiling.
- Date fuzz distributes cards across days. It is deterministic from entry and answer count, so button previews match persisted results.
- Legacy `easyBonus` and `lapsePenalty` are read for compatibility but no longer control scheduling.

Changing settings does not reschedule all existing due dates. New settings apply on the next grade. Recommended settings change preferences, not assigned dates.

## Queue

The engine selects due learning/relearning, then oldest due reviews, then new cards. Shuffle affects new cards, not intervals.

`newCardsPerDay` and `maxReviewsPerDay` count unique entries of the selected deck in the local calendar day. Zero is valid. The daily goal is guidance; all answers are counted separately in `answersToday`.

Bonus sessions bypass daily limits without drawing future cards. They finish when nothing is available. Free browsing does not change schedules.

An empty queue distinguishes no cards, daily limits, waiting for a learning step and no due reviews. Snapshots include the next due time. UI refreshes on timers, day changes, focus, sync and account changes.

A saved sessionStorage queue is not a source of truth. Returning to study checks data again. Background refresh should not repeatedly hide the card behind queue-building feedback.

## Grade persistence

1. UI blocks duplicate presses before the next render.
2. The repository verifies the profile and schedule revision.
3. One transaction writes the new state and review log.
4. UI advances only after successful persistence.

A stale grade must not overwrite newer state. Failed writes keep the current card. Replies from a previous deck or closed page must not replace the new session.

## Legacy data and sync

Existing SM-2 due dates remain unchanged. Cards without FSRS memory derive it from the old interval and ease at the next grade through `memoryFromSm2`. `intervalDays` and `easeFactor` remain for compatibility and statistics.

SQLite and IndexedDB store stability, difficulty and review time. Sync sends state in `payload.nextCard`. Legacy events without FSRS memory are accepted; memory is derived at the next grade. The server does not calculate intervals.

## Code and checks

| Path | Purpose |
| --- | --- |
| `packages/shared/src/core/usecases/srs/fsrs.js` | FSRS-5 memory model |
| `packages/shared/src/core/usecases/srs/srsScheduler.js` | Steps, limits, fuzz, previews and revision |
| `packages/shared/src/core/usecases/srs/srsSession.js` | Queue and quotas |
| `electron/db/services/srs.services.js` | SQLite persistence |
| `packages/shared/src/platform/web/model/createWebSrsRepository.js` | IndexedDB persistence |
| `src/widgets/LearnFlashcardsPanel/model/useSrsSession.js` | UI session, timers and race protection |

Tests compare formulas against `ts-fsrs` over 2,000 random cases with tolerance below `1e-6`. Unit tests cover queues and migration; SQLite checks cover transactions and persistence; web tests use fake-indexeddb. This does not fully verify concurrent real devices.

Run `pnpm test:run`, `pnpm check:srs` and `pnpm check:persistence`. UI changes also need the [smoke checklist](smoke-checklist.md). [Environment](onboarding.md).
