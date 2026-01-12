# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MUNify DELEGATOR is a SvelteKit-based application for managing Model United Nations conference registration, delegation assignment, and organizational matters. Built with Svelte 5, TypeScript, Prisma ORM, and GraphQL (via Pothos & Yoga), it's designed for DMUN e.V. but can be adapted for other MUN conferences.

## Tech Stack Core

- **Frontend**: SvelteKit with Svelte 5 (runes mode), TailwindCSS 4, DaisyUI
- **Backend**: Node.js with SvelteKit server routes
- **Database**: PostgreSQL via Prisma ORM
- **GraphQL**: Pothos schema builder with graphql-yoga server, Houdini client
- **Auth**: OpenID Connect (OIDC) - tested with ZITADEL
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
# Generate Prisma client
bunx prisma generate

# Create and apply migrations
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

# Lint
bun run lint

# Type checking
bun run check          # Single run
bun run check:watch    # Watch mode
bun run typecheck      # TypeScript only

# Testing
bun test               # Run tests once
bun run test:watch     # Watch mode
bun run coverage       # With coverage report
```

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
  - `resolvers/` - GraphQL resolvers organized by module
    - `modules/` - Domain-specific resolvers (conference, delegation, committee, etc.)
    - `api.ts` - Main GraphQL Yoga server configuration
    - `builder.ts` - Pothos schema builder setup with plugins
  - `abilities/` - CASL-based authorization rules per entity
  - `services/` - Backend business logic services

- **`src/lib/`** - Shared frontend code
  - `components/` - Reusable Svelte components
  - `queries/` - Houdini GraphQL queries/mutations
  - `services/` - Frontend utility functions
  - `schemata/` - Zod validation schemas
  - `paraglide/` - Generated i18n code

- **`src/config/`** - Environment configuration
  - `public.ts` - Client-side config (PUBLIC\_\* env vars)
  - `private.ts` - Server-side config (secrets, DB URLs)

- **`src/tasks/`** - Background scheduled tasks (node-schedule)
  - `conferenceStatus.ts` - Auto-update conference states
  - `mailSync.ts` - Email synchronization with external systems

- **`prisma/`** - Database layer
  - `schema.prisma` - Prisma schema definition
  - `migrations/` - Database migration history
  - `seed/` - Database seeding scripts
  - `pothos/` - Generated Pothos types from Prisma

### Key Architectural Patterns

#### 1. GraphQL API Layer (Pothos + Yoga)

- **Schema-first approach** using Pothos code-first schema builder
- All resolvers in `src/api/resolvers/modules/` are auto-imported in `api.ts`
- Plugin stack: Prisma integration, complexity limiting, OpenTelemetry tracing, utilities
- **Authorization**: CASL ability checks per entity type in `src/api/abilities/entities/`
- Context includes: Prisma client, OIDC user info, request metadata

#### 2. Frontend Data Fetching (Houdini)

- **Houdini** manages GraphQL client-side operations
- Type-safe generated queries in `.houdini/` directory
- Queries/mutations in `src/lib/queries/` trigger codegen
- Config in `houdini.config.js` - runes mode enabled
- **Cache Invalidation**: After mutations that modify data, you must invalidate Houdini's cache to update the UI:

  ```typescript
  import { cache } from '$houdini';
  import { invalidateAll } from '$app/navigation';

  // After a mutation:
  cache.markStale();
  await invalidateAll();
  ```

#### 3. Authentication & Authorization

- **OIDC flow** via `openid-client` library
- Login callbacks in `src/routes/auth/`
- User context injected into GraphQL context via `src/api/context/`
- **CASL abilities** define fine-grained permissions per entity:
  - Actions: `list`, `read`, `update`, `delete`, `impersonate`
  - Each entity type has dedicated ability definitions
- Team member roles: `Admin`, `PROJECT_MANAGEMENT`, `PARTICIPANT_CARE`, etc.

#### 4. Internationalization

- **Paraglide-JS** with `url` and `baseLocale` strategy
- Source translations in `messages/` directory
- Use `$t()` function in components for translated strings
- Generate translations via Inlang CLI

#### 5. Database Patterns

- **Prisma ORM** with PostgreSQL
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
$db → prisma
$config → src/config
$houdini → .houdini
```

### Important Integrations

- **PDF Generation**: `pdf-lib` with custom fonts for certificates
- **Barcode/QR**: `@bwip-js/browser`, `@svelte-put/qr`, `barcode-detector`
- **Rich Text Editor**: TipTap for committee agenda items
- **Maps**: Leaflet via `sveaflet` for delegation locations
- **External APIs**: Listmonk email service integration in `src/tasks/apis/`

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
- `OIDC_ROLE_CLAIM` - JWT claim for roles (ZITADEL format)
- `CERTIFICATE_SECRET` - Secret for signing participation certificates
- OpenTelemetry vars (optional): `OTEL_ENDPOINT_URL`, `OTEL_SERVICE_NAME`

## Common Workflows

### Adding a New GraphQL Resolver

1. Create resolver module in `src/api/resolvers/modules/`
2. Import in `src/api/resolvers/api.ts`
3. Define CASL abilities in `src/api/abilities/entities/` if new entity
4. Restart dev server to regenerate schema

### Adding a Frontend Feature

1. Create/modify components in `src/lib/components/`
2. Add GraphQL queries in `src/lib/queries/`
3. Houdini auto-generates types on save
4. Use generated stores in Svelte components
5. Add translations to `messages/` directory

### Database Schema Changes

1. Edit `prisma/schema.prisma`
2. Run `bunx prisma migrate dev --name <descriptive-name>`
3. Prisma auto-generates client and Pothos types
4. Update seed scripts if needed
5. Test migrations against seed data

### Adding Background Task

1. Create task file in `src/tasks/`
2. Use `node-schedule` to define cron schedule
3. Import task in `src/tasks/index.ts`
4. Ensure task output directory exists

## Git Hooks (Lefthook)

**Pre-commit**: Auto-format staged files with Prettier
**Pre-push**: Run tests and lint staged files

## Performance Notes

- Svelte 5 runes mode enabled - use `$state`, `$derived`, `$effect` instead of legacy stores
- Houdini query deduplication and caching
- GraphQL query complexity limiting via Pothos plugin
- OpenTelemetry tracing for performance monitoring
- Image optimization: Use WebP format, lazy load images
- Install dependencies always into the devDependencies section as is best practice for sveltekit projects if not explicitly required at runtime.

## Security Considerations

- OIDC authentication required for all routes in `(authenticated)/`
- CASL authorization checks on all GraphQL mutations
- Certificate signatures use HMAC-SHA256
- Environment secrets must never be committed
- Prisma parameterized queries prevent SQL injection
- GraphQL complexity limits prevent DoS attacks

## Development Workflow

- Never use the git commit command after a task is finished.
