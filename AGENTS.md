# AGENTS.md

This file is the entry point for coding agents working in this repository. It
describes what the project does, which commands are allowed and which conventions
apply. Once you have read it you should not need a tour through the source to get
started.

## Project overview

Leave management for a mid-sized company. No login, no database. The master data
lives as JSON under `data/`.

```
packages/
  holidays/       public holidays per federal state and year, Gauss easter formula
  core-rules/     domain logic: entitlement, workdays, requests, validation
  shared-types/   contract between API and web, pure types plus route constants
  api/            Hono server, REST endpoints on top of core-rules
  web/            Vite + React, request form and overview
```

Dependency direction: `holidays` → `core-rules` → `api` → `web`. A change in
`holidays` affects almost everything, a change in `web` affects nothing but `web`.

All domain logic lives in `core-rules`. The API does not validate on its own, it calls
`validateLeaveRequest`. The frontend knows no domain rule, it renders what the API
returns.

## Domain rules

Note on vocabulary: the domain is German labour law, so a few terms stay German in the
code. `Bundesland` is a German federal state, `Feiertag` a public holiday, and
`carriedOver` is leave carried over from the previous year.

1. **Entitlement.** `fullTimeEntitlement * workdays.length / 5`, rounded half up to
   half days.
2. **Joining during the year.** Entitlement is prorated by one twelfth per full month
   of employment, rounded as in rule 1. A month counts in full when the hire date
   falls on the first of that month, otherwise counting starts with the next month.
3. **Carry-over.** `carriedOver` can be used up to and including 31 March of the
   current year and expires afterwards. Consumption draws from the carry-over first,
   then from the current year's entitlement.
4. **Leave days of a request.** A day counts only when it is a contractual workday of
   that employee **and** not a public holiday in their federal state. Weekends drop
   out through the contractual workdays, not through a separate weekend rule.
5. **Public holidays.** Nationwide plus state specific. Movable feasts come from the
   Gauss easter formula. Buß- und Bettag is the Wednesday before 23 November.
6. **Time limits.** A request may start at most 14 days in the past and must not cross
   the turn of the year. A period spanning new year has to be split into two requests.
7. **Coverage.** A request is rejected when the requested days exceed the available
   entitlement. Pending and approved requests hold entitlement, rejected and cancelled
   ones do not.
8. **Cancellation.** Only possible while `from` lies in the future.
9. **Half days.** A half day counts as 0.5 leave days. Half days are allowed only on
   contractual workdays and only for single-day requests, that is when
   `from === to`. For part-time staff the contractual weekday decides, not every
   calendar day. A half day on a public holiday or on a non-workday is not a valid
   request.
10. **Team coverage.** When more than 50 percent of a team would be absent on a day,
    the result is a **warning**, not a rejection. The warning goes into `warnings`,
    not into `errors`.

## Allowed scripts

There are exactly two entry points. Please do not invoke individual tools directly,
neither `vitest` nor `tsc` nor `oxlint`.

| Command               | Meaning                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`          | Full check: types across all project references, formatting, then lint and tests per package in parallel. This is the truth before any commit. |
| `pnpm check:affected` | The same check, but only for packages with changes and their dependents. The fast loop while working.                                          |

Useful occasionally, rarely needed:

| Command           | Meaning                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm test:json`  | Test run with a JSON report in `.vitest-report.json`. Use it when you want to parse failures instead of reading console output. |
| `pnpm format`     | Apply formatting. `pnpm check` only verifies it.                                                                                |
| `pnpm dev`        | Start the API on port 8787.                                                                                                     |
| `pnpm bench`      | Measure the runtime of the full check and the affected check.                                                                   |
| `pnpm commitlint` | Check a commit message against the rules. The `commit-msg` hook does the same.                                                  |

What `check:affected` compares against is decided by `scripts/affected-base.sh`:
`origin/main` when the current state descends from it, otherwise `HEAD`, which means
the uncommitted working state counts. `AFFECTED_BASE=<ref>` forces a base.

After every change: `pnpm check:affected`. Before wrapping up: `pnpm check`.

## Conventions

**Date format.** All dates are ISO calendar days in `YYYY-MM-DD`, type `IsoDate`.
Arithmetic happens exclusively in UTC through the helpers in
`packages/holidays/src/date.ts`. No `new Date()` with a local timezone in the domain
logic, otherwise days shift depending on the machine.

**Rounding.** Entitlements are rounded half up to half days with `roundToHalfDay`. Do
not improvise with `Math.round` or `toFixed`.

**Today.** The domain logic always receives the reference day, it never reads the
system clock itself. In tests `2026-06-15` is the usual fixed reference day.

**Test layout.** Tests live per package under `test/`, with the extension `.test.ts`
or `.test.tsx`. Large case sets are generated with `test.each` from a table; the table
sits at the top of the file and reads as a specification. Vitest runs with
`globals: true`, so `describe`, `test`, `expect` and `vi` need no import. Expected
values are recomputed independently in the test file or written down as constants,
never derived from the production logic.

**Errors.** Validation results carry a stable `code` from `ValidationCode`. New rules
need a new code, not a free-form message.

**Language.** Developer-facing documentation, code identifiers and commit messages are
English. User-facing strings and validation messages are German. Trainer material is not
part of the participant repository.

**Commit messages.** Conventional commits, subject in English and lower case, at most
72 characters. The allowed scopes live in `commitlint.config.js`: the package names
without `@urlaub/` plus `scripts`, `slides`, `trainer`, `tooling` and `repo`. Example:
`fix(core-rules): count half days only on contractual workdays`.

**Exports.** Every package has exactly one public entry through `src/index.ts`.
Packages import each other by package name, never through relative paths reaching into
another package.

## What not to read

These paths cost context and contain nothing that changes a decision:

- `node_modules/` and `.pnpm-store/` — dependencies
- `pnpm-lock.yaml` — generated, more than 2000 lines
- `packages/*/dist/` and `*.tsbuildinfo` — build output
- `packages/holidays/test/fixtures/holidays-2024-2030.json` — a frozen reference table
  of more than 1500 lines. If you want to know which holiday applies where, read
  `packages/holidays/src/holidays.ts`.
- `.vitest-report.json` — output of `pnpm test:json`

When a test run is red, read the failure from `pnpm check:affected`. On failure the
dot reporter shows file, line and diff. That is usually enough to find the cause
without opening the test file in full.
