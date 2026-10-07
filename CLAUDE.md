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
bun run dev:docker    # Start Docker containers (PostgreSQL, etc.)
bun run dev:server    # Start Vite dev server only

# Install git hooks (lefthook)
bunx lefthook install
```

### Database Operations

```bash
# Write a migration for the current schema.ts
bun run db:generate

# Apply pending migrations
bun run db:migrate

# Push the schema without writing a migration (throwaway databases only)
bun run db:push

# Drop every table and enum (WARNING: deletes all data)
bun run db:reset

# Wipe and refill the dev database: every conference stage, persona accounts, crowd
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
# Production build
bun run build

# Preview production build
bun run preview
```

## Architecture

### Directory Structure

- **`src/routes/`** - SvelteKit routes (filesystem-based routing)
  - `(authenticated)/` - Protected routes requiring authentication
    - `dashboard/` - Conference dashboards
    - `management/` - Admin interfaces for conference/delegation management (the assignment
      lives in `management/assignment/`)
    - `registration/` - User registration flows
  - `api/graphql/` - GraphQL API endpoint
  - `auth/` - OIDC authentication callbacks
  - `seats/`, `vc/`, `validateCertificate/` - Public-facing pages

- **`src/api/`** - Backend GraphQL API layer
  - `handlers/` - One module per domain entity, each holding that entity's abilities, object
    reference, queries and mutations. `register.ts` imports them all and is the single place a
    new handler has to be listed.
  - `rumble.ts` - The rumble instance: schema builder, ability builder, yoga factory, and the
    dev-time generator for the typed frontend client.
  - `context.ts` - Request context (OIDC data plus `mustBeLoggedIn` / `hasRole`)
  - `db/` - `schema.ts` (tables), `relations.ts` (the relational API's graph), `db.ts` (client),
    `reset.ts`, `seedDev.ts` (scenarios in `seed-dev/`) and the faker factories under `seed-data/`
  - `graphql.remote.ts` - SvelteKit remote functions that execute the schema in-process, which
    is how server-side loads reach the API without an HTTP round trip
  - `services/` - Backend business logic services

- **`src/lib/`** - Shared frontend code
  - `api/client.ts` - The urql client and its exchanges
  - `api/rumbleClient/` - **Generated**, do not edit. Written by `clientCreator` whenever the dev
    server starts; the typed surface every query and mutation in the app goes through.
  - `components/` - Reusable Svelte components
  - `services/` - Frontend utility functions
  - `schemata/` - Zod validation schemas
  - `paraglide/` - Generated i18n code

- **`src/config/`** - Environment configuration
  - `public.ts` - Client-side config (PUBLIC\_\* env vars)
  - `private.ts` - Server-side config (secrets, DB URLs)

- **`src/tasks/`** - Background scheduled tasks (node-schedule)
  - `conferenceStatus.ts` - Auto-update conference states
  - `mailSync.ts` - Email synchronization with external systems

- **`drizzle/`** - Generated migration history. Never edited by hand; `db:generate` writes it.

### Key Architectural Patterns

#### 1. GraphQL API Layer (rumble)

- **Code-first**, one file per entity under `src/api/handlers/`. A handler declares, in this order:
  its abilities, its object reference, its queries, its mutations.

  ```ts
  abilityBuilder.committee.allow('read');
  abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);

  export const CommitteeRef = object({ table: 'committee' });
  query({ table: 'committee' }); // generates `committee(id)` and `committees(where, limit, …)`
  ```

- **Every mutation publishes.** A handler makes one pubsub instance per table it writes:

  ```ts
  const pubsub = rumblePubsub({ table: 'committee' });
  // …
  pubsub.updated(args.id); // or created() / removed()
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
    `isParticipantOfConference`, `isManagedUser`, …), wrapped with `where(...)`. A helper returns
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
    table (co-delegates read identity only; supervisors and the care team contact details;
    teammates the phone number; nobody but the care team the care notes), the conference (payment
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
  import { client } from '$lib/api/rumbleClient/client';

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
    `$lib/api/cacheKeys.ts`, and then that field has to be selected.
  - **Key a query by primitives, never by reading through another live result inside the same
    `$derived`.** Reading a field of a live result subscribes the reading `$derived` to that
    result's updates, so a `$derived` that also issues a query would issue it again on every update.
    Pull the id out first (`const delegationId = $derived(member.delegation.id)`) and query with
    that; likewise read fields of a fresh result in a second `$derived`, not in the one that awaited
    it. (rumble only announces updates whose data actually changed, which stops the resulting
    loops, but the extra queries are still waste.)
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
  (a `sveltekit-search-params` object).

- **Global state lives in `$lib/state/*.svelte.ts`**, chase's pattern. `getCurrentUser()` is the
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
  massaging, put that in a helper (`$lib/api/userFormValues.ts`) so two forms on the same table
  cannot drift.

- **Fields are [Formsnap](https://formsnap.dev) components underneath.** The `Form*` wrappers in
  `$lib/components/form/` own the styling and pass `name`/`label`/`description` through to
  Formsnap's `Field`/`Control`/`Label`/`Description`/`FieldErrors`, which generate the ids and wire
  `for`, `aria-describedby`, `aria-invalid` and the `aria-live` error region. Spread the `props`
  the `Control` snippet hands you onto the input and never set `id`/`name` by hand. A field
  component is generic over `N extends FormPath<A> & keyof A`, so a misspelled field name is a
  compile error; for a typed `bind:` (a boolean or a `Date`) reach for `formFieldProxy`, which is
  what keeps those bindings type-safe without a cast.
- **Uploads** go through `fileProxy` and are converted in the component with
  `$lib/helpers/fileToDataURL`; the columns store data URLs, and an untouched field must yield
  `undefined` so the stored value survives.
- **Regeneration** happens on dev server start, so a handler change is only visible to the
  frontend after a restart. `src/lib/api/rumbleClient/` is generated and committed; never edit it.
- **SSR** goes through `src/api/graphql.remote.ts`, which executes the schema in-process.
  `ssrExchange` in `src/lib/api/client.ts` routes there whenever `browser` is false, which is why
  server-side fetching works without the app being able to fetch its own relative URL. It has to
  stay a remote function: `client.ts` is shared with the browser, and only a remote import is
  stubbed out there. Needs `kit.experimental.remoteFunctions` in `svelte.config.js`.
- **Stored files are read through URLs, never selected as data.** Images and PDF templates still
  go in as data URLs (writes are unchanged), but every reader selects the matching `*Url` field
  (`logoUrl`, `contractContentUrl`, `sitePlanUrl`, `contentUrl` on a resolution, …) and gets
  `/files/<kind>/<id>/<field>?v=<updatedAt>`, which `src/routes/files/` serves as real bytes with an
  ETag. The route reads through GraphQL with the request's own context, so column masks decide who
  gets a template. A new stored file goes in `FILE_SOURCES` in `$api/services/files.ts` plus a URL
  field on its object. The one reader left on the data URL is the paper/resolution header's
  emblem, which the resolution editor and `/api/pdf` still take as a data URL.
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
  session on `event.locals.oidc`. There is no auth code in route loads.
- **Locally, the provider is [oidc-mock](https://github.com/strehk/oidc-mock)**, started by the
  `oidcMock()` plugin in `vite.config.ts` whenever `vite dev` runs - no container. Its users live
  in `oidc-mock.yaml` (edits apply on the next login), its login page is served on the app's own
  origin under `/oidc`, and `PUBLIC_OIDC_AUTHORITY` points at
  `http://127.0.0.1:8090/oidc/.well-known/openid-configuration`. The e2e suite signs in through the
  login page's custom-claims form.
- **Dev accounts and the dev seed belong together.** `src/api/db/seed-data/devAccounts.ts` lists
  every account on the login page; `bun run dev:accounts` writes them into `oidc-mock.yaml`
  (never edit its `users` by hand - `devAccounts.test.ts` fails on drift), and
  `bun run db:seed:dev` gives each one a user row (id = `sub`) and a part to play. Nine
  conferences cover the stages (`seed-dev/plans.ts`: pre, registration open / in its grace period
  / closed, preparation with everything and with nothing unlocked, active, post). The closed one
  carries an assignment draft in progress; the locked one has seats handed out but not released,
  so its participants see "assignment in progress". Team personas
  hold one team role everywhere; `[Registration]` personas cover the application steps;
  `[Participant]` personas keep one role (head delegate, minor, supervisor, rejected, …) across
  preparation, active and post, so one login tours the stages. The seed prints the conference ids,
  join codes and invitation links at the end. A new state the UI branches on gets a persona or a
  conference flag here, so it stays reachable with one click.
- **Login-time user upsert** lives in `src/api/services/upsertSelf.ts`, passed to the library as
  `userLoggedInSuccessfully`. It creates or refreshes the row, redeems a pending team-member
  invitation, and redirects to `/auth/email-conflict` or `/my-account` when it has to.
- **Impersonation is stalled** for this migration: the old implementation swapped session cookies
  the library now owns. `$lib/data/impersonation` holds the flag the UI is gated on, and the two
  mutations reject with an explanatory error.
- User context injected into the GraphQL context via `src/api/context.ts`, which reads
  `event.locals.oidc`
- **rumble abilities** define fine-grained permissions per entity:
  - Actions: `read`, `update`, `delete` (declared in `src/api/rumble.ts`); impersonation, when it
    is redesigned, brings its own
  - Each entity's abilities live at the top of its handler
- Team member roles: `Admin`, `PROJECT_MANAGEMENT`, `PARTICIPANT_CARE`, etc. `CONTENT_LEAD` only
  reaches the seat planning: `SEAT_PLANNING_ROLES` on the API, and in the UI the management guard
  (`$lib/helpers/managementAccess.ts`) keeps a content lead on that one page.

#### 4. Internationalization

- **Paraglide-JS** with `url` and `baseLocale` strategy
- Source translations in `messages/` directory
- Use `$t()` function in components for translated strings
- Generate translations via Inlang CLI
- **German gender-inclusive language**: Use gender-neutral forms when possible (e.g., "Teilnehmende" instead of "Teilnehmer"). When neutral forms aren't available, use the gender-asterisk format (e.g., "der/die Teilnehmer\*in", "Delegationsleiter\*in").

#### 5. Database Patterns

- **Drizzle ORM** with PostgreSQL, using the relational API (`db.query.x.findMany({ where, with })`)
  and `defineRelations` in `src/api/db/relations.ts`. Columns are camelCase in TypeScript and
  snake_case in the database; `snakeCase.table` does the mapping.
- Row and insert shapes come from `$api/db/rows` (`Row<'conference'>`, `Insert<'conference'>`)
  rather than from a generated client
- Models: `Conference`, `Delegation`, `Committee`, `DelegationMember`, `SingleParticipant`, etc.
- Conference state machine: `PRE` → `PARTICIPANT_REGISTRATION` → `PREPARATION` → `ACTIVE` → `POST`
- Payment tracking via `PaymentTransaction` model
- Paper submission system with versioning and reviews

#### 6. Assignment

- **Draft, apply, release - three separate things.** The team plans in draft tables
  (`assignmentReview`, `assignmentUnit` + `assignmentUnitMember`, `assignmentSingleRole`,
  `assignmentWeights`) that hold only _changes_ on top of the live registrations: a delegation
  without a unit keeps what it has; a unit without members is "this whole delegation gets that
  role"; units with members are the parts of a split; a unit with a `sourceSingleParticipantId`
  turns a single participant into a delegation. Every row cascades with the registration it points
  at, so withdrawn applications drop out on their own.
- **One pure model, used on both sides.** `$lib/assignment/state.ts` turns live rows + draft into
  `AssignmentGroup`s, `applyPlan.ts` works out what applying does (merges, splits, new and
  dissolved delegations, the errors that block it), `autoAssign.ts` is the Hungarian matching
  (only roles with _exactly_ as many free seats as the group has members). The board in
  `management/assignment/` and `applyAssignment` (`src/api/services/assignmentDraft.ts`) both go
  through them, so the preview is what gets written. Applying moves `delegationMember` rows instead
  of re-creating them, so supervision links and statuses survive, and clears the draft (ratings
  and weights stay).
- **Release is only visibility.** `conference.assignmentReleased` (`setAssignmentReleased`,
  project management and participant care, switchable both ways) decides whether participants and
  supervisors see roles. Until then their read rules mask `assignedNationAlpha3Code`,
  `assignedNonStateActorId`, `assignedCommitteeId`, `assignedRoleId` and `assignmentDetails`
  (`src/api/services/assignmentVisibility.ts`, two rules per participant-side ability:
  `maskedUntilRelease` and `onceReleased`). A masked foreign key is not enough on its own, so
  `assignedNation`, `assignedNonStateActor`, `assignedCommittee` and `assignedRole` resolve
  through the key, and the relations pointing back (`nation.assignedDelegations`,
  `committee.delegationMembers`, …) are filtered with `assignmentVisible`. The dashboard shows
  `AssignmentPending` instead of a rejection, and the mail sync keeps role lists back. Anything new
  that reveals a role to participants has to respect the flag; `e2e/authorization/assignment-release.spec.ts`
  checks the known paths.

#### 7. Background Tasks

- **node-schedule** for cron jobs
- Tasks registered in `src/tasks/index.ts`
- Conference state auto-transitions, email list synchronization
- Task output written to `tasksOut/` directory (configured in build)

### Path Aliases (svelte.config.js)

```
$api → src/api
$assets → src/assets
$config → src/lib/config
```

### Important Integrations

- **PDF Generation**: `pdf-lib` with custom fonts for certificates
- **Barcode/QR**: `@bwip-js/browser`, `@svelte-put/qr`, `barcode-detector`
- **Rich Text Editor**: TipTap for committee agenda items
- **Maps**: Leaflet via `sveaflet` for delegation locations
- **External APIs**: Listmonk email service integration in `src/tasks/apis/`

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
- **Icons**: Use FontAwesome Duotone (`fa-duotone fa-icon-name`)
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
- OpenTelemetry vars (optional): `OTEL_ENDPOINT_URL`, `OTEL_SERVICE_NAME`

## Common Workflows

### Adding a New GraphQL Handler

1. Create the module in `src/api/handlers/`
2. Import it in `src/api/handlers/register.ts`
3. Declare its abilities with `abilityBuilder` at the top of the file
4. Restart the dev server: it rebuilds the schema and regenerates
   `src/lib/api/rumbleClient/`

### Adding a Frontend Feature

1. Create/modify components in `src/lib/components/`
2. Fetch in the component with `$derived(await client.liveQuery.…)`; do not add a `load` function
   (see "Frontend Data Fetching" for the four cases where one is still right)
3. Add translations to `messages/` directory

### Database Schema Changes

1. Edit `src/api/db/schema.ts`, and `src/api/db/relations.ts` if the change adds or removes a
   relation
2. Run `bun run db:generate` to write the migration, then `bun run db:migrate` to apply it
3. Restart the dev server so the schema and the generated client pick the change up
4. Update `src/api/db/seed-data/` if a new column is required
5. Test with `bun run db:nuke && bun run db:seed:dev`

### Adding Background Task

1. Create task file in `src/tasks/`
2. Use `node-schedule` to define cron schedule
3. Import task in `src/tasks/index.ts`
4. Ensure task output directory exists

## Git Hooks (Lefthook)

**Pre-commit**: Auto-format staged files with Prettier, then run `fallow audit` on the working tree
**Pre-push**: Run tests, lint and format-check pushed files, and run `fallow audit` against the branch base

The pre-commit fallow step is a gate: it fails the commit when the commit introduces new fallow findings (findings already present in touched files don't count). The pre-push fallow step is advisory: it uses `--brief`, which renders the findings but always exits 0, mirroring the deliberately non-blocking fallow job in CI. To gate pushes too, drop `--brief` from the pre-push command in `lefthook.yml`.

## Performance Notes

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

## Type Safety (CRITICAL)

This codebase supports **100% end-to-end type safety** from database to frontend. The type system is your primary defense against bugs—use it properly.

### Rules

1. **NEVER use `any`** - The `any` type defeats the purpose of TypeScript. Only use it when absolutely unavoidable (e.g., third-party library limitations), and always add a comment explaining why.

2. **NEVER use type casting (`as Type`)** - Type assertions bypass the compiler's checks. If you feel the need to cast, it indicates a type definition problem that should be fixed at the source.

3. **Trust the generated types** - drizzle and the generated rumble client are accurate. If types don't match your expectations, investigate why rather than casting.

4. **Fix type errors at the source** - When encountering type mismatches:
   - Check if the selection or the handler's args need updating
   - Verify `src/api/db/schema.ts` is correct
   - Ensure the client has been regenerated (restart `bun run dev`)
   - Never silence errors with `as any` or `@ts-ignore`

5. **Use type narrowing** - Prefer type guards, discriminated unions, and proper null checks over assertions.

### Why This Matters

- **Drizzle** infers row and insert types from `src/api/db/schema.ts`
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
  which is the 0.x line without the relational API v2 this app is built on. After any drizzle bump,
  regenerate the client and check `git diff src/lib/api/rumbleClient` for `| null` creeping into
  relations: newer builds wrap relation columns in a `RelationsBuilderColumn`, which our rumble patch
  unwraps.
- **graphql is on 17.** `@escape.tech/graphql-armor` still pins 16 and keeps a nested copy; that is
  fine because armor only parses and walks documents (verified: depth and alias limits still reject
  over-limit queries on a production build). Anything else that brings its own graphql copy would
  not be - schema building fails every `instanceof` check across two copies.
- **TypeScript is installed twice.** svelte-check needs TypeScript 6 (`typescript`); `tsc` itself is
  TypeScript 7, aliased as `@typescript/native`, and is what `bun run typecheck` runs.
- **Sentry**: `dataCollection` is derived from `*_SENTRY_SEND_DEFAULT_PII` in
  `$lib/sentryDataCollection.ts` (Sentry 11 collects everything by default), and the Vite plugin
  runs with `buildTimeInstrumentation: false` - tracing is off, and that instrumentation inlines
  graphql into the server bundle, breaking rumble's client generator during `vite build`.
- **Emails** import from `@better-svelte-email/components` and `@better-svelte-email/server`, not
  the `better-svelte-email` umbrella, whose root re-exports a preview module with raw `.svelte`
  files that Node cannot load during SSR.
- **rumble is patched** (`patches/`), each fix meant to go upstream:
  - live queries announce updates on the next task (urql emits synchronously, often inside a
    `$derived`, where an immediate update throws `state_unsafe_mutation`);
  - `autoIncludeIdField` applies to nested selections too, and only to types that have the field;
  - relation nullability unwraps drizzle's `RelationsBuilderColumn` before reading `notNull`;
  - the per-row column masks test each row with a correlated
    `exists (... where pk = row.pk and rule)` instead of `pk in (select pk ... where rule)`, which
    made postgres evaluate every rule against the whole table once per flag and nesting site (a
    supervisor's group payment query: 9.5 s → 11 ms, same rows);
  - the client generator does not rewrite unchanged files (a rewrite makes Vite reload every open
    page, mid-test in e2e).

  Since 0.24.1 rumble itself drops live-query updates whose data did not change.

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
