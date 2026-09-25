# Migration Guide: Delegator → Drizzle + Rumble, aligned with Chase

Working document for migrating this repo's data/API/query stack **and its project structure** to
match [`munify-chase`](../munify-chase), which already runs the target stack. Chase is the
reference implementation throughout: when in doubt, look at how chase solved the same problem
before inventing a new pattern here.

> Revision 2 — 2026-09-24. Supersedes the first draft (which lived in a scratchpad and only
> covered the ORM/API/client swap). See "What changed in this revision" below.

---

## What changed in this revision

1. **Scope widened from "swap three libraries" to "align the two projects."** Directory layout,
   dependency versions, npm scripts, aliases and tooling are now explicit deliverables, not
   side effects.
2. **Resequenced.** Toolchain alignment (Phase A) and structural alignment (Phase B) now come
   _first_. Both are behavior-preserving, land on `main` as small PRs, and shrink the diff the
   big-bang branch has to carry. The original plan front-loaded the riskiest phase.
3. **Baseline re-surveyed** against the repo as of 2026-09-24; several counts in the first draft
   were stale (77 migrations, not ~85; 29 ability modules, not 28).
4. **Open question resolved: this repo has no GraphQL subscriptions.** `grep subscriptionFields
src/api/resolvers` returns nothing. That removes Redis event targets, `createWs`,
   `graphql-ws`/`graphql-sse`, `subscriptionExchange` and `offlineExchange` from the plan
   entirely — a large simplification versus chase.
5. **Rumble bundles more than the first draft assumed.** `@m1212e/rumble@0.23.21` depends on
   `@pothos/core`, `@pothos/plugin-drizzle`, `@pothos/plugin-tracing`,
   `@pothos/tracing-opentelemetry`, `@pothos/plugin-validation`, `graphql-yoga`,
   `@urql/core`, `@urql/exchange-graphcache` and `@escape.tech/graphql-armor`. So the whole
   `@pothos/*` block and `graphql-yoga` leave `package.json` — they don't stay as the first
   draft said. Query-depth limiting moves from `@pothos/plugin-complexity` to Rumble's
   `armorConfig`.
6. **Added an explicit "do not align" list** so alignment work doesn't sprawl into churn with no
   payoff (component-folder casing, routes, Sentry/OTel, tasks, fallow).

---

## Reference: what chase looks like (surveyed 2026-09-24, v3.0.52)

```
src/
  api/
    context.ts                 # RequestEvent → ctx; mustBeLoggedIn/hasRole/isSessionLive
    rumble.ts                  # single rumble({db, schema, context}) call, re-exports builders
    websocket.ts
    db/
      db.ts                    # drizzle(...) or drizzle.mock() when `building`
      schema.ts                # tables + pgEnums, snakeCase.table, shared id/timestamp helpers
      relations.ts             # defineRelations(schema, r => ...)
      reset.ts  seedConference.ts  seedUtils.ts  seed-data/{dev.yaml,schema.json,schema.d.ts}
    handlers/                  # ONE flat file per table: abilities + object + query + mutations
      register.ts              # imports every handler + runs clientCreator in dev/build
    services/                  # authHelper.ts, OIDC.ts, auth.ts, ...
  lib/
    api/
      client.ts                # hand-written urql Client
      rumbleClient/            # GENERATED typed client (client.ts + schema.ts)
      optimisticUpdateHandlers.ts
    config/{public,private,getConfig}.ts
    components/  data/  helpers/  state/  utils/  paraglide/
  routes/
drizzle/                       # migration SQL, drizzle-kit generated
drizzle.config.ts
```

Chase aliases: `$api → src/api`, `$assets → src/assets`, `$config → src/lib/config`.
Tests are colocated (`src/lib/utils/majorities.test.ts`), not in a `src/tests` tree.

---

## Baseline: delegator today (re-surveyed 2026-09-24)

| Layer                         | Current                                              | Count                              |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------- |
| DB models                     | `prisma/schema.prisma`                               | 30 models, 10 enums                |
| Migrations                    | `prisma/migrations/`                                 | 77                                 |
| Prisma clients                | `prisma/db.ts` (web), `src/tasks/tasksDb.ts` (tasks) | 2                                  |
| Pothos resolver modules       | `src/api/resolvers/modules/**`                       | 41 files                           |
| CASL ability modules          | `src/api/abilities/entities/**`                      | 29 files                           |
| Houdini centralized queries   | `src/lib/queries/*.ts`                               | 8 files                            |
| Inline `graphql()` usage      | `src`                                                | 146 files (86 `.svelte`, 60 `.ts`) |
| Files touching houdini at all | `src`                                                | 215 files                          |
| GraphQL subscriptions         | —                                                    | **0**                              |
| Svelte components             | `src/lib/components/**`                              | 167                                |
| Routes                        | `src/routes/**`                                      | 71 pages                           |
| Frontend service helpers      | `src/lib/services/*`                                 | 35 files                           |

---

## Target structure mapping

Routes stay exactly where they are. Everything else moves toward chase's shape.

| Today                                                         | Target                                                                                                              | Phase |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----- |
| `src/config/{public,private}.ts`                              | `src/lib/config/{public,private}.ts` (+ `getConfig.ts`), `$config` alias repointed                                  | B     |
| `src/api/context/context.ts`                                  | `src/api/context.ts`                                                                                                | B     |
| `src/api/context/oidc.ts`, `permissions.ts`                   | `src/api/services/oidc.ts` / folded into `context.ts`                                                               | B     |
| `src/lib/stores/*`                                            | `src/lib/state/*.svelte.ts` (runes, not stores)                                                                     | B     |
| `src/lib/services/*` (35 files)                               | split into `src/lib/helpers/` (pure, framework-free) and `src/lib/utils/` (UI/runtime, `.svelte.ts` where reactive) | B     |
| `src/lib/constants/*`                                         | `src/lib/data/*`                                                                                                    | B     |
| `src/lib/types/window.d.ts`                                   | `src/app.d.ts` / `src/lib/helpers/utilityTypes.ts`                                                                  | B     |
| `src/tests/**`                                                | colocated `*.test.ts` next to the unit under test                                                                   | B     |
| `src/client.ts` (Houdini client)                              | `src/lib/api/client.ts` (urql client)                                                                               | E     |
| `prisma/schema.prisma`                                        | `src/api/db/schema.ts` + `src/api/db/relations.ts`                                                                  | C     |
| `prisma/db.ts`, `src/tasks/tasksDb.ts`                        | `src/api/db/db.ts` (single client)                                                                                  | C/F   |
| `prisma/migrations/`                                          | `drizzle/`                                                                                                          | C     |
| `prisma/seed/**`, `prisma/defaultData/**`, `src/lib/seeding/` | `src/api/db/{seedConference.ts,seedUtils.ts,reset.ts,seed-data/}`                                                   | F     |
| `src/api/resolvers/modules/**` (41)                           | `src/api/handlers/*.ts` (flat, one per table)                                                                       | D     |
| `src/api/abilities/**` (29)                                   | merged into handlers + `src/api/services/authHelper.ts`                                                             | D     |
| `src/api/resolvers/{api,builder,errors,tracer}.ts`            | `src/api/rumble.ts` + route `+server.ts`                                                                            | D     |
| `src/lib/queries/*.ts` (8)                                    | deleted — the call site _is_ the query with Rumble                                                                  | E     |
| `.houdini/`, `houdini.config.js`                              | `src/lib/api/rumbleClient/` (generated)                                                                             | E     |
| aliases `$db`, `$houdini`                                     | removed                                                                                                             | C/E   |

---

## Dependency alignment

### Upgrade to chase's versions (Phase A, behavior-preserving-ish, do in small PRs)

| Package                                 | Delegator          | Chase                 |
| --------------------------------------- | ------------------ | --------------------- |
| `svelte`                                | 5.45.5             | 5.56.10               |
| `vite`                                  | 7.3.5              | 8.2.2                 |
| `typescript`                            | 5.9.3              | 6.0.3                 |
| `@sveltejs/kit`                         | 2.57.1             | 2.70.3                |
| `@sveltejs/vite-plugin-svelte`          | 5.1.1              | 7.3.0                 |
| `@sveltejs/adapter-node`                | 5.4.0              | 5.5.7                 |
| `eslint` / `@eslint/compat` / `globals` | 9.39 / 1.4 / 15.15 | 10.9 / 2.1 / 17.11    |
| `typescript-eslint`                     | 8.48.1             | 8.67.0                |
| `prettier` + svelte/tailwind plugins    | 3.7.4 / 3.4 / 0.6  | 3.9.6 / 4.1.1 / 0.8.1 |
| `@inlang/paraglide-js`                  | 2.3.2 (pinned)     | 2.24.1                |
| `@inlang/cli` / `@lingual/i18n-check`   | 3.0.12 / 0.8.14    | 3.3.3 / 0.9.5         |
| `tailwindcss` + `@tailwindcss/vite`     | 4.1.17             | 4.3.3                 |
| `daisyui`                               | 5.5.5              | 5.7.20                |
| `lefthook`                              | 1.13.6             | 2.1.10                |
| `concurrently`                          | 9.2.1              | 10.0.5                |
| `nanoid`                                | 5.1.16             | 6.0.1                 |
| `hotkeys-js`                            | 3.13.15            | 4.0.5                 |

Vite 8 + TS 6 + eslint 10 are the three with real breakage risk; give each its own PR.

### Add

```
drizzle-orm, drizzle-kit, drizzle-seed   pin exactly to chase: 1.0.0-rc.5-ab785fc
                                          (rumble peer-depends on drizzle-orm ^1; the
                                           snakeCase.table + defineRelations APIs are 1.0-only)
@m1212e/rumble        ^0.23.21
@urql/core            ^6.0.3            (runtime dep)
@urql/exchange-graphcache  ^9.0.1
pg + @types/pg        ^8.23
@pothos/plugin-validation ^4.3.1        (only if zod-backed arg validation is wanted)
```

Not needed here (chase-only, driven by features this repo doesn't have):
`graphql-ws`, `graphql-sse`, `@graphql-yoga/redis-event-target`, `ioredis`,
`@m1212e/urql-crosstab-sync`, `polka`, `ws`.

### Remove (end of Phase E/G)

`prisma`, `@prisma/client`, `prisma-generator-pothos-codegen`,
`@pothos/core`, `@pothos/plugin-prisma`, `@pothos/plugin-prisma-utils`,
`@pothos/plugin-complexity`, `@pothos/plugin-simple-objects`, `@pothos/plugin-tracing`,
`@pothos/tracing-opentelemetry`, `graphql-yoga`, `@casl/ability`, `@casl/prisma`,
`houdini`, `houdini-svelte`.

`graphql` stays (rumble peer-depends on ^16). Everything under `@pothos/*` and
`graphql-yoga` arrives transitively through rumble — do not re-add them.

### Scripts to align with chase

```jsonc
"db:migrate": "drizzle-kit migrate",
"db:push":    "drizzle-kit push",
"db:studio":  "drizzle-kit studio",          // replaces "studio": "prisma studio"
"db:reset":   "bun ./src/api/db/reset.ts",
"db:seed:dev":"bun ./src/api/db/seedConference.ts dev.yaml",
"db:nuke":    "docker compose -f ./dev.docker-compose.yml down -v && docker compose -f ./dev.docker-compose.yml up -d --wait && bun run db:migrate"
```

Chase's `dev:server` wraps vite in a restart loop (`while true; do svelte-kit sync && vite dev; done`).
This repo currently solves the same problem with the `devAutoRestart()` Vite plugin in
`vite.config.ts` — that plugin exists only to work around **Pothos ObjectRef and Houdini store
race conditions**, both of which disappear with this migration. Delete the plugin in Phase E and
adopt chase's loop only if crashes still happen.

---

## Phases

Phases A and B are independent of the stack swap, merge to `main` continuously, and are worth
doing even if the migration stalls. Phases C–G run on a long-lived branch
(`migration/drizzle-rumble`).

### Phase A — Toolchain & dependency alignment — **DONE (2026-09-24)**

**Blocker found: Vite 8 cannot land yet.** `@sveltejs/vite-plugin-svelte@7` peer-requires
`vite ^8`, but `houdini@2.0.0-next.11` and `houdini-svelte@3.0.0-next.13` both peer-pin
`vite ^7`. So `vite` 7→8 and `@sveltejs/vite-plugin-svelte` 5→7 move to the **end of Phase E**,
once houdini is deleted. Everything else in this phase landed. `@tailwindcss/vite@4.3.3` already
accepts both 7 and 8, so it is not part of that deferral.

Applied:

- [x] svelte 5.45.5 → 5.56.10, `@sveltejs/kit` 2.57.1 → 2.70.3, `adapter-node` 5.4 → 5.5.7,
      `svelte-check` 4.3.4 → 4.7.6 (+ `overrides.svelte` bumped in lockstep)
- [x] typescript 5.9.3 → 6.0.3, typescript-eslint 8.48 → 8.70 — `tsc --noEmit` clean
- [x] eslint 9 → 10.11, `@eslint/compat` 1 → 2, `globals` 15 → 17, `eslint-plugin-svelte`
      3.13 → 3.23, added `@eslint/js` as an explicit dep (chase has it; it was only transitive here)
- [x] tailwindcss + `@tailwindcss/vite` 4.1.17 → 4.3.3, typography 0.5.20, daisyui 5.5 → 5.7.46
- [x] paraglide 2.3.2 (was pinned exact) → ^2.24.1, `@inlang/cli` → ^3.3.3,
      `@lingual/i18n-check` → ^0.9.5
- [x] prettier 3.7 → 3.9.9 + plugin-svelte 3 → 4.1.1, plugin-tailwindcss 0.8.1, sort-json 4.2.0
      (reformatted 16 files: prettier 3.9 collapses short union types onto one line and
      normalizes CSS at-rule quoting — cosmetic only)
- [x] lefthook 1.13 → 2.1.14, concurrently 9 → 10, nanoid 5 → 6, hotkeys-js 3 → 4,
      zod → ^4.4.3, graphql → ^16.14.2
- [x] `project.inlang/.gitignore` replaced with chase's version — the newer inlang SDK emits
      `.lix/`, `.meta.json` and `README.md`, which the old two-line ignore file didn't cover

**ESLint 10 fallout** (two rules new to `js.configs.recommended`):

- `preserve-caught-error` — 2 genuine hits, fixed by attaching `{ cause: error }`
  (`src/api/services/OIDC.ts`, `stats/zip-api/+server.ts`).
- `no-useless-assignment` — 8 hits, one a false positive on Svelte's `$bindable(false)` prop
  default, so the rule is set to `'warn'` in `eslint.config.js` alongside this repo's other
  advisory rules.

**Verified**: `check` 0 errors / 127 warnings (was 1 error / 128), `typecheck` clean,
`test` 153/153, `lint` 0 errors, `format:check` clean, `i18n:check` + `i18n:validate` clean.

Not bumped, deliberately: `vite` / `@sveltejs/vite-plugin-svelte` (blocked, see above);
`svelte-inspect-value` 0.8 → 0.11 (dev-only, 0.x API churn, no reason to risk it now);
tiptap (this repo is _ahead_ of chase at 3.31 vs 2.27/3.30).

#### Original plan, for reference

- [ ] Bump the version table above, one PR per risky bump (vite 8, ts 6, eslint 10 separately).
- [ ] Align `svelte.config.js` with chase where it costs nothing: keep `$api`/`$assets`, plan to
      drop `$db`/`$houdini`. Defer `experimental.remoteFunctions` and `compilerOptions.experimental.async`
      until Phase E decides whether the SSR remote-functions exchange is wanted.
- [ ] Align `lefthook.yml` naming (keep this repo's extra fallow steps — see "do not align").
- [ ] Move runtime-only deps into `devDependencies` per this repo's CLAUDE.md convention, except
      the genuinely runtime ones (`drizzle-orm`, `pg`, `@urql/core`).

**Exit**: `bun run check`, `bun test`, `bun run build` green on the upgraded toolchain, no
functional change.

### Phase B — Structural alignment (no stack change) — **DONE (2026-09-25)**

Behavior-preserving moves + import rewrites. Every specifier was rewritten by resolving it
against the filesystem (handling `$lib/`, `$api/`, relative and extensionless forms) rather
than by text search-and-replace.

- [x] **Component folder casing.** Chase's convention is **directories `camelCase`, component
      files `PascalCase`** (`dataTable/DataTable.svelte`). 37 directories renamed top-down so
      each parent carried its new name before its children moved; 238 specifiers rewritten
      across 98 files. Also fixed an `@import` in `src/app.css` and updated `CLAUDE-UI.md`,
      which now documents the convention. Already-lowercase dirs (`extensions`, `settings`,
      `ui`, `tabs`) untouched; `Charts/ECharts` → `charts/echarts` to match the `echarts`
      package. Git recorded 157 renames.
- [x] `src/config/{public,private}.ts` → `src/lib/config/`, `$config` alias repointed in
      `svelte.config.js`. No import rewrites needed — all 23 consumers use the alias.
- [x] `src/lib/config/{dashboardLinks,teamDashboardLinks}.ts` → `src/lib/data/`. These are
      static navigation data, not env config; moving them keeps `$config` meaning exactly what
      it means in chase (env only).
- [x] `src/lib/constants/migrationNotice.ts` → `src/lib/data/`; `src/lib/constants` removed.
- [x] `src/lib/stores/csvSettings.ts` → `src/lib/state/`; `src/lib/stores` removed.
- [x] `src/api/context/` collapsed: `context.ts` → `src/api/context.ts` with `permissions.ts`
      folded in (70 lines, one consumer, nothing imported it externally);
      `oidc.ts` → `src/api/services/oidcContext.ts` (33 importers rewritten). Named
      `oidcContext` to sit unambiguously beside the existing `services/OIDC.ts` provider client.
- [x] `src/lib/services` (35 files) split into `src/lib/helpers` (24, pure) and
      `src/lib/utils` (10, UI/runtime) — 228 specifiers across 138 files. Classified by the
      stated rule (imports `$app/*`, `svelte`, paraglide or `$houdini` ⇒ `utils`), with two
      deliberate overrides: `resolutionExport.ts` → `utils` because chase has that exact file
      in `utils/`, and `storeExtractorType.ts` → `helpers` because it is type-only.
      `authenticatedHeaderStatus.svelte.ts` turned out to be pure runes state, so it went to
      `src/lib/state/` rather than either.
- [x] `src/lib/types/window.d.ts` → `src/app.d.ts`. It is an ambient global declaration and
      this repo had no `app.d.ts` at all, which is where SvelteKit expects one.
- [x] `src/tests/**` (5 files) colocated as `*.test.ts` beside their units
      (`lib/helpers/*.test.ts`, `tasks/mailSync/mailSyncPlan.test.ts`,
      `routes/.../configuration/changePreview.test.ts`); `src/tests` removed. No vitest config
      change needed — the default `**/*.test.ts` glob already covers them.
- [x] Left `src/lib/{schemata,emails,queries,seeding}` in place: `queries` and `seeding` are
      owned by Phases E and F, and `schemata`/`emails` have no chase counterpart.

**Deviations from the original plan, and why:**

1. **`csvSettings` was moved but not converted to runes.** The plan said `src/lib/state/*.svelte.ts`.
   Converting a `svelte-persisted-store` into runes changes every consumer's `$csvSettings`
   access — that is a behavior rewrite, not a move, and Phase B is meant to be
   behavior-preserving. It sits at `src/lib/state/csvSettings.ts` (no `.svelte.ts`) until
   someone converts it deliberately.
2. **`src/api/services/permissions.ts` does not exist** — the file was folded into `context.ts`
   as planned rather than moved, since Phase D deletes it outright anyway.

**Verified after every step**: `check` 0 errors / 127 warnings, `typecheck` clean,
`test` 153/153, `lint` 0 errors / 764 warnings, `format:check` clean — all identical to the
Phase A baseline.

**Two bugs the rewrite tooling hit, worth knowing if it is reused in Phases C–F:** specifiers
written as `…/foo.svelte` that resolve to a `foo.svelte.ts` file got an extra `.ts` appended
(51 occurrences), and one written as `…/foo.svelte.js` resolved to nothing and was left
pointing at the old path. Both were caught by `typecheck`/`check` and fixed. Always run both
after a move, and grep for the old directory name afterwards — a doc comment referencing
`$lib/services/dateTimeInput` was only found that way.

### Phase C — Database: Prisma → Drizzle (parallel, app untouched) — **DONE (2026-09-25)**

`src/api/db/{schema.ts,relations.ts,db.ts}` + `drizzle.config.ts` + a baseline migration in
`drizzle/`, all verified against the real schema. Nothing in the app imports any of it yet —
the app still runs entirely on Prisma.

**A production restore turned out not to be needed.** Applying all 77 Prisma migrations to an
empty Postgres produces a schema identical to production; production-like _data_ matters for
validating ability filters in Phase D, not for reading schema shape. A disposable container on
port 5440 was used and destroyed afterwards.

**Zero drift confirmed.** `drizzle-kit push` against the migrated database emits exactly one
statement — `DROP TABLE "_prisma_migrations"`, the Prisma bookkeeping table deliberately left
out of `schema.ts`. All 30 app tables, 314 columns, 10 enums, 72 indexes and 61 foreign keys
match with no diff.

What introspection handled better than this plan assumed:

- **drizzle-kit rc.5 emits `defineRelations` natively**, including `.through()` for Prisma's
  four implicit m2m join tables (`_CommitteeToNation`,
  `_ConferenceSupervisorToDelegationMember`, `_ConferenceSupervisorToSingleParticipant`,
  `_CustomConferenceRoleToSingleParticipant`). The plan budgeted for porting 56 relations by
  hand; that was unnecessary, and hand-porting would have been _more_ error-prone.
- **TS identifiers come out camelCase already**, with physical names as explicit string
  arguments (`pgTable('Conference', …)`, `text('A')`). So the code reads like chase even though
  the physical names do not match it.

**Physical naming: aligned with chase after all** (decided 2026-09-25, overriding the initial
recommendation to leave it). `schema.ts` now uses `snakeCase.table(...)` with snake_case table
names and no explicit column names, `drizzle.config.ts` sets `casing: 'snake_case'`, and enum
types are snake_case — identical in shape to chase.

The rename is carried by `drizzle/20260924225440_snake_case_alignment`: **279 statements, every
one an `ALTER ... RENAME`, zero `DROP`/`CREATE`.** No table is recreated and no row is touched.

Getting drizzle-kit to emit renames rather than drop/create needs explicit hints — left to its
own devices in a non-interactive run it silently plans to recreate everything, which on a real
database means total data loss. Always inspect the plan with `--explain` before writing a
migration. The hint shape is:

```json
{
	"from": ["public", "<old>"],
	"kind": "table|column|enum|index|primary_key",
	"to": ["public", "<new>"],
	"type": "rename"
}
```

309 hints were generated mechanically rather than by hand: old names came from the baseline
snapshot's `ddl` array, new names from `getTableConfig()` on the compiled schema (drizzle's own
resolution, so the mapping is authoritative rather than a guess at its casing rules), joined on
a canonical form — lowercase with underscores stripped, under which `DelegationMember` and
`delegation_member` collide by construction. Zero unmatched.

**One name had to be shortened by hand.** The derived
`conference_participant_status_conference_id_assigend_document_nu_key` is 67 characters;
Postgres truncates identifiers at 63, so the database and `schema.ts` would have disagreed
forever. It is `conference_participant_status_conference_id_doc_number_key` (58) instead. Worth
checking for whenever a table with a long name gains a multi-column index.

**Both deployment paths verified against real databases:**

| Path                                                 | Result                                                   |
| ---------------------------------------------------- | -------------------------------------------------------- |
| existing DB: 77 Prisma migrations → rename migration | drift check emits only `DROP TABLE "_prisma_migrations"` |
| fresh DB: `drizzle-kit migrate` (baseline → rename)  | `No changes detected`                                    |

Constraint names not managed by drizzle (the 30 `"<Table>_pkey"` constraints on tables that
declare `.primaryKey()` inline rather than by name) keep their old PascalCase names in the
database. Drizzle does not track them, so they cause no drift; they are cosmetic only.

Shared column helpers, mirroring chase's, now cover all 30 tables:

| Helper                   | Tables | Notes                                                                 |
| ------------------------ | ------ | --------------------------------------------------------------------- |
| `defaultIdAndTimestamps` | 26     | nanoid id + createdAt + updatedAt                                     |
| `defaultIdAndCreatedAt`  | 2      | `PaperVersion`, `PaperReview` — append-only, no `updatedAt`           |
| `defaultTimestamps` only | 2      | `PaymentTransaction` (caller-supplied id), `Nation` (`alpha3Code` PK) |

**Two Prisma behaviours that live in the client, not the database**, and would have been lost
silently — inserts failing on a missing id, and `updatedAt` frozen at its insert value:

- `@default(nanoid())` → `.$defaultFn(() => nanoid())` (28 tables)
- `@updatedAt` → `.$onUpdate(() => new Date())` (28 tables)

Neither emits DDL, so the drift check stays clean either way — which is exactly why they are
easy to miss. They _were_ missed on the first pass: the transformation that inserted the helpers
silently matched nothing for every table written in the three-argument
`pgTable(name, columns, indexes)` form, and the run reported success because it counted
classified tables rather than actual replacements. Roughly 28 tables shipped without their id
default and `updatedAt` trigger, and every check — drift, typecheck, tests — stayed green.
Verify this kind of edit by grepping the result, never by trusting the script's own tally. Ids use **chase's generator**, copied verbatim to `src/lib/helpers/nanoid.ts`
(30 chars, no-look-alike alphabet, plus `isValidNanoid`/`nanoidValidation` which Phase D needs
for `t.arg.id().validate(...)`). Rows created before this change keep their 21-char Prisma-era
ids; both are opaque text, so the two formats coexist permanently. `schema.ts` imports it by
relative path rather than the `$lib` alias because drizzle-kit loads the file outside Vite —
chase does the same.

Added scripts: `db:generate`, `db:migrate`, `db:push`, `db:studio` (chase's names). Prisma's
`studio` script stays until Phase F. `drizzle/**/snapshot.json` added to `.prettierignore`
(chase ignores `drizzle/meta/**`, the pre-1.0 layout).

**Verified**: `typecheck` clean, `check` 0 errors / 127 warnings, `test` 153/153,
`lint` 0 errors, `format:check` clean.

**Open item for deployment (Phase F):** the baseline migration contains full `CREATE TABLE`
statements, so it must be marked as already-applied on existing databases rather than run —
`drizzle-kit migrate` against production would fail on tables that already exist. Decide
whether to insert the journal row manually or to run `migrate` only on fresh databases.

### Phase D — API: Pothos/CASL → Rumble handlers — **authorization layer DONE (2026-09-25)**

**The big-bang framing was wrong.** The plan assumed Pothos/Prisma and Rumble/Drizzle cannot
coexist. The conflict is purely type-level: each Pothos plugin marks its own key required on
every builder. Give the legacy builder an inert `drizzle` key and rumble's `pothosConfig` an
inert `prisma` key, and **both stacks typecheck and serve simultaneously**. Phase D/E can be
incremental, with the app working throughout, instead of broken for days.

Two environment fixes were needed to get there:

- `@m1212e/rumble` statically imports `lib-address`, whose ESM entry calls `require()` - invalid
  ESM, which took down every route importing rumble, in delegator _and_ chase. Fixed upstream in
  rumble 0.23.23 (`createRequire`, selecting the package's valid `require` condition). An issue
  draft for `LancelotP/lib-address` sits at `../lib-address-issue.md`.
- Two copies of `@pothos/core` (delegator's legacy 4.10 and rumble's nested 4.13) made
  `@pothos/plugin-drizzle` register on the wrong SchemaBuilder class - `drizzleObject is not a
function`. Fixed with a version bump plus an override forcing a single copy. Chase never hits
  this because it has no top-level `@pothos/core`.

**All 30 tables have handlers**, each a 1:1 port of its CASL module, verified live: public reads
return data, protected reads return empty arrays (not errors), and m2m traversal through join
tables works.

Four semantics established rather than assumed:

| Question              | Answer                     | How it was established                                                     |
| --------------------- | -------------------------- | -------------------------------------------------------------------------- |
| Do stacked rules OR?  | Yes                        | Chase stacks 3-4 `allow('read')` calls per table                           |
| Anonymous requests    | Grant nothing, never throw | CASL registered rules inside `if (oidc?.user)`; helpers return `undefined` |
| System admin wildcard | Needed per table           | Rumble has no global wildcard for CASL's `can('manage','all')`             |
| Filter shapes valid?  | 15 shapes probed           | Compiled to SQL: `EXISTS`, `IS NULL`, `ne`, 3-level nesting, m2m           |

That last row matters: the `where` object is loosely typed, so a wrong relation name fails only
at runtime - exactly how the original `relations.ts` bug stayed hidden.

**Join tables got surrogate ids** (`drizzle/20260925081546_join_table_surrogate_ids`).
Rumble requires a single-column primary key (`abilityBuilder.ts:396`; its `getTableConfig`
carries `//TODO support composite primary keys`), and Prisma's four implicit m2m tables have
composite `(A,B)` keys. Chase has no implicit m2m at all - its join tables are explicit entities
with their own `id` - so that is the shape adopted here. The old composite key survives as a
unique index, so the pair is still unique; it simply is not the row identity any more.

**The generated migration needed a hand-written backfill.** Drizzle emits
`ADD COLUMN "id" text` followed by `ADD PRIMARY KEY ("id")`, and the nanoid default is applied
by the application rather than the database - so on a table with existing rows every id would be
NULL and the primary key would fail. An `UPDATE ... SET id = gen_random_uuid()::text` sits
between the two. Verified by applying the first two migrations, inserting a join row, then
applying this one: the row came out with an id and the primary key moved to it. Existing join
rows therefore carry uuid-shaped ids while new ones get nanoids; both are opaque text.

**One deliberate fidelity change.** Exactly one CASL rule granted `list` without `read`
(participants listing non-draft papers). Rumble has no list action and neither does chase, so it
maps to `read` - the single place in the port where access widens. Flagged in `paper.ts`.

#### Deliberate API differences from the legacy schema

- **Deletes return `Boolean`.** Every generated `deleteOne*` returned the deleted row; chase's
  deletes return a boolean, and that is what the ported mutations do. They also throw when the
  ability filter matched nothing, rather than reporting success for a delete that did nothing.
- **Naming follows chase** (`createPlace`, not `createOnePlace`). Rumble generates query names
  itself (`places`, not `findManyPlaces`), so the contract changes regardless and Phase E has to
  rewrite the frontend either way; mixed naming would be worse than a clean break.
- **`swapRoleApplicationRanks` returns a list.** The legacy version returned a bespoke object
  with fields `firstRoleApplication` and `secpndRoleApplication` (sic). It now returns the two
  applications as a list, which drops the typo and the one-off type.
- **`updateAllConferenceParticipantStatus` returns a plain list** of changed ids, rather than
  wrapping it in a one-field `{ changed }` object.
- **`createPaperReview` returns `reviewId`** rather than a nested `{ review { id } }` object,
  and its result type is a flat simple object.
- **Conference uploads take data URLs, not multipart files.** Rumble's schema builder has a
  fixed scalar map with no `File`, and these columns (`imageDataURL`, `contractContent`, …)
  store data URLs regardless - so the encoding moves to the client and the multipart upload path
  disappears. `src/api/services/fileToDataURL.ts` becomes frontend work in Phase E.
- **`updateManyDelegationMemberCommittee` takes an explicit id list** and returns the number of
  rows changed, rather than accepting an arbitrary Prisma `where` from the client.
- **`assignCommitteesToDelegationMembers` returns only the target conference's members.** The
  legacy version returned every delegation member the caller could list, across all conferences -
  almost certainly unintended. It now takes a `conferenceId` and scopes the result to it.
- **`sendAssignmentData` returns `Boolean`** and takes an explicit `conferenceId`, rather than a
  one-field `{ success }` object and a Prisma `where`. The single-participant delete that the
  legacy version issued against `singleParticipant.id` using _delegation_ ids is not carried
  over - it could never match, so reproducing it would only preserve a no-op.
- **Commented-out resolvers are not ported.** `createOneCommittee`, `createOneNonStateActor` and
  `createOneCustomConferenceRole` are disabled upstream and absent from `schema.graphql`.

#### Mutation worklist (authoritative: taken from `schema.graphql`, the live API contract)

90 of 90 done. Several `createOne*` resolvers are commented out in the legacy
code (Committee, NonStateActor, CustomConferenceRole), so they are deliberately absent here -
porting them would invent API surface that does not exist today.

- [x] `assignCommitteesToDelegationMembers`
- [x] `connectToConferenceSupervisor`
- [x] `createOneAgendaItem`
- [x] `createOneAppliedDelegationMember`
- [x] `createOneAppliedSingleParticipant`
- [x] `createOneAttendanceEntry`
- [x] `createOneCalendarDay`
- [x] `createOneCalendarEntry`
- [x] `createOneCalendarTrack`
- [x] `createOneConferenceSupervisor`
- [x] `createOneDelegation`
- [x] `createOneDelegationMember`
- [x] `createOnePaper`
- [x] `createOnePaymentTransaction`
- [x] `createOnePlace`
- [x] `createOneRoleApplication`
- [x] `createOneSingleParticipant`
- [x] `createOneSurveyOption`
- [x] `createOneSurveyQuestion`
- [x] `createOneTeamMember`
- [x] `createOneWaitingListEntry`
- [x] `createPaperReview`
- [x] `createReviewerSnippet`
- [x] `createTeamMemberInvitations`
- [x] `deleteDeadDelegationMembers`
- [x] `deleteDeadSingleParticipants`
- [x] `deleteDeadSupervisors`
- [x] `deleteEmptyDelegations`
- [x] `deleteOneAgendaItem`
- [x] `deleteOneAttendanceEntry`
- [x] `deleteOneCalendarDay`
- [x] `deleteOneCalendarEntry`
- [x] `deleteOneCalendarTrack`
- [x] `deleteOneCommittee`
- [x] `deleteOneConference`
- [x] `deleteOneConferenceParticipantStatus`
- [x] `deleteOneConferenceSupervisor`
- [x] `deleteOneCustomConferenceRole`
- [x] `deleteOneDelegation`
- [x] `deleteOneDelegationMember`
- [x] `deleteOneNation`
- [x] `deleteOneNonStateActor`
- [x] `deleteOnePaper`
- [x] `deleteOnePlace`
- [x] `deleteOneRoleApplication`
- [x] `deleteOneSingleParticipant`
- [x] `deleteOneSurveyOption`
- [x] `deleteOneSurveyQuestion`
- [x] `deleteOneTeamMember`
- [x] `deleteOneUser`
- [x] `deleteOneWaitingListEntry`
- [x] `deleteReviewerSnippet`
- [x] `importCalendarDay`
- [x] `normalizeSchoolsInConference`
- [x] `regenerateTeamMemberInvitation`
- [x] `revokeTeamMemberInvitation`
- [x] `rotateSupervisorConnectionCode`
- [x] `seedNewConference`
- [x] `sendAssignmentData`
- [x] `setAgendaItemReviewHelpStatus`
- [x] `startImpersonation`
- [x] `swapRoleApplicationRanks`
- [x] `unregisterParticipant`
- [x] `updateAllConferenceParticipantStatus`
- [x] `updateManyDelegationMemberCommittee`
- [x] `updateOneAgendaItem`
- [x] `updateOneCalendarDay`
- [x] `updateOneCalendarEntry`
- [x] `updateOneCalendarTrack`
- [x] `updateOneCommittee`
- [x] `updateOneConference`
- [x] `updateOneConferenceParticipantStatus`
- [x] `updateOneConferenceSupervisor`
- [x] `updateOneCustomConferenceRole`
- [x] `updateOneDelegation`
- [x] `updateOneDelegationMemberCommittee`
- [x] `updateOnePaper`
- [x] `updateOnePaymentTransaction`
- [x] `updateOnePlace`
- [x] `updateOneSingleParticipant`
- [x] `updateOneSurveyAnswer`
- [x] `updateOneSurveyOption`
- [x] `updateOneSurveyQuestion`
- [x] `updateOneTeamMember`
- [x] `updateOneUser`
- [x] `updateOneUsersGlobalNotes`
- [x] `updateOneUsersIdentityInfo`
- [x] `updateOneUsersNewsletterPreferences`
- [x] `updateOneWaitingListEntry`
- [x] `updateReviewerSnippet`

**Phase D mutation surface is complete (90/90), verified live**: the built schema exposes 90
mutations and 60 queries, public reads return data, protected reads return empty arrays, and
admin-only mutations refuse anonymous callers.

#### Custom query worklist (the non-CRUD half of the Query type)

All 26 done. The table CRUD queries are generated by `query({ table })`;
these are the hand-written ones the frontend also depends on, so Phase E cannot finish
without them.

- [x] `checkTeamInvitationEmails`
- [x] `conferencePlausibility`
- [x] `findGlobalIntroductionPapers`
- [x] `findGlobalPapersGroupedByCommittee`
- [x] `findIntroductionPapers`
- [x] `findNextPaperToReview`
- [x] `findPapersGroupedByCommittee`
- [x] `findPublicPaperContent`
- [x] `findSupervisedPapers`
- [x] `flagCollection`
- [x] `getAllConferenceNations`
- [x] `getCertificateJWT`
- [x] `getCertificateJWTPublicKeyObject`
- [x] `getConferenceStatistics`
- [x] `impersonatableUsers`
- [x] `impersonationStatus`
- [x] `logoutUrl`
- [x] `myOIDCRoles`
- [x] `myReviewStats`
- [x] `myReviewerSnippets`
- [x] `offlineUserRefresh`
- [x] `previewConferenceSupervisor`
- [x] `previewDelegation`
- [x] `previewUserByIdOrEmail`
- [x] `reviewerLeaderboard`
- [x] `searchConference`

**Still to do in this phase**: delete `src/api/resolvers/` and `src/api/abilities/` together with
the Prisma-backed services they are the only remaining callers of (`services/stats.ts`,
`services/ageStats.ts`, `services/requireUserToBeConferenceAdmin.ts`), which the Drizzle ports
`services/statistics.ts`, `services/ageStatistics.ts`, `services/statisticsFilters.ts` and
`assertMayManageConference` replace.

Two deliberate differences from the legacy statistics output, both in groups Prisma's `groupBy`
produced with a zero count: the nationality distribution no longer emits an `Unknown` entry for
users without a country, and the school statistics count delegations without a school under
`Unknown` instead of reporting `delegationCount: 0` for them.

#### Original plan, for reference

### Phase D (original) — API: Pothos/CASL → Rumble handlers

The one unavoidable big bang: the frontend is broken against the new schema until Phase E lands.
Keep it on the branch; do not merge D without E.

1. `src/api/rumble.ts` — chase's file minus the subscription plumbing:
   ```ts
   export const {
   	abilityBuilder,
   	schemaBuilder,
   	whereArg,
   	object,
   	query,
   	createYoga,
   	enum_,
   	clientCreator
   } = rumble({
   	db,
   	schema,
   	context,
   	defaultLimit: 1000,
   	pothosConfig: { plugins: [ValidationPlugin] }
   });
   ```
   No `pubsub`, no `createWs`, no `subscriptions: [...]` — this repo has zero subscriptions.
2. Reshape `context.ts` (already moved in Phase B) to return
   `{ ...req.locals, mustBeLoggedIn(), hasRole(), isSessionLive() }`. **Keep this repo's
   `openid-client` OIDC implementation** — only the context's output shape has to match what
   Rumble abilities expect. Do not swap in `@m1212e/sveltekit-oidc`: this repo's flow carries
   impersonation, email-conflict and invitation paths chase doesn't have.
3. Write `src/api/services/authHelper.ts` first (before any handler): the delegator equivalents of
   chase's `isGlobalAdmin` / `isTeamInConference` / `isParticipantInConference` /
   `isAdminInConference`. Every handler's abilities compose from these, so getting them right once
   is most of the authorization work. The existing CASL conditions are already
   `{ field: { nested: value } }` shapes, close to Drizzle's relational `where`.
4. One `src/api/handlers/<entity>.ts` per table, replacing **both** the old resolver module and
   the old ability module:

   | Table                       | Old resolver(s)                                           | Old ability                               | New handler                               |
   | --------------------------- | --------------------------------------------------------- | ----------------------------------------- | ----------------------------------------- |
   | Conference                  | `modules/conference/conference.ts`                        | `entities/conference.ts`                  | `handlers/conference.ts`                  |
   | Committee                   | `modules/committee.ts`                                    | `entities/committee.ts`                   | `handlers/committee.ts`                   |
   | CommitteeAgendaItem         | `modules/committeeAgendaItem.ts`                          | `entities/committeeAgendaItem.ts`         | `handlers/committeeAgendaItem.ts`         |
   | User                        | `modules/user.ts`, `modules/auth.ts`                      | `entities/user.ts`                        | `handlers/user.ts`                        |
   | ReviewerSnippet             | `modules/reviewerSnippet.ts`                              | `entities/reviewerSnippet.ts`             | `handlers/reviewerSnippet.ts`             |
   | ConferenceParticipantStatus | `modules/conferenceParticipantStatus.ts`                  | `entities/conferenceParticipantStatus.ts` | `handlers/conferenceParticipantStatus.ts` |
   | PaymentTransaction          | `modules/paymentTransaction.ts`                           | `entities/paymentTransaction.ts`          | `handlers/paymentTransaction.ts`          |
   | Paper                       | `modules/paper/paper.ts`                                  | `entities/paper/paper.ts`                 | `handlers/paper.ts`                       |
   | PaperVersion                | `modules/paper/paperVersion.ts`                           | `entities/paper/paperVersion.ts`          | `handlers/paperVersion.ts`                |
   | PaperReview                 | `modules/paper/paperReview.ts`                            | `entities/paper/paperReview.ts`           | `handlers/paperReview.ts`                 |
   | Nation                      | `modules/nation.ts`                                       | `entities/nation.ts`                      | `handlers/nation.ts`                      |
   | NonStateActor               | `modules/nonStateActor.ts`                                | `entities/nonStateActor.ts`               | `handlers/nonStateActor.ts`               |
   | CustomConferenceRole        | `modules/customConferenceRole.ts`                         | `entities/customConferenceRole.ts`        | `handlers/customConferenceRole.ts`        |
   | SingleParticipant           | `modules/singleParticipant.ts`                            | `entities/singleParticipant.ts`           | `handlers/singleParticipant.ts`           |
   | Delegation                  | `modules/delegation.ts`                                   | `entities/delegation.ts`                  | `handlers/delegation.ts`                  |
   | RoleApplication             | `modules/roleApplication.ts`                              | `entities/roleApplication.ts`             | `handlers/roleApplication.ts`             |
   | DelegationMember            | `modules/delegationMember.ts`                             | `entities/delegationMember.ts`            | `handlers/delegationMember.ts`            |
   | ConferenceSupervisor        | `modules/conferenceSupervisor.ts`                         | `entities/conferenceSupervisor.ts`        | `handlers/conferenceSupervisor.ts`        |
   | SurveyQuestion              | `modules/survey/surveyQuestion.ts`                        | `entities/surveyQuestion.ts`              | `handlers/surveyQuestion.ts`              |
   | SurveyOption                | `modules/survey/surveyOption.ts`                          | `entities/surveyOption.ts`                | `handlers/surveyOption.ts`                |
   | SurveyAnswer                | `modules/survey/surveyAnswer.ts`                          | `entities/surveyAnswer.ts`                | `handlers/surveyAnswer.ts`                |
   | WaitingListEntry            | `modules/waitingListEntry.ts`                             | `entities/waitingListEntry.ts`            | `handlers/waitingListEntry.ts`            |
   | TeamMember                  | `modules/teamMember.ts`                                   | `entities/teamMember.ts`                  | `handlers/teamMember.ts`                  |
   | TeamMemberInvitation        | `modules/teamMemberInvitation.ts`                         | `entities/teamMemberInvitation.ts`        | `handlers/teamMemberInvitation.ts`        |
   | CalendarDay                 | `modules/calendar/calendarDay.ts`, `calendarDayImport.ts` | `entities/calendarDay.ts`                 | `handlers/calendarDay.ts`                 |
   | CalendarTrack               | `modules/calendar/calendarTrack.ts`                       | `entities/calendarTrack.ts`               | `handlers/calendarTrack.ts`               |
   | Place                       | `modules/calendar/place.ts`                               | `entities/place.ts`                       | `handlers/place.ts`                       |
   | CalendarEntry               | `modules/calendar/calendarEntry.ts`                       | `entities/calendarEntry.ts`               | `handlers/calendarEntry.ts`               |
   | AttendanceEntry             | `modules/attendanceEntry.ts`                              | `entities/attendanceEntry.ts`             | `handlers/attendanceEntry.ts`             |

   Cross-cutting modules with **no table** — port as free-standing
   `schemaBuilder.queryFields`/`mutationFields` (chase's `user.ts` `currentUserClaims` style),
   not as `object`/`query` CRUD:
   `modules/assignments.ts`, `modules/impersonation.ts`, `modules/flagCollection.ts`,
   `modules/search.ts`, `modules/conference/{certificateConfig,certificateSignature,plausibility,seed,statistics}.ts`,
   `modules/paper/reviewerLeaderboard.ts`.

5. Handler shape, per chase's `committee.ts`:
   ```ts
   abilityBuilder.<table>.allow('read'|'update'|'delete'|'create').when((ctx) => ({ where: ... }));
   const ref = object({ table: '<name>', adjust: (t) => ({ /* computed fields */ }) });
   query({ table: '<name>' });
   schemaBuilder.mutationFields((t) => ({ /* t.drizzleField for non-default mutations */ }));
   ```
   Abilities are applied as
   `ctx.abilities.<table>.filter('update').merge({ where: { id } }).sql.where` on writes and
   `.query.single` on reads.
6. `src/api/handlers/register.ts` importing every handler, plus the `clientCreator` call gated on
   `dev || building` (outputs `src/lib/api/rumbleClient`, `useExternalUrqlClient: '../client'`).
7. Replace `src/api/resolvers/api.ts` with rumble's `createYoga` in
   `src/routes/api/graphql/+server.ts`. Depth limiting moves to `armorConfig.maxDepth` —
   measure this repo's deepest legitimate query before picking the number (chase needed 10).
8. Delete `src/api/resolvers/`, `src/api/abilities/`, `prisma/pothos.config.cjs`,
   `prisma/generated/`, `prisma/pothos/`.

**Exit**: `bun run check` passes; `/api/graphql` served by rumble; every table has a handler with
abilities enforced; spot-checked with one admin and one non-admin user per major entity.

### Phase E — Frontend: Houdini → Rumble client

1. Verify `clientCreator` output in `src/lib/api/rumbleClient/{client.ts,schema.ts}` on `bun run dev`.
2. Write `src/lib/api/client.ts` — **the minimal version**: `nativeDateExchange` +
   `cacheExchange` (`@urql/exchange-graphcache`) + `fetchExchange`. Chase's 547-line client
   carries an offline demo mode, crosstab sync and an SSR remote-functions exchange, none of which
   this repo needs. Port those later only against a concrete requirement.
3. Migrate the 8 files in `src/lib/queries/` first — smallest, most isolated, validates the setup.
   Each Houdini store becomes a `client.query.<field>({...})` / `client.mutate.<field>({...})`
   call at the call site; the query-definition file disappears.
4. Migrate the 146 inline-`graphql()` files in feature batches mirroring
   `src/routes/(authenticated)/**` (dashboard, management, registration, assignment-assistant,
   papers, calendar), `bun run check` after each batch.
5. Replace every `cache.markStale(); await invalidateAll();` pair. With graphcache normalizing
   entities, most mutations self-update; add explicit refetch only where an aggregate/computed
   field genuinely can't be inferred.
6. Delete `houdini.config.js`, `.houdini/`, `src/client.ts`, the houdini Vite plugin, and the
   `devAutoRestart()` plugin (its two race conditions were Pothos- and Houdini-specific).

**Exit**: `bun run build` green with houdini gone from `package.json` and `vite.config.ts`; manual
click-through of registration, management dashboards, assignment assistant, paper
submission/review and calendar against a staging DB.

### Phase F — Tasks, seeds, dev data

- [ ] Point `src/tasks/**` at `$api/db/db` and delete `src/tasks/tasksDb.ts` — one client only.
      Re-check `scripts/tasksBuild.ts` bundling now that Prisma's engine binary is gone (this
      should get simpler and smaller).
- [ ] Port `prisma/seed/**`, `prisma/defaultData/**` and `src/lib/seeding/` to
      `src/api/db/{seedConference.ts,seedUtils.ts,reset.ts,seed-data/}`, using `drizzle-seed`
      where chase does.
- [ ] Delete `prisma/` entirely (schema, migrations, db.ts) — git history is sufficient archive.
- [ ] Drop the `$db` alias.

### Phase G — Cleanup & docs

- [ ] Remove every dep in the "Remove" list; `bun run typecheck && bun run check && bun test && bun run lint`.
- [ ] `grep -r "@prisma/client\|houdini\|@casl/\|@pothos/"` → no hits.
- [ ] `bun run fallow` — expect the dead-code/duplication numbers to move a lot; re-baseline.
- [ ] Rewrite `CLAUDE.md` Tech Stack + Architecture + "Adding a New GraphQL Resolver" +
      "Database Schema Changes" for the Rumble handler pattern and `drizzle-kit generate/migrate`.
      This file is what future sessions read first; stale content here actively misleads.
- [ ] `bun run i18n:check`.
- [ ] Delete this document once merged.

---

## Do NOT align (deliberate divergences)

Keeping these is the "reasonably" in "as close as reasonably possible":

- **Routes.** Out of scope by definition; the two apps are different products.
- **`RESOLUTION_EDITOR_V0_2_MIGRATION.md`'s component paths.** Left at the old casing on
  purpose: it documents a migration that already happened, and rewriting its paths would
  misrepresent the tree as it stood at the time.
- **Sentry/Bugsink + OpenTelemetry.** Delegator-only observability. Rumble bundles
  `@pothos/plugin-tracing` + `@pothos/tracing-opentelemetry`, so the resolver-level tracing
  survives the migration — verify how rumble exposes it before deleting `src/api/resolvers/tracer.ts`.
- **`src/tasks/**`+`Dockerfile.tasks`+`scripts/tasksBuild.ts`.\*\* Chase has no background tasks.
- **fallow** (`fallow`, `fallow:audit`, `fallow:health`, the lefthook/CI steps). Delegator-only
  tooling worth keeping.
- **Docker compose extras** (listmonk, mailpit, bugsink) — real delegator dependencies.
- **`src/lib/{schemata,emails}`**, superforms, sveltekit-search-params, PDF/certificate stack —
  no chase counterpart.
- **This repo's OIDC implementation** — see Phase D step 2.

---

## Risks & remaining open questions

1. **Drizzle 1.0 is still a prerelease** (`1.0.0-rc.5-ab785fc`). Rumble's typed-client and
   ability filters are built on 1.0-only APIs (`snakeCase.table`, `defineRelations`), so pinning
   to exactly chase's build is not optional. Check for a stable 1.0 before starting; if one
   exists, upgrade chase and delegator together, not separately.
2. **Schema freeze vs. rebase.** 77 migrations exist; new ones landing on `main` mid-migration
   have to be replayed by hand into `schema.ts`. Decide with the team: freeze, or accept periodic
   manual replay. Phases A and B merging continuously makes a freeze cheaper, since they don't
   touch the schema.
3. **Authorization parity is the real risk, not the ORM.** 29 CASL modules become ability-builder
   rules; a missing relation in `relations.ts` or a dropped `OR` branch silently _widens_ access
   rather than erroring. Plan explicit per-entity read/write checks with an admin, a team member,
   a supervisor, and a plain participant before merging Phase D.
4. **Phase D→E window.** The API and frontend cannot be migrated atomically. Merge D and E to
   `main` as a single squashed unit, or ship from the branch to staging only.
5. Whether to eventually adopt chase's `experimental.remoteFunctions` SSR exchange — defer.
6. **`bun run build` currently fails locally**, before and after Phase A, with
   `ReferenceError: Cannot access 'api' before initialization`. Cause: `src/api/resolvers/builder.ts:73`
   does `import('./api')` while `src/routes/api/graphql/+server.ts` statically imports `api.ts`,
   which imports `builder.ts` — a genuine import cycle that Node 26 evaluates into a TDZ error
   (CI runs an older Node and doesn't trip it). Not a migration blocker and not worth fixing:
   Phase D deletes both files, and chase's equivalent dev-only re-import lives in `rumble.ts`
   where nothing statically imports it back.
