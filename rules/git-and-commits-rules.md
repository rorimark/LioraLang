# Git and commits

**English** | [Русский](git-and-commits-rules.ru.md) | [Polski](git-and-commits-rules.pl.md)

History should explain what changed and why. Each commit is a complete logical part that can be reviewed and reverted independently of unrelated work.

## Before changes

Inspect `git status`, branch and remote state. Do not reset or move others' edits automatically. Tasks usually use separate branches; an explicit agreement to work and publish on main takes precedence.

Branch names describe the task and follow current project instructions. Do not create another branch merely to save an already agreed stage.

## Commit contents

Read `git diff`, stage selected files or hunks, then inspect `git diff --cached`. Avoid blind `git add .` when unrelated work exists.

Behavior and its required tests normally belong together. Separate unrelated refactoring, renaming and mass formatting. Avoid commits that deliberately cannot run without the next one.

Run relevant checks before committing. Do not claim checks you did not run. Never include tokens, local env, databases, build artifacts or accidental logs.

## Conventional Commits

```text
type(scope): concise action
```

| Type | Use |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Restructuring without behavior change |
| `perf` | Verified performance improvement |
| `test` | Tests and test infrastructure |
| `docs` | Documentation |
| `style` | Code formatting without logic change |
| `build` | Builds and dependencies |
| `ci` | CI automation |
| `chore` | Maintenance, including version preparation |
| `revert` | Reverting published changes |

Scopes identify areas such as `srs`, `ai`, `cards`, `release` or `docs`. `style` is not for a user-visible redesign; choose the type by behavior.

```text
fix(srs): keep the card after a failed grade
feat(ai): add editable deck drafts
docs: refresh project guides
chore(release): prepare v0.9.1
```

Keep subjects short, without a final period. Bodies explain reasons, compatibility and checks where useful. Use `!` or `BREAKING CHANGE:` for incompatible changes with a migration path.

## Publishing and history

Publish completed stages as agreed. Push does not replace staged review. Check remote state and preserve others' commits when integrating.

Rebase and squash your own unpublished work. Do not rewrite shared history or force-push main. Revert published changes unless explicitly agreed otherwise.

Resolve conflicts by understanding both sides, not selecting all ours/theirs to continue. Repeat affected checks.

## Review descriptions

Describe the problem and resulting behavior, then validation and material limitations. Write for a reviewer without conversation history. Omit chronological narration and abandoned options unless relevant.

Release tags match `package.json`, with primary notes in `docs/releases/vX.Y.Z.md` and Russian/Polish companions. [Release process](../docs/onboarding.md).
