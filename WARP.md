# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

MUNify DELEGATOR is a registration and organization management system for Model United Nations conferences. Built with SvelteKit 2, it handles delegation registration, assignment, and management workflows for MUN conferences.

**Tech Stack**: SvelteKit 2 (Svelte 5 runes mode), TypeScript, Prisma ORM (PostgreSQL), GraphQL (Pothos + Yoga), Tailwind CSS 4 + DaisyUI, Houdini (GraphQL client), Paraglide (i18n)

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
# Migrate database to latest schema
bunx prisma migrate dev

# Reset database (WARNING: deletes all data)
bunx prisma migrate reset

# Seed database with development data
bun prisma/seed/dev/seed.ts

# Open Prisma Studio (database GUI)
bun run studio
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
    - `management/[conferenceId]/` - Admin conference management UI
    - `registration/[conferenceId]/` - Registration flows (delegation, individual, supervisor)
    - `assignment-assistant/` - Committee assignment tooling
  - `api/graphql/` - GraphQL API endpoint
  - `auth/` - OIDC authentication flows

- **`src/api/`** - GraphQL API implementation
  - `resolvers/` - Pothos GraphQL resolvers organized by entity
  - `abilities/` - CASL permission definitions per entity
  - `context/` - Request context (OIDC, permissions)
  - `services/` - Business logic services

- **`src/lib/`** - Shared utilities
  - `components/` - Reusable Svelte components
  - `queries/` - Houdini GraphQL queries/mutations
  - `services/` - Frontend services
  - `schemata/` - Zod validation schemas
  - `db/` - Database utilities
  - `paraglide/` - Generated i18n code

- **`src/tasks/`** - Background tasks (email sync, conference status updates)

- **`prisma/`** - Database schema, migrations, and seed scripts
  - `schema.prisma` - Main database schema
  - `migrations/` - Database migration history
  - `seed/dev/` - Development seed scripts

### Key Architectural Patterns

#### GraphQL API Layer

- **Schema Generation**: Pothos schema builder with Prisma plugin generates GraphQL schema from Prisma models
- **Resolvers**: Organized by entity in `src/api/resolvers/modules/` (e.g., `conference.ts`, `delegation.ts`)
- **Auto-generated CRUD**: `prisma-generator-pothos-codegen` creates base CRUD operations
- **Server**: GraphQL Yoga serves the API at `/api/graphql`

#### Frontend Data Flow

- **Houdini Client**: Type-safe GraphQL client with automatic cache management
- **Code Generation**: `houdini.config.js` watches schema and generates TypeScript types
- **Queries**: Store queries in `src/lib/queries/` for reuse across components
- **Load Functions**: SvelteKit `+page.ts` files use Houdini queries for SSR/CSR data loading

#### Authentication & Authorization

- **OIDC Integration**: Uses OpenID Connect (designed for ZITADEL but supports any OIDC provider)
- **Context Building**: `src/api/context/context.ts` constructs request context with OIDC data
- **Permission System**: CASL ability-based authorization
  - Definitions in `src/api/abilities/entities/`
  - Admins get full access, team members get scoped access based on roles
  - Roles: `admin`, `PROJECT_MANAGEMENT`, `PARTICIPANT_CARE`, etc.

#### Database & ORM

- **Prisma Models**: Single source of truth in `prisma/schema.prisma`
- **Generators**: Three generators run on schema changes:
  1. `@prisma/client` - TypeScript client
  2. `prisma-pothos-types` - Pothos integration types
  3. `prisma-generator-pothos-codegen` - Auto-generated resolvers
- **Migrations**: All schema changes must create migrations (`bunx prisma migrate dev`)

#### Internationalization

- **Paraglide.js**: Compile-time i18n with URL-based locale switching
- **Message Files**: JSON files in `messages/` directory per locale
- **Middleware**: `hooks.server.ts` uses `paraglideMiddleware` to set locale from URL

#### UI Components

- **Tailwind CSS 4**: Utility-first styling with DaisyUI component library
- **Svelte 5 Runes**: Uses modern runes mode (`$state`, `$derived`, `$effect`)
- **Houdini Integration**: `houdini-svelte` plugin provides reactive stores

### State Management Concepts

- **Conference States**: `PRE` → `PARTICIPANT_REGISTRATION` → `PREPARATION` → `ACTIVE` → `POST`
- **Delegations**: Groups of participants representing countries
- **Single Participants**: Individuals applying for custom roles
- **Committee Assignment**: Matching delegations to nations in committees
- **Background Tasks**: `src/tasks/` contains scheduled jobs (mail sync, status updates)

### Testing Database Changes

After modifying `prisma/schema.prisma`:

1. Run `bunx prisma migrate dev` to create migration
2. Run `bun prisma/seed/dev/seed.ts` to seed test data
3. Use Prisma Studio (`bun run studio`) to verify data structure

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
  - `$db` → `prisma`
  - `$config` → `src/config`
  - `$houdini` → `.houdini`

## Development Workflow

1. **Schema Changes**: Edit `prisma/schema.prisma` → run migrations → regenerate GraphQL schema
2. **API Changes**: Modify resolvers in `src/api/resolvers/modules/` → schema regenerates automatically
3. **Frontend Changes**: Edit Svelte components → Vite hot-reloads
4. **Adding GraphQL Operations**: Create `.gql` files or use `graphql()` function → Houdini generates types
5. **Permission Changes**: Edit ability files in `src/api/abilities/entities/`

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
- Requires external OIDC provider (ZITADEL recommended)
- Environment variables must be configured (see `.env.example`)
