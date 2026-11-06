# MCP server for AI assistants

DELEGATOR serves an [MCP](https://modelcontextprotocol.io) server at `/mcp`, so a conference's team
can work with an AI assistant (Claude, ChatGPT, …) instead of downloading data to paste into
one. An assistant acts with the account of whoever connects it, with exactly that person's rights,
and **personal data never reaches it**.

## What an assistant sees

- **Only conferences that switched it on.** Project management does that per conference on the
  team page _KI-Zugang_ (`team/ai-access`), which also shows the log of every call. Only the
  conference's team can connect; a system admin counts as holding every team role there, and has
  no reach beyond such conferences.
- **No personal data.** Names, contact details, address lines, birthdays, gender, pronouns, diet,
  emergency contacts, codes and tokens, and every free text written by or about people (care notes,
  motivation, sighting notes, review comments) read `[redacted]`; `null` stays `null`. Visible are
  ids, statuses, roles and seats, the minor flag, school, city and country, and papers and
  resolutions. Counts by gender or diet leave out groups smaller than five (the statistics read
  `<5` there), and are counted only alone or with each other, never together with a status, school,
  city, country, committee or role, which an assistant knows per person.
- **No lookups by personal data.** Filtering, sorting or searching by a redacted field is refused
  before anything runs, as are lookups by name, entry code or email.
- **No personal data in.** Tools never take names, contact details or notes about people.

The rules live in `src/api/mcp/` (see CLAUDE.md, "MCP server"). How the team uses it is in the user manual,
`docs/*/user-manual/team/ai-access.md`.

## Tools

| Tool                                                | What it does                                                          |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| `whoami`                                            | The conferences the caller can work in, with their team roles         |
| `participant_overview`                              | Participants with their paperwork, filtered and paged, plus a summary |
| `participant_counts`                                | Participants counted by up to three attributes                        |
| `assignment_overview`                               | Seats and holders per role, warnings, a page of the applications      |
| `graphql_query` / `graphql_schema`                  | Any read-only query, and the schema with redacted fields marked       |
| `createCommittee`, `assignDelegation`, … (about 62) | The mutations that opted in, one tool each                            |

Saved views of the team's tables (`createTableView`, `updateTableView`, `copyTableView`,
`setTableViewDefault`, `deleteTableView`) are shared views only, and the state an assistant
writes filters, sorts and groups only by columns without personal data
(`src/api/mcp/viewStateGuard.ts`).

Changes that reach people outside the team (the conference's stage, the announcement, unlocking
payments, distributing a survey) answer with a preview first and run only when called again with
`confirm: true`.

## Setting it up

1. **Logto: an API resource for the MCP server.** Create an API resource whose indicator is the
   public URL of `/mcp`, e.g. `https://delegator.example.org/mcp`. Access tokens for it must be
   JWTs (Logto's default for API resources). For a system admin to be recognised as such, the role
   claim the app reads (`OIDC_ROLE_CLAIM`) has to be in that token too, e.g. with a custom JWT
   claim; without it admins act with their team roles only.
2. **Logto: letting MCP clients register.** MCP clients register themselves with the authorization
   server: by a client ID metadata document (`client_id_metadata_document_supported` in the
   provider's metadata) or by dynamic client registration (`registration_endpoint`). Check
   `https://<logto>/oidc/.well-known/openid-configuration` for either. If Logto offers neither,
   create a third-party application per client in Logto (redirect URI as the client documents
   it, e.g. `https://claude.ai/api/mcp/auth_callback`) and enter its client id in the client's
   advanced connector settings.
3. **The app:** set `MCP_RESOURCE` to the same URL (and optionally `MCP_SCOPES` to the scopes
   defined on the resource). Unset, `/mcp` answers 404.
4. **Per conference:** project management switches it on under _KI-Zugang_.

A client then finds everything on its own: `/mcp` answers a request without token with a 401
naming `/.well-known/oauth-protected-resource/mcp`, which names Logto as authorization server.

## Locally

oidc-mock has no client registration, so connect a client with a token instead:

```bash
bun run --silent mcp:token dev-team-pm
```

```bash
claude mcp add --transport http delegator http://localhost:5173/mcp --header "Authorization: Bearer $(bun run --silent mcp:token dev-team-pm)"
```

Set `MCP_RESOURCE=http://localhost:5173/mcp` in `.env`, and switch a conference on
(`team/ai-access` as `dev-team-pm`). Tokens last an hour.
