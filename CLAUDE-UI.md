# UI Design Guide

Components and UI rules. Data fetching, forms and route params: see CLAUDE.md. Keep this file in
sync with `src/lib/components/` when adding, changing or deprecating components.

## Design Principles

Match existing patterns first; DaisyUI components and utilities over custom CSS; minimal, clear
hierarchy; Svelte 5 runes only; accessible by default (blind and low-vision participants attend).

## Accessibility

`e2e/accessibility/accessibility.spec.ts` runs axe-core (WCAG 2.2 A/AA, serious + critical) over the
public and participant pages, contrast in the high contrast variant, plus keyboard paths.

- **Dialogs** go through `Modal`, `Drawer`, `ActionModal` or bits-ui `Dialog`. A hand-rolled one
  gets `role="dialog"` (or `alertdialog`), `aria-modal="true"` and `{@attach modalFocus(close)}`
  (`#lib/helpers/modalFocus`: focus in, Tab trapped, Escape closes, focus returns to opener). One
  that stays mounted: `{@attach open ? modalFocus(close) : undefined}`. Unlabelled, it is named by
  its first heading. Backdrop button gets `tabindex="-1"`.
- **One `<main id="main-content" tabindex="-1">` per page** (skip link target), held by the layouts
  (`(authenticated)`, `docs`); pages outside them bring their own. Components never render `<main>`.
- **Icon-only controls take `aria-label`.** Tooltips (`data-tip`, `title`) are hover-only, so an
  icon carrying meaning (status, table header) repeats it as `<span class="sr-only">`. A button with
  visible text is named by that text, not an `aria-label` that doesn't contain it (voice control).
- **State is never colour alone**: `aria-pressed` on toggles, `aria-selected` on tabs, `aria-sort`
  on sortable headers (with a `<button>` inside). Looks disabled = real `disabled`, not just `btn-disabled`.
- **Clickable rows** keep table semantics: row `onclick` for the mouse, a real `<a href>` in a cell
  for everyone else (`PaperTable`); never `role="button"` on a `<tr>`. Lists open an entry from the
  whole row: `rowClick` / `CLICKABLE_ROW` (`#lib/helpers/rowClick`) skip the row's own controls and
  text selections; `PersonNameButton` is the name cell that opens the user card by keyboard.
- **`<dl>`**: each `<div>` holds exactly one `<dt>`/`<dd>` pair (an icon goes inside the `<dt>`).
- **High contrast** (`#lib/helpers/contrast`, footer `ContrastToggle`, or system "increase
  contrast") sets `data-contrast="more"`; `app.css` darkens semantic colours and lifts muted text.
  Opacity-muted text (`text-base-content/60`, `opacity-50`) is fine; don't hard-code colours around it.
- **Every icon is `aria-hidden="true"`** (Phosphor glyphs are read out as stray characters, even in
  a button's name); `src/lib/icons.test.ts` fails on an empty `<i>` without it.
  `SquareButtonWithLoadingState` takes a required `label`.

## Component Library Overview

Components live in `src/lib/components/`: directories `camelCase`, files `PascalCase`
(`dataGrid/DataGrid.svelte`), as in munify-chase. Key directories: `calendar/`, `form/`
(superforms inputs), `dashboard/`, `dataGrid/`, `navMenu/`, `navigation/`, `tabs/`, `table/`,
`delegationStats/`, `infoGrid/`, `charts/echarts/`, `paperHub/`, `survey/`, `chat/`,
`announcement/`, `email/`, `scanner/`, `teamManagement/`, `userCard/`. Route-local components that
set a pattern are documented below too (Seat Planning, Assignment Board, Calendar Editor).

## DetailedPaperStats Component

`#lib/components/paperHub/DetailedPaperStats.svelte`: Paper Hub statistics. Props `allPapers`
(flat: `type`, `status`, `versions { reviews { id } }`) and `committeesWithPapers` (`name`,
`abbreviation`, `papers`). Shows totals, review-progress and acceptance-rate (accepted / non-draft)
gauges, papers by type, status by type (stacked), committee breakdown. Charts from
`#lib/components/charts/echarts/index`: `BarChart`, `MultiSeriesBarChart`, `GaugeChart`, `EChartsBase`.

## Team Management Components

`src/lib/components/teamManagement/`:

- **`InviteTeamMembersModal`** (`bind:open`, `conferenceId`): two steps (enter emails, then review
  and assign roles). Parses comma/semicolon/newline lists, checks each address's status (existing
  user, new, pending invitation, already member), a role per invitee, warns on external domains.
- **`PendingInvitationsTable`** (`invitations`: `id`, `email`, `role`, `expiresAt`, `userExists`,
  `invitedBy`): email, role, account status, expiry (expired dimmed), inviter; copy link, resend,
  revoke.
- `TeamManagementPage` (`team/`) frames the members and invitations pages (tabs + invite button);
  it is a component, not a layout, because a route group would hide the pages from the breadcrumbs.

## Calendar Components

`src/lib/components/calendar/`:

- `CalendarDisplay`: `days`, `timezone` (IANA, default `'UTC'`). Day tabs on small screens, columns side by side on 3xl+; picks "today" in the conference timezone; per-day track filter
- `CalendarDayView`: `dayName`, `date`, `tracks`, `entries`, `filterTrackId`, `timezone`, `onEntryClick`. One day's hour grid with entries and the "now" marker
- `CalendarTimeMarker`: `startHour`, `endHour`, `hourHeight`, `timezone`. Red "now" line, positioned via `Intl.DateTimeFormat` in the conference timezone
- `CalendarEntryCard`: One entry as a coloured card: icon, name, time, room, track
- `CalendarEntryDrawer`: Slide-out details: place, map, site plan (opened by entry click)

## Calendar Editor (team/calendar)

`team/calendar/` has three tabs: **Calendar** (the editor), **Days & tracks**, **Places**.

### CalendarEditor

`CalendarEditor.svelte` draws every day side by side, a column per track, on one time axis. It is
the **only** place entries are moved (no list, move or sort-order form).

Gestures: drag a card to move it in 15-min steps (sideways: track; another day column: day); drag
top/bottom edge to resize (≥ 15 min), left/right edge to span more tracks of its day (≥ 1);
click/drag empty space for a new entry (an hour from the click or the dragged range, sideways for
several tracks); click / Enter opens the entry form (Duplicate, Delete in its footer); on a focused
card arrows move 15 min / one track, Shift moves the end / right edge, Delete asks; Escape cancels a drag.

- An entry runs on a **run of consecutive tracks** (`calendarEntry.tracks`, join table
  `calendarEntryToCalendarTrack`; API takes `calendarTrackIds`), at least one. No "no track = all
  tracks": a new track picks up nothing; deleting a track deletes entries that ran on it alone. A
  moved entry keeps its width, squeezed where the target day has fewer tracks. The form's "Track …
  to …" selects set first and last track.
- **A track is the conference's, not a day's** (`calendarTrack.conferenceId`); the days it runs on
  are `calendarDayToCalendarTrack` (`calendarDay.tracks`). Copying/moving entries keeps tracks by
  id, never by name. `setCalendarTrackOnDay` (off) takes that day's entries off it and deletes those
  left on none; deferred triggers refuse an entry on a track its day doesn't run. A track names its
  committees and roles (`calendarTrackToCommittee`, `calendarTrackToConferenceRole`); the
  dashboard timeline (`entriesForSeat`, `seatOf`) follows them. Only an imported day file names
  tracks by name: import reuses the conference's track of that name (names are unique).

### Structure

- `calendarGrid.ts`: pure geometry/drag maths: snapping, `dragSpan`, `createSpan`, column grid, drop target, overlaps, lanes, `keyAction`
- `calendarEditor.svelte.ts`: State: drag in progress, optimistic saves in a `SvelteMap` over the live data, undo toast, rollback with the server's message
- `CalendarEditor.svelte`: pointer handling (one `pointerdown` on the grid; the pointer stays captured so a card can change column mid-drag), layout
- `EditorEntryCard.svelte`: One card and its resize edges
- `EntryFormModal.svelte`: Entry details: day, track, times + duration chips, colour, icon presets, place, room
- `DaysTracksTab`, `TrackMatrix`, `DayFormModal`, `TrackRowFormModal` (.svelte): Matrix: days as columns, tracks as rows, a checkbox per cell; select/deselect all; plus button (track on every day, for picked committees/roles); drag a row's grip to reorder

### Rules

- **Day order comes from the date**; days have no sort order; the day form sends only name and date
  (`dayFields`). Tracks are ordered with the arrows (`trackOrderChanges` renumbers).
- **Times are wall-clock minutes stored as UTC**, written back with `dateAtMinutes`; a drag ends at
  23:45 at the latest.
- **The hour range follows the saved entries, not the drag** (grid doesn't shift under the pointer),
  with an hour of room; "Whole day" shows 00:00–24:00.
- **Unit tests run Svelte's server build**, where a `$derived` is computed once: read derived state
  after the last change; leave the live overlay to `e2e/calendar/`.

## RoleFlag Component

`#lib/components/RoleFlag.svelte`: a nation's flag or a non-state actor's icon (via `Flag`),
nothing without a role. `role` as selected (`assignedRole { kind icon nation { alpha2Code } }`),
optional `size` (default `xs`). For the name, narrow with `splitRole` (`#lib/helpers/conferenceRole`).

## Kbd Component

`#lib/components/Kbd.svelte`: shortcut hint. `hotkey` (`"alt+a"`, `"shift+enter"`), `size`
(`'xs' | 'sm'`, default `'sm'`). On macOS shows `⌥ ⇧ ⌃ ↵`; elsewhere text; SSR-safe (text by default).

## Form Components (Critical)

Forms are superforms SPA forms submitting through a mutation (see "Forms" in CLAUDE.md). Build them
with **`mutationForm({ initial, validators, save, toastProgress })`**
(`#lib/components/form/mutationForm.ts`): validated on input, never reset, errors toasted,
`save(data)` once valid, generic progress toast unless `toastProgress: false`. Prefer it over
spelling out the superForm options.

### FormSection (long forms)

Long forms (profile, conference settings) group fields with `FormSection` (`title`, `icon`,
optional `description` on the left, fields on the right, groups separated by a rule, not boxed); lay
related fields side by side with a `grid` inside. `<FormSection title={m.address()} icon="house">`.

`FormImage`: image upload (drop zone, preview, replace, discard), fills the same `File` field as
`FormFile`; `storedUrl` previews what the server holds.

### FormFieldset (Required for Grouping)

Outside `FormSection` layouts, **always** wrap related inputs in `FormFieldset` (`title`, `icon`
snippet before the title). `plain` drops its frame and makes the title a small uppercase heading,
for groups that share one larger surface (a wide dialog in regions, divided by
`border-base-content/10` lines rather than boxed one by one).

### Available Form Components

Fields take `form`, `name`, `label` (plus as listed):

- `Form` (`form`, `showSubmitButton`, `action`): wrapper with submit button
- `FormTextInput`: `labelIcon` (snippet), `type`, `step`, `placeholder`
- `FormTextArea`, `FormCheckbox`, `FormDateTimeInput`, `FormFile`; `FormSelect`: `options`
  (`{ value, label }[]`)
- `FormSubmitButton` (`form`, `disabled`, `loading`)
- `AddressRegionField`: `form`, `name`, `rules` (`addressRules(country)`), `disabled`; hidden where the country has no region
- `AddressFields`: `form`, `fields` (`ADDRESS_FIELDS`), `rules`, `disabled`; postal code/city/region per country
- `AddressSection`: `form`, `fields`, `rules`; `AddressFields` inside the "Address" `FormSection`
- `SchoolPicker`: `form`, `name` (`schoolName`), `idName` (`schoolId`), `label`, `description`, `disabled`

**`SchoolPicker`** is how every form asks for a school (applications, joining a delegation, waiting
list, supervisors), always the person's own. Binds both fields of `schoolChoiceSchema`
(`#lib/schemata/schoolChoice.ts`): typing searches `searchSchools` (≥ 2 chars, debounced) and clears
`schoolId` (a new name creates a school on save); a suggestion sets both; "Keine Schule angeben"
clears both (a school is always optional). A hint line says which. To change one later:
`SchoolChangeForm` (`current`, `save(choice)`, `onSaved`, `requireTaintedToSubmit`) in a `Modal` or
inline; `SchoolLine` (`#lib/components/userCard/sections/`) is the list row with that button;
`stages/Common/MySchool.svelte` is the caller's own on the dashboard (`setParticipantSchool` without `id`).

## Modal Component

`#lib/components/Modal.svelte`: closes on backdrop click or Escape, `role="dialog"` named by
`title` (or first heading), keeps and returns focus (`modalFocus`). Props: `open` (bindable),
`title`, `fullWidth` (90%), `wide` (`max-w-3xl`, for reading text), `wider` (`max-w-5xl`, column pickers), `children`, `action` (footer snippet), `onclose`. With a form inside,
use `<Form {form} showSubmitButton={false}>` and submit from the `action` buttons.

Footer buttons go in `{#snippet action()}…{/snippet}` (Cancel `btn`, confirm `btn btn-primary`).

### ActionModal and ConfirmDeleteModal

For a confirmation (with or without a few fields) prefer these to a hand-built `Modal`. Both are
**always open**: render inside `{#if}` and close in `onClose` (cancel and backdrop call it).

- `ActionModal`: `title`, `confirmLabel`, `loading`, `onConfirm`, `onClose`, children; also
  `subtitle` (snippet), `confirmClass`, `confirmDisabled`, `bodyClass`, `boxClass`.
- `ConfirmDeleteModal`: `title`, `text`, `onConfirm` (async; it tracks its own loading), `onClose`.

### EmailPrompt (offering mails after an action)

No mutation sends mail. A team action that makes mails due offers them with
`#lib/components/email/`: `const emailPrompt = createEmailPrompt()`, then after the mutation
`void emailPrompt.offer({ conferenceId, kinds: ASSIGNMENT_KINDS })`, and render
`<EmailPrompt prompt={emailPrompt} />`. It opens only when something of those kinds is owed and the
caller may manage mails; "Later" leaves them on the e-mail page.

## Drawer Component

`#lib/components/Drawer.svelte`: slide-out panel (details, edit forms); focus-keeping dialog named
by `title` (or `category`), closes on Escape. Props: `open` (bindable), `category`, `title`,
`loading` (spinner), `width` (default `34rem`), `onClose`.

## SlidePanel Component

`#lib/components/SlidePanel.svelte`: base for animated edge panels (dataGrid `SideDrawer`,
`CalendarEntryDrawer`). A bits-ui `Dialog` with Svelte transitions (focus trap, Escape, overlay
click included); no swipe-to-dismiss. Put bits-ui `Dialog.Title` / `Dialog.Close` inside. Props:
`open` (bindable), `direction` (`'top' | 'right' | 'bottom'`, default `'right'`), `class` (max
width/height, rounding), `keepFocus` (don't move focus in on open), `children`.

## BarcodeScanner Component

`#lib/components/scanner/BarcodeScanner.svelte`: camera scanning with device switching and manual
input fallback. Every code read or typed is checked against `acceptance` (`scanAcceptance.ts`,
signatures included) before it reaches `scannedCode`; refusals are toasted. `QuickScan` (command
palette camera) takes the same `acceptance`.

- `scannedCode`: Bindable `string | null`: a bare signed code, or the user id as read/picked; `userIdOfCode` gives the user
- `acceptance`: `ScanAcceptance`: `conferenceId`, signed code `kinds` (`live`, `print`), `printedNametags` (unsigned 1D barcodes count)
- `persistKey`: localStorage key for the camera preference
- `barcodeFormats`: default `['qr_code', 'code_128']`
- `manualPlaceholder`, `scanPromptText`: Texts for the manual field and while scanning
- `cameraZIndex`: z-index class of the preview (default `'z-30'`)
- `extraControls`: Snippet between camera settings and input

Exposes `reset()` (clears the code, restarts camera or refocuses input); call it via `bind:this`
after saving. Typical binding into URL state:
`bind:scannedCode={() => params.queryUserId, (code) => (params.queryUserId = code ? userIdOfCode(code) : code)}`.

## Dashboard Components

`#lib/components/dashboard/`:

- **`DashboardSection`**: `icon` (Phosphor name without `ph-`), `title`, `description`, `variant`
  (`"default" | "info"`, blue), `collapsible`, `defaultCollapsed`, `collapsed` (bindable),
  `headerAction` (snippet), `id` (anchor target), `tourAnchor` (`data-tour` for guided tours, see
  CLAUDE.md "User manual, help and tours").
- **`DashboardLinkCard`**: title, description, and an `info` snippet for live details the card
  fetches itself (e.g. `CalendarLinkInfo`: what's on now and the next two things on the caller's
  track; `MessagesLinkInfo`: unread chats). A link definition (`dashboardLinks.ts`,
  `teamDashboardLinks.ts`) sets `info` to a component receiving `conferenceId`;
  `DashboardLinkCards` and the quick links pass it on. Team members' cards sit without a section
  box, below `TeamWaiting` (`stages/TeamMember/`, from `teamWaiting.ts`).
- **`DashboardContentCard`**: `title`, `description`, children.
- **`ConferenceHeader`**: `title`, `longTitle`, `state`, `startDate`, `endDate`, `emblemDataURL`.
- **`StatusChecklist`**: progress bar, open steps first, done ones struck through. `steps`:
  `{ task, status, hint?, href? }` with status `DONE | PENDING | PROBLEM | NOT_YET_POSSIBLE`; an
  open step's `href` links where it is done (anchor via `DashboardSection` `id`). `legend={false}`
  drops the notes explaining open statuses.
- **Registration flow** (`routes/(authenticated)/registration/[conferenceId]/`): every page is in
  `RegistrationStepPage`: a way back, a stepper for the page's path (`registrationSteps.ts`;
  choosing the path on the dashboard is step 0), content in a `DashboardSection`.

## Announcement Components

`#lib/components/announcement/` (see "Announcements" in CLAUDE.md):

- **`AnnouncementCard`**: one announcement as readers see it. Edge colour, icon and badge follow
  `importance` (badge says it in words too); `read={false}` shows "New" and, with `onread`, a "mark
  as read" button. Long text folds until opened (never for urgent, or with `expanded`). Without
  `read` it is a preview (the editor). Parts: `AnnouncementBadges`, `AnnouncementAttachments`.
- **`AnnouncementFeed`**: with `limit` (dashboard) pinned + unread + newest and a link to the rest;
  without, all. Renders nothing when empty unless `showEmpty`.
- **`UrgentAnnouncementBar`**: header bar while an urgent one is unread.
- Fetch via `fetchAnnouncementFeed`, mark via `markAnnouncementsRead` (`#lib/api/announcements`),
  so feed and bar share one result and one read state.
- **Team list** (`team/announcement/+page.svelte`): rows drawn inline (see `rowView`), each a grid
  of fixed columns (`.announcement-grid`, `lg` and up, with a header row): title with icon-only
  badges (`RowBadge.tone`) and audience chips, state badge with icon (`STATE_LOOK`), short date
  (`rowCells.when`, until, edited), read count with bar (`rowCells.reach`), author, icon buttons.
  Short cells are `aria-hidden`; the full `rowFacts` sentences sit beside them as `sr-only` (and as
  `title`), keeping the `announcement-<fact>` test ids. The row edits on click (`onRowClick`
  skips its buttons and text selection), the title is the keyboard's button (`announcement-edit`).
  `splitActions`: publish in sight, the rest behind `announcement-more`. State chips (`STATE_ORDER`) once several states exist.
- **Editor** (`AnnouncementEditor`): `plain` fieldsets in two rows: content (with attachments)
  beside the preview (sticky on wide screens), then audience beside settings. Importance is a
  segmented radio group coloured like the card, toggles carry their hint beneath the label.
  The reach count (`AudienceCount`) fetches in an `$effect`, not
  `$derived(await …)`: awaited, it would hold back every change to the audience (chips included)
  until the server had counted. The old count stays, dimmed, while a new one loads.
  Audiences are added through one search (`AudienceSearch`, a combobox over `audienceSections`:
  groups, committees, roles, survey answers, team). An option a picked block always holds
  (`audienceCovers` in `#lib/helpers/announcements`, true at every stage) is `aria-disabled` with
  the reason; adding a wider block drops the narrower ones (`addAudience`) and says so.
  The search is multi-select: picked options stay, checked (`aria-selected`), and choosing one
  again takes it out; Backspace in the empty field takes out the last; "remove all" from two on.
  Order: search, chips, `SUGGESTED_AUDIENCES` not picked yet (one click, disabled when covered),
  then the reach count and hint as quiet `text-xs` lines below a divider.

## Chat Components

`#lib/components/chat/` (see "Messages" in CLAUDE.md). Both messages pages
(`dashboard/[conferenceId]/messages`, `team/messages`) are a `ChatWorkspace` with their own list header.

- **`ChatWorkspace`**: list beside the open chat (taking turns on a phone). `chats` (`fetchChats`,
  `#lib/api/chats`), `selectedId`, `onSelect` (keep `?chat=` in the URL via `queryParameters`),
  snippets `listHeader`, `emptyList`, `listFooter`, `noSelection` (the pane while nothing is open).
  Its height is guessed from the window, or with `fill` taken from a flex parent (participant page:
  fixed-height page column). Surfaces, not frame lines: a `bg-base-200` list column, a faint ring,
  `border-base-content/10` dividers. The thread and composer keep to a `max-w-4xl` column.
- **Participant messages page**: compact header, `ChatStartPane` beside the list (delegation group,
  team inboxes without single trusted persons, "new message", the role-not-name note) through
  `createChatOpener` (`chatOpener.svelte.ts`, shared with the picker). `ChatSettingsMenu` (gear in
  `ChatListHeader`'s `actions`) holds the unread-mail switch and the terms.
- **`ChatThread`**: fetches itself by `chatId`, marks read while on screen, messages by day,
  composer (Enter sends, Shift+Enter breaks) or why the caller can't write (`chat.writeRefusal`).
  Menu blocks and reports. Reviewing a report: `ChatReviewBanner`, plus each open report (`reports`) as a
  note where it was filed (`placeReports`: above the next message, before its day's heading if
  filed on a quieter day, or closing the thread). `firstUnreadId` (`threadMessages.ts`), taken once on
  open: `ChatMessages` draws "new messages" above it and the thread opens there, until reopened.
  What one author writes within five minutes shares one bubble (`runsOf`; unread/reported lines
  break a run), author name inside at the top, last time at the bottom, full time on hover. The
  thread follows new messages only near the end or for the caller's own; otherwise
  "jump to new messages" appears. The composer keeps a draft per chat (module map) and takes focus
  on fine pointers.
- **Motion**: switching chats is a view transition (`chatViewTransition`, `data-chat-transition`,
  names `chat-list`/`chat-pane`, CSS in `app.css`): the pane cross-fades, on a phone list and
  thread slide. `ChatWorkspace` swaps `shownId` (bindable, for the page around) inside it. Bubbles
  fly in, the list reorders with `flip`, unread badges pop; Svelte transitions take
  `prefersReducedMotion` into account, CSS ones a reduced-motion query.
- **Report desk** (`team/messages/ReportDesk.svelte`, "Reports" in the team menu, participant
  care): three columns, taking turns when narrow. `ReportQueue` (a case per reported chat, longest
  waiting first: `reportCases`, `waitingSince`), the chat's read-only `ChatThread`, `ReportCaseFile`
  (everyone of the chat by name and role, delegation group members included, with earlier
  settled reports; suspension switch; `WriteToDelegateButton`; user card; the internal note settling
  all the chat's reports, `resolveChatReports`). `SettledReports` keeps settled ones with notes.
  Same surfaces as the messenger: one ringed frame, queue and case file as `bg-base-200` columns,
  queue rows like chat list rows, the case file scrolls with note and "settle" pinned below.
  Reviewing, the thread header shows no card buttons (the case file has them).
- **Corners follow the theme**: `rounded-box` (cards, panels, bubbles), `rounded-field` (small
  things); never `rounded-lg` / `rounded-xl` (DMUN's theme is near-square).
- **`NewChatDialog` / `NewChatPicker`**: one search over role, country, committee (`matchesSearch`:
  every word must match, "ger ga" works), chips per committee, team inboxes and delegation group on
  top. `mode="team"`: person first, then the inbox to write from.
- **`WriteToDelegateButton`**: `conferenceId`, `participantId`, optional `paperId`, `compact` (icon
  only, table rows); asks for inboxes on click.
- **`FilterChips`** (`#lib/components/FilterChips.svelte`, shared): "all" first, pressing the
  pressed chip lifts the filter; `options` (with `key`), `selected`, `onSelect`, `label`, `chip`
  snippet. `CommitteeChips`, the team inbox chips and the announcement state chips build on it.
- **Team messages**: one team-menu entry (`MessagesNavButton`, dot while unread) plus "Reports" for
  participant care (dot while one waits, `?view=reports`). System admins get participant care's
  inbox and both of every committee (`inboxesOf`), never the trusted persons'. Page and menu read
  `fetchTeamInboxes` + `teamInboxesOf`.
  `team/messages` is always the messenger (`InboxChats`, `fill`): every inbox's chats in one list,
  inbox chips (`FilterChips`, unread per chip, only with several inboxes) set `?inbox=`, a red
  banner links waiting reports, the bell in the list header links the notification settings.
- **Archive**: `ChatArchiveButton` (thread header, team side) toggles it; archived chats are hidden
  until `ArchiveToggle` in `InboxChats` (`?archive=1`) lists them after the open ones, marked
  (`listedChats`).
- **Small parts**: `ChatList` → `ChatListItem`, `ChatMessages` → `ChatBubble`, `ChatThread` →
  `ChatThreadHeader`, picker → `PickerTeamOptions`, `PickerContactGroups`, `PickedContactInboxes`.
  Decisions live in tested helpers, not templates: `listBadge`, `kindHint` (`chatLabels.ts`),
  `unreadStateOf` (`threadMessages.ts`), `inboxChoice` (`inboxChoice.ts`).
- **`MessagingTermsModal`**: the terms (`messagingTerms`), loaded on open in a boundary with
  skeleton and `LoadError`; the composer opens it with `onAccepted` when the API asks for consent.
  `ChatSettingsMenu` shows them. `MessagingTermsChecklist`: a
  disclosure per section (`MessagingTermsSection`, title + summary on the button, `aria-expanded`);
  when agreeing, the first opens, "Understood" confirms and opens/focuses the next open one
  (`confirmSection`, `#lib/helpers/messagingTerms`), a progress bar counts, statement checkboxes stay
  disabled until all are confirmed.
- **Contact details warning**: `ChatComposer` holds back a draft that `findPersonalDetails`
  (`#lib/helpers/personalDetails`: phone numbers, emails, messenger links) flags and shows an inline
  `role="alert"` with "Send anyway"; editing the draft dismisses it. Client side only, a nudge.
- **`ChatAvatar`**: round flag or icon (`chatAvatar(chat)` / `contactAvatar(contact)`).
- **`chatLabels.ts`** names everything (`contactLabel` → `Germany · GA`, `inboxName`, `chatTitle`,
  `chatSubtitle`). Never build labels by hand; never show a participant's name to another participant.
- **`MessagesLinkInfo`**: the dashboard card's unread count.

## Survey Components

All take `conferenceTimezone`.

- **`SurveySection`** (`#lib/components/dashboard/`): `conferenceId`, `userId`. Fetches non-hidden, non-draft surveys itself; renders nothing without any;
  collapsible `DashboardSection` that auto-collapses when all are answered; when collapsed shows
  pinned selection cards for surveys with `showSelectionOnDashboard`.
- **`SurveyCard`** (`#lib/components/survey/`): `question` (`id`, `title`, `description`, `deadline`,
  `showSelectionOnDashboard`, `options`), `answer` (`{ option: { id, title } } | undefined`),
  `userId`. Deadline status, current answer badge, "Answer"/"Change answer"
  opens `SurveyAnswerModal`.
- **`SurveyAnswerModal`**: `open` (bindable), `question` (options with `upperLimit`,
  `countSurveyAnswers`), `currentAnswerOptionId`, `userId`. Radio option
  cards with capacity; locked after the deadline; runs its own `updateOneSurveyAnswer`.
- **`DeadlineDisplay`** (`#lib/components/`): `deadline`. Open/closed badge
  with the deadline in the conference timezone, plus local time when the user's differs.

## Data Display

### DataGrid

`#lib/components/dataGrid/DataGrid.svelte`, the team pages' table: search; **filter builder**
(conditions and groups, AND / OR, one level); sort by up to five columns (shift-click adds);
**grouping** by up to three (collapsible, counts; dates by day/month/year, numbers in ranges);
show/move/resize columns (`alwaysVisible` column and actions pinned); pages; selection; export (CSV,
JSON, print; the selection, else every match). With `views`, **saved views** (personal or shared,
conference or global) in the database.

Props: `columns` (`GridColumn<Row>[]`, `dataGrid/gridColumn`), `source`, `rowId`, `base` (the
built-in view: sorting, filter, grouping, page size), `label`, `exportName`, `onRowClick`, `views`,
`urlPrefix` (several grids on a page), snippets `toolbar` (page controls, gets the grid state, e.g.
the participants' quick filters) and `actions` (row buttons, a column pinned right).

**Columns.** `type` (`text`, `number`, `date`, `enum`, `multiEnum`, `boolean`) decides operators
(`#lib/dataGrid/operators.ts`), sorting (enums in `options` order, empties last), grouping and
default text. `value` is the row's value; `text` / `cell` what shows (a component via
`cellOf({ component: BadgeCell, props })`, never HTML; cells in `dataGrid/cells/`); `exportValue`
where the export differs; `optionLabel` for enums. `defaultVisible: false`, `group` (menu heading),
`description`, `filterable` / `sortable` / `groupable: false`. A column with (nearly) one value per
row (names, contact details, ids, free text) is **always `groupable: false`** (a group and a DB
query per row; `#lib/dataGrid/tables/groupable.test.ts`); a view/URL grouping by one drops that
level (`applicableGrouping`, grid and API).

**Sources:**

- `createLocalSource({ rows, columns })` (`dataGrid/dataSource`): rows the page holds (a parsed
  upload, the seat overview); `#lib/dataGrid/localEngine.ts` does it all in the browser.
- `createServerSource({ table, conferenceId, rowsFor, changes })`: the big team tables. The API
  engine (`dataTablePage`, `dataTableGroups`, CLAUDE.md "Data tables") answers row ids; `rowsFor`
  fetches those rows via the page's own live queries and answers a **reader**. Live results are
  tracked only when read synchronously in a `$derived`, never after an `await`, so `FlatGrid` /
  `GroupRows` await the request in one derived and call the reader in another (that is what follows
  live updates). Engine answers aren't live: `changes` (a live query of the table's rows read as a
  short text, count + newest) is re-sent as `GridRequest.revision` (the engine's ignored `revision`
  argument) so the cache doesn't answer with old ids; the team and waiting list pass one. Tables with
  own columns (`#lib/dataGrid/tables/…`) use `defineColumns`, which refuses a column the API knows
  and the page forgot.

**State.** `gridState.svelte.ts` (view state, search, page, selection); `gridUrl.svelte.ts` mirrors
it (`?view=`, `state=` only when changed, `q=`, `page=`) with a shallow `goto` once Svelte settled
(a navigation while rows load trips "Batch has scheduled effects"). Edits write only changed parts;
queries read an **applied** copy one task behind (`grid.applied`, `grid.query(path)`), else a panel
edit commits together with its fetch and the panel lags until rows arrive. Key each query's derived
on what it reads, never the whole state.

**Structure.** `DataGrid.svelte` only composes `toolbar/`, `filter/` (row, group, connective, value
input), `columns/`, `grouping/` (`GroupLevel` fetches a level's groups, `GroupRows` a group's page),
`table/` (frame, header cell with sort/filter/resize, row, cell, pager), `views/`. Pure logic in
`#lib/dataGrid/`, unit tested. `openSoleMatch` opens the one row a link's `?q=` finds.

### Other display components

- **`CollapsibleCard`**: `icon`, `title`, `bind:expanded`, optional `badge` snippet at the header's end.
- **`LoadState`**: `<LoadState {loading} {error}>…</LoadState>`: spinner, error, or children; for
  state loaded by hand rather than an awaited `$derived`.
- **`DelegationStats`**: `delegationStats/GenericWidget.svelte`, DaisyUI stats:
  `content={[{ icon, title, value, desc? }]}`.
- **`InfoGrid`**: `infoGrid/Grid.svelte` + `Entry.svelte` (`title`, `icon`, `content` or children).

## Seat Planning (Matrix + Hints Sidebar)

`team/seat-planning/` is the reference for a large editable matrix with live optimistic writes and
a hints sidebar computed from the same state.

### Structure

- `seatPlanner.svelte.ts`: `createSeatPlanner(() => ({ committees, nonStateActors, assignments }))` (type `SeatPlanner`): derived seat state, optimistic updates, undo toast, lock lookups
- `SeatMatrix.svelte` / `SortableHeader.svelte`: Pinned table on the shared `Table` shell (`#lib/components/table/Table.svelte`: scroll container, zebra and size from table settings; `SortButton` is the shared sort header button); every column sortable (`sortSeatRows`), totals in `<tfoot>`. **Only the first column may be a `th`**: `table-pin-cols` pins every `th`
- `SeatMatrixRow.svelte` / `SeatCell.svelte`: One row per state, one toggle button per committee; locked cells show a lock with tooltip
- `SeatMatrixFilters.svelte` / `filters.ts`: Filters and sorting in the URL via `queryParameters` (shared with the sidebar)
- `HintsSidebar.svelte` + `hints/*`: One component per section. `RegionalBalanceHints` draws diverging seat bars per committee (`RegionalDeviationBars`) against a baseline set in `RegionalBaselineModal` (UN 193, HRC, ECOSOC, Security Council, manual)
- `CountryInfoPopover.svelte`: Native `popover="auto"`, `fixed` next to the clicked name so the scroll container can't clip it
- `sizeLimits.svelte.ts`: Per-browser settings in `localStorage`, loaded in an `$effect` (never during SSR)

Layout: matrix (`min-h-0 min-w-0 grow`) and an `<aside class="shrink-0 overflow-y-auto xl:w-80">`
in a `flex flex-col xl:flex-row` container.

### Rules

- **Logic in pure, unit-tested functions**: shared with the API in `src/lib/helpers/seatPlanning/`
  (`baselines.ts`, `unMembers.ts`), page-only beside it (`seatHints.ts`, `sortRows.ts`). Components
  only render results.
- **Optimistic writes**: pending changes in a `SvelteMap` overlaid on live results. The mutation
  returns the changed committee with its nations (cache updates without refetch; the publish reaches
  other open matrices). On error drop the pending entry and toast the server's message.
- **Set, don't toggle**: mutations take the target state (`enabled: true/false`) so concurrent clicks converge.
- **Undo**: success toasts carry the inverse mutation:
  `toast.success(msg, { action: { label: m.undo(), onClick } })`.
- **Sidebar → matrix**: hints pointing at rows set the shared URL filters, no own state.
- Hint alerts: `alert alert-warning alert-soft` rule violations, `alert-info alert-soft`
  suggestions, `alert-error alert-soft` hard limits.

## Assignment Board

`team/assignment/` is tabbed (Sichtung, Gewichtung, Einzelteilnehmende, Zuteilung, Abschluss), a
child route per tab; tabs and `DraftStatus` badge (pending changes, released or not) in `+layout.svelte`.

- `board.ts`: `fetchAssignmentBoard` / `fetchAssignmentRoles` (live), `boardState` (groups, seats, occupancy via `#lib/assignment`), `describeRole`
- `GroupCard.svelte`: Draggable group (delegation, split part, converted single): rating, flags, wish rank of its role, pending marker, split/unassign
- `RoleCard.svelte`: Drop zone for a nation/NSA/custom role: seats taken/total, its groups, free slots, over-capacity in red
- `SplitModal.svelte`: Splits a delegation by picking a part per member (radio grid, no drag and drop)
- `assignGroup.ts`: Plans a role for a group: whole delegations via `assignDelegation`, parts and converted singles via their unit
- `sighting/ApplicationCard.svelte`: One application: people, texts, wishes; `ReviewControls` rate, flag, disqualify, annotate
- `sighting/+page.svelte`, `DeckNav.svelte`: Deck is the backend's (`sightingDeck`: filtered, ordered, window around the card + totals + cards to step to); a card is read on its own; search and school filter ask the backend

- Drag and drop: `@thisux/sveltednd` (`draggable` with `dragData: { id: group.key }`, `droppable`
  containers `pool`, `role:<key>`). Each drop is one draft mutation; live queries bring the result
  back, no local copy of the draft.
- The library sets `touch-action: none` on draggables (fingers couldn't scroll). Draggable cards
  (`GroupCard`, `SingleCard`, members in `SplitPart`) add `pointer-coarse:touch-pan-y!` and a
  `DragGrip` (touch screens only) to start the drag from.
- **A page that awaits (`$derived(await …)`) must not read route params or URL state inside that
  derived**: a navigation (incl. the table's/sighting's own URL writes) hands fresh `params` and
  re-runs it from a pending batch's state, leaving the previous card. Pull the id into its own
  `$derived`, hold query inputs in `$state` and write them to the URL, and create
  `createTableState` / `queryParameters` before the first `await` (after it, SSR has no request URL).
- rumble rejects an empty `AND`: use `allOf`. The client cache answers unchanged variables, so a
  refetch after a save must change one (see `sightingDeck`'s `revision`).
- Cards keyed by live-data props pull keys into their own `$derived` before querying
  (`ApplicationCard`), or a rebuilt parent list re-runs their queries in a loop.
- Release: `finish/ReleaseDialog.svelte` (the finish tab's release card).
- `#lib/components/AssignmentPending.svelte`: what participants/supervisors see between registration
  end and release, instead of `ApplicationRejected`.
- School rule warnings: `SchoolRuleWarnings`, `SchoolRulesCard`, `SchoolRuleAlerts` (logic in
  `schoolRules.ts`; see "Schools" in CLAUDE.md).

## Badge Generator

Nametags and placards ("Länderschilder") print with the external generator at
`PUBLIC_BADGE_GENERATOR_URL` (default https://badges.dmun.de), from a CSV.
`#lib/components/BadgeGeneratorLinks.svelte` is the one hand-over: joined "CSV herunterladen" button,
generator link and hint. Props: `badges` (`() => Badge[] | Promise<Badge[]>`, built on click),
`filename` (no extension), `label`, `variant` (`'inline'` default, `'tile'` for downloads),
`showHint`. Rows come from `#lib/helpers/badgeCsv.ts` (`personBadge`, `placardBadges`, `badgeRow`),
which keeps the generator's rules: exact header, comma-separated UTF-8, a flag
(`countryAlpha2Code`) **or** an image (`alternativeImage`), never both.

## Navigation Components

## App Shell

Signed-in area (`routes/(authenticated)/`): **one** global navigation, a sticky top bar
(`AuthenticatedHeader.svelte`) in a centred `max-w-[1400px]` container shared with content. Two
levels: **global** ("Konferenzen" at `/dashboard`, "Mein Konto", administration) and **one
conference** ("Übersicht" and below). "Dashboard" names neither in the UI.

- Wordmark (`MUNify DELEGATOR`) → `/dashboard`; then breadcrumbs, whose conference crumb is
  `ConferenceSwitcher.svelte` (dropdown), also beside the conference side nav.
- Avatar menu (`UserMenu.svelte`): name + email (→ "Mein Konto": profile, notifications for team
  members), "Konferenzen", "Administration" for system admins (create conference, CHASE link, Slack
  workspaces), feedback, logout, language.
- A strip atop the bar marks impersonation (yellow) and the dev server (red).
- The conference list has no sidebar. A conference's team gets `SideNavigationDrawer` (via
  `ConferenceShell`): always shown on desktop, behind the burger on mobile, headed by switcher and
  "Übersicht"; no logo, back or home buttons.

### NavMenu

`#lib/components/navMenu/`: `NavMenu` > `NavMenuButton` (`title`, `href`, `icon` as `ph-…` class)
and `NavMenuDetails` (`title`, `icon`; a labelled group with indented entries, does not collapse).
`NavMenuButton` also takes:

- `attention` + `attentionLabel` (screen reader text and tooltip): a pinging red dot for something
  wanting a look (`PlausibilityNavButton` while duplicate pairs await a decision; fetched on its own
  so the menu doesn't wait).
- `includeSubpages`: stays active below its `href`, for lists whose detail pages aren't in the menu
  (surveys and `survey/[surveyId]`); such a detail page carries a back link to its list.

### Breadcrumbs

`(authenticated)/Breadcrumbs.svelte`, built by sveltekit-breadcrumbs from `+page.svelte` paths.
Rules, checked by `(authenticated)/breadcrumbs.test.ts`:

- Every folder name of a page needs an entry in `(authenticated)/breadcrumbs.ts` (`[param]` by its
  name; `conferenceId` is drawn as the switcher).
- **No page in a route group** (`(name)/`): the library can't see through it. Share layout through a
  component (`team/TeamManagementPage.svelte`).
- A static folder beats a `[param]` sibling (`dashboard/create` vs `dashboard/[conferenceId]`);
  `staticFirst` orders them, as the library takes the first fit.

A folder without its own page is a plain-text crumb; `team` is omitted (the side nav says where you are).

### ConferenceShell

`[conferenceId]/ConferenceShell.svelte` (from `+layout@(authenticated).svelte`) frames every page of
a conference. For the team it draws `ConferenceNavMenu.svelte`: **Übersicht**, then
`#lib/data/teamRoutes.ts` filtered by what the caller may open, so a page is in the menu exactly
when the guard (`team/+layout.ts`) lets them in; the command palette reads the same registry. A new
team page is one registry entry; its `roles` say who may open it. Non-team users get no menu;
participant pages bring `BackToDashboard`, which hides itself beside the menu.

### Tabs

`#lib/components/tabs/`: `<Tabs><Tab title icon active onclick /></Tabs>`, content switched with
`{#if}` on your own state (or URL state).

## Status Indicators

- **`StatusLight`** (`#lib/components/StatusLight.svelte`): `color` (`success`, `warning`, `error`,
  `info`), `blink` (default true), `size` (`xs`–`xl`), `tooltip`.
- **`OptionalTooltip`**: `<OptionalTooltip tip={…}>` wraps children in a DaisyUI tooltip only when
  `tip` is set (e.g. a track that may have a description).
- **Badges**: DaisyUI `badge badge-success | badge-warning | badge-error | badge-info | badge-neutral`.

## Icons

[Phosphor](https://phosphoricons.com), as MUNify CHASE. The root layout loads regular, fill and
duotone from `@phosphor-icons/web`; names are Phosphor's (`@phosphor-icons/core`), not Font Awesome's.

- Duotone is the default look: `<i aria-hidden="true" class="ph-duotone ph-user"></i>`; `ph-fill`
  for active states; regular `ph` for brand logos (`ph ph-github-logo`). Size/colour via Tailwind
  (`text-2xl`, `text-success`). Animations in `app.css`: `animate-spin` (spinner), beat, fade,
  `icon-shake`.
- Icon props take the bare name (`icon="users"`) unless the component's doc comment says it's a
  class (`ph-users`, as in `teamRoutes.ts`, `NavMenuButton`, `SideDrawer`).
- Icons stored in the DB (`conferenceRole.icon`, `calendarEntry.icon`) are bare Phosphor names; the
  API refuses others (`iconArgSchema`, `#api/services/iconName`). Pick them with `IconPicker`
  (`#lib/components/IconPicker.svelte`, searches the catalogue).
- Glyphs are square: no fixed-width class; set a width (`w-5 text-center`) only where a column of
  icons must line up.

## Color & Theming

DaisyUI semantic classes only, never hard-coded colours:

- Backgrounds: `bg-base-100` (primary), `bg-base-200` (muted), `bg-base-300` (hover/tertiary)
- Text: `text-base-content`, `text-base-content/60` (muted), `text-primary`, `text-secondary`
- Status: `text-/bg-success`, `-warning`, `-error`, `-info`
- Borders: `border-base-200` (light), `border-base-300` (medium)

## Layout Patterns

- Centred page: `flex w-full flex-col items-center` > `w-full max-w-4xl`
- Dashboard: `flex w-full flex-col gap-10` with `ConferenceHeader` then `DashboardSection`s
- Card grid: `grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3` of
  `card bg-base-100 border border-base-200 shadow-sm` > `card-body`

## Navigation

Client-side navigations are instant: the next page's skeleton shows at once, pages cross-fade, a
top bar reports a still-loading navigation. Code in `src/lib/components/navigation/` and `#lib/helpers/`.

### PageBoundary

`navigation/PageBoundary.svelte`: layouts wrap their pages in it. A `<svelte:boundary>` whose
`pending` is a `PageSkeleton`, re-created per `key` (a settled boundary never shows `pending`
again); `pending` is passed only in the browser, so full loads still SSR with content. Props: `key`,
`skeleton` (`SkeletonLayout`, default `PAGE_SKELETON`). Key it with
`boundaryKey({ pathname, frames: ['team/assignment'] })` (`#lib/helpers/boundaryKey`): pages below
a frame share one key because that layout has its own boundary.

Used in `ConferenceShell` (`DASHBOARD_SKELETON` for the overview, else `teamSkeletonForPath`), the
assignment layout (below its tabs, `ASSIGNMENT_TAB_SKELETONS`), the paper hub layout (below its back
link), `dashboard/+layout.svelte`. **A layout keeping state across its pages must not sit inside a
pathname-keyed boundary**: make it a frame in `boundaryKey` with its own `PageBoundary`.

### PageSkeleton

`navigation/PageSkeleton.svelte`: draws a `SkeletonLayout` (`role="status"`, `aria-busy`,
`data-skeleton`), invisible for 120 ms (`.page-skeleton` in `app.css`) so cache hits never flash it.
A layout is a tree of `SkeletonNode`s (`skeletonShapes.ts`): with `children` a plain element, without
a grey block. **Each team page has its own** in `#lib/data/teamSkeletons.ts`, drawn after the page
(wrapper classes, grids, breakpoints, sections populated) so nothing jumps. Build from the shared
blocks (`dataGrid`, `tabs`, `formSection`, `field`, `stat`, `toggle`, `paragraph`, `table`); write
class strings whole (Tailwind finds only literals). New team page: a `TEAM_SKELETONS` entry named as
its registry entry's `skeleton`; a differing page below an entry (detail page, a page it `owns`):
`SUBPAGE_SKELETONS`. **When a page's layout changes, change its skeleton.**

### NavigationProgress

`navigation/NavigationProgress.svelte`, once in the root layout: thin `bg-primary` top bar while
`navigating.to` is set, after 200 ms.

### View transitions

`enableViewTransitionApi()` (`#lib/helpers/viewTransitionApi.svelte`, root layout) wraps non-shallow
navigations in `document.startViewTransition`; `app.css` animates (off under
`prefers-reduced-motion`). Persistent parts stay put via `view-transition-name`: `app-header`
(`AuthenticatedHeader`), `team-nav` (`SideNavigationDrawer`), `app-footer` (`Footer`). **Names must
be unique on the page** or the browser skips the transition. Same name on two pages morphs an
element (`thing-{id}`).

### Code preloading

`data-sveltekit-preload-data="hover"` on `<body>` (app.html); the team side nav adds
`data-sveltekit-preload-code="viewport"`.

### Svelte transitions

Overlays animate through Svelte transitions, never CSS classes toggled on mount (daisyUI's `.modal`
transition never runs on an element created open): `Modal` and `DialogHost` fade with the box
scaling from 96 %, `Drawer` and `SlidePanel` fly in from the edge, the command palette drops in,
`MaintenanceBanner` slides. Use `transition:slide` for blocks appearing inside a page (banners,
collapsibles), `transition:fade` for overlays; 150–300 ms.

## Common Patterns

- **Loading**: whole pages get the layout's `PageBoundary` skeleton. A part loading on its own wraps
  itself in `<svelte:boundary>` with a `pending` snippet. Primitives:
  `loading loading-spinner loading-md`, `skeleton h-4 w-full`, `loading loading-dots loading-sm`.
- **Empty states**: centred `flex flex-col items-center justify-center py-12 text-center`, a
  `ph-duotone ph-tray text-4xl text-base-content/30 mb-4` icon, `text-base-content/60` text.
- **Buttons**: `btn btn-primary` (primary), `btn btn-ghost` (secondary), `btn btn-error` (danger),
  `btn btn-square btn-ghost btn-sm` + icon + `aria-label` (icon button).

## URL State Management

`sveltekit-search-params` v4: `queryParameters({ tab: true, page: ssp.number(1) })` returns a
reactive object; read `params.x`, assign to navigate, assign `null` to drop the key. Call it during
component init (before any `await`). Name it `params`, and the route prop `routeParams` where both exist.

## Checklist for New UI Features

1. Reuse a component from `src/lib/components/` if one exists
2. Group form fields (`FormFieldset` / `FormSection`)
3. DaisyUI classes before custom CSS; semantic colours only
4. Loading and empty states
5. Responsive, mobile-first
6. Accessibility rules above (labels, `aria-hidden` icons, state attributes)
7. All user-facing text through Paraglide (`m.…()` from `#lib/paraglide/messages`)
8. A team page gets a registry entry and a skeleton; update the manual (CLAUDE.md §11)
