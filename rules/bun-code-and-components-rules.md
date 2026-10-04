# Bun and current tooling

**English** | [Русский](bun-code-and-components-rules.ru.md) | [Polski](bun-code-and-components-rules.pl.md)

Liora uses Node.js, pnpm 10.33.0, Vite and Vitest. Electron has its own runtime; Supabase functions use Deno. This file does not mandate Bun or replace [setup instructions](../docs/onboarding.md).

Earlier generic Bun guidance duplicated component rules. Those requirements are now in the [code rules](code-and-components-rules.md).

## A possible Bun migration

Make migration a separate task with a verifiable reason, such as install speed or a server capability. Do not change package manager, lockfile and runner during an unrelated UI task.

Check before migrating:

- Vite and build scripts;
- Vitest and browser acceptance;
- Electron and `better-sqlite3` for its ABI;
- electron-builder and dependencies in `app.asar`;
- GitHub Actions and reproducible installation;
- Node compatibility and the separate Supabase Deno environment.

Choose one primary package manager and lockfile. Do not maintain divergent lockfiles as equal authorities. Update documentation and CI with the actual tooling change.

## Runtime boundaries

`Bun.file`, `Bun.write` and `Bun.serve` belong only in explicitly selected Bun infrastructure. Browser, core and renderer must not depend on them. Use standard Web APIs or adapters for shared contracts.

Installing Bun does not change Electron's runtime or make Deno Edge Functions Bun services. Verify each executable module's environment.
