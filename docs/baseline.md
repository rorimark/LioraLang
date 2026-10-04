# Verification baseline

**English** | [Русский](baseline.ru.md) | [Polski](baseline.pl.md)

Functional baseline: 0.9.1, prepared October 4, 2026. These results record release preparation, not a fresh run of every command after each documentation edit.

## Pre-release results

| Check | Result |
| --- | --- |
| `test:run` | 544 tests across 77 files passed |
| `lint`, `check:boundaries`, `check:layers`, `check:i18n` | Passed |
| `check:subjects` | SQLite persists subject cards |
| `check:subject-assistant` | Suggestions and settings passed |
| `check:subject-topic` | Generation, editing, save, cancellation and mobile passed |
| `check:offline-knowledge` | Offline subject creation and grading after caching passed |
| `build:web`, `build:desktop` | Built successfully |
| Desktop release workflow | macOS ARM64 and Windows x64 published |

AI acceptance used controlled API responses without real allowance or model-quality assessment. Offline acceptance verifies tested scenarios, not every browser configuration.

Release: [v0.9.1](https://github.com/rorimark/LioraLang/releases/tag/v0.9.1).

## Earlier documentation checks on October 4

The earlier refresh checked 36 Markdown files, 160 local links, 104 code paths, 46 pnpm command references and six JSON blocks. Long dashes, unclosed fences and trailing whitespace were absent.

Language, programming, mathematics and history package examples passed parsing, export and re-import with preserved subject fields. Export selected formats 1, 5, 6 and 6.

Platform and layer scripts passed through Bash and Node.js, as did `git diff --check`. Functional tests and builds were not repeated solely for Markdown changes.

## Three-language documentation checks on October 4

All 34 document groups have complete English, Russian and Polish versions: 102 Markdown files. English is primary. Navigation switches languages, while content links stay within the chosen language.

Checks passed for 594 local links, 312 code path references, 120 pnpm command references and 18 JSON blocks. The documents contain no long dashes, trailing whitespace or unclosed code fences.

All 12 complete deck examples passed parsing, export and re-import while preserving text and normalized subject fields. Each language's examples export as formats 1, 5, 6 and 6. The three mathematics examples also rendered through local KaTeX with errors enabled.

Platform and layer boundary scripts and `git diff --check` passed. Application tests and builds were not repeated for this documentation-only change.

## Recording a new baseline

Record version or commit, environment, commands, results and scope after functional changes. Keep failures with their fix or known cause too.

Old chunk names and sizes are not current metrics. Measure a specific build, distinguish raw/gzip, and compare the same target. Web and desktop overwrite `dist/`.

Docs-only edits need link, command, path, example and formatting checks. Behavior changes need relevant [onboarding checks](onboarding.md) and [smoke scenarios](smoke-checklist.md).

## Historical context

The older document recorded shared use-case and adapter migration in March 2026. Those bundle sizes and interim conclusions are not today's baseline. See current [architecture](architecture.md) and [release notes](releases/README.md).
