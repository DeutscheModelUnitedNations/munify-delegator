# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

MUNify DELEGATOR is a registration and organization management system for Model United Nations conferences. Built with SvelteKit 2, it handles delegation registration, assignment, and management workflows for MUN conferences.

**Tech Stack**: SvelteKit 2 (Svelte 5 runes mode), TypeScript, Drizzle ORM (PostgreSQL), GraphQL via [rumble](https://github.com/m1212e/rumble), Tailwind CSS 4 + DaisyUI, urql with a generated typed client, Paraglide (i18n)

## Development Commands

### Setup & Running

```bash
# Install dependencies
bun install

# Start full dev environment (Docker services + dev server)
bun run dev

# OR run separately:
bun run dev:docker   # Start PostgreSQL and other services
bun run dev:server   # Start SvelteKit dev server with Vite

# Install git hooks for automated linting
bunx lefthook install
```

### Database Management

```bash
# Write a migration for the current schema.ts, then apply it
bun run db:generate
bun run db:migrate

# Drop every table and enum (WARNING: deletes all data)
bun run db:reset

# Wipe and refill the dev database with faker data
bun run db:seed:dev

# Database GUI
bun run db:studio
```

### Code Quality

```bash
# Format code
bun run format

# Lint (runs both prettier check and eslint)
bun run lint

# Type check
bun run typecheck

# Svelte type checking
bun run check

# Continuous type checking
bun run check:watch
```

### Building

```bash
# Build for production
bun run build
```

### Translations

```bash
# Add new translation key
bun run add-translation

# Machine translate missing keys
bun run machine-translate
```

## Architecture Overview

### Directory Structure

- **`src/routes/`** - SvelteKit file-based routing
  - `(authenticated)/` - Protected routes requiring authentication
    - `dashboard/[conferenceId]/` - Participant-facing conference dashboard
    - `dashboard/[conferenceId]/management/` - Admin conference management UI
    - `registration/[conferenceId]/` - Registration flows (delegation, individual, supervisor)
    - `assignment-assistant/` - Committee assignment tooling
  - `api/graphql/` - GraphQL API endpoint
  - `auth/` - the auth pages the OIDC library does not serve itself (invitation hand-off, error,
    email conflict, migration notice)

- **`src/api/`** - GraphQL API implementation
  - `handlers/` - One module per entity, holding its abilities, queries and mutations
  - `rumble.ts` - The rumble instance (schema builder, ability builder, client generator)
  - `context.ts` - Request context (OIDC data and its helpers)
  - `db/` - Drizzle schema, relations, client, reset and dev seed
  - `services/` - Business logic services

- **`src/lib/`** - Shared utilities
  - `api/` - The urql client plus the **generated** `rumbleClient/`
  - `components/` - Reusable Svelte components
  - `services/` - Frontend services
  - `schemata/` - Zod validation schemas
  - `paraglide/` - Generated i18n code

- **`src/tasks/`** - Background tasks (email sync, conference status updates)

- **`drizzle/`** - Generated migration history

### Key Architectural Patterns

#### GraphQL API Layer

- **Schema Generation**: rumble builds the schema from the drizzle tables; `object({ table })` and
  `query({ table })` give an entity its type and its two root queries
- **Handlers**: Organized by entity in `src/api/handlers/` (e.g., `conference.ts`, `delegation.ts`),
  all listed in `register.ts`
- **Server**: GraphQL Yoga serves the API at `/api/graphql`
- Schema changes need a dev server restart

#### Frontend Data Flow

- **Generated client**: `client.query.x({ __args, …selection })` and `client.mutate.x(…)`, written
  into `src/lib/api/rumbleClient/` on dev server start
- **Fetching happens in components**, not in `load`: `const x = $derived(await client.liveQuery.…)`
  at the top of `<script>`. `load` survives only for redirect/403 guards, page options, and the one
  invitation route that has to set a cookie before rendering; a guard returns no data
- **Global state**: `$lib/state/currentUser.svelte` for the signed-in person, cached in the browser
  only — module state on the server is shared across requests
- **SSR**: component fetches during SSR go through the remote function in
  `src/api/graphql.remote.ts`, which runs the schema in-process rather than over HTTP
- **After mutations**: usually nothing — mutations publish to the tables they write and `liveQuery`
  refreshes itself. `invalidateAll()` still re-runs the remaining layout loads but not a
  component's own fetch
- **Subscriptions**: served over SSE on `/api/graphql`, with Redis (`REDIS_URL`) as the event
  target so several instances share events
- **Forms**: superforms in SPA mode (`defaults()` + `SPA: true`, mutation in `onUpdate`) with
  [Formsnap](https://formsnap.dev) field primitives behind the `Form*` components in
  `$lib/components/form/`. No form actions, no `superValidate`

#### Authentication & Authorization

- **OIDC Integration**: `@m1212e/sveltekit-oidc` (recommended provider: Logto, but any OIDC provider
  works). `src/api/services/OIDC.ts` builds it and `src/hooks.server.ts` installs its `handle`,
  which guards the authenticated routes, serves both callback routes without `+page` files and puts
  the session on `event.locals.oidc`. The login-time user upsert is
  `src/api/services/upsertSelf.ts`
- **Impersonation**: stalled during the migration — the library owns the session cookies the old
  implementation swapped. `$lib/data/impersonation` gates the UI
- **Context Building**: `src/api/context.ts` constructs request context from `event.locals.oidc`
- **Permission System**: rumble abilities, which are drizzle filters composed into each query
  - Definitions at the top of each handler in `src/api/handlers/`
  - Admins get full access, team members get scoped access based on roles
  - Roles: `admin`, `PROJECT_MANAGEMENT`, `PARTICIPANT_CARE`, etc.

#### Database & ORM

- **Drizzle schema**: Single source of truth in `src/api/db/schema.ts`, with the relation graph in
  `relations.ts`
- **Relational API**: `db.query.x.findMany({ where, with, columns })`; columns are camelCase in
  TypeScript and snake_case in the database
- **Migrations**: All schema changes must create migrations (`bun run db:generate`)

#### Internationalization

- **Paraglide.js**: Compile-time i18n with URL-based locale switching
- **Message Files**: JSON files in `messages/` directory per locale
- **Middleware**: `hooks.server.ts` uses `paraglideMiddleware` to set locale from URL

#### UI Components

- **Tailwind CSS 4**: Utility-first styling with DaisyUI component library
- **Svelte 5 Runes**: Uses modern runes mode (`$state`, `$derived`, `$effect`), with
  `experimental.async` enabled so components can await at the top level

### State Management Concepts

- **Conference States**: `PRE` → `PARTICIPANT_REGISTRATION` → `PREPARATION` → `ACTIVE` → `POST`
- **Delegations**: Groups of participants representing countries
- **Single Participants**: Individuals applying for custom roles
- **Committee Assignment**: Matching delegations to nations in committees
- **Background Tasks**: `src/tasks/` contains scheduled jobs (mail sync, status updates)

### Testing Database Changes

After modifying `src/api/db/schema.ts`:

1. Run `bun run db:generate` and `bun run db:migrate` to create and apply the migration
2. Run `bun run db:seed:dev` to refill test data
3. Use `bun run db:studio` to verify the data structure

### Configuration

- **Environment Variables**: Copy `.env.example` to `.env` and configure:
  - `DATABASE_URL` - PostgreSQL connection string
  - `PUBLIC_OIDC_AUTHORITY` - OIDC provider URL
  - `PUBLIC_OIDC_CLIENT_ID` - OIDC client identifier
  - `SECRET` - Session encryption key
  - `CERTIFICATE_SECRET` - Certificate signing key (generate with `openssl rand -base64 32`)

- **Aliases**: Configured in `svelte.config.js`:
  - `$api` → `src/api`
  - `$assets` → `src/assets`
  - `$config` → `src/lib/config`

## Development Workflow

1. **Schema Changes**: Edit `src/api/db/schema.ts` → `db:generate` → `db:migrate` → restart the dev server
2. **API Changes**: Modify a handler in `src/api/handlers/` → restart the dev server, which rebuilds
   the schema and regenerates the frontend client
3. **Frontend Changes**: Edit Svelte components → Vite hot-reloads
4. **Adding Operations**: Call `client.liveQuery` / `client.mutate` with a selection object in the
   component; there are no GraphQL documents and no data-loading `load` functions in this codebase
5. **Permission Changes**: Edit the `abilityBuilder` calls at the top of the entity's handler

## Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code restructure without behavior change
- `style:` - UI/UX changes
- `docs:` - Documentation
- `test:` - Tests
- `chore:` - Maintenance
- `ci:` - CI/CD changes
- `build:` - Build system changes
- `perf:` - Performance improvements

Example: `feat(delegation): add nation preference selection`

## Docker Deployment

Use provided Docker images: `deutschemodelunitednations/delegator`

- Example compose file in `example/` directory
- Requires external OIDC provider (Logto recommended)
- Environment variables must be configured (see `.env.example`)
