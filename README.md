# Urlaubsverwaltung

Sample application for the workshop **Modernes JS-Tooling für Agentic Coding**. A
small leave management system as a pnpm monorepo: public holidays, leave
entitlements, requests, a REST API and a slim React frontend.

The application is scenery, not subject matter. It is built so that you can take it in
within fifteen minutes.

## Requirements

- **Node 22 or newer** — `node -v`
- **pnpm through Corepack** — `corepack enable` is enough, the version is pinned in
  `package.json`
- **Claude Code or a comparable coding agent** for the hands-on blocks
- Git

## Setup

```bash
corepack enable
pnpm install
pnpm check
```

Once `pnpm check` is green you are ready. The first run takes a few minutes for the
download, later runs take seconds.

## Running the application

```bash
pnpm dev                      # API on http://localhost:8787
pnpm --filter @urlaub/web dev # UI on http://localhost:5173
```

The UI proxies `/api` to the API port. There is no login and no database; the master
data lives as JSON under `data/`.

## Layout

```
packages/
  holidays/       public holidays per federal state and year, Gauss easter formula
  core-rules/     domain logic: entitlement, workdays, requests, validation
  shared-types/   contract between API and web
  api/            Hono server
  web/            Vite + React
data/             employees and absences as JSON
docs/tickets/     tasks for the hands-on blocks
scripts/bench.sh  runtime measurement for the full and the affected check
```

`holidays` → `core-rules` → `api` → `web`: a change at the bottom pulls almost
everything with it, a change at the top almost nothing.

## Commands

| Command                                   | Effect                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| `pnpm check`                              | types, formatting, lint and tests across all packages        |
| `pnpm check:affected`                     | the same, but only for changed packages and their dependents |
| `AFFECTED_BASE=<ref> pnpm check:affected` | forces a specific comparison base                            |
| `pnpm test:json`                          | test run with a machine-readable report                      |
| `pnpm format`                             | apply formatting                                             |
| `pnpm bench`                              | measure runtimes                                             |
| `pnpm commitlint`                         | check a commit message against conventional commits          |

## Branches

| Branch     | Content                                                              |
| ---------- | -------------------------------------------------------------------- |
| `slow`     | the same code with a 2023 toolchain. Starting point of the workshop. |
| `fast`     | hardened feedback loop, reference solution for blocks 1 to 3         |
| `solution` | `fast` plus the MCP server and a solved ticket 001                   |

`main` points at `slow`.

## Language

Code, developer documentation and commit messages are English. The tickets under `docs/tickets/` are German because the workshop is held in
German. Presentation and trainer materials are maintained outside this repository.
