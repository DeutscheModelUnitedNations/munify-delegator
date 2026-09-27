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

# Wipe and refill the dev database with faker data
bun run db:seed:dev

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
bun run typecheck      # TypeScript only

# Lint (slow - runs automatically on git push via lefthook)
bun run lint           # Only run manually when specifically needed

# Codebase analysis (fallow: dead code, cycles, duplication, complexity)
bun run fallow         # Full report
bun run fallow:audit   # Only what changed against the branch base
bun run fallow:health  # Health score with letter grade

# Testing
bun test               # Run tests once
bun run test:watch     # Watch mode
bun run coverage       # With coverage report
```

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
    - `management/` - Admin interfaces for conference/delegation management
    - `registration/` - User registration flows
    - `assignment-assistant/` - Delegation assignment tools
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
    `reset.ts`, `seedDev.ts` and the faker factories under `seed-data/`
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

  Reach for an explicit check in `services/authHelper.ts` only when the answer is needed before a
  row exists.

- The endpoint is `src/routes/api/graphql/+server.ts`. Adding fields needs a **dev server restart**:
  the schema builder is populated at module init.

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

  When a page needs several queries, put them in a co-located module that exports the fetch
  function and its result type (`conferenceCalendar.ts`, `assignmentProject.ts`), and let child
  components import that type for their props.

- **`load` functions are for four things only**: redirect and 403 guards, OIDC/cookie work, page
  options like `ssr = false`, and pages that use SvelteKit **form actions** (there the load hands
  the action its superforms object, which is the framework's contract). Everything else fetches in
  the component, and a guard returns nothing — route parameters come from `page.params`, not from
  load data. A `load` must never return what the generated client gave it: those are subscribeable
  proxies, and `load` data has to be serialized into the page.
- **Global state lives in `$lib/state/*.svelte.ts`**, chase's pattern. `getCurrentUser()` is the
  signed-in person; `fetchMyParticipation(conferenceId)` is what the caller is in one conference.
  Cache such a singleton **only in the browser**: module state on the server is shared by every
  request the process serves, so caching there hands one visitor's identity to the next. For the
  same reason the urql client answers server-side operations `network-only` — see the comment on
  `requestPolicy` in `src/lib/api/client.ts`.
- **Forms without an action** are SPA forms that submit through a mutation. Build their initial
  value with superforms' `defaults()` in the component rather than `superValidate` on the server.
- **Regeneration** happens on dev server start, so a handler change is only visible to the
  frontend after a restart. `src/lib/api/rumbleClient/` is generated and committed; never edit it.
- **SSR** goes through `src/api/graphql.remote.ts`, which executes the schema in-process.
  `ssrExchange` in `src/lib/api/client.ts` routes there whenever `browser` is false, which is why
  server-side fetching works without the app being able to fetch its own relative URL. It has to
  stay a remote function: `client.ts` is shared with the browser, and only a remote import is
  stubbed out there. Needs `kit.experimental.remoteFunctions` in `svelte.config.js`.
- **After a mutation you normally do nothing.** `liveQuery` subscribes as well as queries, and every
  mutation publishes to the tables it writes, so open queries are told to refresh themselves. Fetch
  with `liveQuery`, not `query`, anywhere a component displays the result — `query` is for one-shot
  reads inside an event handler and for `load` functions, which are not reactive either way.
- **`invalidateAll()` is for load data only.** It still re-runs the surviving loads, which is why
  the dashboard keeps it (the signed-in person's participation comes from a layout load) and so do
  the pages with form actions. It does nothing for a component's own fetch, so do not reach for it
  there; a component that cannot be live refreshes by calling its own fetch function again, and a
  child component tells its parent through a callback (`onUpdate`, `onSaved`) rather than
  invalidating the world.

#### 3. Authentication & Authorization

- **OIDC flow** via `openid-client` library
- Login callbacks in `src/routes/auth/`
- User context injected into the GraphQL context via `src/api/context.ts`
- **rumble abilities** define fine-grained permissions per entity:
  - Actions: `read`, `update`, `delete`, `impersonate` (declared in `src/api/rumble.ts`)
  - Each entity's abilities live at the top of its handler
- Team member roles: `Admin`, `PROJECT_MANAGEMENT`, `PARTICIPANT_CARE`, etc.

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

#### 6. Background Tasks

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
- DataTable configuration
- Navigation components (Tabs, NavMenu)
- Status indicators and badges
- Color theming and icons
- Code examples for common patterns

**Quick reference**:

- **Forms**: Always wrap related inputs with `FormFieldset` for visual grouping
- **Modals**: Use `Modal` component with `action` snippet for footer buttons
- **Layout**: Use DaisyUI classes; prefer `bg-base-*` and semantic colors
- **Icons**: Use FontAwesome Duotone (`fa-duotone fa-icon-name`)
- **URL State**: Use `sveltekit-search-params` for URL-persisted state

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

Both fallow steps are advisory: they use `--brief`, which renders the findings but always exits 0, so they never block a commit or a push. This mirrors the deliberately non-blocking fallow job in CI. To turn either into a gate, drop `--brief` from the command in `lefthook.yml`.

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
