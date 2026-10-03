# Migration Guide: Prisma/Pothos/Houdini → Drizzle/Rumble

This is a follow-along working document for migrating this repo's data/API/frontend-query stack
to match [`munify-chase`](../munify-chase), which already completed the same migration
(Houdini → Rumble, on top of Drizzle + a hand-glued Pothos setup). Chase is the reference
implementation throughout — when in doubt, look at how chase solved the same problem before
inventing a new pattern here.

**Decisions locked in for this migration** (see rationale inline below):

- **Sequencing**: big-bang, layer by layer — DB schema fully cut over, then the whole GraphQL
  API, then the whole frontend. No dual-stack (Prisma+Drizzle or Pothos+Rumble) running
  side by side in the same running app.
- **DB schema authoring**: generate the initial Drizzle schema via `drizzle-kit introspect`
  against the current database, then hand-clean it (naming, types, relations) rather than
  transcribing `schema.prisma` by hand.
- **Authorization**: CASL (`@casl/ability`, `@casl/prisma`) is fully replaced by Rumble's
  built-in ability builder. All 28 ability-entity modules get rewritten, not adapted.
- **Frontend scope**: included. All Houdini usage (146 files with inline `graphql()` template
  literals, 8 centralized query files, houdini-svelte stores) is replaced with Rumble's
  generated typed client, matching chase's `client.query.*` / `client.mutate.*` pattern.

## Why this is a big undertaking

This is not three independent swaps — the layers are coupled today:

- Pothos's schema is generated from the **Prisma DMMF** via `prisma-generator-pothos-codegen`
  (`prisma/pothos.config.cjs` → `prisma/pothos/generated`). Pothos as currently wired cannot run
  without Prisma.
- CASL abilities (`src/api/abilities/entities/**`) derive their subject types directly from
  Prisma client return types (`@casl/prisma`'s `createPrismaAbility`) and are applied as
  Prisma `where`-clause guards inside resolvers. Swapping the ORM without swapping the
  authorization layer is not possible without a translation shim, which we're not building —
  we replace both at once, in the API-layer phase.
- Houdini's schema introspection points at the live GraphQL endpoint, so its types are only
  as good as whatever schema Pothos produces — another reason the API layer must be stable
  before starting the frontend phase.

This is why "big-bang, layer by layer" was chosen over per-entity vertical slices: partial
migration would require Prisma and Drizzle (and Pothos-hand-rolled and Rumble) to coexist and
agree on data shape, which given ~30 heavily-relational models is more risk than it's worth.

## Current state (baseline, surveyed 2026-08-31)

| Layer                                                       | Current                                                                 | Count                             |
| ----------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| DB models                                                   | `prisma/schema.prisma`                                                  | 30 models, 10 enums, 56 relations |
| Migrations                                                  | `prisma/migrations/`                                                    | ~85 migration folders             |
| Prisma clients                                              | `prisma/db.ts` (web), `src/tasks/tasksDb.ts` (tasks, separate instance) | 2                                 |
| Pothos resolver modules                                     | `src/api/resolvers/modules/**`                                          | 41 files                          |
| CASL ability modules                                        | `src/api/abilities/entities/**`                                         | 28 files                          |
| Houdini centralized queries                                 | `src/lib/queries/*.ts`                                                  | 8 files                           |
| Inline `graphql()` usage                                    | `.svelte` / `.ts` across `src`                                          | 146 files                         |
| Houdini store consumption (`.fetch`/`.mutate`/`.subscribe`) | across `src`                                                            | 56 files                          |
| Seed/fixture scripts on Prisma                              | `prisma/seed/**`, `prisma/defaultData/**`                               | several                           |

Target reference deps (from chase, pin similarly — check for newer patch releases before
installing):

```
drizzle-orm, drizzle-kit, drizzle-seed   (chase pins a 1.0.0-rc.5 prerelease — evaluate
                                           current latest stable vs. matching chase's version
                                           at migration time)
@m1212e/rumble                            (published on npm, public — normal dependency)
@urql/core, @urql/exchange-graphcache, graphql-ws, graphql-sse
zod (already present here)
```

Deps to remove at the end: `prisma`, `@prisma/client`, `@prisma/instrumentation`,
`prisma-generator-pothos-codegen`, `@pothos/plugin-prisma`, `@pothos/plugin-prisma-utils`,
`@casl/ability`, `@casl/prisma`, `houdini`, `houdini-svelte`.

Deps that stay: `graphql`, `graphql-yoga` (still used, just wired via Rumble instead of by
hand), `@pothos/core` and other non-Prisma Pothos plugins as needed (`@pothos/plugin-complexity`,
tracing plugins — check what Rumble already bundles/configures internally before re-adding).

---

## Phase 0 — Prep

- [ ] Create a long-lived migration branch (e.g. `migration/drizzle-rumble`), do not target `main`
      directly until each phase is validated.
- [ ] Take a full DB backup / ensure a disposable staging DB with production-like data exists —
      introspection and the whole API phase should be developed against a real copy, not an
      empty dev DB, so relation/index edge cases surface early.
- [ ] Freeze schema changes on `main` for the duration (or plan to periodically rebase — 85
      existing migrations plus new ones landing on `main` mid-migration is a real risk; confirm
      with the team how long this migration is expected to take before committing to a freeze).
- [ ] Read chase's `CLAUDE.md` and skim `src/api/rumble.ts`, `src/api/context.ts`,
      `src/api/db/db.ts`, `src/api/handlers/register.ts`, and 2–3 representative handlers
      (`user.ts`, `conference.ts`) — these are the templates every step below points back to.

---

## Phase 1 — Database: Prisma → Drizzle

**Goal**: same Postgres database, same data, no application code changed yet. This phase ends
with a working `drizzle.config.ts`, `src/api/db/schema.ts`, `src/api/db/relations.ts`, and
`src/api/db/db.ts`, verified against the real schema — but nothing in `src/api/resolvers` or
`src/lib` references it yet.

1. Install `drizzle-orm`, `drizzle-kit`, `drizzle-seed` as dev/prod deps matching chase's
   versions (or current stable — re-verify at execution time).
2. Add `drizzle.config.ts` at the repo root, modeled on chase's:
   ```ts
   export default {
   	schema: './src/api/db/schema.ts',
   	out: './drizzle',
   	dialect: 'postgresql',
   	casing: 'snake_case',
   	strict: true,
   	dbCredentials: { url: configPrivate.DATABASE_URL }
   };
   ```
3. Run `drizzle-kit introspect` against the staging DB (with all 85 Prisma migrations applied)
   to generate an initial `schema.ts`. This captures the _actual_ column names/types/constraints/
   indexes as they exist today — safer than hand-transcribing `schema.prisma`, since Prisma's
   `@map`/`@@map` and enum handling can silently diverge from the literal SQL.
4. Hand-clean the introspected output:
   - Replace ad-hoc per-table id/timestamp fields with chase's shared helpers
     (`defaultTimestamps`, `defaultIdAndTimestamps`) where the shape matches (this repo's models
     mostly follow `id` + presumably `createdAt`/`updatedAt` — verify per-model).
   - Re-derive `pgEnum` calls for all 10 Prisma enums (`ConferenceState`, `PaperType`,
     `PaperStatus`, `Gender`, `FoodPreference`, `AdministrativeStatus`, `MediaConsentStatus`,
     `ReviewHelpStatus`, `TeamRole`, `CalendarEntryColor`) — introspection will produce raw
     Postgres enum types; name them consistently with chase's `snake_case` convention.
   - Move relations out of inline `.references()` where chase uses the separate Drizzle
     `relations.ts` API (chase splits `schema.ts` — tables/enums/columns — from
     `relations.ts` — the relational API used for `db.query.*` with `with:`). Follow that split.
   - Decide on ID strategy: this repo's schema uses `@default(nanoid())` already (matches
     chase's `nanoid()`-generated text PKs) — confirm this carries through introspection
     correctly (introspection may show `text` with a DB-level default/function that needs
     replacing with the app-level `.$defaultFn(() => nanoid())` pattern chase uses).
5. Write `src/api/db/db.ts` following chase's pattern (mock during SvelteKit `building`,
   real `drizzle(...)` otherwise, export `db`, `schema`, `relations`).
6. Generate a baseline migration with `drizzle-kit generate` and diff it against the current DB
   with `drizzle-kit push --dry-run` (or equivalent) to confirm **zero schema drift** — the
   whole point of introspection-first is that this step should produce an empty diff. If it
   doesn't, something in the hand-cleanup changed semantics; fix the schema, not the DB.
7. Do **not** touch `prisma/` yet — leave it in place and fully functional. The app keeps running
   on Prisma through this entire phase; Drizzle exists in parallel purely as a verified,
   unused-by-the-app schema definition until Phase 2 starts wiring it up.
8. Checklist per model — go through all 30 models and confirm each has a Drizzle table with
   matching columns, enums, defaults, and foreign keys:
   `Conference, Committee, CommitteeAgendaItem, User, ReviewerSnippet,
ConferenceParticipantStatus, PaymentTransaction, UserReferenceInPaymentTransaction, Paper,
PaperVersion, PaperReview, Nation, NonStateActor, CustomConferenceRole, SingleParticipant,
Delegation, RoleApplication, DelegationMember, ConferenceSupervisor, SurveyQuestion,
SurveyOption, SurveyAnswer, WaitingListEntry, TeamMember, TeamMemberInvitation, CalendarDay,
CalendarTrack, Place, CalendarEntry, AttendanceEntry`

**Exit criteria**: `drizzle-kit push --dry-run` (or `check`) reports no diff against the live
staging DB; app still runs unmodified on Prisma.

---

## Phase 2 — API layer: Pothos/CASL → Rumble

**Goal**: `src/api/resolvers/**` and `src/api/abilities/**` are deleted; a new
`src/api/handlers/**` (Rumble handlers, one per table) replaces them, mounted via Rumble's
`createYoga` at the same `/api/graphql` route. Frontend is untouched and still broken against
the new schema until Phase 3 — this is the one unavoidable "big bang" moment; plan a short
window where the app is non-functional end-to-end, or feature-branch it fully before merging.

1. Create `src/api/rumble.ts`, modeled on chase's:

   ```ts
   export const {
     abilityBuilder, schemaBuilder, whereArg, object, query, pubsub,
     createYoga, createWs, enum_, clientCreator
   } = rumble({
     db, schema, context,
     defaultLimit: 1000,
     subscriptions: [...], // only if this repo needs subscriptions — check if it currently has any
     pothosConfig: { plugins: [ /* ValidationPlugin if using zod-backed input validation */ ] }
   });
   ```

   Check whether this repo has any live GraphQL subscriptions today (search `subscriptionFields`
   in `src/api/resolvers`) before deciding whether to wire up Redis/event-target plumbing —
   don't add it speculatively if unused.

2. Port `src/api/context/context.ts` → `src/api/context.ts`, following chase's shape: a function
   of `RequestEvent` returning `{ ...req.locals, mustBeLoggedIn(), hasRole(), isSessionLive() }`.
   This repo's OIDC setup differs from chase's (`@m1212e/sveltekit-oidc` vs. whatever
   `openid-client`-based wiring exists here) — keep the existing OIDC session mechanism, just
   reshape the context function's _output_ to match what Rumble abilities expect (`ctx.oidc`,
   `ctx.mustBeLoggedIn()`, etc.).

3. For each of the 30 tables, create one `src/api/handlers/<entity>.ts` that replaces both the
   old Pothos resolver module **and** the old CASL ability module for that entity. Use this
   mapping as the worklist (old Pothos module → old ability module → new handler):

   | Table                       | Old resolver(s)                                                     | Old ability                                         | New handler                               |
   | --------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
   | Conference                  | `resolvers/modules/conference/conference.ts`                        | `abilities/entities/conference.ts`                  | `handlers/conference.ts`                  |
   | Committee                   | `resolvers/modules/committee.ts`                                    | `abilities/entities/committee.ts`                   | `handlers/committee.ts`                   |
   | CommitteeAgendaItem         | `resolvers/modules/committeeAgendaItem.ts`                          | `abilities/entities/committeeAgendaItem.ts`         | `handlers/committeeAgendaItem.ts`         |
   | User                        | `resolvers/modules/user.ts`, `modules/auth.ts`                      | `abilities/entities/user.ts`                        | `handlers/user.ts`                        |
   | ReviewerSnippet             | `resolvers/modules/reviewerSnippet.ts`                              | `abilities/entities/reviewerSnippet.ts`             | `handlers/reviewerSnippet.ts`             |
   | ConferenceParticipantStatus | `resolvers/modules/conferenceParticipantStatus.ts`                  | `abilities/entities/conferenceParticipantStatus.ts` | `handlers/conferenceParticipantStatus.ts` |
   | PaymentTransaction          | `resolvers/modules/paymentTransaction.ts`                           | `abilities/entities/paymentTransaction.ts`          | `handlers/paymentTransaction.ts`          |
   | Paper                       | `resolvers/modules/paper/paper.ts`                                  | `abilities/entities/paper/paper.ts`                 | `handlers/paper.ts`                       |
   | PaperVersion                | `resolvers/modules/paper/paperVersion.ts`                           | `abilities/entities/paper/paperVersion.ts`          | `handlers/paperVersion.ts`                |
   | PaperReview                 | `resolvers/modules/paper/paperReview.ts`                            | `abilities/entities/paper/paperReview.ts`           | `handlers/paperReview.ts`                 |
   | Nation                      | `resolvers/modules/nation.ts`                                       | `abilities/entities/nation.ts`                      | `handlers/nation.ts`                      |
   | NonStateActor               | `resolvers/modules/nonStateActor.ts`                                | `abilities/entities/nonStateActor.ts`               | `handlers/nonStateActor.ts`               |
   | CustomConferenceRole        | `resolvers/modules/customConferenceRole.ts`                         | `abilities/entities/customConferenceRole.ts`        | `handlers/customConferenceRole.ts`        |
   | SingleParticipant           | `resolvers/modules/singleParticipant.ts`                            | `abilities/entities/singleParticipant.ts`           | `handlers/singleParticipant.ts`           |
   | Delegation                  | `resolvers/modules/delegation.ts`                                   | `abilities/entities/delegation.ts`                  | `handlers/delegation.ts`                  |
   | RoleApplication             | `resolvers/modules/roleApplication.ts`                              | `abilities/entities/roleApplication.ts`             | `handlers/roleApplication.ts`             |
   | DelegationMember            | `resolvers/modules/delegationMember.ts`                             | `abilities/entities/delegationMember.ts`            | `handlers/delegationMember.ts`            |
   | ConferenceSupervisor        | `resolvers/modules/conferenceSupervisor.ts`                         | `abilities/entities/conferenceSupervisor.ts`        | `handlers/conferenceSupervisor.ts`        |
   | SurveyQuestion              | `resolvers/modules/survey/surveyQuestion.ts`                        | `abilities/entities/surveyQuestion.ts`              | `handlers/surveyQuestion.ts`              |
   | SurveyOption                | `resolvers/modules/survey/surveyOption.ts`                          | `abilities/entities/surveyOption.ts`                | `handlers/surveyOption.ts`                |
   | SurveyAnswer                | `resolvers/modules/survey/surveyAnswer.ts`                          | `abilities/entities/surveyAnswer.ts`                | `handlers/surveyAnswer.ts`                |
   | WaitingListEntry            | `resolvers/modules/waitingListEntry.ts`                             | `abilities/entities/waitingListEntry.ts`            | `handlers/waitingListEntry.ts`            |
   | TeamMember                  | `resolvers/modules/teamMember.ts`                                   | `abilities/entities/teamMember.ts`                  | `handlers/teamMember.ts`                  |
   | TeamMemberInvitation        | `resolvers/modules/teamMemberInvitation.ts`                         | `abilities/entities/teamMemberInvitation.ts`        | `handlers/teamMemberInvitation.ts`        |
   | CalendarDay                 | `resolvers/modules/calendar/calendarDay.ts`, `calendarDayImport.ts` | `abilities/entities/calendarDay.ts`                 | `handlers/calendarDay.ts`                 |
   | CalendarTrack               | `resolvers/modules/calendar/calendarTrack.ts`                       | `abilities/entities/calendarTrack.ts`               | `handlers/calendarTrack.ts`               |
   | Place                       | `resolvers/modules/calendar/place.ts`                               | `abilities/entities/place.ts`                       | `handlers/place.ts`                       |
   | CalendarEntry               | `resolvers/modules/calendar/calendarEntry.ts`                       | `abilities/entities/calendarEntry.ts`               | `handlers/calendarEntry.ts`               |
   | AttendanceEntry             | `resolvers/modules/attendanceEntry.ts`                              | `abilities/entities/attendanceEntry.ts`             | `handlers/attendanceEntry.ts`             |

   Modules with **no matching table** (cross-cutting/computed logic — audit individually,
   port as free-standing `schemaBuilder.queryFields`/`mutationFields` in chase's `user.ts`
   `isGlobalAdmin`/`currentUserClaims` style, not as `object`/`query` CRUD scaffolding):
   `resolvers/modules/assignments.ts`, `modules/impersonation.ts`, `modules/flagCollection.ts`,
   `modules/search.ts`, `modules/conference/certificateConfig.ts`,
   `modules/conference/certificateSignature.ts`, `modules/conference/plausibility.ts`,
   `modules/conference/seed.ts`, `modules/conference/statistics.ts`,
   `modules/paper/reviewerLeaderboard.ts`.

4. For each handler, translate CASL rules into Rumble ability-builder calls. Pattern (from
   chase's `user.ts` / `conference.ts`):
   ```ts
   abilityBuilder.<table>.allow('read' | 'update' | 'delete' | 'create').when((ctx) => {
     return { where: <drizzle-relational-where-shape> };
     // or: return 'allow';  /  throw new GraphQLError(...) to hard-deny with a message
   });
   ```
   Extract this repo's condition-helper equivalents of chase's `authHelper.ts`
   (`isAdmin`, `isGlobalAdmin`, `isParticipant`, `isTeamInConference`, etc.) into a similar
   `src/api/services/authHelper.ts` — most of this repo's CASL conditions are already
   structurally `{ field: { nested: value } }` shapes, which is very close to Drizzle's
   relational `where` shape; the mechanical part of the port is swapping Prisma's implicit
   filter operators for Drizzle relational query syntax where they differ (check chase's
   `authHelper.ts` for the OR/nested-relation idioms Rumble expects).
5. Use `object({ table: '<name>' })` for the GraphQL object type and `query({ table: '<name>' })`
   for default CRUD queries, per chase's pattern; add custom fields via `adjust:` (see chase's
   `ConferenceRef`'s `uniqueConferenceMembers` field) and custom mutations via
   `schemaBuilder.mutationFields` using `t.drizzleField` (see chase's `updateConference`,
   `deleteConference`) only where default CRUD isn't sufficient.
6. Create `src/api/handlers/register.ts` importing every handler file, plus the `clientCreator`
   call gated on `dev || building`, matching chase exactly (this both registers the schema and
   regenerates the frontend client on every dev boot/build).
7. Replace `src/api/resolvers/api.ts`'s hand-rolled `createYoga(...)` with Rumble's
   `createYoga` export, mounted in `src/routes/api/graphql/+server.ts` (same route, same
   `GET`/`POST`/`OPTIONS` shape as chase).
8. Port `src/tasks/tasksDb.ts` and everything under `src/tasks/**` that queries Prisma directly
   (e.g. `conferenceStatus.ts`) to import `db`/`schema` from `src/api/db/db.ts` instead of
   maintaining a second, separate client — there's no reason to keep two DB clients once Drizzle
   is the only ORM (Prisma's separate task client existed for its own connection-pool reasons;
   re-evaluate whether that's still needed with Drizzle's connection handling).
9. Port seed scripts (`prisma/seed/**`, `prisma/defaultData/**`) to Drizzle, considering
   `drizzle-seed` (chase's `seedConference.ts`/`seedUtils.ts`/`reset.ts`) for structure.
10. Delete `src/api/resolvers/`, `src/api/abilities/`, `prisma/pothos.config.cjs`,
    `prisma/pothos/generated`, and finally `prisma/schema.prisma` + `prisma/migrations/` +
    `prisma/db.ts` (only after Phase 1's Drizzle migration baseline is confirmed to reproduce
    the schema — keep the old Prisma migration history archived outside the deleted path if you
    want a historical record, e.g. `git log` is sufficient, no need to keep the files).

**Exit criteria**: `bun run check` passes, GraphQL schema is served at `/api/graphql` via Rumble,
every table has a working handler with abilities enforced, and manual queries via a GraphQL
client (or Rumble-generated client, once Phase 3 starts) return correctly-scoped data for at
least one admin and one non-admin test user per major entity.

---

## Phase 3 — Frontend: Houdini → Rumble generated client

**Goal**: `houdini.config.js`, `.houdini/`, and every `graphql()` template literal usage removed;
all data fetching goes through Rumble's generated `client.query.*` / `client.mutate.*`.

1. Confirm `clientCreator` (wired in Phase 2 step 6) is generating
   `src/lib/api/rumbleClient/{client.ts,schema.ts}` on `bun run dev` — check it against chase's
   output shape before writing any consuming code.
2. Build `src/lib/api/client.ts` — the underlying urql `Client` config that
   `rumbleClient/client.ts` wraps. Start from chase's structure but **trim aggressively**: chase's
   version includes an elaborate offline/"local demo" mode and SvelteKit remote-functions SSR
   exchange that this repo almost certainly doesn't need on day one. Minimum viable port:
   `fetchExchange` + `subscriptionExchange` (only if subscriptions are in use) +
   `@urql/exchange-graphcache` for cache normalization. Add chase's SSR remote-functions
   exchange and crosstab-sync exchange later, only if a concrete need shows up (avoid
   speculative complexity — this project doesn't have chase's offline-first requirement).
3. Migrate the 8 centralized query files in `src/lib/queries/` first — each is a single,
   well-isolated conversion and a good way to validate the client setup end-to-end:
   `allConferences.ts`, `calendarQuery.ts`, `certificateQuery.ts`,
   `changeParticipantStatusMutation.ts`, `fastUserQuery.ts`, `getBaseDocuments.ts`,
   `myConferenceparticipationQuery.ts`, `userPaymentTransactionsQuery.ts`. Replace each
   Houdini `graphql()`-defined store with a typed `client.query.<field>({...})` /
   `client.mutate.<field>({...})` call at the call site (see chase's
   `AgendaItemChanger.svelte` mutation example and `currentUser.svelte.ts` query example) —
   Rumble's client has no separate "query definition" file; the call site _is_ the query.
4. Migrate the 146 files with inline `graphql()` literals. Since there's no per-file dependency
   ordering requirement, batch these by feature area (dashboard, management, registration,
   assignment-assistant, etc. — mirroring `src/routes/(authenticated)/**`) rather than one by
   one; each batch should be checked with `bun run check` before moving to the next.
5. Replace every cache-invalidation call:
   ```ts
   // before (Houdini)
   import { cache } from '$houdini';
   import { invalidateAll } from '$app/navigation';
   cache.markStale();
   await invalidateAll();
   ```
   with the graphcache-normalized-cache equivalent — with `@urql/exchange-graphcache` wired
   correctly (keys/resolvers matching the schema), most mutations should auto-update the cache
   via normalized entity updates without any manual invalidation call, same as chase. Only fall
   back to an explicit refetch where graphcache genuinely can't infer the update (e.g. a
   computed/aggregate field) — check chase's `optimisticUpdateHandlers`/`updates` for that
   pattern before reinventing one.
6. Delete `houdini.config.js`, `.houdini/`, and remove the houdini Vite plugin from
   `vite.config.ts`.

**Exit criteria**: `bun run build` succeeds with houdini fully removed from
`package.json`/`vite.config.ts`; every route that fetches data works end-to-end against a real
staging DB (manually click through: registration flow, management dashboards, assignment
assistant, paper submission/review, calendar, at minimum).

---

## Phase 4 — Cleanup & verification

- [ ] Remove all migrated-away deps from `package.json` (see list at the top).
- [ ] `bun run typecheck`, `bun run check`, `bun test`, `bun run lint` all pass.
- [ ] Grep the repo for `@prisma/client`, `houdini`, `@casl/`, `pothos` (excluding
      `@pothos/core` and any Rumble-required plugins) to confirm no stragglers.
- [ ] Update `CLAUDE.md` (Tech Stack, Architecture sections) to describe Drizzle/Rumble instead
      of Prisma/Pothos/Houdini — this file is what future Claude Code sessions read first, so it
      must reflect the new stack or it will actively mislead future work.
  - [ ] Update the "Adding a New GraphQL Resolver" / "Database Schema Changes" workflow
        sections to describe the Rumble handler pattern and `drizzle-kit generate`/`migrate`
        instead of `prisma migrate dev`.
- [ ] Re-run `bun run i18n:check` (translations shouldn't be affected, but confirm nothing
      broke from route/component restructuring).
- [ ] Delete this document, or move it to a `docs/archive/` folder, once the migration is merged
      to `main` — keep it around only as long as the migration branch is active.

---

## Open questions to resolve before/during execution (not blocking the plan, but worth deciding)

- Exact `drizzle-orm`/`drizzle-kit` version to pin — chase is on a `1.0.0-rc.5` prerelease;
  check for a stable 1.0 release by the time this migration starts.
- Whether this repo has any live GraphQL subscriptions today (affects whether Redis
  event-target plumbing from chase's `rumble.ts` is needed).
- How much of chase's `client.ts` complexity (local-demo/offline mode, SSR remote-functions
  exchange, crosstab sync) is actually wanted here, vs. a minimal urql setup — recommendation
  above is to start minimal and add only what's needed.
- Downtime window / feature-branch strategy for the Phase 2→3 boundary, since the API and
  frontend can't both be migrated atomically in one commit.
