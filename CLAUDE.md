# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MUNify DELEGATOR is a SvelteKit-based application for managing Model United Nations conference registration, delegation assignment, and organizational matters. Built with Svelte 5, TypeScript, Drizzle ORM, and GraphQL (via [rumble](https://github.com/m1212e/rumble)), it's designed for DMUN e.V. but can be adapted for other MUN conferences.

It shares its stack, and much of its structure, with the sibling project MUNify CHASE. When a question is not answered here, how chase does it is the intended answer.

## Tech Stack Core

- **Frontend**: SvelteKit with Svelte 5 (runes mode), TailwindCSS 4, DaisyUI
- **Backend**: Node.js with SvelteKit server routes
- **Database**: PostgreSQL via Drizzle ORM (relational API), migrations through drizzle-kit
- **GraphQL**: rumble (Pothos + graphql-yoga + drizzle, with its own ability layer) on the server; a generated typed client over urql on the frontend
- **Auth**: OpenID Connect (OIDC) - recommended provider: Logto
- **i18n**: Paraglide-JS for internationalization (default locale: German)
- **Runtime**: Bun (package manager and development runtime)
- **Observability**: OpenTelemetry tracing support

## Development Commands

### Setup & Running

```bash
# Install dependencies
bun install

# Start development (Docker + dev server)
bun run dev

# Separate commands
bun run dev:docker    # Start Docker containers (PostgreSQL, the RustFS S3 bucket, etc.)
bun run dev:server    # Start Vite dev server only

# Install git hooks (lefthook)
bunx lefthook install
```

### Database Operations

```bash
# Write a migration for the current schema (src/api/db/schema/)
bun run db:generate

# Apply pending migrations
bun run db:migrate

# Push the schema without writing a migration (throwaway databases only)
bun run db:push

# Drop every table and enum (WARNING: deletes all data)
bun run db:reset

# Wipe and refill the dev database and the bucket: every conference stage, persona accounts, crowd
bun run db:seed:dev

# Rewrite oidc-mock.yaml's users from src/api/db/seed-data/devAccounts.ts
bun run dev:accounts

# Recreate the container from scratch and migrate it
bun run db:nuke

# Database GUI
bun run db:studio
```

### Code Quality

```bash
# Format code
bun run format

# Type checking (PREFERRED for development - fast feedback)
bun run check          # Single run - use this to verify changes
bun run check:watch    # Watch mode
bun run typecheck      # TypeScript only (tsc is TypeScript 7, installed as @typescript/native)

# Lint (slow - runs automatically on git push via lefthook)
bun run lint           # Only run manually when specifically needed

# Codebase analysis (fallow: dead code, cycles, duplication, complexity)
bun run fallow         # Full report
bun run fallow:audit   # Only what changed against the branch base
bun run fallow:health  # Health score with letter grade

# Testing
bun test               # Run tests once
bun run test:watch     # Watch mode
bun run coverage       # Unit tests with coverage (coverage/unit)
bun run test:e2e:coverage  # e2e suite with server + browser coverage (coverage/e2e-*)
```

**Coverage feeds fallow's CRAP scores.** Both coverage commands end in `scripts/mergeCoverage.ts`,
which merges whatever reports exist into `coverage/coverage-final.json` (and an HTML report in
`coverage/report/`); the `fallow*` scripts, the lefthook hooks and the CI fallow job pass that file
to fallow, which otherwise only estimates coverage. The e2e run records the browser through the
`page` fixture in `e2e/support/test.ts` (specs import `test` from there, not from
`@playwright/test`), and the server through `NODE_V8_COVERAGE`, which `scripts/serverCoverage.ts`
maps back to the sources: Vite's module runner evaluates modules with `new AsyncFunction`, which
Node keeps no source map for, so c8 cannot. Generated code (Paraglide, the rumble client) is left
out by `scripts/coverageScope.ts`. CI scores with unit coverage only.

**Note:** Prefer `bun run check` over `bun run lint` during development. Linting is slow (~2 min) and runs automatically on push via lefthook pre-push hooks. Use `bun run check` for quick type-checking feedback.

### i18n (Internationalization)

```bash
# Check for missing/unused translations
bun run i18n:check

# Validate translation project
bun run i18n:validate

# Auto-translate missing keys
bun run i18n:translate

# Add new translation key interactively
bun run add-translation
```

### Building

```bash
# Production build (app, then the compute worker threads in build/compute via tsdown, then nothing else: the jobs image builds itself with `bun run build:jobs`)
bun run build

# Preview production build
bun run preview
```

## Architecture

### Directory Structure

- **`src/routes/`** - SvelteKit routes (filesystem-based routing)
  - `(authenticated)/` - Protected routes requiring authentication
    - `dashboard/[conferenceId]/` - A conference's dashboard and everything around it
      - `team/` - **Every team-facing page** (settings, tables, assignment, workflows, team members,
        scanner, maintenance), behind one guard and one navigation. There is no page at `team/` itself: the dashboard's team
        entry (`stages/TeamMember/TeamMemberDashboard.svelte`) is one card that opens the first page
        the caller may open, next to the conference's resource links.
        The assignment lives in `team/assignment/`. See "Team area" below.
      - `paperhub/` - Stays outside `team/`: participants and supervisors use it too
    - `dashboard/create/` - Creating a conference from a seeding JSON (system admins)
    - `registration/` - User registration flows
  - `api/graphql/` - GraphQL API endpoint
  - `auth/` - OIDC authentication callbacks
  - `seats/`, `vc/`, `validateCertificate/` - Public-facing pages

- **`src/api/`** - Backend GraphQL API layer
  - `handlers/` - One directory per domain entity (`paper/`), so the IDE keeps them sorted, each
    split three ways after `avv`: `paper/paper.ts` is the GraphQL layer (object reference, queries,
    mutations), `paper/paperPermissions.ts` **all** of the entity's authorization (its abilities in
    `registerPaperAbilities()` and every `assertCan…` / `can…` check a resolver runs), and
    `paper/paperService.ts` the business logic, which holds no schema, ability or query definitions
    and **never checks permissions**. `register.ts` is the only file beside the directories. It
    imports them all and is the single place a new handler has to be listed.
  - `rumble.ts` - The rumble instance: schema builder, ability builder, yoga factory, and the
    dev-time generator for the typed frontend client.
  - `context.ts` - Request context (OIDC data plus `mustBeLoggedIn` / `hasRole`)
  - `db/` - `schema/` (tables, one file per part of the app: `application.ts`, `roles.ts`,
    `papers.ts`, …; `index.ts` exports them all, `columns.ts` holds the shared column helpers),
    `relations.ts` (the relational API's graph), `db.ts` (client),
    `reset.ts`, `seedDev.ts` (scenarios in `seed-dev/`) and the faker factories under `seed-data/`
  - `graphql.remote.ts` - SvelteKit remote functions that execute the schema in-process, which
    is how server-side loads reach the API without an HTTP round trip
  - `services/` - Business logic shared by several handlers or routes, and `authHelper.ts`, the
    authorization building blocks every `*Permissions.ts` composes from (after chase);
    `services/README.md` indexes them. Like handler services, these never check permissions.

- **`src/lib/`** - Shared frontend code
  - `api/client.ts` - The urql client and its exchanges
  - `api/rumbleClient/` - **Generated**, do not edit. Written by `clientCreator` whenever the dev
    server starts; the typed surface every query and mutation in the app goes through.
  - `components/` - Reusable Svelte components
  - `services/` - Frontend utility functions
  - `schemata/` - Zod validation schemas
  - `paraglide/` - Generated i18n code

- **`src/env.ts`** - Every environment variable, declared and validated by SvelteKit (3's
  explicit environment variables). Import them by name:
  `import { DATABASE_URL } from '$app/env/private'` (server only) or `'$app/env/public'`
  (`public: true`, also the browser). A missing or malformed value stops the app at start-up
  (or build) with one report listing every problem. `$env/*` is switched off. A variable that is
  required at runtime but not during `vite build` goes through `requiredAtRuntime` there. A test
  that needs one mocks the module (`vi.mock('$app/env/private', …)`): nothing fills them in
  under vitest. `src/jobs/` runs outside SvelteKit and validates its own variables with zod in `src/jobs/config.ts`, the only jobs module that reads `process.env`.

- **`src/jobs/`** - One-shot jobs behind the `delegator-jobs` CLI (`cli.ts`, one file per job, after
  avv), built by `bun run build:jobs` into `jobsOut/` and shipped as its own image
  (`Dockerfile.jobs`). Run by an external scheduler; `bun run jobs <command>` runs one locally.
  Jobs-only code lives here, not in `src/api`, and `db.ts` is the jobs' own client so a job needs
  only `DATABASE_URL` and does not read the app's configuration.
  - `refresh-statistics.ts` - Recomputes the statistics materialized views (every few minutes)
  - `mailSync/` + `apis/listmonk/` - Mail list synchronisation with Listmonk (`mail-sync`)
  - `invitationCleanup.ts` - Deletes team member invitations long after they expired
  - `fileCleanup.ts` - Deletes stored files nothing uses any more, and bucket objects without a row
  - `sendEmails.ts` - Calls the app's `/api/jobs/send-emails` until no automatic mail is left due

- **`drizzle/`** - Generated migration history. Never edited by hand; `db:generate` writes it.

### Key Architectural Patterns

#### 1. GraphQL API Layer (rumble)

- **Code-first**, one directory per entity under `src/api/handlers/`, in three files (after avv's
  `ticket/`). The permissions file declares the abilities and the checks:

  ```ts
  // committeePermissions.ts
  export function registerCommitteeAbilities() {
  	abilityBuilder.committee.allow('read');
  	abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);
  }
  export function assertCanCreateCommittee(ctx: ApiContext, conferenceId: string) {
  	return assertTeamRole(ctx, conferenceId, SEAT_PLANNING_ROLES);
  }
  ```

  The handler registers them first, then declares its object reference, queries and mutations;
  each resolver runs its permission checks, then calls the service:

  ```ts
  // committee.ts
  registerCommitteeAbilities();
  export const CommitteeRef = object({ table: 'committee' });
  query({ table: 'committee' }); // generates `committee(id)` and `committees(where, limit, …)`
  ```

- **Services never check permissions** - neither `<entity>Service.ts` nor anything in
  `src/api/services/`. No `ctx.abilities`, no `assertTeamRole`, no role or ownership comparison:
  they take the caller's id, or the rows and ids the permissions file already authorized, as
  plain arguments. Checks about _what_ (a stage, a size limit, uniqueness) stay in the service;
  checks about _who_ go in `<entity>Permissions.ts`. Applying the `read` ability to shape what a
  query returns stays in the GraphQL layer; every other use of `ctx.abilities` is a permission
  check. A check several entities need goes into `authHelper.ts`, not into two permission files:
  `assertAllowedById` / `assertAllowedRow` (a row through its own update/delete ability, else
  NOT_FOUND), `allowedRowWhere` (that row as a `where` to write through), `deleteAllowedRow` (delete
  it in one statement, NOT_FOUND when nothing went), `assertUpdated` (an update's `.returning()`
  came back empty), `readableById` (re-read a row through its read ability after a write),
  `assertOfferedIn` / `offeredIn`, `assertCustomRolesOf`, `participantIdsOf`,
  `assertParticipantOrTeamMemberIn`, `assertParticipantOfConference`. Permission functions take
  `ApiContext` (`#api/rumble.js`), which carries `abilities`.

- **Every mutation publishes.** Pubsub instances live in `src/api/pubsub.ts`, one per table, shared by every handler and service that writes it. Never create one in a handler:

  ```ts
  import { committeePubsub } from '#api/pubsub.js';
  // …
  committeePubsub.updated(args.id); // or created() / removed()
  ```

  Publish for **every** table a resolver touches, not just its own — deleting a delegation has to
  announce its members too, or a subscriber watching members never hears about it. Use `updated(id)`
  when one row changed and the bare `updated()` for a bulk write with no single id.

- **Authorization** lives in those `abilityBuilder` calls. An ability is a drizzle filter, so it
  composes into a query rather than being checked after the fact:

  ```ts
  ctx.abilities.committee.filter('update').merge({ where: { id: args.id } }).sql.where;
  ```

  `services/authHelper.ts` is the one place authorization is built from; its header holds the
  role matrix (who may do what). Rules of thumb, all of them enforced by `e2e/authorization/`:

  - **Rules compose from the helpers** (`isTeamMemberOfConference(ctx, roles)`, `isOwnUser`,
    `isParticipantOfConference`, `isCaredForUser`, …), wrapped with `where(...)`. A helper returns
    `undefined` for "grants nothing" and never throws. Every table also gets
    `.allow([...]).when(systemAdmin)` - rumble has no global wildcard.
  - **Updates and deletes go through the row's own ability** (`filter('update').merge({ where:
{ id } })`). Load the row through it first when the resolver needs the row anyway.
  - **Creates check the parent with `assertTeamRole(ctx, conferenceId, roles)`**, which runs the
    same `isTeamMemberOf` filter against the conference row (chase checks the parent's `update`
    ability for the same reason). A system admin always passes.
  - **Every id an argument names is checked to belong where the row goes**: a track to its day, a
    place, role, committee or nation to the conference, a `userId` to the caller unless the
    caller is participant care. A missing check here is how a team of one conference writes into
    another.
  - **A rule's `columns` apply to the rows that rule matched** (rumble ≥ 0.25 masks per row), so
    visibility that depends on how the reader relates to a row is a rule like any other: the user
    table (paper reviewers read names only; co-delegates names and email; students their supervisors' name and
    email; supervisors and the care team contact details; teammates the phone number, team admins
    everything but the care notes; nobody but the care team the care notes of participants, and
    nobody those of the team), the conference (payment
    and postal details for people with a part in it, team links for the team), a delegation's
    `entryCode`, a supervisor's `connectionCode`, an invitation's `token`. **A masked non-null
    column cannot be selected:** the GraphQL type stays non-null, so a reader who is masked and
    asks for it gets an error for the whole query - not selecting it never throws. Only select
    such a column where the reader may see it.

- The endpoint is `src/routes/api/graphql/+server.ts`, and `src/api/yoga.ts` holds the one yoga
  instance it, `/api/graphql/stream` and the SSR remote function all share. Adding fields needs a
  **dev server restart**: the schema builder is populated at module init.
- **Subscriptions share one stream per tab** (graphql-sse's single connection mode, wired up in
  `src/lib/api/client.ts`). The browser reserves a stream with `PUT /api/graphql/stream`, holds it
  open with a `GET`, and starts each subscription with a short `POST` whose results arrive on that
  stream. Never go back to one response per subscription (urql's `fetchSubscriptions`): over
  HTTP/1.1 a browser allows six connections per host, and a page with six live queries would hold
  them all, queueing every later mutation, subscription and lazily imported chunk forever. The
  reservation lives in the process's memory, so several app instances need sticky sessions for
  `/api/graphql/stream`; the events themselves still fan out through Redis.

#### 2. Frontend Data Fetching (generated rumble client)

- Every operation goes through the generated client, which takes a selection object rather than a
  GraphQL document:

  ```ts
  import { client } from '#lib/api/rumbleClient/client.js';

  const conference = await client.query.conference({
  	__args: { id: conferenceId },
  	id: true,
  	title: true,
  	committees: { id: true, abbreviation: true }
  });

  await client.mutate.updateCommittee({ __args: { id, name }, id: true, name: true });
  ```

  Mutations returning a scalar have no selection to describe; wrap them for `toast.promise` with
  `Promise.resolve(client.mutate.deleteX({ __args: { id } }))`.

- **Where to fetch**: in the component, at the top of `<script>`, not in a `load`. This is chase's
  idiom and what `compilerOptions.experimental.async` is for:

  ```ts
  const delegations = $derived(
  	await client.liveQuery.delegations({
  		__args: { where: { conferenceId: { eq: data.conferenceId } } },
  		id: true,
  		school: true
  	})
  );
  ```

  Use `$derived(await …)` whenever the query depends on a route param or other reactive value — a
  bare top-level `await` runs **once**, so the page would keep showing the conference you navigated
  away from. svelte-check flags the bare form with `state_referenced_locally`; that warning is a
  real bug, not noise. A plain `await` is right only for something seeded once, such as the initial
  value of a form field.

- **Each component fetches what it renders, and nothing more.** A page fetches only what decides
  _which_ sections to show (often just ids), and hands each section the ids it needs; the section
  queries its own fields. Never fetch a large tree at the top and prop-drill it down: every
  component then re-renders on every change anywhere in it, and nobody can tell which field is
  still used. `fetchMyParticipation` is the model: it only answers who the caller is in a
  conference (role, ids, a few discriminating fields), and the dashboard stages fetch the rest.
  Small overlapping queries are cheap: they share one normalized cache record per entity.

  - **You never need to select `id`.** The generated client adds it to every selection of a type
    that has one (`autoIncludeIdField` in `src/api/handlers/register.ts`), because graphcache
    cannot normalize a selection without it - it stores it embedded, overwrites the link other
    queries of the same field hold, and their next read comes back `undefined`. A type keyed by
    something else (a nation, by `alpha3Code`) belongs in `customKeyFields` in
    `#lib/api/cacheKeys.ts`, and then that field has to be selected.
  - **Key a query by primitives, never by reading through another live result inside the same
    `$derived`.** Reading a field of a live result subscribes the reading `$derived` to that
    result's updates, so a `$derived` that also issues a query would issue it again on every update.
    Pull the id out first (`const delegationId = $derived(member.delegation.id)`) and query with
    that; likewise read fields of a fresh result in a second `$derived`, not in the one that awaited
    it. (rumble only announces updates whose data actually changed, which stops the resulting
    loops, but the extra queries are still waste.)
  - **Every property read of a live result is a subscription.** rumble's result proxy calls Svelte's
    `createSubscriber` on each read, and each call creates a render effect; a `$derived` that walks
    a live array row by row creates one per row, and renews them all every time it runs. A page
    that computes over many live rows reads each result once into a plain copy
    (`#lib/api/liveSnapshot`, which uses `slice`, a single read) in its own `$derived`, and
    computes over the copies; `memoizeLast` (`#lib/helpers/memoizeLast.js`) then skips the work when
    a derived runs again over the same copies. On the assignment board this took a tab switch
    from ~45 board computations and a 0.5 s stall to 2 and ~0.1 s. Do not read live results in an
    `$effect` there instead: during the page's first async work that trips Svelte's "Batch has
    scheduled effects" invariant.
  - When a component needs several queries, run them with `Promise.all` in one
    `$derived(await …)`. A module that exports a fetch function and its result type is still right
    when several components share a shape (`conferenceParticipants.ts`).

- **`load` functions are for three things only**: redirect and 403 guards, page options like
  `ssr = false`, and cookie work that has to happen before anything renders — of which only
  `auth/accept-invitation` is left. There are **no form-action loads any more**; every form submits
  through a mutation (see Forms below). Everything else fetches in the component, and a guard
  returns nothing — route parameters come from the `params` prop, not from load data. A `load` must
  never return what the generated client gave it: those are subscribeable proxies, and `load` data
  has to be serialized into the page.
- **Route parameters come from the `params` prop**, never from `page.params`:

  ```ts
  let { params }: PageProps = $props(); // LayoutProps in a layout
  const conference = $derived(await fetchConference(params.conferenceId));
  ```

  `page` from `$app/state` is `$state` that SvelteKit writes when it hydrates, and that write sits
  in a batch that stays pending until the page's first async work settles. A live-query update
  landing in that window starts a second batch, and Svelte shows a later batch the _previous_
  value of anything a pending batch wrote — so an async derived re-run there reads the placeholder
  `page`, `params` is `{}`, and that result is the one that sticks. The page renders as if the
  conference did not exist. The prop is handed to the component rather than written in a batch,
  so it does not have this problem. Name it `routeParams` where the page already has a `params`
  (a `sveltekit-search-params` object). Read it through a primitive `$derived`
  (`const conferenceId = $derived(params.conferenceId)`) before an awaited derived uses it, in
  layouts too: every navigation, a query-only one included, hands over a fresh `params` object,
  and an awaited derived reading `params.x` directly asks for everything again each time.

- **Global state lives in `#lib/state/*.svelte.ts`**, chase's pattern. `getCurrentUser()` is the
  signed-in person; `fetchMyParticipation(conferenceId)` is what the caller is in one conference.
  Cache such a singleton **only in the browser**: module state on the server is shared by every
  request the process serves, so caching there hands one visitor's identity to the next. For the
  same reason the urql client answers server-side operations `network-only` — see the comment on
  `requestPolicy` in `src/lib/api/client.ts`.

#### Forms

- **Every form is a superforms SPA form that submits through a mutation.** There are no form
  actions and no `superValidate` on the server. The shape is always the same:

  ```ts
  const form = superForm(defaults(initialValues, zod4Client(schema)), {
  	SPA: true,
  	resetForm: false,
  	validationMethod: 'oninput',
  	validators: zod4Client(schema),
  	onError: (e) => toast.error(e.result.error.message),
  	async onUpdate({ form: validated }) {
  		if (!validated.valid) return;
  		const promise = client.mutate.updateX({ __args: { ...validated.data, id }, id: true });
  		toast.promise(promise, genericPromiseToastMessages);
  		await promise;
  	}
  });
  ```

  `onUpdate` is the place for the mutation — it runs after validation, unlike `onSubmit`. Seed
  `initialValues` from a **plain `await`**, not `$derived(await …)`: re-reading the row while
  someone is typing would discard their edits. Build the object field by field rather than
  spreading a query result: the generated client returns a subscribeable proxy, and spreading it
  drags `subscribe` along and widens every field to `unknown`. Where the initial values need
  massaging, put that in a helper (`#lib/api/userFormValues.ts`) so two forms on the same table
  cannot drift.

- **Fields are [Formsnap](https://formsnap.dev) components underneath.** The `Form*` wrappers in
  `#lib/components/form/` own the styling and pass `name`/`label`/`description` through to
  Formsnap's `Field`/`Control`/`Label`/`Description`/`FieldErrors`, which generate the ids and wire
  `for`, `aria-describedby`, `aria-invalid` and the `aria-live` error region. Spread the `props`
  the `Control` snippet hands you onto the input and never set `id`/`name` by hand. A field
  component is generic over `N extends FormPath<A> & keyof A`, so a misspelled field name is a
  compile error; for a typed `bind:` (a boolean or a `Date`) reach for `formFieldProxy`, which is
  what keeps those bindings type-safe without a cast.
- **Uploads** go through `fileProxy`, then `uploadFile` (`#lib/api/uploadFile.js`), which puts the file
  straight into the S3 bucket and returns its id for the mutation (`logoFileId`, …). An untouched
  field must yield `undefined` so the stored file survives; `null` removes it. See "Files" below.
- **Personal data goes in through rumble's scalars**: `PersonName`, `EmailAddress`,
  `PhoneNumber` (stored as E.164), `Date` for a calendar day and `AddressInput` for an address
  (validated against libaddressinput's metadata, alpha-2 country codes; the user table keeps
  alpha-3, `#lib/helpers/countryCodes.js` converts). Values that arrive some other way, such as
  OIDC claims in `upsertSelf.ts`, go through rumble's exported `normalizePersonName` /
  `normalizeEmailAddress` / `parsePhoneNumber`. The account forms check the same rules first:
  `isPersonName`, and `addressRules`/`addressIssues` for which of postal code, city and region
  (`AddressRegionField`) a country uses. A `Date` value is UTC midnight on the wire; a date picker
  yields local midnight, so convert with `#lib/helpers/calendarDay` (`toUpdateUserArgs` does).
- **Regeneration** happens on dev server start, so a handler change is only visible to the
  frontend after a restart. `src/lib/api/rumbleClient/` is generated and committed; never edit it.
- **SSR** goes through `src/api/graphql.remote.ts`, which executes the schema in-process.
  `ssrExchange` in `src/lib/api/client.ts` routes there whenever `browser` is false, which is why
  server-side fetching works without the app being able to fetch its own relative URL. It has to
  stay a remote function: `client.ts` is shared with the browser, and only a remote import is
  stubbed out there. Needs `experimental.remoteFunctions` in the `sveltekit()` options in
  `vite.config.ts`. It refuses HTTP calls (`event.isRemoteRequest`): SvelteKit serves every
  `query` remote function as a `GET` endpoint, which would otherwise execute any document a
  browser sends with the visitor's cookies, past yoga, armor and the error masking. `/api/graphql`
  sends no CORS headers (`cors: false`): the API is same-origin only, and yoga's default reflects
  any origin with credentials.
- **Files live in an S3 bucket** (any S3-compatible service, through
  [s3mini](https://code.nolog.cz/thinking.tools/s3mini); locally RustFS from
  `dev.docker-compose.yml`, console on http://localhost:9101). A row holds the id of a
  `stored_file` (`conference.logoFileId`, `place.sitePlanFileId`, `resolution.fileId`, …), which
  knows the object's key, type, size and name. All of it lives in the table's handler,
  `#api/handlers/storedFile/`: `FILE_SOURCES` (`fileSources.ts`) lists every file - its column,
  who may upload it, the allowed types and the size limit; `storedFilePermissions.ts` holds the
  checks, `storedFileService.ts` the uploads and download URLs, and `storageClient.ts` the s3mini
  wrapper the jobs and the seed build their own bucket from.
  - **Upload:** `requestFileUpload` checks the caller's team role, type and size, records the file
    and answers with it (the `StoredFile` object); its `uploadUrl` is a presigned PUT URL with type
    and length signed in, null once something has arrived, so a stored file never changes. The
    browser PUTs the bytes there; the mutation saving the row takes the id, `assertCanClaimFile` checks that the caller
    uploaded it, for that field of that conference, and `ensureUploadComplete` that it arrived in
    full.
  - **Download:** rows never resolve a file themselves; readers select the relation
    (`conference.logoFile { url }`, `contractFile`, `place.sitePlanFile`, `resolution.file`, …)
    and read `id` / `url` from the `StoredFile`, whose `url` is a presigned GET URL of the bucket.
    There is no app route in between, and two checks guard the URL: the holding row's file id
    column mask (a relation behind a masked id resolves to nothing; `e2e/authorization/api-abilities.spec.ts`
    pins it for a template), and the `storedFile` read rules, which follow the row holding the file
    through reverse relations (`imageOf`, `contractOf`, `sitePlanOf`, `resolutionOf`, …): pictures
    wherever the conference is readable, templates and resolutions for the people with a part in
    the conference, site plans for whoever reads the conference's schedule (the team, participants
    once `showCalendar` is on), an unclaimed file for its uploader only. There is no
    query listing files, and `uploadedById` is masked for all but the uploader. A URL is reused for
    six hours and valid for twelve, so browsers cache the (immutable) object and live queries do
    not see a new URL on every refetch. Browsers talk to the bucket directly: it needs CORS (GET
    and PUT from the app's origin), and an image drawn onto a canvas is loaded with
    `crossOrigin = 'anonymous'`. The resolution header's emblem is still embedded as a data URL
    (`fetchFileAsDataURL`, `paperhub/conferenceHeaderInfo.ts`) for the editor and `/api/pdf`.
  - **Cleanup is garbage collection:** no mutation or cascade deletes a file, and a file names no
    conference. The `file-cleanup` job collects every `stored_file` nothing points at, found
    through the schema's foreign keys to it (`fileReferenceColumns`), so **a file id kept in
    anything but a `fileRef()` column looks unused and gets deleted**. It works a page at a time:
    locks the rows, deletes their objects from the bucket, then the rows. Objects without a row
    go too.
  - A new file is a `fileRef()` column, a relation to `storedFile` in `relations.ts` and its
    reverse on `storedFile`, a read rule in `storedFilePermissions.ts`, an entry in
    `FILE_SOURCES`, `assertCanClaimFile` + `ensureUploadComplete` in the mutations that set it,
    and a target in `uploadFile`. A field that has to stay private needs its id column masked.
- **After a mutation you normally do nothing.** `liveQuery` subscribes as well as queries, and every
  mutation publishes to the tables it writes, so open queries are told to refresh themselves. Fetch
  with `liveQuery`, not `query`, anywhere a component displays the result — `query` is for one-shot
  reads inside an event handler and for `load` functions, which are not reactive either way.
- **`invalidateAll()` is for load data only**, and almost nothing returns load data any more. It
  does nothing for a component's own fetch, so do not reach for it there; a component that cannot be live refreshes by calling its own fetch function again, and a
  child component tells its parent through a callback (`onUpdate`, `onSaved`) rather than
  invalidating the world.

#### 3. Authentication & Authorization

- **OIDC flow** via [`@m1212e/sveltekit-oidc`](https://github.com/m1212e/sveltekit-oidc), the same
  library chase uses. `src/api/services/OIDC.ts` builds the instance; its `handle` hook (wired up in
  `src/hooks.server.ts`) protects `AUTHENTICATED_ROUTES`, serves `/auth/login-callback` and
  `/auth/logout-callback` **without any `+page` files**, refreshes tokens, and puts the validated
  session on `event.locals.oidc`. There is no auth code in route loads. Every guard that decides
  by path (`authenticatedRoutes`, `isPublicRoute`, the migration notice) looks at
  `routePath(event.url)`: Paraglide prefixes non-default locales (`/en/…`) and `event.url` keeps
  the prefix, so matching `event.url.pathname` would miss every English URL. A redirect target
  that comes from the request (`/login?next=`) goes through `sameSitePath`
  (`#api/services/sameSitePath.ts`), which resolves it like a browser would; `startsWith('/')`
  alone lets `/\evil.example` through.
- **Locally, the provider is [oidc-mock](https://github.com/strehk/oidc-mock)**, started by the
  `oidcMock()` plugin in `vite.config.ts` whenever `vite dev` runs - no container. Its users live
  in `oidc-mock.yaml` (edits apply on the next login), its login page is served on the app's own
  origin under `/oidc`, and `PUBLIC_OIDC_AUTHORITY` points at
  `http://127.0.0.1:8090/oidc/.well-known/openid-configuration`. The e2e suite signs in through the
  login page's custom-claims form.
- **Dev accounts and the dev seed belong together.** `src/api/db/seed-data/devAccounts.ts` lists
  every account on the login page; `bun run dev:accounts` writes them into `oidc-mock.yaml`
  (never edit its `users` by hand - `devAccounts.test.ts` fails on drift), and
  `bun run db:seed:dev` gives each one a user row (id = `sub`) and a part to play. Ten
  conferences cover the stages (`seed-dev/plans.ts`: pre, registration open / in its grace period
  / closed, preparation with everything and with nothing unlocked, active, post, a second small
  one, and another organizer's past conference without any dev team member). The closed one
  carries an assignment draft in progress; the locked one has seats handed out but not released,
  so its participants see "assignment in progress". Team personas
  hold one team role everywhere; `[Registration]` personas cover the application steps;
  `[Participant]` personas keep one role (head delegate, minor, supervisor, rejected, …) across
  preparation, active and post, so one login tours the stages. The seed prints the conference ids,
  join codes and invitation links at the end. A new state the UI branches on gets a persona or a
  conference flag here, so it stays reachable with one click.
- **Login-time user upsert** lives in `src/api/services/account/upsertSelf.ts`, passed to the library as
  `userLoggedInSuccessfully`. It creates or refreshes the row, redeems a pending team-member
  invitation, and redirects to `/auth/email-conflict` or `/my-account` when it has to.
- **Impersonation** is a delegated session the OIDC library keeps next to the caller's own
  (`OIDC.startImpersonation`). `startImpersonation` gets a subject token for the target from
  Logto's Management API (M2M credentials `OIDC_M2M_*`; oidc-mock serves the same endpoint, any
  values work locally) and exchanges it (RFC 8693) with the caller's access token as actor, so the
  issued token names them in `act`; `#api/services/account/impersonation.ts` does both. The library
  accepts it only as long as its actor is the signed-in session, never refreshes it, and drops it
  on sign out. Who may act as whom is `impersonatableBy` (`userPermissions.ts`): admins anybody but
  themselves, participant care and project management the participants of their conferences, never
  anybody on a team. `impersonationHandle` (`hooks.server.ts`) checks it again on every request and
  loads the target's identity from their row, since the exchanged token may carry only `sub`. While
  impersonating, `ctx.oidc.user` is the target, `ctx.oidc.impersonator` the caller, and the system
  roles are only those both hold. `e2e/authorization/impersonation.spec.ts` pins it down.
- User context injected into the GraphQL context via `src/api/context.ts`, which reads
  `event.locals.oidc`
- **rumble abilities** define fine-grained permissions per entity:
  - Actions: `read`, `update`, `delete` (declared in `src/api/rumble.ts`); impersonation, when it
    is redesigned, brings its own
  - Each entity's abilities live in its `<entity>Permissions.ts`
- Team member roles: `Admin`, `PROJECT_MANAGEMENT`, `PARTICIPANT_CARE`, etc. The role lists live
  in `#lib/helpers/teamRoles.ts`, shared by the API (`authHelper.ts` re-exports them) and the UI.
  `CONTENT_LEAD` reaches the seat planning, the committees and the conference's content (links,
  postal address, templates, status, resolutions) next to the scanner and the settings.

- **Team area.** Everything a conference's team works in is under `dashboard/[conferenceId]/team/`,
  behind **one guard** (`team/+layout.ts`) and **one registry** (`#lib/data/teamRoutes.ts`): each
  entry holds the path, title, icon, section, command palette keywords and the roles that may open
  it. The side navigation (`team/TeamShell.svelte`), the dashboard's team entry (`stages/TeamMember/TeamMemberDashboard.svelte`: one card that opens the first page the caller may open, plus the conference's resource links), the command palette and the guard are all
  generated from it, so they cannot disagree. What a caller may open comes from `TeamAccess`
  (`#lib/helpers/teamAccess.ts`: every role they hold, plus the admin flag; fetch it with
  `fetchTeamAccess`). The page-level predicates (`canEditConference`, `canEditCommittees`, …) take
  that and mirror the API's abilities. There are no redirect stubs: a path that is not a page is a
  404, a page the caller may not open a 403. Folder names are kebab-case.

#### 4. Internationalization

- **Paraglide-JS** with `url` and `baseLocale` strategy
- Source translations in `messages/` directory
- Use `$t()` function in components for translated strings
- Generate translations via Inlang CLI
- **The API speaks the locale of whoever asked.** `/api/graphql` has no locale in its path, so the browser client sends it in the `x-locale` header (`#lib/api/localeHeader.ts`) and `hooks.server.ts` runs the request in that locale (`#api/services/requestLocale.ts`). Every user-facing message a resolver builds (`GraphQLError`, mail text) is an `m.…()` message; never a literal. Mails are written in the recipient's stored `user.locale` (`localeOfUser`), rendered inside `runWithLocale`, so labels from `$lib/utils/enumTranslations` follow along; pass enums to the mail, not translated labels. Dates and numbers are formatted with `getLocale()`, never the browser's default. **Errors the client has to recognise carry a code**: throw them with `apiError(code, m.…())` (`#api/services/errors/apiError.ts`), never a bare `GraphQLError`, and read them with `hasErrorCode(err, code)` / `errorCodeOf(err)` (`$lib/api/errorCodes.ts`, which holds the closed `ERROR_CODES` list). Never branch on an error's message: it is translated text. `isNetworkError` likewise looks at urql's `networkError`, not at message words. `UNAUTHENTICATED` is handled once, for every operation, by `loginRedirectExchange` (`$lib/api/loginRedirect.ts`): it sends the browser to `/login?next=…` and back, so a resolver that needs a session just calls `mustBeLoggedIn()`.
- **German gender-inclusive language**: Use gender-neutral forms when possible (e.g., "Teilnehmende" instead of "Teilnehmer"). When neutral forms aren't available, use the gender-asterisk format (e.g., "der/die Teilnehmer\*in", "Delegationsleiter\*in").

#### 5. Database Patterns

- **Drizzle ORM** with PostgreSQL, using the relational API (`db.query.x.findMany({ where, with })`)
  and `defineRelations` in `src/api/db/relations.ts`. Columns are camelCase in TypeScript and
  snake_case in the database; `snakeCase.table` does the mapping.
- Row and insert shapes come from Drizzle itself (`typeof schema.conference.$inferSelect`,
  `typeof schema.conference.$inferInsert`, with `import type * as schema from '#api/db/schema/index.js'`)
  rather than from a generated client
- Models: `Conference`, `Delegation`, `Committee`, `DelegationMember`, `SingleParticipant`, etc.
- **A person's part in a conference is one `conferenceParticipant` row** (per user and conference),
  created by `ensureConferenceParticipant` the first time they register there - as delegate, single
  participant or supervisor - and kept while they take part. It holds what is about the person
  (payment, postal documents, attendance, access card); `delegationMember`, `singleParticipant` and
  `conferenceSupervisor` point at it (`conferenceParticipantId`). **Supervision links people**
  (`supervision`: supervisor → `conferenceParticipant`), so it survives whatever happens to the
  registration; `delegationMember.supervisors`, `singleParticipant.supervisors` and
  `conferenceSupervisor.supervisedDelegationMembers` / `supervisedSingleParticipants` read it
  through the participant row. A rule that relates a supervisor to someone goes through these
  relations, never through `user`, which would match the person's part in another conference.
- **No row says which conference it is in twice.** Whatever is about a person in a conference
  points at their `conferenceParticipant`: delegation members, single participants, supervisors,
  paper authors (`paper.authorParticipantId`), payers (`paymentTransaction.payerParticipantId`), the
  people a payment covers and survey answers. None of these rows has its own `conferenceId` or
  `userId`; the relations `user` and `conference` on them run through the participant row (or the
  delegation, for papers), so filter with `conference: { id: { eq } }` / `user: { id: { eq } }`
  in the client and `participant: { conferenceId, userId }` in server code. Team-side actors
  (reviewer, scanner, inviter, search history) stay plain `user` references: a system admin acts
  without a team row. The team and the waiting list have no participant row. Removing someone's
  participation keeps their participant row while papers or payments name it.
- **The database keeps rows inside one conference.** A row whose parents reach a conference by two
  ways (a member: delegation and person; a paper: delegation, author and agenda item; an answer:
  question and person; …) must reach the same one: deferred constraint triggers check it at
  commit (`assert_same_conference`, 18 tables, in the `conference_anchor` migration), so an
  application step may write in any order within its transaction. A `conference_id` a row keeps
  cannot change (`conference_id_is_immutable`); rewriting the same value passes. A row that
  reaches its conference through a link of its own and is named by other rows (a track's day, a
  survey option's question, an agenda item's committee, a single participant's, supervisor's or
  payment's participant row) may change that link within the conference, never out of it
  (`reached_conference_is_immutable`, in the `conference_reach_unchanged` migration), or it would
  carry the rows naming it along past their checks. None of this is
  drizzle-managed: a new table with two such parents gets its trigger in its migration, as does a
  new link of that kind, and `db:push` creates none. `e2e/authorization/same-conference.spec.ts` pins them down.
- **A person takes part in a conference in one way only**: delegation member, single participant,
  supervisor or team. The flows refuse a second part up front (`fetchParticipationsAndTeamMembership`,
  `#api/services/registration/participation.ts`, the team invitations included), and deferred
  constraint triggers (`assert_one_part`, in the `one_part_per_conference` migration) refuse it at
  commit, under an advisory lock so two concurrent registrations cannot both pass. A step swapping
  one part for another does both writes in one transaction. `e2e/authorization/one-part.spec.ts`.
- **Calendar entries can be for some survey choices only**: `calendarEntry.surveyOptions`
  (`calendar_entry_to_survey_option`) limits an entry to those who picked any one of them (and the
  conference's team); without any it is for everybody. An option an entry names cannot be deleted
  (`restrict`), since that would widen the entry's audience. The `read` rules in `calendarEntryPermissions.ts` do it, so every calendar query
  follows. **Survey options fill under a row lock** (`surveyAnswerService.ts`): a participant is
  refused a full option, and `distributeUnansweredSurvey` hands everyone seated who has not answered
  the least full option with room (`surveyDistribution.ts`).
- **Scanner sessions can expect a survey choice the same way**: a checking session (not one that
  only records) names survey options (`attendance_session_to_survey_option`, set when it starts),
  and `scanLookup`, given the session, answers the titles when the scanned person picked none of
  them; the scanner shows that as an open point (`surveyOptionMissing`). The titles come with the
  lookup because only participant care reads the survey itself.
- Supervisor connection codes are unique across all conferences.
- Conference state machine: `PRE` → `PARTICIPANT_REGISTRATION` → `PREPARATION` → `ACTIVE` → `POST`
- Payment tracking via `PaymentTransaction` model
- Paper submission system with versioning and reviews
- **Seats from the waiting list are dated**: seating a user who has a waiting list entry
  (`markSeatedFromWaitingList`, called by `createAppliedDelegationMember` /
  `createAppliedSingleParticipant`) sets the entry's `assigned` and `assignedAt` and hands its
  school to the new registration. The participants table shows waiting people as `WAITING_LIST`
  rows and everybody's `waitingListSince` / `seatedFromWaitingListAt`.
- **The team places the generated parts on its own templates.** `#lib/helpers/documentLayout.ts`
  declares, per document (`certificate`, `contract`, `guardianConsent`, `mediaConsent`), the
  elements the generator draws - texts (a point and a font size), boxes and square codes - with
  defaults where they always were. Positions are fractions of the page from the top left, stored
  per document in `conference.documentLayouts` (members-only like the templates; written through
  `setDocumentLayout`, conference content roles), and each element falls back to its default on its
  own. `pdfGenerator.ts` draws from the resolved layout; the document settings open
  `DocumentLayoutEditor.svelte` for any of them: pdf.js (`pdfjs-dist`, loaded on demand) draws the
  template's first page, the elements are dragged and resized on it, and the test print uses the
  unsaved layout. A new placed field is an element in `DOCUMENT_ELEMENTS` plus a label and sample in
  `team/configuration/sections/layoutElements.ts`. Certificates get no fold marks; letters keep them.
- **Certificates list the check-in sessions the holder was at**: `getCertificateJWT` returns the
  conference's scanner occasions the holder was scanned at (`certificateSessions`, merged by name)
  and signs them into the optional `a` claim, so the PDF and `/validateCertificate` show the same
  list. A certificate never mentions an occasion someone missed; claims of earlier certificates
  that still list those (with 0) are read without them (`sessionsFromClaim`). Participant care takes an occasion off the
  certificates on the scanner page (`attendanceSession.showOnCertificate`, set for every session of
  the occasion by `setAttendanceOccasionOnCertificate`; a new session inherits its occasion's
  setting).

#### 6. Assignment

- **A role is one row of `conference_role`**: a nation, a non-state actor or a custom role for
  single participants (`kind`). Everything naming a role - `delegation.assignedRoleId`,
  `singleParticipant.assignedRoleId`, `roleApplication.roleId`, the single participants' wishes,
  the draft's `roleId`s - is one foreign key to it, which also ties the role to its conference.
  Nations are global reference data; a conference offers one while a committee seats it
  (`committee_to_role`), and `setCommitteeNationSeat` keeps the nation's role row with its seats.
  A nation row carries only `nationAlpha3Code`; `#lib/helpers/conferenceRole` counts a role's seats
  (`roleSeats`) and splits a selected role into its nation or non-state actor (`splitRole`).

- **Draft, apply, release - three separate things.** The team plans in draft tables
  (`assignmentReview`, `assignmentUnit` + `assignmentUnitMember`, `assignmentSingleRole`,
  `assignmentWeights`) that hold only _changes_ on top of the live registrations: a delegation
  without a unit keeps what it has; a unit without members is "this whole delegation gets that
  role"; units with members are the parts of a split; a unit with a `sourceSingleParticipantId`
  turns a single participant into a delegation. Every row cascades with the registration it points
  at, so withdrawn applications drop out on their own.
- **One pure model, used on both sides.** `#lib/assignment/state.ts` turns live rows + draft into
  `AssignmentGroup`s, `applyPlan.ts` works out what applying does (merges, splits, new and
  dissolved delegations, the errors that block it), `autoAssign.ts` is the Hungarian matching
  (only roles with _exactly_ as many free seats as the group has members). The board in
  `team/assignment/` and `applyAssignment` (`src/api/handlers/assignment/assignmentDraft.ts`) both go
  through them, so the preview is what gets written. Applying moves `delegationMember` rows instead
  of re-creating them and clears the draft (ratings and weights stay); supervision and statuses
  hang on the person's `conferenceParticipant`, so they survive either way.
- **The tabs never read a whole conference, and the backend does the sorting.** A conference can
  hold more applications than a list query returns (1000). `team/assignment/board.ts` reads
  the draft with the applications it touches (each unit and planned single role brings its source
  row and review), the applications that hold a role (`fetchSeatedApplications`), and joins them
  with `seatedFrom`: enough for the roles, the seat counts and the plan of applying. Nothing is
  asked for by the draft's ids, so a move arrives as one live update; a query keyed by them kept
  the page's update pending after every move, and a second move in that window left a card
  stranded in the pool. The delegation pool is asked for exactly as shown: filtered by
  `delegation.memberCount` (kept by a trigger on `delegation_member`), the role and the exclusion,
  and a search, in tiers (`tieredPage`): pinned (required) ones first, then the rated ones, each by
  rating (read through `assignmentReviews`), then the rest by id, a page
  at a time (`PoolPages`, loaded imperatively; `PoolList` asks for the next page as it scrolls).
  The size tabs come from per-size `delegationsCount`s that ignore the draft
  (`poolCountsBesidesDraft` takes the touched delegations out). Pages are copied out of the query
  results once and never re-read.
- **Required applications.** The sighting marks an application as one that must get a seat
  (`assignmentReview.required`, never together with `disqualified`). The automatic distribution
  (`autoAssign` / `autoAssignSingles`) seats it before everyone else whenever a role fits
  (`boostRequired`: a row bonus larger than the rest of the matrix can differ, so its choice of
  role still follows its wishes). The summary checks every required application of the conference,
  not only those on the board (`requiredWithoutSeat`, `#lib/assignment/seatChecks.ts`), and warns
  on the page and in the apply dialog; it also warns when applying would leave no seat free
  (`seatOccupancy`), since a few free seats are what the waiting list fills later. Both only warn.
- **The board keeps its size and filter out of SvelteKit's navigation.** `delegations/+page.svelte`
  holds them as state and mirrors them into the URL with a shallow `goto` on the next task: a
  navigation or a `page` write landing while the board's async loads are pending trips Svelte's
  "Batch has scheduled effects" invariant (5.57.1).
- **Release is only visibility.** `conference.assignmentReleased` decides whether participants
  and supervisors see roles. `setAssignmentReleased` sets it, from the release card on the
  assignment's finish tab (`ReleaseDialog.svelte`). Releasing with `sendEmails: true` switches the
  result mails (`ASSIGNMENT_RESULT_KINDS`) on and sweeps; `false` marks those due right now as
  skipped (computed as if released, before the flag is written, so no sweep sends them first);
  either needs `assertCanManageEmails` too. Until then their read rules mask the delegation's and the single
  participant's `assignedRoleId` and the member's `assignedCommitteeId`
  (`src/api/services/authHelper.ts`, two rules per participant-side ability:
  `maskedUntilRelease` and `onceReleased`). Nothing but those rules is needed: rumble ≥ 0.26
  follows the masks. A relation backed by a masked key (`assignedRole`, `assignedCommittee`, …)
  resolves to nothing, the relations pointing back (`conferenceRole.assignedDelegations`,
  `committee.delegationMembers`, …) list only rows exposing their key, and `where` / `orderBy`
  arguments only match rows exposing the column they name - so a participant cannot find a role
  by filtering or sorting either. Do not hand-write any of this in a handler. The dashboard shows
  `AssignmentPending` instead of a rejection, and the mail sync keeps role lists back. Anything new
  that reveals a role to participants has to respect the flag; `e2e/authorization/assignment-release.spec.ts`
  checks the known paths.

#### 7. Possible duplicate accounts

- **Why:** someone with a care note (`user.globalNotes`) who signs up again with a new account
  would shed it. The plausibility page lists accounts that may belong to the same person as an
  account from before, for participant care to decide (`OPEN` / `CONFIRMED` / `DISMISSED`).
- **Matching** is pure, in `#api/handlers/possibleDuplicate/duplicateMatching.ts`: names are transliterated to Latin
  letters (`any-ascii`, any script) and compared per part with Jaro-Winkler; birthday, email local
  part, phone, emergency numbers and address add weights, none of them enough alone. Only accounts
  sharing a blocking key are compared. `possibleDuplicates.ts` loads the accounts and stores the
  pairs: the pool is everyone who attended a conference that is over or has a care note; a
  conference scan (button on the page) and every profile change (`updateUser`,
  `updateUsersIdentityInfo`) compare against it, a chunk at a time so the event loop keeps
  turning. A re-scan refreshes scores but never a decision.
- **Visibility:** the pair is readable by whoever manages one of its accounts; a user read rule
  lets participant care read the _other_ account's identity and care notes (no contact details)
  while the pair is open or confirmed; once it is dismissed the name stays (the page lists dismissed pairs, so a dismissal can be undone) and the notes are withheld. `e2e/authorization/possible-duplicates.spec.ts` pins it
  down.
- **Confirmed means the notes follow the person.** The user card shows the care notes of accounts
  confirmed to be the same person (`LinkedAccountNotes`), and the sighting's red warning counts them
  with the person's own (`careNotesOf` in `#lib/helpers/linkedNotes.js`; select
  `confirmedLinkedAccounts` wherever a note is shown). An open pair is only a suspicion and carries
  nothing over.
- **The dev seed replays the ways a returning person's data can differ**
  (`seed-dev/duplicateScenarios.ts`, one scenario per case): spelling, umlauts, name order, a
  dropped second given name, typos, another script, an email variant, a nickname with a reformatted
  phone, the parents' number, a new family name in the same household, and the limits - what is not
  found (a new name and address with only the parents' number kept), siblings, a shared birthday,
  a common name - plus every decision state (open, confirmed, dismissed, and pairs gone stale after
  a profile correction), an account with three generations, a note-only earlier account (waiting
  list), and a returning supervisor. The stored pairs are what the matcher finds for the scenario
  accounts, so `duplicates.test.ts` fails when the matcher and the seed drift apart. The earlier
  accounts took part in "Seed 8 · Post" or in "Seed 10 · Other organizers", where no dev team
  member is on the team: there participant care reads them only through the pair. The new ones
  are in "Seed 2" - sign in as `dev-team-care` and open its plausibility page.

#### 8. Schools

- **A school is one row of `school`, shared by every conference** (`schema/schools.ts`), and
  **only people have one**: a person's own school in a conference is
  `conferenceParticipant.schoolId`; someone on the waiting list, who has no participant row yet,
  has `waitingListEntry.schoolId` (both `schoolRef()`, `set null` on delete). Delegations, single
  participants and supervisors keep no school. Every mutation that sets one takes the pair
  `schoolId` / `schoolName` (`SchoolChoice`): an existing school, or a name that
  `resolveSchoolChoice` (`#api/handlers/school/schoolService.ts`) finds (ignoring case and
  spacing) or creates. Both left out keeps the school, both `null` removes it - **a school is
  always optional**, so `applicationTextsComplete` does not ask for one.
- **Where it is set:** applying stores the school the applicant names on their participant row
  (`createDelegation`, `createSingleParticipant`, `createConferenceSupervisor`); joining a
  delegation (`createDelegationMember`) takes the newcomer's own, which the join form fills in
  with the head delegate's (`previewDelegation.headDelegateSchoolId`). Seating someone from the
  waiting list carries the entry's school over. Afterwards `setParticipantSchool` changes it:
  without an `id` the caller's own (`MySchool.svelte` on the dashboard stages, apart from the
  application texts: every member of a delegation names theirs), with one participant care
  correcting anyone's (`ParticipantSchoolSection` in the user card). The assignment never
  changes it: a delegation merged from several schools keeps each person's.
- **Reading it:** `conferenceParticipant.school`, and for whoever can read a registration
  `delegationMember.school`, `singleParticipant.school` and `conferenceSupervisor.school`, read
  relations through the participant row (only participant care reads participant rows
  themselves). A delegation's schools are its members': `delegationSchoolsLabel` /
  `distinctSchoolNames` (`#lib/helpers/delegationSchools.ts`), most common first.
- **Visibility:** everybody reads a school's name and place (applicants pick from
  `searchSchools`); address, contact and the team's `notes` are masked except for participant
  care and project management of a conference where someone has it as their own (or waits with
  it), who also edit it (`updateSchool`) and merge duplicates (`mergeSchools`, which repoints the
  participant rows and waiting list entries of all conferences and deletes the sources).
  `conferenceSchools` (the team's schools page) and `schoolMetrics` (per conference: registered,
  applied, seated, attended, from the waiting list) are participant care's.
- **Seat limit per school:** `conference.maxSeatsPerSchool` (default 16, null for none). The
  assignment board counts the seats its plan gives each school - per person, by their own school
  (`schoolSeats` / `schoolsOfGroup` with `schoolLookupsOf`; someone without a school counts for
  none) - and warns past the limit; it never blocks. `schoolMetrics`, the schools page and the
  statistics (`statistics_schools`, delegation members and single participants per school) count
  people too.
- The cleanup page's duplicate analysis (`schoolSuggestion`) groups the schools of the people in a
  conference's applications; a suggestion's variants point at schools, and merging goes through
  `mergeSchools`. The sighting's school filter matches an application when any of its people has
  that school.

#### 9. Automatic emails

- **Every mail follows from state, not from an event.** `dueEmails` (`#api/handlers/email/`) is
  pure: given a conference snapshot (`loadEmailSnapshot`) and the time, it lists every mail the
  conference owes - acceptances and rejections once the assignment is released, seats from the
  waiting list, postal/payment unlocked, received or with a problem, the reminders before the
  application deadline and the conference, a reminder to everyone seated who has not answered a
  published survey before its deadline (`SURVEY_REMINDER`, keyed by survey and deadline, so a
  moved deadline reminds again), certificates, students linked to a supervisor, and
  each review of a paper to its author (`PAPER_REVIEWED`, keyed by the review, replies to the
  reviewer). The rules (who gets what, the reminder windows in `#lib/helpers/emailKinds.ts`) are unit tested
  there; the e-mail page explains them in the same words.
- **`emailLog` makes each mail happen once.** The sweep (`emailSweep.ts`) claims a mail by writing
  its row, unique per conference, kind, person and `subjectKey`, before sending, so concurrent
  sweeps and instances never double-send; failures are retried three times, a claim left by a dead
  process frees up after 15 minutes. Every row (sent, failed, skipped) is shown in the log.
- **Per conference and kind, off by default** (`conferenceEmailSetting`), on the "E-Mails" tab of
  the conference settings (`team/configuration/emails/`, participant care: `canManageEmails`). The
  switches wait for the settings' save button (`emailChanges.svelte.ts`) and show up in its change
  preview next to the form's fields; confirming saves them through their own mutations. Switching a kind on asks whether
  the people it already applies to get it on saving (`notifyExisting`) or are marked `SKIPPED`.
- **The texts are the conference's to change** (`conferenceEmailText`, unique per conference, kind
  and locale, since a mail goes out in the recipient's language). A text is a subject, a heading
  and a body with `{placeholders}`; `#lib/helpers/emailTemplates.ts` holds the defaults (built
  from the `emailAuto…` messages), which placeholders each kind offers, and `fillEmailText`, which
  the API and the editor share. Only changed fields are stored: an empty one falls back to the
  default, and a field saved unchanged is stored as none so it follows when the default improves.
  The greeting and the button stay fixed; `{list}` alone in a paragraph places a kind's list.
  `emailPreview` renders a draft (`draft: true`) in any locale, which is the editor's preview.
- **One footer under every mail** (`conferenceEmailFooter`, per conference and locale,
  `setConferenceEmailFooter`): paragraphs with `{conference}` (`emailFooterParagraphs`), drawn by
  `EmailLayout` above the fixed small print in the automatic and the team mails alike. A language
  without one gets none; `emailPreview` takes a draft `footer`, which is the footer editor's preview.
- **The team's own mails share the texts, not the switches.** The invitation into the team and the
  welcome for an existing account (`TEAM_INVITATION`, `TEAM_WELCOME`, `ALWAYS_SENT_KINDS` in
  `#lib/helpers/emailKinds.ts`) are sent where they happen (`sendTeamInvitationEmail.ts`) and always
  go out; the page lists them without a switch so their text can be changed like any other, and
  `setConferenceEmailEnabled` refuses them. `dueEmails` never owes them, nor are they logged.
- **Two triggers, one path:** the mutations that change what is due (release, applying the draft,
  conference settings, participant statuses, seating someone, a supervisor link, a paper review) call
  `scheduleEmailSweep` (in the background, one at a time per conference); the `send-emails` job
  calls `/api/jobs/send-emails` with `x-jobs-secret: JOBS_SECRET` every few minutes for the reminders
  and anything missed. The app renders the mails (one template, `NotificationEmail.svelte` on
  `#api/services/email/templates/EmailLayout.svelte`, DMUN's corporate design from `brand.ts`; values per kind in
  `emailContent.ts`) in the recipient's locale; links use the origin of the request that
  triggered the sweep.

#### 10. Background Tasks and Jobs

- **Jobs** (`src/jobs/`) are one-shot commands of the `delegator-jobs` CLI (citty), run by a
  scheduler outside the app (a cron job, a Dokploy schedule); nothing inside the app runs on a
  timer. A new job is a file with a `run…` function and a sub-command in `cli.ts` that imports it
  when it runs. Schedule:
  - `refresh-statistics` - every few minutes. The app only reads the views; without the job they
    go stale (`bun run db:seed:dev` refreshes them once).
  - `mail-sync` - every 15 minutes; needs `LISTMONK_API_URL`, `LISTMONK_API_USER`,
    `LISTMONK_API_KEY`
  - `invitation-cleanup` - daily; `--retention-days` (30), `--dry-run`
  - `file-cleanup` - daily; deletes unused uploads and orphaned objects; `--grace-hours` (24),
    `--dry-run`; needs the `S3_*` variables
  - `send-emails` - every few minutes; asks the app to send the automatic mails that are due (it
    renders them). Needs `APP_URL` and `JOBS_SECRET` (the same as the app's)

### Path Aliases

SvelteKit 3 has no `svelte.config.js`: its options are the `sveltekit()` plugin's, in
`vite.config.ts`. There are no aliases (SvelteKit 3 deprecates the plugin's `alias`): `#lib`,
`#api` and `#assets` are subpath imports (`imports` in `package.json`), written with the file
extension (`#lib/helpers/formatNames.js`, `#api/db/db.js`; a directory as `…/index.js`):

```
#lib → src/lib
#api → src/api
#assets → src/assets
```

### Important Integrations

- **PDF Generation**: `pdf-lib` with custom fonts for certificates
- **Barcode/QR**: `@bwip-js/browser`, `@svelte-put/qr`, `barcode-detector`
- **Rich Text Editor**: TipTap for committee agenda items
- **Maps**: Leaflet via `sveaflet` for delegation locations
- **External APIs**: Listmonk email service integration in `src/jobs/apis/`
- **File storage**: an S3 bucket through `s3mini` (`#api/handlers/storedFile/storageClient.ts`)

### UI Component Patterns

See **[CLAUDE-UI.md](./CLAUDE-UI.md)** for comprehensive UI design documentation including:

- Form components and `FormFieldset` grouping patterns
- Modal and Drawer usage
- Dashboard section layouts
- ManagedTable configuration
- Navigation components (Tabs, NavMenu)
- Status indicators and badges
- Color theming and icons
- Code examples for common patterns

**Quick reference**:

- **Forms**: Always wrap related inputs with `FormFieldset` for visual grouping
- **Modals**: Use `Modal` component with `action` snippet for footer buttons
- **Layout**: Use DaisyUI classes; prefer `bg-base-*` and semantic colors
- **Icons**: Use FontAwesome Sharp Duotone (`fa-sharp-duotone fa-solid fa-icon-name`), never with custom `--fa-*` colors
- **URL State**: Use `sveltekit-search-params` for URL-persisted state (v4: `queryParameters()` returns a
  reactive object - read and assign `params.x`, no `$` store syntax)

**Maintenance**: When creating new UI components, significantly modifying existing ones (props, usage patterns), or deprecating components, update CLAUDE-UI.md accordingly. Keep documentation in sync with the actual component implementations.

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `style:` - UI/styling changes
- `refactor:` - Code restructuring without behavior change
- `perf:` - Performance improvements
- `docs:` - Documentation updates
- `test:` - Test updates
- `chore:` - Maintenance tasks
- `build:` - Build system changes
- `ci:` - CI/CD changes

Format: `<type> (<scope>): <description>` (e.g., `feat (Frontend): implement login modal`)

## Testing Strategy

- **Vitest** with jsdom environment
- Test files: `src/tests/` directory
- Coverage provider: v8
- Run tests before pushing (enforced by lefthook pre-push hook)
- **Never run the e2e suite (`bun run test:e2e`, `playwright test`, `test:e2e:coverage`) unless
  explicitly asked to.** It takes a long time; verify changes with `bun run check` and `bun test`.
  When asked, it runs against a production build at the lowest CPU priority by default; see
  `e2e/README.md` for `E2E_SERVER`, `E2E_WORKERS` and `E2E_NICE`.

## Environment Variables

Required variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET` - Session encryption secret
- `NODE_ENV` - Environment (development/production/test)
- `PUBLIC_OIDC_AUTHORITY` - OIDC provider URL
- `PUBLIC_OIDC_CLIENT_ID` - OAuth client ID
- `OIDC_SCOPES` - OAuth scopes (must include `openid`)
- `OIDC_ROLE_CLAIM` - JWT claim for roles
- `CERTIFICATE_SECRET` - Secret for signing participation certificates
- `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` - The file bucket (the endpoint names
  it); `S3_PUBLIC_ENDPOINT` when browsers reach it under another URL, `S3_REGION` (us-east-1)
- OpenTelemetry vars (optional): `OTEL_ENDPOINT_URL`, `OTEL_SERVICE_NAME`

## Common Workflows

### Adding a New GraphQL Handler

1. Create `src/api/handlers/<entity>/` with `<entity>.ts` (GraphQL layer),
   `<entity>Permissions.ts` (`register<Entity>Abilities()` plus the `assertCan…` checks, built from
   `authHelper.ts`) and, when there is logic beyond the resolvers, `<entity>Service.ts` (no
   permission checks)
2. Import `<entity>.ts` in `src/api/handlers/register.ts`
3. Call `register<Entity>Abilities()` at the top of `<entity>.ts`
4. Restart the dev server: it rebuilds the schema and regenerates
   `src/lib/api/rumbleClient/`

### Adding a Frontend Feature

1. Create/modify components in `src/lib/components/`
2. Fetch in the component with `$derived(await client.liveQuery.…)`; do not add a `load` function
   (see "Frontend Data Fetching" for the four cases where one is still right)
3. Add translations to `messages/` directory

### Database Schema Changes

1. Edit the matching file in `src/api/db/schema/` (a new table goes into the file of its part of
   the app, and into the exports of `schema/index.ts`), and `src/api/db/relations.ts` if the
   change adds or removes a relation
2. Run `bun run db:generate` to write the migration, then `bun run db:migrate` to apply it
3. Restart the dev server so the schema and the generated client pick the change up
4. Update `src/api/db/seed-data/` if a new column is required
5. Test with `bun run db:nuke && bun run db:seed:dev`

### Adding a Background Job

1. Create the job in `src/jobs/` with a `run…` function that uses `./db`
2. Add a sub-command to `src/jobs/cli.ts` that imports it when it runs
3. Schedule `delegator-jobs <command>` in whatever runs the image

## Git Hooks (Lefthook)

**Pre-commit**: Auto-format staged files with Prettier, then run `fallow audit` on the working tree
**Pre-push**: Run tests, lint and format-check pushed files, and run `fallow audit` against the branch base

The pre-commit fallow step is a gate: it fails the commit when the commit introduces new fallow findings (findings already present in touched files don't count). The pre-push fallow step is advisory: it uses `--brief`, which renders the findings but always exits 0, mirroring the deliberately non-blocking fallow job in CI. To gate pushes too, drop `--brief` from the pre-push command in `lefthook.yml`.

## Performance Notes

- **Postgres JIT is off** for the app's connections (`-c jit=off` in `src/api/db/db.ts`). rumble's
  ability and mask SQL is costed far above `jit_above_cost`, and compiling it took seconds per
  statement (a delegation card: 6.3 s of 6.7 s).
- **The sighting turns cards in the browser.** `sighting/deckWindow.svelte.ts` holds a window of
  the backend's deck and moves through it without asking; the backend is asked in the background
  (near the window's edge, after a review) and waited for only on a jump outside it. The next cards
  and their reviews are read ahead one at a time (`prefetchCards`), and reviews show optimistically
  (`savedReviews.svelte.ts`).

- Svelte 5 runes mode enabled - use `$state`, `$derived`, `$effect` instead of legacy stores
- `compilerOptions.experimental.async` is on, so components may `await` at the top level of
  `<script>`
- OpenTelemetry tracing for performance monitoring
- Image optimization: Use WebP format, lazy load images
- Install dependencies always into the devDependencies section as is best practice for sveltekit projects if not explicitly required at runtime.

## Security Considerations

- OIDC authentication required for all routes in `(authenticated)/`
- rumble ability filters on all GraphQL queries and mutations
- Certificate signatures use HMAC-SHA256
- Environment secrets must never be committed
- Drizzle parameterized queries prevent SQL injection
- GraphQL complexity limits prevent DoS attacks
- **Lookups by code are rate-limited per account.** A delegation's entry code and a supervisor's
  connection code are the only check on `previewDelegation`, `createDelegationMember`,
  `previewConferenceSupervisor` and `connectToConferenceSupervisor`, so each wraps its lookup in
  `codeGuessLimiter.attempt` (`#api/services/codeGuessLimit.ts`): a lookup throws `codeNotFound()`
  for a wrong code, and ten of those in ten minutes answer `TOO_MANY_ATTEMPTS`. The counters live
  in Redis keys that expire (or a pruned in-memory map), never in the database. New codes are 8
  letters (`#lib/helpers/entryCode.ts`); older 6-letter codes still work, and code fields use
  `createEntryCodeInput` so a 6-letter prefix of a new code is not looked up mid-typing.

## Type Safety (CRITICAL)

This codebase supports **100% end-to-end type safety** from database to frontend. The type system is your primary defense against bugs—use it properly.

### Rules

1. **NEVER use `any`** - The `any` type defeats the purpose of TypeScript. Only use it when absolutely unavoidable (e.g., third-party library limitations), and always add a comment explaining why.

2. **NEVER use type casting (`as Type`)** - Type assertions bypass the compiler's checks. If you feel the need to cast, it indicates a type definition problem that should be fixed at the source.

3. **Trust the generated types** - drizzle and the generated rumble client are accurate. If types don't match your expectations, investigate why rather than casting.

4. **Fix type errors at the source** - When encountering type mismatches:
   - Check if the selection or the handler's args need updating
   - Verify `src/api/db/schema/` is correct
   - Ensure the client has been regenerated (restart `bun run dev`)
   - Never silence errors with `as any` or `@ts-ignore`

5. **Use type narrowing** - Prefer type guards, discriminated unions, and proper null checks over assertions.

### Why This Matters

- **Drizzle** infers row and insert types from `src/api/db/schema/`
- **rumble** builds the GraphQL schema from those tables, and its abilities are drizzle filters, so
  authorization is type-checked too
- **`clientCreator`** generates the frontend client from the live schema, so a selection that asks
  for a field the API does not have fails to compile
- This chain provides compile-time guarantees that data flows correctly through the entire stack

### Exceptions (Rare)

If `any` or casting is truly unavoidable, you MUST:

1. Add a `// TYPE-SAFETY-EXCEPTION:` comment explaining why
2. Keep the scope as narrow as possible
3. Consider opening an issue to fix it properly later

## Functions Only

This codebase has no classes, except error classes. State and behavior live in functions: a
`createX(...)` factory returning an object of methods and getters, with private state in the
closure (`$state` works inside a factory in a `.svelte.ts` file). Export the type as
`ReturnType<typeof createX>` and share behavior by composition, not inheritance.

## MCP Servers

This project uses Model Context Protocol (MCP) servers to enhance AI-assisted development. Configuration is in `.mcp.json`.

### Configured Servers

| Server                  | Package/URL                                        | Purpose                                                    |
| ----------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| **svelte**              | `@sveltejs/mcp`                                    | Official Svelte 5 documentation, code validation and fixes |
| **daisyui-github**      | `gitmcp.io/saadeghi/daisyui`                       | DaisyUI component library documentation                    |
| **tailwind-github**     | `gitmcp.io/tailwindlabs/tailwindcss`               | TailwindCSS documentation                                  |
| **github**              | `@anthropic-ai/github-mcp-server`                  | GitHub PRs, issues, code search, workflow management       |
| **vitest**              | `@djankies/vitest-mcp`                             | Test running with structured output, coverage analysis     |
| **context7**            | `@upstash/context7-mcp`                            | Up-to-date documentation for any library                   |
| **memory**              | `@modelcontextprotocol/server-memory`              | Persistent knowledge graph across sessions                 |
| **sequential-thinking** | `@modelcontextprotocol/server-sequential-thinking` | Complex problem-solving through structured thinking        |
| **drizzle-github**      | `gitmcp.io/drizzle-team/drizzle-orm`               | Drizzle ORM documentation                                  |
| **rumble-github**       | `gitmcp.io/m1212e/rumble`                          | rumble source, the API layer this app is built on          |
| **fallow**              | `fallow-mcp` (local devDependency)                 | Dead code, cycles, duplication and complexity analysis     |

### Setup Requirements

**GitHub MCP Server**: Requires a GitHub Personal Access Token. Replace `<YOUR_TOKEN>` in `.mcp.json` with your token, or set the `GITHUB_PERSONAL_ACCESS_TOKEN` environment variable.

**Context7**: Optionally get a free API key at [context7.com/dashboard](https://context7.com/dashboard) for higher rate limits.

### Usage Tips

- Use `use context7` in prompts to fetch current documentation for any library
- The Svelte MCP server validates Svelte 5 code and suggests fixes
- rumble has no published docs, so read its source through the MCP server when its behavior is
  unclear
- Vitest MCP provides structured test output optimized for AI analysis
- Memory MCP remembers context across conversation sessions

## Dependency Notes

Some versions are held back or wired up on purpose. Check here before "updating to latest":

- **drizzle-orm / drizzle-kit / drizzle-seed track the `1.0.0-rc.5` builds, not npm's `latest`**,
  which is the 0.x line without the relational API v2 this app is built on. They are pinned to
  `1.0.0-rc.5-5935859`: the tagged `1.0.0-rc.5` release breaks the row type Pothos hands to every
  `adjust` resolver (`object({ adjust })`), which silently becomes an index signature of `any`;
  check `src/api/handlers/storedFile/storedFile.ts` type-checks before moving on. After any drizzle bump,
  regenerate the client and check `git diff src/lib/api/rumbleClient` for `| null` creeping into
  relations: newer builds wrap relation columns in a `RelationsBuilderColumn`, which our rumble patch
  unwraps.
- **graphql is on 17.** `@escape.tech/graphql-armor` still pins 16 and keeps a nested copy; that is
  fine because armor only parses and walks documents (verified: depth and alias limits still reject
  over-limit queries on a production build). Anything else that brings its own graphql copy would
  not be - schema building fails every `instanceof` check across two copies.
- **TypeScript is installed twice.** svelte-check and SvelteKit 3 need TypeScript 6 (`typescript`);
  `tsc` itself is TypeScript 7, aliased as `@typescript/native`, and is what `bun run typecheck` runs.
- **OpenTelemetry 3** has no `sdk-trace-node`: `src/instrumentation.server.ts` builds a
  `TracerProvider` from `@opentelemetry/sdk-trace` and registers the async-hooks context manager
  and the W3C propagators itself, which `NodeTracerProvider.register()` used to do.
- **adapter-node 6 ignores `ORIGIN`.** Behind a TLS-terminating proxy, set `PROTOCOL_HEADER` and
  `HOST_HEADER` (see `.env.example`), or request URLs - and the links in the automatic emails - come
  out as `http://` on the internal host.
- **Sentry**: `dataCollection` is derived from `*_SENTRY_SEND_DEFAULT_PII` in
  `#lib/sentryDataCollection.ts` (Sentry 11 collects everything by default), and the Vite plugin
  runs with `buildTimeInstrumentation: false` - tracing is off, and that instrumentation inlines
  graphql into the server bundle, breaking rumble's client generator during `vite build`.
- **Emails** import from `@better-svelte-email/components` and `@better-svelte-email/server`, not
  the `better-svelte-email` umbrella, whose root re-exports a preview module with raw `.svelte`
  files that Node cannot load during SSR.
- **rumble is not patched.** The live-query timing, nested `autoIncludeIdField`, relation
  nullability, correlated column-mask flags, the generator's write-if-changed and the mask-aware
  filter arguments ("Release is only visibility") landed upstream in 0.26.0. Since 0.26.2 a live
  result's Svelte subscriber also skips the replay it is handed when it subscribes (the data the
  reader already shows), which, announced as an update while a page's first async work was
  pending, tripped Svelte's "Batch has scheduled effects" invariant. Keep rumble at ≥ 0.26.2.

- **@sveltejs/kit is patched** to log in `'gray'` instead of `'grey'`: Node 25 dropped the `grey`
  alias from `util.styleText`, which made every `vite build` fail at the adapter step. Drop the
  patch once SvelteKit ships the fix.

- **sveltekit-breadcrumbs is patched** to drop two leftover `console.log`s that dumped the route
  glob on every page render, in the browser and the server log alike.

## Development Workflow

- Never use the git commit command after a task is finished.

### PR Labels

When creating pull requests, always apply the appropriate `PR: *` label based on the conventional commit type in the PR title:

| Commit prefix              | Label                |
| -------------------------- | -------------------- |
| `feat` (new functionality) | `PR: Feature`        |
| `feat` (improve existing)  | `PR: Enhancement`    |
| `fix`                      | `PR: Bug`            |
| `perf`                     | `PR: Performance`    |
| `refactor`, `style`        | `PR: Refactor`       |
| `docs`                     | `documentation`      |
| `ci`, `build`, `chore`     | `PR: Infrastructure` |
| `deps`, `dependencies`     | `dependencies`       |
| `test`                     | `PR: Tests`          |

Every PR must have at least one of these labels before merging. This powers the auto-generated release notes.
