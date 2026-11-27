# Team dashboard widgets

The team's overview of a conference (`dashboard/[conferenceId]`, `stages/TeamMember/`) shows today
what waits for the caller (`TeamWaiting`), the link cards (wiki, services, preparation, docs) and
the CHASE status. This plan adds **widgets**: one block per question the team asks in a stage
("how many have paid?", "what is on now?"), each linking to the page where it is answered. The
design canvas ("Team Dashboard Widgets") shows the preparation, conference and post-conference
overviews and which widget shows in which stage.

## Decisions

| Topic              | Decision                                                                                                                                                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| What a widget is   | A Svelte component that fetches its own data (`liveQuery`) and renders inside a shared frame (`DashboardWidget`): title, a link to its team page, a `large` or `compact` size and an empty state. No widget takes data from the page.                                                                        |
| Which widgets show | One registry, `#lib/data/teamDashboardWidgets.ts`, like `teamRoutes.ts`: per widget the team route it belongs to and its size per conference state. A pure `widgetsFor({ state, access })` picks and orders them. Nothing shows that the caller may not open (`mayOpenTeamRoute`, as `teamWaiting.ts` does). |
| Order              | Fixed by stage and size: large widgets first, in registry order. No pinning or hiding in this plan; revisit once the set has settled.                                                                                                                                                                        |
| Where they sit     | `TeamWaiting` stays first. The widgets follow, then the link cards. The CHASE status becomes one item of the readiness check (widget 7) and stops being a card of its own.                                                                                                                                   |
| Numbers            | Live count fields where they exist (`totalSeats`, `totalParticipants`, `waitingListLength`, `papersCount`, `bankTransfersCount`, …). Aggregates from `getConferenceStatistics` come from materialized views refreshed by a job, so a widget using them says "Stand hh:mm" from `refreshedAt`.                |
| Empty and zero     | A widget with nothing to say renders one line ("Alles erledigt", "Noch keine Papiere") rather than zeros. A widget whose data is not there yet in a stage simply is not in that stage's list.                                                                                                                |
| Loading and errors | Each widget sits in its own `<svelte:boundary>` with a skeleton and `LoadError`, so one slow or failing query does not hold or break the overview. Widgets mount in the browser only, after the frame hydrated (the `mounted` pattern of `DashboardLinkCards`, same hydration issue).                        |
| Mock-ups vs. data  | Everything in the mock-ups the API cannot answer today is either dropped from the first version or listed under "New API" with its own phase. Mock-up figures are sample values.                                                                                                                             |
| Delivery           | This document, then the phases below on one branch, each with unit tests, e2e specs, the manual (`docs/de`, `docs/en` `team/overview.md`) and CLAUDE-UI.md updated.                                                                                                                                          |

## Frame

- **`#lib/components/dashboard/DashboardWidget.svelte`**: `title`, `icon`, `href` (the "→" link,
  resolved through `resolve`), `size: 'large' | 'compact'`, `empty?: string`, children. A
  `<section aria-labelledby>` with an `h2`; progress as daisyUI `progress` elements with an
  accessible label, never colour alone. Square, `bg-base-100` on the overview's `bg-base-200`,
  following CLAUDE-UI.md's dashboard rules. Documented in CLAUDE-UI.md "Dashboard Components".
- **`#lib/data/teamDashboardWidgets.ts`**: the registry.

  ```ts
  export interface TeamDashboardWidget {
  	id: WidgetId;
  	/** The team page it summarises: decides who sees it and where its link goes */
  	routeId: string;
  	/** Size per conference state; a state that is absent hides the widget */
  	stages: Partial<Record<ConferenceState, 'large' | 'compact'>>;
  	component: () => Promise<{ default: Component<WidgetProps> }>;
  }
  export function widgetsFor({ state, access }: { state: ConferenceState; access: WaitingAccess }) {…}
  ```

  `widgetsFor` is pure and unit tested (order, size per stage, nothing the caller may not open,
  the paper hub's extra access).

- **`TeamMemberDashboard.svelte`**: reads `conference.state`, renders `TeamWaiting`, then
  `widgetsFor(...)` in a responsive grid (large widgets span the row on wide screens, compact ones
  sit two or three to a row; one column on a phone), then the link cards.
- **Skeleton**: `DASHBOARD_SKELETON` (`#lib/components/navigation/skeletonShapes.ts`) gains
  widget-shaped blocks, so the overview's skeleton keeps its shape.
- **Tour**: the overview has none today (no team route at `team/`). Add `data-tour` anchors
  `team.overview.waiting` and `team.overview.widgets`, and a small tour if the participant
  dashboard's pattern (`participantDashboard.tour.ts`) fits; otherwise only the manual section.

## The widgets

Size per stage: **L** large, **C** compact, – not shown. Stages: PRE, PARTICIPANT_REGISTRATION
(REG), PREPARATION (PREP), ACTIVE, POST.

| #   | Widget                 | PRE | REG | PREP | ACTIVE | POST | Route (who sees it) |
| --- | ---------------------- | --- | --- | ---- | ------ | ---- | ------------------- |
| 1   | Fahrplan & Fristen     | L   | L   | L    | C      | C    | any team role       |
| 2   | Teilnehmende           | –   | L   | C    | –      | –    | `participants`      |
| 3   | Zahlungen & Unterlagen | –   | C   | L    | C      | C    | `payments`          |
| 4   | Gremien & Zuteilung    | C   | C   | L    | –      | –    | `seatPlanning`      |
| 5   | Positionspapiere       | –   | –   | L    | C      | –    | `paperHub`          |
| 6   | Kommunikation          | C   | L   | L    | C      | C    | `emails`            |
| 7   | Startklar              | L   | C   | L    | –      | –    | `settings`          |
| 8   | Jetzt & gleich         | –   | –   | –    | L      | –    | any team role       |
| 9   | Einlass & Anwesenheit  | –   | –   | –    | L      | –    | `attendance`        |
| 10  | Meldungen & Anliegen   | –   | –   | C    | L      | C    | `messages`          |
| 11  | Abschluss              | –   | –   | –    | –      | L    | `settings`          |

Route ids are those of `teamRoutes.ts` (`settings` is the configuration page; check-in counts belong to
`attendance`, since `checkIn` is only nametag bins). `teamRoutes.ts` has no id union type yet;
adding one (`as const` ids) lets the registry catch typos.

### 1 · Fahrplan & Fristen

- The five states as a stepper, the current one marked (`aria-current="step"`).
- The next dates from `conference`: `applicationDeadline` (+ grace period), `paymentDeadline`,
  `assignmentReleasedAt`, `startConference`, `endConference`, and survey question `deadline`s.
  Past ones collapse to "Erledigt", the next three show with "in n Tagen".
- Each date carries the number behind it where one exists (unpaid before the payment deadline from
  `postalPaymentProgress`).
- The stage changes by hand: for `manageConference`, a link "Phase wechseln" to the settings once
  a stage's last date passed.
- Pure: `deadlinesOf(conference, now)` in `#lib/helpers/`, unit tested (ordering, grace period,
  missing optional dates).
- **Not in v1**: the paper deadline from the mock-up (no column exists; see "New API").

### 2 · Teilnehmende

- `totalParticipants` / `totalSeats`, live.
- Breakdown from `getConferenceStatistics.registered` (delegation members, single participants,
  supervisors), with "Stand".
- `waitingListLength` with a link to the waiting list.
- **Not in v1**: withdrawals this week (withdrawing deletes the registration; nothing records it).

### 3 · Zahlungen & Unterlagen

- `postalPaymentProgress`: paid, postal complete, problems.
- Review cases: the count `ReviewCases.svelte` shows (participants in `NEEDS_HUMAN_REVIEW` plus
  bank transfers whose `result` is not `RECEIVED`). Move its query and `reviewCases.ts` grouping
  into a shared fetch (`#lib/api/paymentReviewCases.ts`) so the payments page and the widget
  agree.
- **Not in v1**: "Bankabgleich zuletzt um …" (the sync stores no run time).

### 4 · Gremien & Zuteilung

- `getConferenceStatistics.committeeFillRates`, one bar per committee.
- Open seats: `totalSeats − totalParticipants`.
- Draft not applied: `assignmentUnits` / `assignmentSingleRoles` non-empty (only for
  `manageParticipants`; others see the fill rates only).
- Released: `assignmentReleased` / `assignmentReleasedAt`.

### 5 · Positionspapiere

- Status bar from `paperStats.byStatus` plus a live `papersCount` for `REVISED`, which
  `paperStats` lacks: add `revised` to `byStatus` (small API change, see phase 2).
- "Papers missing" = expected authors − papers, only where the conference expects one paper per
  delegation (decide the rule with the content team; otherwise leave the segment out).
- For reviewers: `myReviewStats` and the waiting count, linking to `findNextPaperToReview`'s flow.
- Agenda items with `reviewHelpStatus: HELP_NEEDED`.
- **Not in v1**: "Dein Stapel" (reviewers are not assigned papers; there is only "next paper").

### 6 · Kommunikation

- The latest `PUBLISHED` announcement: title, age, `readCount` / `recipientCount`. Needs the
  announcement route's roles; others see only the mail part.
- `openEmailCounts`: open mails per kind, marked automatic or manual
  (`conferenceEmailSettings`), linking to the emails page with the kind selected.
- **Not in v1**: due dates per kind (the API returns counts only; the reminder windows are
  constants). A later `dueAt` on `openEmailCounts` would add them.

### 7 · Startklar

- A pure `readinessChecks({ stage, facts })` in `#lib/helpers/conferenceReadiness.ts`, unit
  tested, returning `{ id, done, label, href }[]`. Two lists:
  - **Before registration (PRE)**: committees and seats planned (`totalSeats > 0`), application
    deadline in the future, fee and bank details set, registration texts/documents uploaded.
  - **Before the conference (PREP)**: guide published (`guidePublished`, `guideOutline`), calendar
    days cover `startConference`…`endConference`, discussion points on every agenda item,
    document layouts and certificate file set, a check-in session exists (`attendanceSessions`),
    CHASE linked and reconciled (`instanceLinks`, today's `ChaseStatusCard`).
- The facts are read by one small fetch beside the widget. If it grows past a handful of queries,
  add a `conferenceReadiness` field instead (phase 2 decides).
- Each open item links to the page and tab where it is done.

### 8 · Jetzt & gleich

- Reuse `calendarNow.ts` (`timelineOf`, `leadOfTimeline`, `startsIn`) and `minuteClock` from the
  participant's `NextEntries`. A team member has no seat, so `entriesForSeat` gives every entry.
- `e2e/dashboard/next-entries.spec.ts` asserts "the team has no next entries on its overview":
  that test changes with this widget.
- **Not in v1**: team-only entries (there is no team track; the mock-up's "Track Team" is an
  idea for the calendar, not this plan).

### 9 · Einlass & Anwesenheit

- Checked in today out of expected participants, missing without notice, and under-age
  participants without guardian consent.
- **Needs new API** (phase 3): no aggregate exists. Add `checkInSummary(conferenceId, day)` →
  `{ expected, checkedIn, missing }` from `attendanceEntries` of CHECK sessions that day, and a
  `missingConsentCount` (guardian consent not done for participants under age at the conference;
  `ofAgeAtConference` is computed, so the service counts it). Both gated by `manageParticipants`.
- **Not in v1 of the widget**: attendance per committee (derivable from entries ×
  `assignedCommitteeId`, or from CHASE presence; decide in phase 3).

### 10 · Meldungen & Anliegen

- `fetchChats` + `teamInboxes`: unread per inbox the caller answers.
- Open `chatReports` with their age.
- Oldest unanswered: the earliest `lastParticipantMessageAt` among chats unread by the team,
  derived client-side (pure helper, unit tested).
- Overlaps with `TeamWaiting`'s message tiles; during ACTIVE the widget replaces them (the
  registry hides those tiles when widget 10 is large).

### 11 · Abschluss

- Certificates: participants who qualify (attendance recorded; needs a count, phase 3) and
  `CERTIFICATE_AVAILABLE` mails sent (`emailStats`).
- Feedback survey: answers per published question / participants (needs a count, phase 3), and the
  "remind the rest" action that `distributeUnansweredSurvey` already offers.
- Open money: participants with payment `PENDING` or `PROBLEM`, and review cases (widget 3's
  fetch).
- Checklist: an announcement published after `endConference`, the survey reminder sent.
- **Not in v1**: certificate downloads (not tracked), refunds (no such concept), data deletion
  dates (no retention path exists; see the `TODO(privacy)` in `src/api/db/schema/users.ts`).

## New API

| Need                               | Shape                                                                                                  | Phase |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ | ----- |
| `revised` in `paperStats.byStatus` | one more column in the statistics view                                                                 | 2     |
| Readiness facts (if one field)     | `conferenceReadiness(conferenceId)` → booleans per check, `manageConference`/content roles             | 2     |
| Check-in summary                   | `checkInSummary(conferenceId, day)`, `manageParticipants`                                              | 3     |
| Missing guardian consent           | `missingConsentCount(conferenceId)`, `manageParticipants`                                              | 3     |
| Certificate eligibility count      | `certificateEligibleCount(conferenceId)`                                                               | 3     |
| Survey response rates              | `answerCount` on `SurveyQuestion` (or `surveyAnswersCount` with a where)                               | 3     |
| Later, own plans                   | withdrawal history, bank sync run time, paper deadline column, team calendar track, refunds, retention | –     |

Every new field: permission in the entity's `…Permissions.ts`, logic in its service, the count
tested in the service, and a case in `e2e/authorization/`.

## Phases

1. **Frame + widgets on today's API**: `DashboardWidget`, the registry and `widgetsFor`, the new
   layout of `TeamMemberDashboard`, skeleton; widgets 1, 2, 3, 4 and 10. CHASE status stays a card
   until widget 7 exists.
2. **Preparation widgets**: 5 (with `revised`), 6, 7 (readiness, CHASE status moves in), 8
   (and the next-entries spec changes).
3. **Conference and post**: the new counts, then 9 and 11.

Each phase ends with `bun run check` and `bun test` passing, a draft PR updated with what is done
and open.

## Tests

- **Unit**: `widgetsFor` (per stage, per role, paper hub access), `deadlinesOf`,
  `readinessChecks`, the oldest-unanswered helper, review case grouping after the move, and each
  new service count.
- **e2e** (`e2e/dashboard/team-overview.spec.ts`): the seed's stage conferences and team personas
  (`seed-dev/plans.ts`, `seed-data/devAccounts.ts`) already cover PREPARATION, ACTIVE and POST.
  Per stage: the expected widgets show for project management, a reviewer sees only what their
  role opens, a widget's link leads to its page, and an empty state renders. A spec that changes
  data (marking a readiness item done) gets its own fixture in `e2e/seed/`.
- **Accessibility**: the overview joins `e2e/accessibility/` with widgets in each stage.

## Open questions

- Should the stage change by itself at `startConference` / `endConference`? Today it is set by
  hand; widget 1 only links to the setting.
- "Papers missing": is the expected number one per delegation, per committee seat, or not
  meaningful for every conference?
- Do team members without `manageParticipants` see payment and participant numbers? The
  statistics query allows any team member; the plan gates widgets by their route, which is
  stricter.
