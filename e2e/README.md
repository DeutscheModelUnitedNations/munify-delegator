# End-to-end tests

Playwright specs driving the real app against a real database and the mock OIDC provider from
`dev.docker-compose.yml`.

## Running

The suite needs Postgres and the mock OIDC server. The default ports (5432 / 8080 / 5173) are
often taken by other projects, so every one of them is overridable:

```bash
# Default stack (dev.docker-compose.yml on its usual ports)
bun run dev:docker
bun run test:e2e
```

```bash
# Alongside another project that already holds 5432 / 8080 / 5173
docker compose -f dev.docker-compose.yml -f e2e.compose.yml up -d postgres mockoidc

export DATABASE_URL="postgres://postgres:postgres@localhost:15432/postgres"
export PUBLIC_OIDC_AUTHORITY="http://localhost:18080/default/.well-known/openid-configuration"
export E2E_PORT=5174

bunx prisma migrate deploy   # first time only
bunx playwright test
```

- `E2E_PORT` moves the dev server (`playwright.config.ts`); it also lets CI shard without
  port collisions.
- The login helper derives the OIDC origin from `PUBLIC_OIDC_AUTHORITY`, so remapping the mock
  provider's port needs no code change.

## How the fixtures work

`e2e/seed/seed.ts` runs as Playwright's `globalSetup` and **upserts** everything, so it is safe
to run repeatedly against a database that already has data. Two conferences exist:

| Conference               | State                      | Used for                                                                                                    |
| ------------------------ | -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `E2E_CONFERENCE_ID`      | `PARTICIPANT_REGISTRATION` | registration, delegations, payments, papers, management                                                     |
| `E2E_PREP_CONFERENCE_ID` | `PREPARATION`              | anything gated behind an assignment + post-registration state (surveys, the assigned-participant dashboard) |

Rules worth keeping when adding fixtures:

- **A nation can only be assigned to one delegation per conference**
  (`@@unique([conferenceId, assignedNationAlpha3Code])`). Two fixtures sharing a nation constant
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

- **Never look up a row by position in a paginated table.** Registration specs create new users
  on every run, so the seeded rows drift off page one. Filter first - the participants table
  takes a `?search=` query param.
- **Prefer asserting persisted state over rendered text** for the final check of a mutation.
  Several UI confirmations only exist while a drawer or toast is settled.
- **Scope modal interactions to the modal** (`.modal-open, dialog[open]`); the page behind it has
  buttons with the same accessible names, and those names carry icon prefixes so anchored
  regexes (`/^speichern$/`) will not match.
- `waitForHydration()` is only `networkidle`, which is not a real hydration signal. Clicks fired
  straight after it can be lost. Where that matters, wrap the interaction and its expected
  outcome in `expect(async () => { ... }).toPass()`.

## Deliberately not covered

- **Attendance scanner** (`dashboard/[id]/attendance`) - a camera QR scanner. Covering it
  honestly needs a simulated video device; a fake that bypasses the scanner would assert nothing.
- **Assignment-assistant wizard** - a local drag-and-drop editor over a downloaded JSON file.
  `assignment.spec.ts` covers the JSON upload that follows it instead.

## Quarantined

`management/conference-configuration.spec.ts` is `test.fixme`. Saving conference settings never
reaches the server: a probe as the first statement of the `updateSettings` action never fires,
and the POST is answered with a 302 from `(authenticated)/+layout.server.ts` (its
`offlineUserRefresh` returns no user, so it redirects to sign-in and discards the submission). A
following GET re-authenticates transparently, so the page looks fine and the change is silently
lost. Participant-side form actions POST successfully in the same suite, so form actions are not
broken generally. Next step: exercise `addAgendaItem` on the same page to tell whether the
problem is route/session-scoped or specific to `updateSettings` (multipart, with File fields).
