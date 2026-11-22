# CLAUDE.md

Guidance for Claude Code in this repository. UI conventions are in [CLAUDE-UI.md](./CLAUDE-UI.md);
the domain areas are documented in `docs/architecture/` (index below) — **read the matching file
before working in that area**.

## Project Overview

MUNify DELEGATOR: SvelteKit app for Model United Nations conference registration, delegation
assignment and organisation, built for DMUN e.V. It shares stack and structure with the sibling
project MUNify CHASE: when something is not answered here, how chase does it is the intended answer.

**Stack:** SvelteKit + Svelte 5 (runes, `experimental.async`), TailwindCSS 4 + DaisyUI, PostgreSQL
via Drizzle ORM (relational API, drizzle-kit migrations), GraphQL via
[rumble](https://github.com/m1212e/rumble) (Pothos + graphql-yoga + drizzle + ability layer) with a
generated typed client over urql, OIDC auth (Logto; oidc-mock locally), Paraglide-JS i18n (default
German), Bun as package manager/runtime, OpenTelemetry, pino logging.

## Commands

```bash
bun install
bun run dev              # Docker (Postgres, RustFS S3 bucket, …) + dev server
bun run dev:docker / dev:server
bunx lefthook install    # git hooks

bun run db:generate      # write a migration for src/api/db/schema/
bun run db:migrate       # apply migrations
bun run db:push          # push schema without migration (throwaway DBs only)
bun run db:reset         # drop every table and enum
bun run db:seed:dev      # wipe + refill dev DB and bucket (all stages, personas, crowd, ~490k bulk users, ~6 min)
bun run db:seed:dev:small # same without the bulk: ~570 users, seconds
bun run dev:accounts     # rewrite oidc-mock.yaml users from seed-data/devAccounts.ts
bun scripts/buildZipCoordinates.ts # rebuild the stats map's ZIP area centres from GeoNames
bun run db:nuke          # recreate the container and migrate
bun run db:studio

bun run format
bun run check            # PREFERRED type check (svelte-check --tsgo, incremental)
bun run typecheck        # tsc only (TypeScript 7)
bun run lint             # slow (~2 min uncached); pre-push lints pushed files
bun run fallow / fallow:audit / fallow:health
bun test / test:watch / coverage
bun run test:e2e:coverage

bun run i18n:check / i18n:validate / i18n:translate / add-translation
bun run build            # app + compute workers (tsdown); jobs image: bun run build:jobs
bun run preview
```

- Dev server and `vite preview` (e2e) serve **HTTPS** (self-signed, `@vitejs/plugin-basic-ssl`) on
  :5173 / :4173 so the browser talks HTTP/2 like production. `DEV_HTTP=1` serves plain HTTP (for MCP
  clients, a linked local chase); the e2e suite follows it.
- **Coverage feeds fallow's CRAP scores**: both coverage commands end in `scripts/mergeCoverage.ts`
  → `coverage/coverage-final.json`, which the fallow scripts, hooks and CI pass to fallow. e2e
  records the browser via the `page` fixture in `e2e/support/test.ts` (specs import `test` from
  there, not `@playwright/test`) and the server via `NODE_V8_COVERAGE` mapped by
  `scripts/serverCoverage.ts` (Vite's module runner keeps no source maps for c8). Generated code is
  excluded by `scripts/coverageScope.ts`. CI scores unit coverage only.
- **If `bun run check` eats all memory** (TS7 grows without bound), a type a changed file exports
  cannot be named in a declaration: incremental TS7 emits `.d.ts` signatures for changed files and
  inlines unnamed types. The generated rumble client did this until rumble 0.33.3 exported its
  `make…` return types. Exported values with huge inferred types need an annotation
  or an exported type. A run is ~4 GB / ~10 s.

## Directory Structure

- `src/routes/` — SvelteKit routes
  - `(authenticated)/` — protected routes
    - `dashboard/` — pages about no one conference: conference list, system administration
      (`create/`, `chase-link/`, `slack-workspaces/`, via the account menu)
    - `dashboard/[conferenceId]/` — a conference's overview and everything around it, inside
      `ConferenceShell.svelte` (`+layout@(authenticated).svelte`)
      - `team/` — **every team-facing page**, one guard, one navigation (see "Team area"). No page at
        `team/` itself; the overview (`stages/TeamMember/TeamMemberDashboard.svelte`) is home.
      - `paperhub/` — outside `team/`, participants and supervisors use it too
    - `registration/` — registration flows
  - `api/graphql/` — GraphQL endpoint; `api/health/` — liveness for the image's `HEALTHCHECK`
    (rolling updates wait for it; checks nothing behind the server); `auth/` — OIDC callbacks; `seats/`, `vc/`,
    `validateCertificate/` — public; `id/` — target of signed-code links
- `src/api/` — backend
  - `handlers/<entity>/` — one directory per entity, three files (after avv): `<entity>.ts` GraphQL
    layer, `<entity>Permissions.ts` **all** authorization (`register<Entity>Abilities()` + every
    `assertCan…`/`can…`), `<entity>Service.ts` business logic (no schema, no abilities, **never
    checks permissions**). `register.ts` imports them all — the one place a new handler is listed.
  - `rumble.ts` — rumble instance, schema/ability builders, yoga factory, client generator
  - `context.ts` — request context (OIDC data, `mustBeLoggedIn`, `hasRole`)
  - `db/` — `schema/` (one file per app part, `index.ts` exports all, `columns.ts` shared helpers),
    `relations.ts`, `db.ts`, `reset.ts`, `seedDev.ts` (+ `seed-dev/`), faker factories in `seed-data/`
  - `graphql.remote.ts` — remote functions executing the schema in-process (SSR)
  - `services/` — logic shared by several handlers/routes (index: `services/README.md`), and
    `authHelper/`, the authorization building blocks. Never check permissions either.
- `src/lib/` — code shared by several frontend parts or by frontend and API. Backend-only code
  lives in `src/api/`, single-page-area code beside its route. Split partially shared modules
  (`#lib/assignment/weights` vs `#api/handlers/assignment/autoAssign`).
  - `api/client.ts` urql client; `api/rumbleClient/` **generated, never edit**; `components/`;
    `services/`; `schemata/` (zod); `dataGrid/` (table model); `paraglide/` (generated)
- `src/env.ts` — every environment variable, declared and validated by SvelteKit 3's explicit env.
  Import by name from `$app/env/private` (server) or `$app/env/public`. `$env/*` is off. Missing or
  malformed values stop start-up with one report. Vars needed at runtime but not during `vite build`
  use `requiredAtRuntime`. Tests mock the module (`vi.mock('$app/env/private', …)`).
- `src/jobs/` — one-shot jobs of the `delegator-jobs` CLI, own image (see
  `docs/architecture/jobs.md`). Validates its own env in `config.ts`; app code it calls reads
  `$app/env/*`, answered from `process.env` (`appEnv.ts`).
- `drizzle/` — generated migration history, never edited by hand.

## Architecture docs (`docs/architecture/`)

| File                     | Covers                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `assignment.md`          | Roles, draft/apply/release, board, required applications, release masking                                                                       |
| `schools.md`             | Schools, school choice, visibility, school rules (groups, foreign schools)                                                                      |
| `emails.md`              | Automatic emails: `dueEmails`, snapshot paging, sweep, log, texts, footers, pacing                                                              |
| `messages.md`            | Chats, inboxes, trusted persons, reports, hiding messages, write rules, messaging terms                                                         |
| `announcements.md`       | Announcement states, audiences, feed, reads, mails                                                                                              |
| `team-notifications.md`  | Per-topic/channel team notifications, Slack workspaces                                                                                          |
| `data-tables.md`         | DataGrid model, table engine sources, saved views, presets                                                                                      |
| `chase-link.md`          | Link to MUNify CHASE, link worker, sync, NSA cards (plan: `docs/plans/chase-link.md`)                                                           |
| `mcp-server.md`          | `/mcp` for AI assistants: auth, confinement, classification/redaction, tools                                                                    |
| `possible-duplicates.md` | Duplicate account matching, decisions, transitive links, seed scenarios                                                                         |
| `conference-features.md` | Calendar tracks, survey-limited entries, scanner sessions, entrance check, age limits, waiting list, withdrawal, document layouts, certificates |
| `files.md`               | S3 bucket, `stored_file`, upload/download flow, cleanup, adding a file field                                                                    |
| `security.md`            | Signed codes (CWT/COSE, scanners, `/id`), code-guess rate limiting                                                                              |
| `user-manual.md`         | `/docs` manual, help links, tours, generated screenshots                                                                                        |
| `jobs.md`                | Job CLI, schedule and required variables per job                                                                                                |
| `dependencies.md`        | **Read before upgrading anything**: pinned/patched packages and why                                                                             |

## GraphQL API (rumble)

- **Code-first, three files per entity.** The permissions file declares abilities and checks; the
  handler calls `register<Entity>Abilities()` first, then declares object ref, queries and
  mutations; each resolver runs its permission checks, then calls the service.

  ```ts
  // committeePermissions.ts
  export function registerCommitteeAbilities() {
  	abilityBuilder.committee.allow('read');
  	abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);
  }
  export function assertCanCreateCommittee({
  	ctx,
  	conferenceId
  }: {
  	ctx: ApiContext;
  	conferenceId: string;
  }) {
  	return assertTeamPermission({ ctx, conferenceId, permission: 'planSeats' });
  }
  // committee.ts
  registerCommitteeAbilities();
  export const CommitteeRef = object({ table: 'committee' });
  query({ table: 'committee' }); // committee(id), committees(where, limit, …)
  ```

- **Services never check permissions** (handler services and `src/api/services/` alike): no
  `ctx.abilities`, no `assertTeamPermission`, no role/ownership comparison. They take the caller's
  id or already-authorized rows/ids as plain arguments. Checks about _what_ (stage, size limit,
  uniqueness) stay in the service; checks about _who_ go in `<entity>Permissions.ts`. Applying the
  `read` ability to shape a query's result stays in the GraphQL layer; every other `ctx.abilities`
  use is a permission check. Permission functions take `ApiContext` (`#api/rumble`).
- **`authHelper/`** holds only cross-entity building blocks:
  - `callerFacts.ts` — loads the caller's facts (team roles, own registrations, people around them)
    once per root field; `liveRule` / `liveWhere` turn rules built from them into `.when()` rules.
  - `rules.ts` — who may do what: `systemAdmin`, team/participant filters, `teamConference`,
    `assertTeamPermission`, `hasPartIn`, release masks, `participantIdsOf`.
  - `utils.ts` — `grantWhere`, `callerUserId`, and row helpers that go through the caller's ability
    and answer NOT_FOUND when it doesn't reach: `assertAllowed`, `updateIfAllowed`,
    `deleteIfAllowed`. Re-read a row after a write with
    `(await ctx.abilities.x.filter('read')).merge({ where: { id } }).query.single`.
  - A check used once stays private in its permissions file; a check about one entity others need
    (`calendarConference`, `assertCanManageCalendarDay`, `assertCanGrantTeamRole`) is exported from
    that entity's permissions file.
- **Arguments are validated by zod schemas on the arguments**, never by hand
  (`@pothos/plugin-validation`): `t.arg.int().validate(schema)` for one, `validate: schema` on the
  field for several, `args: t.validate({ … }, schema)` with a `transform`. A field-level schema's
  output _replaces_ `args`, so use `z.looseObject` (or `.loose()`): a strict one strips unnamed args.
  Word issues with lazy messages (`{ error: () => m.x() }`) → `INVALID_INPUT`. Whole-document JSON
  args go through `jsonDocument` (`#api/services/argSchemas`). Keep schemas in the service (or
  `#lib/schemata/` when a form shares it) so they are unit tested. Only DB-dependent checks stay in
  code.
- **Every write publishes, from the service that writes, after commit.** Pubsubs live in
  `src/api/pubsub.ts` (one per table); never create one in a handler or publish from a resolver.
  After `await db.transaction(...)`, publish (`committeePubsub.updated(id)` / `created()` /
  `removed()`); if what to announce is only known inside, return it from the transaction. A helper
  given a `tx` publishes right after its write. Publish for **every** table a write touches
  (deleting a delegation announces its members). Announce by id (`updated(ids)` for bulk via
  `.returning({ id })`); a bare `updated()` reaches nobody (rows listen on their id, lists on
  `created`/`removed`). Only writes a resolver makes itself (`updateIfAllowed`/`deleteIfAllowed`)
  publish in the resolver.
- **Updates are granular, never set-replacements.** `update…` takes every field but the key as
  optional and writes only given ones; `null` clears a nullable column and keeps a non-null one
  (`args.x ?? undefined`). Upserts created on first change put only given fields + `updatedAt` in
  the conflict `set`. Cross-field rules are checked on the written row inside the transaction.
  Values meaningful only whole (address, document layout) stay one argument. Clients send only
  what changed.
- **Authorization = ability filters** (drizzle filters that compose into queries):
  `ctx.abilities.committee.filter('update').merge({ where: { id: args.id } }).sql.where`. Enforced by
  `e2e/authorization/`:
  - Rules compose from helpers (`isTeamMemberOfConference({ ...args, roles })`, `isOwnUser`,
    `isParticipantOfConference`, `isCaredForUser`, …) wrapped in `liveWhere` (`liveRule` with
    `columns`). A helper returns `undefined` for "grants nothing" (decided by context alone, never
    the facts) and never throws. Every table also gets `.allow([...]).when(systemAdmin)` (no global
    wildcard).
  - **Rules filter on the table's own columns** with ids from the caller's facts
    (`{ conferenceId: { in: ids } }`), never relation chains: rumble evaluates all relational rules
    of a table as nested `exists` in one statement, and the user table's 101 killed Postgres. One
    hop via `hop(filter, (participant) => ({ participant }))` (`NOTHING` for an empty list). An
    empty id list matches nothing (`1 = 0`). `relationalRules.test.ts` guards user/delegation.
  - Updates/deletes go through the row's own ability; load the row through it first when needed.
  - **Team checks are team permissions** (`TEAM_PERMISSIONS` in `#lib/helpers/teamRoles.ts`:
    `manageParticipants`, `planSeats`, `reviewPapers`, …, granted per `rolesWithTeamPermission`).
    Put `teamConference({ ctx, permission })` into the query that loads the row
    (`{ id, conference: await teamConference(...) }`); creates without a row use
    `assertTeamPermission({ ctx, conferenceId, permission })` (`hasTeamPermission` non-throwing).
    System admins always pass. Never compare roles by hand — add a team permission.
  - **Every id an argument names must belong where the row goes.** Anchor the row in the conference
    the resolver authorized; that other ids are of the same conference and roles of the right kind
    is the database's job (triggers, see Database) — don't look them up first. A `userId` is still
    resolved to the person's row in the authorized conference (`participantIdsOf`).
  - **A rule's `columns` mask the rows that rule matched** (rumble ≥ 0.25), so per-reader visibility
    is just rules (user table: reviewers names only, co-delegates names+email, care team care notes,
    …; conference payment/postal details; `entryCode`, `connectionCode`, invitation `token`).
    **A masked non-null column cannot be selected** — the query errors for a masked reader; only
    select it where the reader may see it.
- Endpoint `src/routes/api/graphql/+server.ts`; `src/api/yoga.ts` is the one yoga instance (shared
  with SSR). New fields need a **dev server restart** (schema built at module init; the client is
  regenerated on start).
- **Subscriptions are yoga's SSE** on `/api/graphql` (urql `fetchSubscriptions`), fanned out via
  Redis; one streaming response each. HTTP/1.1 allows 6 per host, so production must stay HTTP/2
  (dev/e2e get it from HTTPS; mind the six under `DEV_HTTP=1`).
- `/api/graphql` sends no CORS headers (rumble default `cors: false`): same-origin only.

## Frontend Data Fetching

- **Everything goes through the generated client** with selection objects:

  ```ts
  import { client } from '#lib/api/rumbleClient/client';
  const delegations = $derived(
  	await client.liveQuery.delegations({
  		__args: { where: { conferenceId: { eq: conferenceId } } },
  		school: true
  	})
  );
  await client.mutate.updateCommittee({ __args: { id, name }, name: true });
  ```

  Scalar-returning mutations for `toast.promise`: `Promise.resolve(client.mutate.deleteX({ __args: { id } }))`.

- **Fetch in the component**, top of `<script>`, not in a `load`. Use `$derived(await …)` whenever
  the query depends on a param or reactive value; a bare top-level `await` runs **once**
  (svelte-check's `state_referenced_locally` there is a real bug). Plain `await` only for one-time
  seeds (initial form values).
- **`liveQuery` wherever a result is displayed**; `query` only for one-shot reads in handlers.
  After a mutation you normally do nothing — the write publishes and live queries refresh.
  `invalidateAll()` is only for load data (almost none exists). Non-live components re-call their
  fetch; children notify parents via callbacks (`onUpdate`, `onSaved`).
- **Each component fetches what it renders, nothing more.** Pages fetch only what decides which
  sections show (often ids) and pass ids down; sections query their own fields. Never prop-drill a
  big tree. Model: `fetchMyParticipation`. Small overlapping queries share normalized cache records.
  - **Never select `id`**: the client adds it (`autoIncludeIdField`); graphcache needs it to
    normalize. Types keyed otherwise (nation by `alpha3Code`) go in `customKeyFields`
    (`#lib/api/cacheKeys.ts`) and that field must be selected.
  - **Key queries by primitives**: pull ids out first
    (`const delegationId = $derived(member.delegation.id)`); never read a live result inside the
    `$derived` that issues a query, and read fields of a fresh result in a second `$derived`.
  - **Every property read of a live result is a subscription** (one render effect per read).
    Pages computing over many live rows copy each result once (`#lib/api/liveSnapshot`) in its own
    `$derived` and compute over copies; `memoizeLast` skips repeated work. Don't read live results
    in an `$effect` there (trips Svelte's "Batch has scheduled effects").
  - **Never read an awaited `$derived` inside a library's snippet that renders later** (map
    children after the map exists): Svelte compiles the read into an async block that never renders
    there. Pass the value to a child component as a plain prop (`stats/widgets/AreaMap.svelte`).
  - Several queries in one component: `Promise.all` in one `$derived(await …)`. A shared fetch
    function + result type module is fine when several components share a shape.
- **A layout shows the next page's skeleton while its first data loads.** Page-rendering layouts
  wrap pages in `PageBoundary` (`#lib/components/navigation/`), keyed by pathname, `pending` only in
  the browser. Fetch failures show `LoadError` (retry) inside the boundary — errors must not escape
  it (Svelte runs the template against unassigned variables). Sections with a persistent frame stop
  the outer key via `boundaryKey`. Team route skeletons: `#lib/data/teamSkeletons`. Details:
  "Navigation" in CLAUDE-UI.md.
- **`load` is only for** redirect/403 guards, page options (`ssr = false`), and pre-render cookie
  work (`auth/accept-invitation`; also the manual's markdown loads). No form-action loads. Guards
  return nothing. Never return generated-client results from `load` (unserializable proxies).
- **Route params come from the `params` prop**, never `page.params` (`page` is written in a batch
  that stays pending during first async work; a live update in that window makes derived re-runs
  see `params = {}`). Read through a primitive `$derived` (`const conferenceId = $derived(params.conferenceId)`)
  before awaited deriveds use it, layouts too. Name it `routeParams` where `params` is taken by
  `sveltekit-search-params`. Pages under a pathname-keyed `PageBoundary` (team pages) read once:
  `untrack(() => params.conferenceId)`.
- **Global state in `#lib/state/*.svelte.ts`** (`getCurrentUser()`, `fetchMyParticipation(conferenceId)`).
  Cache singletons **only in the browser** — server module state is shared across requests. For the
  same reason SSR operations are `network-only` (see `requestPolicy` in `src/lib/api/client.ts`).
- **SSR** goes through `src/api/graphql.remote.ts` (schema executed in-process; `ssrExchange` routes
  there when `!browser`). Must stay a remote function (stubbed in the browser; needs
  `experimental.remoteFunctions`). It refuses HTTP calls (`event.isRemoteRequest`), since remote
  `query`s are GET endpoints that would bypass yoga, armor and masking.

## Forms

- **Every form is a superforms SPA form submitting through a mutation** — no form actions, no
  server `superValidate`:

  ```ts
  const form = superForm(defaults(initialValues, zod4Client(schema)), {
  	SPA: true,
  	resetForm: false,
  	validationMethod: 'oninput',
  	validators: zod4Client(schema),
  	onError: (e) => toast.error(e.result.error.message),
  	async onUpdate({ form: validated }) {
  		if (!validated.valid) return;
  		const promise = client.mutate.updateX({ __args: { ...validated.data, id } });
  		toast.promise(promise, genericPromiseToastMessages);
  		await promise;
  	}
  });
  ```

  Mutate in `onUpdate` (runs after validation). Seed `initialValues` from a **plain `await`**
  (re-reading while typing discards edits) and build it field by field (spreading a result drags
  `subscribe` along and widens types); shared massaging goes in a helper (`#lib/api/userFormValues.ts`).

- **Fields are Formsnap underneath**: `Form*` wrappers in `#lib/components/form/` own styling and
  ids/aria wiring. Spread the `Control` snippet's `props` onto the input; never set `id`/`name`.
  Field components are generic over `N extends FormPath<A> & keyof A`; typed `bind:` (boolean,
  `Date`) via `formFieldProxy`.
- **Uploads**: `fileProxy` → `uploadFile` (`#lib/api/uploadFile`) → file id for the mutation. An
  untouched field yields `undefined` (keeps the file), `null` removes it. See `docs/architecture/files.md`.
- **Personal data uses rumble's scalars**: `PersonName`, `EmailAddress`, `PhoneNumber` (E.164),
  `Date` (calendar day, UTC midnight on the wire — convert pickers with `#lib/helpers/calendarDay`),
  `AddressInput` (libaddressinput, alpha-2; the user table keeps alpha-3, convert with
  `#lib/helpers/countryCodes`). Other sources (OIDC claims) use `normalizePersonName` /
  `normalizeEmailAddress` / `parsePhoneNumber`. Forms pre-check with `isPersonName`,
  `addressRules`/`addressIssues`, `AddressRegionField`.

## Authentication & Authorization

- **OIDC** via `@m1212e/sveltekit-oidc` (as chase). `src/api/services/oidc/OIDC.ts` builds it; its
  `handle` (in `hooks.server.ts`) protects `AUTHENTICATED_ROUTES`, serves `/auth/login-callback` and
  `/auth/logout-callback` (no `+page` files), refreshes tokens, sets `event.locals.oidc`. No auth
  code in loads. Path guards use `routePath(event.url)` (Paraglide's `/en/` prefix). Redirect
  targets from requests go through `sameSitePath` (`startsWith('/')` lets `/\evil.example` through).
- **Locally the provider is oidc-mock**, started by the `oidcMock()` Vite plugin (no container);
  users in `oidc-mock.yaml`, login page under `/oidc`. The e2e suite signs in via its custom-claims
  form.
- **Dev accounts and dev seed belong together.** `seed-data/devAccounts.ts` lists every account;
  `bun run dev:accounts` writes `oidc-mock.yaml` (never edit its users; `devAccounts.test.ts` fails
  on drift); `db:seed:dev` gives each a user row (id = `sub`) and a part. Ten conferences cover the
  stages (`seed-dev/plans.ts`). Team personas hold one team role everywhere; `[Registration]`
  personas cover application steps; `[Participant]` personas keep one role across preparation,
  active and post. **A new state the UI branches on gets a persona or conference flag in the seed.**
- **Login upsert** `src/api/services/account/upsertSelf.ts` (`userLoggedInSuccessfully`): creates/
  refreshes the row, redeems a pending team invitation (`claimPendingInvitation`, once, only for the
  invited address), redirects to `/auth/email-conflict`, `/my-account` or
  `/auth/error?type=invitation_other_email`.
- **Impersonation** is a delegated session (`OIDC.startImpersonation`): a subject token from Logto's
  Management API (`OIDC_M2M_*`; oidc-mock serves it locally) exchanged (RFC 8693) with the caller as
  actor (`#api/handlers/user/impersonation.ts`). Logto wants an opaque `openid` actor token, so
  `actorAccessTokenOf` (`#api/services/oidc/actorToken.ts`) trades the refresh token for one without
  resource (the refresh token exists only because sign-in sends `prompt: 'consent'`). Who may:
  `impersonatableBy` (`userPermissions.ts`) — admins anyone but themselves, participant care and
  project management their conferences' participants, never team members; re-checked per request by
  `impersonationHandle`. While impersonating `ctx.oidc.user` is the target, `ctx.oidc.impersonator`
  the caller, system roles only those both hold. `e2e/authorization/impersonation.spec.ts`.
- Context: `src/api/context.ts` reads `event.locals.oidc`. Ability actions: `read`, `update`,
  `delete` (`src/api/rumble.ts`).
- **Team roles** (`Admin`, `PROJECT_MANAGEMENT`, `PARTICIPANT_CARE`, `CONTENT_LEAD`, …) live in
  `#lib/helpers/teamRoles.ts` (re-exported by `authHelper/rules.ts`). A team keeps at least one
  `PROJECT_MANAGEMENT` member: removing/demoting the last answers `CONFLICT` (under a conference
  lock) unless a system admin does it. `CONTENT_LEAD` reaches seat planning, committees, conference
  content, scanner and settings.
- **Team area**: everything under `dashboard/[conferenceId]/team/`, one guard (`team/+layout.ts`) and
  one registry (`#lib/data/teamRoutes.ts`: path, title, icon, section, palette keywords, roles). Side
  nav (`ConferenceShell.svelte`, `ConferenceNavMenu.svelte`), command palette and guard are generated
  from it. The menu frames every conference page for team members only (`BackToDashboard` steps aside,
  `#lib/state/conferenceMenu`). The overview lists what waits (`stages/TeamMember/teamWaiting.ts`) for
  pages the caller may open. Team pages that edit what participants see link their view
  (`team/ParticipantViewLink.svelte`, `participantViewOf`). Access comes from `TeamAccess`
  (`#lib/helpers/teamAccess.ts`, `fetchTeamAccess`); page predicates (`canEditConference`, …) mirror
  the API. No redirect stubs: non-pages 404, forbidden pages 403. Folder names are kebab-case.

## Internationalization

- Paraglide-JS (`url` + `baseLocale` strategy), sources in `messages/`, used as `m.…()` from
  `#lib/paraglide/messages`; translate via Inlang CLI / `bun run i18n:translate`.
- **The API speaks the caller's locale**: the browser sends `x-locale` (`#lib/api/localeHeader.ts`),
  `hooks.server.ts` runs the request in it (`#api/services/requestLocale.ts`). Every user-facing
  resolver message is `m.…()`, never a literal. Mails use the recipient's `user.locale`
  (`localeOfUser`, `runWithLocale`); pass enums, not translated labels. Format dates/numbers with
  `getLocale()`.
- **Errors the client recognises carry a code**: `apiError({ code, message: m.…() })`
  (`#api/services/errors.ts`), read with `hasErrorCode` / `errorCodeOf` (`$lib/api/errorCodes.ts`,
  closed `ERROR_CODES`). Never branch on message text; `isNetworkError` checks urql's
  `networkError`. `UNAUTHENTICATED` is handled globally by `loginRedirectExchange`; resolvers just
  call `mustBeLoggedIn()`.
- **German is informal**: "du"/"dein" (lowercase mid-sentence), plural "ihr"/"euch" for groups,
  du-imperatives. **Gender-inclusive**: neutral forms ("Teilnehmende"), otherwise gender asterisk
  ("Delegationsleiter\*in").

## Database

- Drizzle relational API (`db.query.x.findMany({ where, with })`), `defineRelations` in
  `src/api/db/relations.ts`; camelCase in TS, snake_case in SQL (`snakeCase.table`). Row/insert
  types from Drizzle (`typeof schema.conference.$inferSelect` / `$inferInsert`, with
  `import type * as schema from '#api/db/schema/index'`).
- **A person's part in a conference is one `conferenceParticipant` row** (per user and conference,
  `ensureConferenceParticipant` on first registration). It holds payment, postal documents,
  attendance, access card, school; `delegationMember`, `singleParticipant`, `conferenceSupervisor`
  point at it (`conferenceParticipantId`). **Supervision links people** (`supervision`: supervisor →
  participant row), surviving registration changes; supervisor rules go through these relations,
  never through `user` (which matches other conferences).
- **No row says which conference it is in twice.** Rows about a person point at their participant
  row (members, single participants, supervisors, `paper.authorParticipantId`,
  `paymentTransaction.payerParticipantId`, covered people, survey answers) and have no own
  `conferenceId`/`userId`; their `user`/`conference` relations run through it. Filter with
  `conference: { id: { eq } }` / `user: { id: { eq } }` in the client, `participant: { conferenceId, userId }`
  on the server. Team-side actors (reviewer, scanner, inviter) stay plain `user` refs. Team and
  waiting list have no participant row. Participant rows survive while papers/payments name them.
- **The database keeps rows inside one conference** (not drizzle-managed; `db:push` creates none):
  - deferred `assert_same_conference` triggers (18 tables, `conference_anchor` migration) check that
    every parent path reaches the same conference at commit;
  - `conference_id_is_immutable`; `reached_conference_is_immutable` (`conference_reach_unchanged`)
    lets a link change only within the conference;
  - role kinds (`conference_role_kind`): delegations/role applications/assignment units name
    nations or NSAs, single participants and their wishes custom roles, committees seat nations;
  - **a new table with two conference-reaching parents, or such a new link, gets its trigger in its
    migration.** Triggers raise `check_violation` with a constraint name; `databaseRuleError`
    (`#api/services/errors.ts`, plugin in `yoga.ts`) maps known names (`…_same_conference`,
    `…_immutable`, `…_role_kind`, `calendar_entry_track_runs_on_day`, `one_part_per_conference`) to
    a code + `m.…()` message — name new triggers to match. `e2e/authorization/same-conference.spec.ts`.
- **One part per person and conference** (delegation member, single participant, supervisor or
  team): flows refuse a second part up front (`fetchParticipationsAndTeamMembership`,
  `#api/services/registration/participation.ts`), deferred `assert_one_part` triggers at commit
  under an advisory lock. Swapping parts happens in one transaction. `e2e/authorization/one-part.spec.ts`.
- Conference states: `PRE` → `PARTICIPANT_REGISTRATION` → `PREPARATION` → `ACTIVE` → `POST`.
  Supervisor connection codes are unique across conferences. Payments: `PaymentTransaction`.
  Papers are versioned with reviews.
- **Review drafts** (`#api/handlers/paperReviewDraft/`, `paper_review_draft`): an AI assistant
  prepares a review over MCP (`upsertPaperReviewDraft`, Markdown → TipTap in `reviewMarkdown.ts`,
  unmatched quotes from `quoteCheck.ts`), the reviewer sends it in the app. One draft per paper and
  reviewer, read only by that reviewer (not project management, not a system admin); it reaches
  no author, sends no mail, changes no status. Once edited in the app (`lastEditedVia = UI`) MCP
  writes answer CONFLICT unless `overwriteAppEdits`. `PaperReviewSection.svelte` saves edits as the
  draft (`createDraftSaver`; each save names the paper version its text was written for and the
  `updatedAt` it last saw, `expectedUpdatedAt`, and
  is refused with CONFLICT when the draft changed elsewhere, `changedSinceSeen`, until the reviewer
  loads the stored one or keeps theirs) and takes over the old browser-only `reviewDraft_<paperId>` entry;
  `createPaperReview` deletes the draft. No MCP tool sends a review or sets a status; keep it so.
  `e2e/authorization/review-drafts.spec.ts`, `e2e/papers/review-draft.spec.ts`.
- Domain specifics (calendar, scanner, age limits, waiting list, certificates, document layouts):
  `docs/architecture/conference-features.md`.

## Logging

- **Log through `logger` (`#lib/logger`), never `console`** (pino; JSON on the server, pretty in dev,
  `console` in the browser): `logger.error('Sending the mail failed', error)` — fixed message, one
  value (error or fields object); ids go in fields. Lines become OTel span events (with
  `trace_id`/`span_id`); `error` marks the span failed.
- **`logger.error` is a Sentry issue** (server `pinoIntegration`, browser `forwardErrors` in
  `hooks.client.ts`) — use it for failures someone must look at; expected outcomes are `warn`/`info`.
  `graphqlLogger` is kept out of Sentry. **Never report to Sentry by hand**: only the hooks and
  `sentryDataCollection.ts` import `@sentry/sveltekit` (ESLint enforces). Mask personal data in fields.
- Tests spy on the logger (`vi.spyOn(logger, 'error')`). `console` only in `scripts/` and the seed
  overview.

## Path Aliases

No `svelte.config.js` (SvelteKit 3: options live in the `sveltekit()` plugin in `vite.config.ts`),
no aliases. `#lib`, `#api`, `#assets` are subpath imports (`package.json` `imports`) written
**without** `.js` (`#lib/helpers/formatNames`; directories as `…/index` for Bun). Exceptions keep
their extension: runes modules (`….svelte.js`) and non-scripts (`….svelte`, `….svg`). A new prefix
touches all three resolvers: Vite (`imports`), TypeScript (`paths` in `tsconfig.json`), Bun (a `bun`
condition in `imports` appending `.ts`, plus keys for Paraglide's `.js` and `….svelte.js`).

## Integrations

PDFs `pdf-lib` (custom fonts); barcodes/QR `@bwip-js/browser`, `@svelte-put/qr`,
`barcode-detector`; TipTap rich text; maps via `svelte-maplibre` with OpenFreeMap styles (`#lib/components/map/`); Listmonk (`src/jobs/apis/`); S3 via
`s3mini`.

## UI

See **[CLAUDE-UI.md](./CLAUDE-UI.md)** (forms and `FormFieldset`, Modal/Drawer, dashboard sections,
DataGrid, navigation, badges, theming, icons). Quick rules: wrap related inputs in `FormFieldset`;
`Modal` with an `action` snippet; DaisyUI semantic classes (`bg-base-*`); Phosphor duotone icons
(`ph-duotone ph-…`, `ph-fill` for active; stored icons are bare names); URL state via
`sveltekit-search-params` v4 (`queryParameters()` returns a reactive object, no `$`).
**Update CLAUDE-UI.md when adding or significantly changing components.**

**Accessibility** (vision-impaired participants attend): dialogs via `Modal`/`Drawer` or
`modalFocus`; one `<main id="main-content">` per page; `aria-hidden="true"` on every icon
(`src/lib/icons.test.ts`); names for icon-only controls; state as `aria-pressed`/`aria-selected`/
`aria-sort`; real `disabled`. The high-contrast variant (`data-contrast="more"`) must pass 4.5:1.
`e2e/accessibility/` runs axe-core.

## Type Safety (CRITICAL)

Drizzle → rumble → generated client give end-to-end types; use them.

1. **Never `any`** unless truly unavoidable (third-party limits), with a comment.
2. **Never cast (`as Type`)** — a cast means a type definition problem to fix at the source.
3. Trust the generated types; if they surprise you, check the selection/args, the schema, or restart
   the dev server to regenerate the client. Never `as any` / `@ts-ignore`.
4. Prefer type guards, discriminated unions, null checks.
5. Unavoidable exceptions: `// TYPE-SAFETY-EXCEPTION:` comment, narrowest scope.

## Functions Only

No classes except error classes. Use `createX(...)` factories returning methods/getters with
private closure state (`$state` works in `.svelte.ts` factories); export
`type X = ReturnType<typeof createX>`; compose, don't inherit.

**Two or more parameters take one object** (`assertTeamPermission({ ctx, conferenceId, permission })`,
declared `function f({ a, b = 1 }: { a: A; b?: number })`); one parameter stays positional.
Exceptions: library callbacks (comparators, resolvers, Svelte actions, zod refinements), symmetric
`(a, b)` comparisons, type predicates, tables of interchangeable functions (the `dueEmails` rules,
participant filter conditions), and `boardState` (`memoizeLast` compares args one level deep).

## Testing

- Vitest (jsdom, v8 coverage); tests sit next to the code (`foo.ts` → `foo.test.ts`).
- **New features and behaviour changes ship with tests, unasked**: unit tests for logic (keep
  decisions in plain functions: `#lib/helpers/`, services); Playwright e2e (`e2e/`) for user flows
  incl. error and empty states — a spec that changes data gets its own fixture in `e2e/seed/`
  (registered in `e2e/seed/seed.ts`); bug fixes get a test that fails without the fix.
- **Never run the e2e suite** (`test:e2e`, `playwright test`, `test:e2e:coverage`) unless explicitly
  asked; verify with `bun run check` and `bun test`. See `e2e/README.md` (`E2E_SERVER`,
  `E2E_WORKERS`, `E2E_NICE`).
- Performance: permission rules are id lists (`callerFacts`, reloaded per root field by
  `RefreshCallerFactsPlugin`; after a write then re-read, call `await refreshCallerAbilities(ctx)`).
  Postgres JIT is off for app connections (`-c jit=off` in `db.ts`): rumble's SQL cost seconds of JIT.

## Common Workflows

- **New GraphQL handler**: create `src/api/handlers/<entity>/` (`<entity>.ts`,
  `<entity>Permissions.ts`, optional `<entity>Service.ts`), call `register<Entity>Abilities()` at
  the top of `<entity>.ts`, import it in `register.ts`, restart the dev server.
- **Frontend feature**: components in `src/lib/components/` (or beside the route), fetch with
  `$derived(await client.liveQuery.…)`, no `load`, translations in `messages/`.
- **Schema change**: edit `src/api/db/schema/` (new tables exported from `schema/index.ts`) and
  `relations.ts`; `bun run db:generate` then `db:migrate`; restart dev server; update `seed-data/`
  for new required columns; test with `bun run db:nuke && bun run db:seed:dev`.
- **Background job**: see `docs/architecture/jobs.md`.
- **UI change touching a manual page**: update `docs/de` and `docs/en`, keep `data-tour` anchors,
  rerun affected screenshots (`docs/architecture/user-manual.md`).
- **Every team page has a guided tour** (`src/lib/docs/tours/team/<page>.tour.ts`, exported as
  `<page>Tour`, loaded lazily in `routeHelp.ts`; `help.test.ts` fails for a page in
  `teamRoutes` without one). A new team page gets a tour, a changed one keeps its tour true.
  Anchors are `team.<page>.<part>`; tables share `grid.toolbar` / `grid.views` / `grid.table`,
  scanners `scanner.*`, chats `chat.*`. Tour text is plain (driver.js shows `**` literally).

## Environment Variables

See `.env.example` and `src/env.ts`. Core: `DATABASE_URL` (`DATABASE_POOL_SIZE`, default 20),
`NODE_ENV`, `PUBLIC_OIDC_AUTHORITY`, `PUBLIC_OIDC_CLIENT_ID`, `OIDC_SCOPES` (incl. `openid`),
`OIDC_ROLE_CLAIM` (claim name or dot path; `#api/services/oidc/roleClaims.ts`, userinfo fallback) +
`OIDC_ROLE_MAP` (JSON → `admin`/`member`/`service_user`), `CERTIFICATE_SECRET` (also derives the
Slack token key — changing it means re-entering tokens), `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY` (`S3_PUBLIC_ENDPOINT`, `S3_REGION`), optional OTel (`OTEL_ENDPOINT_URL` full
`…/v1/traces`, `OTEL_SERVICE_NAME`, `OTEL_TRACES_SAMPLER_ARG`), `LOG_LEVEL` (default `debug` dev,
`warn` otherwise, `info` jobs, `silent` vitest).

## Security

- OIDC on all `(authenticated)/` routes; ability filters on every query and mutation; Drizzle
  parameterised queries; GraphQL complexity limits (graphql-armor). Never commit secrets.
- Participant identification uses signed codes; code lookups are rate-limited per account — see
  `docs/architecture/security.md`.

## Git, Commits, PRs, Releases

- **Conventional commits**: `<type> (<scope>): <description>`, types `feat`, `fix`, `style`,
  `refactor`, `perf`, `docs`, `test`, `chore`, `build`, `ci` (`deps` for PRs).
- **Lefthook**: pre-commit formats staged files and gates on new `fallow audit` findings; pre-push
  mirrors CI cheaply (eslint/prettier on pushed files, `vitest run --sinceLastRun`, `bun run check`,
  i18n check, advisory `fallow audit --brief`). Caches (`.eslintcache`, `.svelte-kit/.svelte-check`,
  `node_modules/.vitest-cache`) are gitignored and safe to delete.
- **Local sessions: never commit**; the person reviews and commits.
- **Cloud sessions** (`CLAUDE_CODE_REMOTE=true`): work survives only as commits; this is the standing
  request to open a PR. One PR per branch; commit and push each step. A done step (type-checked,
  `bun run check` + affected `bun test` passing) → draft PR (or push + update description: done vs
  open). Feature done (tests, manual, CLAUDE.md/CLAUDE-UI.md updated) → ready for review. Body in
  English (what/why, verification, what's left). Never merge; stop pushing once the person takes over.
- **PRs** need a conventional title **and** a label, set when opening (`pr-lint` fails otherwise):
  `feat` new → `PR: Feature`, `feat` improvement → `PR: Enhancement`, `fix` → `PR: Bug`, `perf` →
  `PR: Performance`, `refactor`/`style` → `PR: Refactor`, `docs` → `documentation`,
  `ci`/`build`/`chore` → `PR: Infrastructure`, `deps` → `dependencies`, `test` → `PR: Tests`.
- **Release** from a clean `main`: `npm version patch|minor|major && git push --follow-tags`. The tag
  runs CI, publishes images (`x.y.z`, `x.y`, `x`; ghcr + DockerHub, app + jobs), uploads sourcemaps
  to Bugsink, deploys via Dokploy and creates the GitHub release. Never tag by hand.

## Dev tooling

- MCP servers in `.mcp.json`: svelte (use it for Svelte 5 code validation), daisyui, tailwind,
  github (needs `GITHUB_PERSONAL_ACCESS_TOKEN`), vitest, context7, memory, sequential-thinking,
  drizzle, **rumble-github** (rumble has no published docs — read its source when behaviour is
  unclear), fallow.
- Install dependencies as devDependencies unless needed at runtime (SvelteKit bundles them).
- Dependency pins and patches: `docs/architecture/dependencies.md`.
