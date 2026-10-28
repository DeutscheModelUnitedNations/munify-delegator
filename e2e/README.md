# End-to-end tests

Playwright specs driving the real app against a real database and the local OIDC provider,
[oidc-mock](https://github.com/strehk/oidc-mock), which `vite dev` and `vite preview` start
themselves (see `oidc-mock.yaml` and the `oidcMock()` plugin in `vite.config.ts`).

## Running

The suite needs Postgres and the S3 bucket (RustFS, created by the `s3-init` service); the server
Playwright launches brings the OIDC provider along. `playwright.config.ts` reads `.env` itself.
The default ports (5432 / 9100 / 4173, and 8090 for the provider's back channel) are often taken
by other projects, so they are overridable:

```bash
# Default stack
bun run dev:docker
bun run test:e2e
```

```bash
# Alongside another project that already holds 5432 / 4173
# Own project name (-p): without it compose replaces the dev Postgres container
docker compose -p delegator-e2e -f dev.docker-compose.yml -f e2e.compose.yml up -d postgres s3 s3-init

export DATABASE_URL="postgres://postgres:postgres@localhost:15432/postgres"
export S3_ENDPOINT="http://localhost:19100/delegator"
export E2E_PORT=4174

bun run db:migrate   # first time only
bun run test:e2e
```

What the suite runs against, and how hard it works the machine, is set by environment variables:

| Variable      | Default                 | Meaning                                                                                                                                                                                                         |
| ------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E2E_SERVER`  | `build`                 | `build`: a production build, served by `vite preview`. Pages load fast, and saving a file mid-run changes nothing. `preview`: the build already in `build/`, to run again without rebuilding. `dev`: `vite dev` |
| `E2E_WORKERS` | `2`                     | Spec files run side by side, each worker with its own browser. `1` runs them one after another                                                                                                                  |
| `E2E_NICE`    | `19` (`0` in CI)        | CPU priority of everything the run starts, so a local run yields to the rest of the machine                                                                                                                     |
| `E2E_PORT`    | `4173` (`5173` for dev) | Where the app is served; also lets CI shard without port collisions                                                                                                                                             |

A server already listening on the port is reused outside CI, so `E2E_SERVER=dev` runs against a
`bun run dev` you have open. The dev server reloads its whole program on every save and compiles
each page on its first visit, which is why it is not the default: a run against it takes about
three times as long and fails while the sources change under it. `bun run test:e2e:coverage` uses
it anyway, since only it serves the source maps the coverage is mapped through.

- Signing in goes through the provider once per user and worker: `loginAs` keeps the session
  cookies of every sign in and hands them to the next test signing in with the same claims.
- A second dev server in the same project shares the running provider (oidc-mock attaches to a
  back channel with the same issuer), so nothing needs remapping for it. To move the provider,
  change `port` in `oidc-mock.yaml` and `PUBLIC_OIDC_AUTHORITY` together.
- `loginAs` signs in through the login page's custom-claims form, with `preferred_username` as
  the token's `sub`, and recognises the provider by the path in `PUBLIC_OIDC_AUTHORITY` - its
  pages are served on the app's own origin.

## How the fixtures work

`e2e/seed/seed.ts` runs as Playwright's `globalSetup` and **upserts** everything, so it is safe
to run repeatedly against a database that already has data. Two conferences exist:

| Conference               | State                      | Used for                                                                                                    |
| ------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `E2E_CONFERENCE_ID`      | `PARTICIPANT_REGISTRATION` | registration, delegations, payments, papers, management                                                     |
| `E2E_PREP_CONFERENCE_ID` | `PREPARATION`              | anything gated behind an assignment + post-registration state (surveys, the assigned-participant dashboard) |

Rules worth keeping when adding fixtures:

- **A nation can only be assigned to one delegation per conference**
  (`delegation_assigned_role_id_key`; a nation's role belongs to one conference). Two fixtures sharing a nation constant
  will collide as soon as a spec tries to assign it.
- **`PaperVersion.content` is a JSON _string_, not an object.** `PaperVersion.contentHash`
  md5-hashes the stored value directly, and hash-wasm throws `Invalid data type!` on an object -
  which nulls the entire `findUniquePaper` query and renders the paper page blank.
- **Reset state a spec mutates.** The draft-paper fixture deletes its versions and clears
  `firstSubmittedAt` so a re-run starts from a never-submitted draft; survey answers are cleared
  for the same reason.
- **Give per-run data unique values.** `SurveyQuestion` is `@@unique([conferenceId, title])`, so
  specs that create one suffix the title with `Date.now()`.

## Writing specs that stay green

- **Import `test` and `expect` from `../support/test`**, not from `@playwright/test`. It is the
  same `test`, plus the browser coverage `bun run test:e2e:coverage` records for the default
  `page` (pages on contexts a spec opens itself are not recorded).

- **Never look up a row by position in a paginated table.** Registration specs create new users
  on every run, so the seeded rows drift off page one. Filter first - the participants table
  takes a `?search=` query param.
- **Prefer asserting persisted state over rendered text** for the final check of a mutation.
  Several UI confirmations only exist while a drawer or toast is settled.
- **Scope modal interactions to the modal** (`.modal-open, dialog[open]`); the page behind it has
  buttons with the same accessible names, and those names carry icon prefixes so anchored
  regexes (`/^speichern$/`) will not match.
- `waitForHydration()` waits for the `data-hydrated` attribute the root layout sets on `<body>` in
  `onMount`. Never wait for `networkidle` instead: the subscription stream stays open while a page
  shows live data, so the network never goes idle and every such wait burns its whole timeout.
  The attribute only marks the first full load; after a client-side navigation, wait for
  something the new page renders.

## Deliberately not covered

- **Attendance scanner** (`dashboard/[id]/team/attendance`) - a camera QR scanner. Covering it
  honestly needs a simulated video device; a fake that bypasses the scanner would assert nothing.

## Quarantined

`team/conference-configuration.spec.ts` is `test.fixme`. Saving conference settings never
reaches the server: a probe as the first statement of the `updateSettings` action never fires,
and the POST is answered with a 302 from `(authenticated)/+layout.server.ts` (its
`offlineUserRefresh` returns no user, so it redirects to sign-in and discards the submission). A
following GET re-authenticates transparently, so the page looks fine and the change is silently
lost. Participant-side form actions POST successfully in the same suite, so form actions are not
broken generally. Next step: exercise `addAgendaItem` on the same page to tell whether the
problem is route/session-scoped or specific to `updateSettings` (multipart, with File fields).
