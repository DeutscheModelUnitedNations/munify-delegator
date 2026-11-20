# Preparation guide in the DELEGATOR

The preparation material for participants lives on guide.dmun.de today (Ghost). It moves into the
DELEGATOR: a wiki-like guide per conference, edited by the team with a WYSIWYG editor (TipTap),
whose pages can be shared between conferences and years. This document is the plan; nothing is
built yet.

## What guide.dmun.de is today

Crawled on 2026-11-20.

- **Ghost 5.115** with the "Doks" documentation theme. Every guide page is a Ghost post; the
  sidebar per conference is a hand-built list of sections. Top navigation: Home, MUN-SH, MUNBW,
  Ansprechpartner\*innen, Impressum. Search (⌘K). About **175 posts**, under `/mun-sh/…` and
  `/munbw/…` (MUN-SH 2027 and MUNBW 2026 live side by side).
- **Sidebar of one conference** (MUN-SH 2027):
  - one section per committee (GV, SR, WiSo, MRR, UNESCO, WEK, ICAO), each with the same steps:
    _Warum vorbereiten?_, _Schritt 1: Meine Rolle als Delegierte\*r_, _Schritt 2: Auf mein Land
    vorbereiten_, _Schritt 3: Auf mein Gremium vorbereiten – der SR_, _Schritt 4: Auf meine Themen
    vorbereiten_ with one page per agenda item (_– SR TOP1: …_), _Schritt 5: Positionspapier_,
    _Schritt 6: Arbeitspapier_, _Schritt 7: Vorbereitung auf die Debatte_;
  - _Vorbereitung als NA-Vertreter\*in_ (steps 1–7 for non-state actors);
  - _Vorbereitung als Journalist\*in_ (3 pages);
  - _Organisatorisches_ (Ablauf & Locations, Checkliste und Dresscode);
  - _Wichtige Begriffe_ (Akteure auf der Konferenz, Diplomatie, UN-ABC, Völkerrechts-ABC,
    Wichtige Dokumente).
  - MUNBW has the same shape; its IGH (court) has its own steps (_Urteilssätze schreiben_).
- **Almost everything is a copy.** Text similarity of the crawled pages:

  | Pages compared                           | Similarity |
  | ---------------------------------------- | ---------- |
  | Schritt 5, SR vs WiSo (MUN-SH)           | 100 %      |
  | Warum vorbereiten, MUN-SH vs MUNBW       | 100 %      |
  | Schritt 1, MUN-SH vs MUNBW               | 99 %       |
  | Schritt 2, MUN-SH vs MUNBW               | 100 %      |
  | Schritt 5, MUN-SH vs MUNBW               | 94 %       |
  | UN-ABC (49k characters), MUN-SH vs MUNBW | 100 %      |

  What really differs: the agenda item pages (25–32k characters each, with the committee text as
  PDF download, content warning, summary, points for discussion, background, research hints,
  glossary, sources), the committee pages (Schritt 3, which also list the committee's topics) and
  _Organisatorisches_.

- **Copies rot**: slugs were reused across years, so `/munbw/gv-top-1-katastrophenschutz/` shows
  "Klimaflucht" and the WEK lives at `die-fachkommission-fur-suchtstoffe-sh`.
- **Content elements** (count over 25 crawled pages): toggles/accordions 111 (the ABCs, the country
  research questions), callouts with emoji 41 (❓ FRAGEN, 📍 LOCATIONS, points for discussion),
  buttons 27 ("Weiter zum Schreiben des Positionspapiers (Schritt 5)"), images with caption and
  licence 18, file downloads 4 (committee text PDFs, Infopaket), header cards 4, YouTube embed 1,
  blockquotes, horizontal rules, headings H2–H4, many links between pages.
- Pages address the reader with "Sie" (the app's own German uses "du"; guide content is authored
  text and keeps whatever the team writes).

## Decisions

| Topic                  | Decision                                                                                                                                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Sharing modes          | Four scopes per page: **everywhere** (every series, every year), **year** (every series, one year), **series** (one series, every year), **conference** (one conference).                                                                                    |
| Series                 | New entity `conference_series` (MUNBW, MUN-SH), kept by system admins; a conference picks its series. Shared scopes reach **only conferences with a series**, never other organizers' conferences.                                                           |
| Year                   | The **calendar year of the conference start** (in the conference's time zone). MUNBW 2026 and MUN-SH 2027 are different years.                                                                                                                               |
| Who reads              | **Logged in only**, inside the conference dashboard.                                                                                                                                                                                                         |
| When participants read | Only once the assignment is released **and** the new conference toggle "Guide published" is on (assignment may be released before the guide is updated). Team always (preview).                                                                              |
| Audiences              | Delegates (their own committee's section), NSA representatives, custom roles (press, IGH judges, … one by one), supervisors. **Supervisors and team see everything.**                                                                                        |
| Sidebar                | Per conference: ordered sections of entries pointing at pages. A **committee template** (one per conference) is expanded once per committee: shared step pages, the committee's page, its agenda item pages. A delegate sees only their committee's section. |
| IGH and other specials | Custom roles; their sections are built by hand with the custom role as audience. No template variants.                                                                                                                                                       |
| Committee / TOP pages  | Owned by the committee and the agenda item (`committee`, `committee_agenda_item`), edited in the guide editor, filling the template's slots automatically.                                                                                                   |
| Committee text PDF     | **Generated with Typst from the agenda item page when it is published**, stored as a file and offered on the page (and reusable by the paper hub and MCP). No upload.                                                                                        |
| Shared edits           | **Draft and publish.** Page content, page scope and the sidebar (incl. the committee template) are drafts until published. Every publish keeps a **version** to view and restore.                                                                            |
| Placeholders           | A few fixed ones in pages: `{{Konferenz}}`, `{{Gremium}}`, `{{Themen}}` (list of the committee's agenda items).                                                                                                                                              |
| Editing rights         | New team permission `editGuide` (content lead, project management). Pages beyond one conference may be edited and published by holders of `editGuide` in **any conference the page reaches**. System admins always.                                          |
| Editor                 | TipTap with the guide blocks (below). Rich blocks are fine in the editor even where Markdown has no syntax for them.                                                                                                                                         |
| Participant view       | Sidebar, page, **table of contents** from headings, **previous/next** following the sidebar. No search, progress tracking or section PDFs in the first version.                                                                                              |
| Old link               | `conference.linkToPreparationGuide` stays as a fallback: the dashboard shows the internal guide when "Guide published" is on, otherwise the external link as today. Removed later.                                                                           |
| Migration              | **Out of scope for the code.** An AI assistant migrates the content over MCP after deployment (playbook at the end).                                                                                                                                         |
| MCP                    | Full guide support: read, write drafts, publish with preview (`confirm: true`), import files from allowlisted URLs. **Markdown first**, TipTap JSON as an alternative for rich blocks. Deleting stays in the app.                                            |
| Delivery               | This document first. Implementation only after review.                                                                                                                                                                                                       |

## Data model

### Series and conference

- `conference_series`: `id`, `name` ("MUN-SH"), `abbreviation`, timestamps. System admins manage
  it on a new page under the account menu (like Slack workspaces).
- `conference.seriesId` (nullable, `restrict` on delete), `conference.guidePublished` (boolean,
  default false). The year is derived (`extract(year from start_conference at time zone timezone)`),
  not stored.

### Pages

`guide_page`, one row per page, holding the **draft**:

- `id`, timestamps, `kind`: `GENERAL` | `COMMITTEE` | `AGENDA_ITEM`
- draft scope: `seriesId` (nullable), `year` (nullable int), `conferenceId` (nullable)
  - everywhere: all three null; year: `year`; series: `seriesId`; conference: `conferenceId`
  - a `check` allows exactly these four shapes; `COMMITTEE`/`AGENDA_ITEM` pages are always
    conference-scoped
- `committeeId` (kind `COMMITTEE`, unique), `agendaItemId` (kind `AGENDA_ITEM`, unique)
- `title`, `content` (TipTap JSON), `draftUpdatedAt`, `draftUpdatedBy`
- `publishedVersionId` (nullable) and the **published scope** copied from that version
  (`publishedSeriesId`, `publishedYear`, `publishedConferenceId`), so "which published pages reach
  conference X" is one indexed query.

`guide_page_version`: `id`, `pageId`, `number`, `title`, `content`, scope (the four fields),
`publishedAt`, `publishedBy`, `pdfFileId` (agenda items: the generated committee text). Restoring a
version copies it into the draft; publishing makes a new version.

Triggers (the "Database" rules in CLAUDE.md): `guide_page` reaches a conference through
`conferenceId`, `committeeId` and `agendaItemId`, so it gets an `assert_same_conference` trigger in
its migration (`guide_page_same_conference`), mapped in `databaseRuleError`.

A page is "used by" a conference when its published scope reaches the conference **and** the
conference's published sidebar names it. Pages are deleted only when no published sidebar names
them (CONFLICT otherwise); committee and agenda item pages go with their row.

### Sidebar (outline)

`guide_outline`, one per conference: `conferenceId` (unique), `draft` (jsonb), `published` (jsonb,
nullable), `publishedAt`, `publishedBy`; `guide_outline_version` keeps every published outline.
The outline is one document (like document layouts: meaningful only whole), validated by a zod
schema in the service:

```ts
type Outline = {
	sections: Array<{
		id: string;
		title: string;
		audience: Audience; // who sees the section
		entries: Array<{ pageId: string; label?: string; audience?: Audience }>;
	}>;
	// expanded once per committee, placed at `position` among the sections
	committeeTemplate?: {
		position: number;
		titleFormat: 'COMMITTEE_NAME';
		slots: Array<
			| { type: 'page'; pageId: string; label?: string }
			| { type: 'committeePage'; label?: string }
			| { type: 'agendaItemPages' } // one entry per agenda item, indented
		>;
	};
};
type Audience =
	| { type: 'everyone' }
	| { type: 'delegates' }
	| { type: 'nonStateActors' }
	| { type: 'customRoles'; roleIds: string[] }
	| { type: 'supervisors' };
```

The committee sections have the audience "delegates of this committee". Publishing an outline
checks that every page it names is published and reaches the conference.

### What a reader gets

One service function computes a reader's guide for a conference: the published outline, expanded
and filtered by the reader's part (delegation member → committee of their seat; NSA; custom role;
supervisor/team → all). Participants never read `guide_page` through the table: the resolvers
`myGuide(conferenceId)` (outline) and `guidePage(conferenceId, pageId)` (one page, with
placeholders filled and prev/next) check that the page is in the reader's guide. Team members with
`editGuide` read drafts and versions through the table's ability (pages reaching a conference where
they hold the permission).

## Editor and blocks

Built from the paper editor's TipTap setup (`src/lib/components/paper/editor/`), as its own
extension set:

| Block                                                                           | Editor                        | Markdown (MCP)                     |
| ------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------- |
| Headings H2–H4, paragraphs, bold, italic, lists, links, blockquote, rule, table | yes                           | plain Markdown                     |
| Image with caption                                                              | yes                           | `![caption](file:<fileId>)`        |
| Link to another guide page                                                      | yes                           | `[text](guide:<pageId>)`           |
| File download                                                                   | yes                           | `[label](file:<fileId>)`           |
| Placeholder                                                                     | yes                           | `{{Gremium}}`                      |
| Callout (emoji, colour)                                                         | yes                           | TipTap JSON only                   |
| Toggle (collapsible)                                                            | yes                           | TipTap JSON only                   |
| Button link                                                                     | yes                           | TipTap JSON only (or a plain link) |
| Video embed (YouTube)                                                           | yes, loads only after a click | TipTap JSON only                   |

A link to a page resolves per conference to that page's place in the reader's sidebar; a page not
in the reader's guide shows as plain text. "Weiter zu Schritt 5" buttons become unnecessary with
automatic prev/next, but stay possible.

Team UI (all under `team/guide/…`, in `teamRoutes`, each with a tour):

- **Pages**: the library of pages reaching this conference, with scope badge, draft/published
  state, "used in the sidebar", filters by scope and kind. Create page (scope picker showing the
  four modes as a 2×2 grid).
- **Page editor**: title, scope, TipTap, preview (as a chosen audience/committee), publish with a
  list of the conferences the publish reaches, versions with restore. Agenda item pages show the
  generated PDF of the last publish.
- **Sidebar**: builder for sections, entries, audiences and the committee template; preview "as"
  delegate of committee X / NSA / custom role / supervisor; publish.
- Conference configuration: series, "Guide published" toggle.

Participant UI: `dashboard/[conferenceId]/guide/[[pageId]]` with sidebar (drawer on phones),
page, table of contents, previous/next; a dashboard card replaces the external link when the guide
is published.

## Committee text PDF (Typst)

Publishing an agenda item page renders it with a Typst template kept in the repo (header with the
conference's logo/emblem, committee, agenda item title, the page content incl. images and
sources) via `compileTypst` (`src/api/services/typst.ts`). A TipTap → Typst converter (unit tested)
covers every block; images are written next to the source. The PDF is stored (`stored_file`) on the
version and linked on the page. A failed render fails the publish with a message.

## Permissions

- New team permission `editGuide` in `TEAM_PERMISSIONS`, granted to `CONTENT_LEAD` and
  `PROJECT_MANAGEMENT`.
- **Edit/publish a page**: the caller holds `editGuide` in at least one conference reached by the
  page's current published scope **and** one reached by its draft scope (so nobody can pull a page
  out of others' reach without being one of them). Committee/agenda item pages: `editGuide` in
  their conference.
- **Edit/publish a sidebar**: `editGuide` in that conference.
- **Read**: see "What a reader gets". Supervisors and team: whole guide, still only after the
  "Guide published" toggle for supervisors.
- e2e under `e2e/authorization/guide.spec.ts`.

## MCP

Only for conferences with AI access switched on, acting as the connected team member (same rights
as above).

| Tool                                                               | What it does                                                                                                                                                     |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `guidePages`                                                       | Pages reaching a conference, with scope, kind, state, where they are used                                                                                        |
| `guidePage`                                                        | One page's draft and published version, as Markdown (default) or TipTap JSON                                                                                     |
| `createGuidePage` / `updateGuidePageDraft`                         | Writes a draft from `markdown` **or** `tiptap`; Markdown that would drop rich blocks already in the page is refused unless `replaceRichBlocks: true`             |
| `publishGuidePage`                                                 | Preview first (conferences reached, diff summary), runs with `confirm: true`                                                                                     |
| `guideOutline` / `updateGuideOutlineDraft` / `publishGuideOutline` | Sidebar and committee template, publish with preview                                                                                                             |
| `importGuideFile`                                                  | Server downloads a URL from an allowlist (`GUIDE_IMPORT_HOSTS`, default `guide.dmun.de`, `cdn.dmun.de`), checks type and size, stores it and answers the file id |

Markdown ↔ TipTap extends `reviewMarkdown.ts` with the guide marks/nodes above; reading a page with
callouts/toggles as Markdown says which blocks were left out.

## Migration playbook (for the assistant, after deployment)

1. Create the series MUN-SH and MUNBW (app), assign MUN-SH 2027 and MUNBW 2026.
2. Crawl guide.dmun.de (sitemap `sitemap-posts.xml`, sidebar from any post page).
3. Group near-identical pages (≥ 95 %): one page each, scope **everywhere** (generic steps, ABCs,
   Diplomatie, Wichtige Dokumente, NSA and press steps); MUN-SH/MUNBW variants that differ →
   **series** scope; Organisatorisches → **conference**.
4. Committee pages → the committees' pages; TOP pages → the agenda items' pages (the committee
   text PDF is regenerated, not imported).
5. Images and other files via `importGuideFile`.
6. Build each conference's sidebar with the committee template, NSA, press, organisational and
   glossary sections; publish pages, then sidebars, each after the preview.
7. Hand over a report of every merge and scope decision.

## Phases

1. Series, conference fields, `guide_page` (+ versions), outline, permissions, services, GraphQL,
   pubsubs, triggers; seed (series on the seed conferences, a sample guide with every audience).
2. Team area: pages, editor with guide blocks, sidebar builder, preview, publish, versions; tours;
   manual pages (`docs/de`, `docs/en`).
3. Participant view, dashboard card, fallback link.
4. MCP tools, Markdown converter, file import.
5. Typst committee text.

Each phase with unit tests and e2e (incl. empty and error states), as one PR series.

## Assumptions to confirm

- "Supervisors" as an audience means supervisor-only pages exist; supervisors also see everything
  else.
- Custom roles of single participants include press and IGH; NSAs are a role kind of their own.
- Before the "Guide published" toggle, supervisors see nothing either.
- Placeholders that need a committee (`{{Gremium}}`, `{{Themen}}`) are allowed only in pages used in
  the committee template; elsewhere the editor warns.
- Past (`POST`) conferences keep showing what is published now (no freezing per conference).
