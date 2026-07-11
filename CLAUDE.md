# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Test

```bash
pnpm build          # tsup bundles CLI (src/index.ts → dist/), then builds packages/web (Vite+React)
pnpm test           # vitest run — full test suite
pnpm test:watch     # vitest in watch mode
pnpm dev            # tsup --watch for CLI rebuilds
pnpm link           # build + global link for local debugging
pnpm unlink         # remove global link
```

- Node >= 18, pnpm as package manager
- CLI entry: `src/index.ts` → tsup outputs ESM with `#!/usr/bin/env node` banner to `dist/index.js`
- Web frontend: `packages/web` (Vite + React), built separately via `pnpm --filter @namewta/fastcli-web build`
- Tests use vitest; test isolation via `os.tmpdir()` + `FASTCLI_HOME` — never touches real `~/.fastcli/`

## Architecture (dependency order, top-down)

```
src/index.ts          — citty command tree, wires subcommands, catches ConfigCorruptError/ConfigVersionTooNewError
  src/cli/            — CLI commands (add, edit, remove, run, list, info, view, config) + first-run wizard + TUI menu
    └── src/core/     — domain layer: registry (merge builtin+user tools), resolver (op lookup + {{name}}/{{version}} substitution), executor (spawn shell, signal forwarding, command chains), builtin-templates (install/uninstall/danger commands generated from packageManager)
    └── src/config/   — paths, schema types, reader (load/migrate/validate), writer (atomic write, 0o600)
    └── src/utils/    — fuzzy search (fuse.js), slug/id generation, tool name conflict checks
    └── src/i18n.ts   — en/zh-CN message dictionaries, normalizeLanguage, t() helper
    └── src/web-server/ — Express API, 127.0.0.1 only, token auth, ETag+If-Match for writes

packages/web/         — Vite+React SPA, communicates with web-server over HTTP API only
```

**Dependency rules:** `src/cli` may depend on `src/core`, `src/config`, `src/utils`, `src/i18n`. `src/core` must NOT depend on CLI or web layers. `src/config` must NOT depend on upper modules. `packages/web` must only reach backend via HTTP; no direct filesystem access to `~/.fastcli/`.

## Key Design Decisions

- **Builtin tools** are metadata-only in `src/builtin/tools.ts` (id, name, npmPackage, tags). Actual command strings are generated at runtime by `src/core/builtin-templates.ts` based on `config.packageManager` (`volta` → `volta install <pkg>@latest`; `npm` → `npm install -g <pkg>`).
- **Registry** merges builtin + user tools into a `Map<id, ToolEntry>`. User entries with same id override builtin (with a one-time `console.warn`).
- **Resolved vs executed:** `resolver.ts` is a pure function — finds the operation, does `{{name}}`/`{{version}}` substitution, returns `{ kind: 'ok', commands }` or `{ kind: 'unconfigured', availableOps }`. Unknown placeholders are preserved literally. `executor.ts` then spawns the shell.
- **Command chains** are always `string[]` — single commands use single-element arrays. No string-or-array ambiguity.
- **Executor always prints** `$ <command>` before spawning (Requirement 7.1). Uses `/bin/sh -c` (POSIX) or `cmd.exe /d /s /c` (Windows). Signal forwarding: SIGINT/SIGTERM are forwarded to child during spawn. Returns `ExecResult`; never throws.
- **Web API** serializes writes via a promise-based queue (`enqueueWrite`). All mutating endpoints require `If-Match` header checked against SHA-256 ETag of the current file content. Only accepts connections from `127.0.0.1`.
- **Config files** (`config.json`, `tools.json`) use schema version `"2"`. Reader auto-migrates v1→v2 (strings to arrays). Corrupt JSON or too-new version → `ConfigCorruptError` / `ConfigVersionTooNewError` caught at top level. POSIX writes use atomic rename with `0o600`.

## Hard Rules

- All relative imports must use explicit `.js` extension
- `commands` values are always `string[]`, never bare strings
- Builtin tools only defined in `src/builtin/tools.ts`; never in `tools.json`
- User tools only in `~/.fastcli/tools.json`; the `source` field is always forced to `'user'` by the registry
- `FASTCLI_HOME` env var only for test isolation — not a user-facing feature
- Web editor binds `127.0.0.1` only, token auth required
- Documentation sync: `.docs-sync-state.json` tracks last sync commit; git diff `last_sync_sha..HEAD` determines doc updates
- README is the user-facing promotion doc; AGENTS.md is the AI agent handbook; CLAUDE.md is this file
- Release workflow: tag `v*` triggers CI → `pnpm install --frozen-lockfile` → `pnpm build` → `pnpm test` → `pnpm publish --access public` → GitHub Release
