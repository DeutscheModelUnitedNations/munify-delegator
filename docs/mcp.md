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
| `agenda_item_context`                               | An agenda item's points for discussion and published committee text   |
| `graphql_query` / `graphql_schema`                  | Any read-only query, and the schema with redacted fields marked       |
| `read_skill`                                        | A file of an offered skill, for clients without MCP skills support    |
| `createCommittee`, `assignDelegation`, … (about 69) | The mutations that opted in, one tool each                            |

Saved views of the team's tables (`createTableView`, `updateTableView`, `copyTableView`,
`setTableViewDefault`, `deleteTableView`) are shared views only, and the state an assistant
writes filters, sorts and groups only by columns without personal data
(`src/api/mcp/viewStateGuard.ts`).

Changes that reach people outside the team (the conference's stage, unlocking
payments, distributing a survey, publishing an announcement) answer with a preview first and run
only when called again with `confirm: true`.

Announcements can be written, changed, duplicated, published, taken back and mailed again
(`createAnnouncement`, `updateAnnouncement`, `duplicateAnnouncement`, `publishAnnouncement`,
`withdrawAnnouncement`, `renotifyAnnouncement`, `sendAnnouncementTestMail`). An assistant creates
drafts freely; changing, publishing, taking back and mailing again preview first. Deleting an
announcement stays in the app.

Paper reviews are prepared, never sent: `upsertPaperReviewDraft` writes the caller's review draft
of a paper (Markdown in: paragraphs, bold, italic, lists, headings and `> quotes`, taken
literally) and answers a link to the paper's review editor and the quotes the paper's latest
version does not contain word for word; `deletePaperReviewDraft` removes it, and
`myPaperReviewDraft` / `myPaperReviewDrafts` read it back. A draft reaches nobody but its
reviewer. Sending the review is only possible in the app: no tool sends one or changes a paper's
status. Once the reviewer edited the draft in the app, both tools refuse (CONFLICT) unless called
with `overwriteAppEdits: true`. The server does not check that the reviewer agreed, so the
assistant sets it only after asking. A replacement makes the draft the assistant's again: later
changes need no flag until the reviewer edits it in the app once more.

The preparation guide (`docs/plans/guide.md`) is written over MCP as well, so an assistant can
move the old guide.dmun.de in. `graphql_query` reads pages (`guideLibrary`, `guidePage` with
`draftMarkdown` and `versions { markdown }`) and sidebars (`guideOutlineOf`); `createGuidePage` and
`updateGuidePageDraft` take Markdown (preferred) or TipTap JSON, and refuse (CONFLICT) Markdown
that would drop callouts, toggles, buttons or embeds unless `replaceRichBlocks: true`;
`setGuidePageScope` and `ensureGuidePageOf` (committee and agenda item pages) change pages.

The sidebar changes one step at a time, so an assistant does not rewrite JSON it only read:
`addGuideSection`, `updateGuideSection`, `removeGuideSection`, `moveGuideSection` (a section, the
committee template or the topic overview, among the blocks), `addGuideEntry`, `updateGuideEntry`, `moveGuideEntry`
(also into the template), `removeGuideEntry`, `setGuideTemplate`, `moveGuideTemplateSlot` and
`setGuideTopicOverview` (one section with every committee's page and topics, for non-state
actors, supervisors and chosen custom roles; never delegates).
Sections are named by id, entries by section and page, never by index, so another person's change
in between does not hit the wrong entry (a page listed twice in one section is found as its first
entry). `updateGuideOutlineDraft` still replaces the whole draft. Each of them answers the draft
and its `draftUpdatedAt`; passed back as `expectedDraftUpdatedAt`, a draft changed since (in the
app, by someone else) is left alone (CONFLICT), and the app's autosave checks the same way.

The workspace's views read as the team sees them: `guideVisibility` (who sees which section),
`guideCommitteeMatrix` (the committee template against the committees, with missing pages and
progress) and `guidePendingChanges` (pages waiting to be published, whether the sidebar changed).
`publishGuidePage`, `publishGuideOutline` and `publishGuideChanges` (the pending pages, then the
sidebar, like "publish changes" in the app) reach participants and preview first (read
`guidePendingChanges` and `guidePagePublishPreview` for the conferences a page reaches).
`importGuideFile` downloads an image or PDF from the allowed hosts (`GUIDE_IMPORT_HOSTS`, by
default guide.dmun.de and cdn.dmun.de) and answers its id for `file:<id>` in a page. Deleting
pages and restoring sidebar versions stay in the app.

### Agenda item context

`agenda_item_context` (`reviewPapers` or `editGuide`) is what a paper is judged against: the
agenda item, its `discussionPoints` and its published committee text (`agendaItemCommitteeText`:
the published version of its guide page as Markdown, placeholders filled but `{{Diskussionspunkte}}`
left, with a short-lived PDF link; null while nothing is published). An agenda item without points
of its own gets those its committee text lists under "Punkte zur Diskussion" (pages taken over from
the old guide); `discussionPointsSource` says which (`agendaItem`, `committeeText`, `none`). The
points are set with `create`/`updateAgendaItem` or `setAgendaItemDiscussionPoints` (which guide
editors may call too).

## Skills

The server offers skills, instructions for whole tasks, through the MCP skills extension
(SEP-2640, `@modelcontextprotocol/server/ext/skills`; resources `skill://<name>/…`), and names them
in its instructions so an assistant suggests one when a request matches. Clients that do not load
skills read them with `read_skill`. `SKILL_REPOSITORIES` in `src/api/mcp/skills.ts` lists them;
today `papierkorrektur` from the public repository `DeutscheModelUnitedNations/papierkorrektur-skill`.

They are read from GitHub, not bundled: the ref is resolved to a commit (`api.github.com`), and
the listing and every file are read at that commit (files from `raw.githubusercontent.com`), so
a change in the skill's repository reaches assistants without a release. The first MCP request
after start waits for the read (at most 10 s for the whole read). A copy goes stale after an hour
(five minutes after a failure); the first request after that still gets it and starts reading
the skill again in the background, and requests after that read get the new copy. A skill GitHub
does not deliver, or delivers broken (checked strictly before it replaces anything), keeps its
last good copy; one never read is left out, and the server works without it. Links to
`https://delegator.munify.cloud` in text files point at the origin of `MCP_RESOURCE` instead, so
staging and local instances link to themselves. The skills are the same for everyone: they hold
no data, and what they make an assistant do runs with the caller's rights like any other call.

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
(`team/ai-access` as `dev-team-pm`). Tokens last an hour. Start the dev server with `DEV_HTTP=1`
(`DEV_HTTP=1 bun run dev`): it serves HTTPS with a self-signed certificate otherwise
(`vite.config.ts`), which MCP clients refuse.
