# Who can do what: the API's permission inventory

Reviewed state: commit `26af3eb8` (branch `rumbbbbbbble`), working tree clean, 2026-10-27.
Source of truth: `src/api/handlers/*/*Permissions.ts`, the resolvers in `src/api/handlers/*/*.ts`,
`src/api/services/authHelper.ts`, and the schema in `src/api/db/schema/`. The findings that came
out of reading this are in [backend-findings.md](./backend-findings.md); a line here that has a
finding links to it as `→ F-nn`.

Every line is one thing somebody can do, with the condition under which they can. Tick the box
once you have decided the line is what you want. Lines are grouped by entity, as the code is.

## How to read this

**Actors.** `anybody` is an unauthenticated request (the GraphQL endpoint is not behind the login
redirect; abilities decide). `user` is any signed-in account. The rest relate the caller to the row:

| Actor        | Meaning                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------- |
| self         | the row is about the caller                                                                    |
| co-delegate  | the caller is a member of the same delegation (applied or not)                                 |
| supervisor   | the caller supervises the person (a `supervision` row to the person's `conferenceParticipant`) |
| supervised   | the caller is supervised by the row's supervisor                                               |
| participant  | the caller is delegate, single participant or supervisor in the row's conference               |
| team         | the caller holds any role on the row's conference's team                                       |
| PC           | `PARTICIPANT_CARE_ROLES` = PROJECT_MANAGEMENT or PARTICIPANT_CARE of that conference           |
| PM           | PROJECT_MANAGEMENT of that conference                                                          |
| TC           | TEAM_COORDINATOR of that conference                                                            |
| CL           | CONTENT_LEAD; `SEAT_PLANNING_ROLES` = PM + CL; `CONFERENCE_CONTENT_ROLES` = PM + PC + CL       |
| paper roles  | `PAPER_ROLES` = every team role but MEMBER (REVIEWER, PM, PARTICIPANT_CARE, TC, CL)            |
| admin        | the OIDC `admin` role; passes every rule, on every table, whether on a team or not             |
| service user | the OIDC `service_user` role (the chase integration)                                           |

**Masks.** "sees X" lists columns; "everything but Y" means the rule exposes the whole row except
Y. rumble masks per row: a reader matched by several rules sees the union of their columns. A
masked non-null column fails the whole query when selected, so a reader only ever sees what some
rule grants. The generated list queries (`users`, `delegations`, …) and every relation follow the
same rules, including `where`, `orderBy` and the `search` argument (search only looks at columns
every matching rule guarantees).

**Release.** Until `conference.assignmentReleased`, participant-side rules hide
`delegation.assignedRoleId`, `delegationMember.assignedCommitteeId` and
`singleParticipant.assignedRoleId` / `assignmentDetails`. Relations behind them resolve to nothing.
The team always sees them.

**Registration stage.** Registering yourself (head delegate, single participant, supervisor),
joining a delegation and sending an application are bound to PARTICIPANT_REGISTRATION plus its
grace period (`assertRegistrationOpen`, `assertApplicationReady`). Editing a registration and the
team registering somebody else are open in every stage; the waiting list only opens in
PREPARATION. → F-09

---

## User (`user`)

Columns: identity (`email`, `givenName`, `familyName`, `preferredUsername`, `locale`, `pronouns`,
`birthday`), contact (`phone`, `street`, `apartment`, `zip`, `city`, `region`, `country`),
`gender`, `foodPreference`, `emergencyContacts`, newsletter flags, `globalNotes` (care notes).
`NAME` below = id, timestamps, given/family name, pronouns. `IDENTITY` = `NAME` + email,
preferred username, locale, birthday.

Read

- [ ] self: everything but `globalNotes`.
- [ ] PC of a conference the person takes part in (delegate, single, supervisor) or waits for
      (`isCaredForUser`): everything, `globalNotes` included. Not for the team. → F-04
- [ ] admin: everything, everybody.
- [ ] supervisor of the person (in the conference they supervise them in): everything but
      `globalNotes` — address, phone, emergency contacts, gender, food preference, birthday
      included. → F-05
- [ ] PM, TC: everybody on their team, everything but `globalNotes`. → F-04
- [ ] teammate (any role, same conference): IDENTITY + `phone`.
- [ ] co-delegate: NAME (id, given/family name, pronouns). → F-06
- [ ] supervised person reads their supervisors: NAME + email.
- [ ] co-supervisor (shares a supervised person): NAME + email.
- [ ] paper roles of a conference read the authors of its papers: NAME. → F-06
- [ ] an author reads who reviewed their papers: id, given name, family name only.
- [ ] PC reads the _other_ account of a possible duplicate of someone they manage: IDENTITY +
      `globalNotes` while OPEN or CONFIRMED; IDENTITY only once DISMISSED. → F-13
- [ ] anybody / user without a relation: nothing (no rule matches).

Write

- [ ] self: `updateUser` — name, birthday, phone, address, apartment, gender, pronouns, food
      preference, emergency contacts, newsletter flags. Not email, locale, username (OIDC), not
      `globalNotes`.
- [ ] admin: `updateUser` on anybody (the update ability).
- [ ] PC of a conference the person takes part in or waits for, never for a teammate (or admin):
      `updateUsersIdentityInfo` (name, birthday)
      and `updateUsersGlobalNotes` (care notes).
- [ ] anybody, no session: `updateUsersNewsletterPreferences` opting _out_ any email address;
      always answers true. Opting _in_ only for the caller's own address. → F-16
- [ ] self: `upsertSelf` (re-sync row from OIDC claims; refused while impersonating).
- [ ] whoever may delete the respective rows: `unregisterParticipant(userId, conferenceId)` removes
      membership, single registration, supervisor row and participant row, each only as far as the
      caller's delete ability on that table reaches. No account deletion exists. → F-18

Lookups and impersonation

- [ ] PC/PM of _any_ conference, or admin: `previewUserByIdOrEmail` — id, email, given/family name
      of any account in the system. → F-01
- [ ] admin: impersonate anybody but themselves. PC of a conference: impersonate its delegates,
      single participants and supervisors, never anybody holding a team role anywhere. Checked on
      every request; system roles are the intersection of both. `canImpersonateUser` tells.
- [ ] user: `issueIdentityCode` (signed code of their own id for the scanner),
      `identityCodePublicKey`, `myOIDCRoles`, `offlineUserRefresh`, `logoutUrl`,
      `impersonationStatus`.

## Conference participant (`conferenceParticipant`)

Per person and conference: `paymentStatus`, `didAttend`, `guardianConsent`, `mediaConsent`,
`mediaConsentStatus`, `termsAndConditions`, `assignedDocumentNumber`, `accessCardId`, `schoolId`.
No column masks on this table.

Read

- [ ] self: own row.
- [ ] supervisor: the rows of the people they supervise (the supervision points at this row).
- [ ] co-delegate: the rows of co-delegates — payment and consent statuses, attendance,
      document number, access card id, school. → F-07
- [ ] PC, admin: every row of the conference.

Write

- [ ] PC (or admin): `updateConferenceParticipant` by id, by user id, or by user **email** — all
      statuses, document number (or next free one), access card id; creates the row when the person
      is in the conference and has none. → F-01
- [ ] PC: `setParticipantSchool`, `updateAllConferenceParticipants(didAttend)` for the whole
      conference.
- [ ] self (delegate, single or supervisor): `setMySchool`.
- [ ] Rows are also created implicitly by every registration (`ensureConferenceParticipant`) and by
      a scan of a team member. → F-17

## Delegation (`delegation`)

Columns: `entryCode`, `applied`, `motivation`, `experience`, `assignedRoleId`, `memberCount`.

Read

- [ ] member: own delegation, `assignedRoleId` only once released.
- [ ] supervisor of any member: same.
- [ ] PC: all of the conference, with `entryCode`.
- [ ] team (any role): all of the conference, without `entryCode`.
- [ ] admin: all.
- [ ] user (any signed-in account): `previewDelegation(conferenceId, entryCode)` — head delegate's
      full name, member count, schools; the code is the check, and 10 wrong codes in 10 minutes
      lock the account out of every lookup by code. → F-02

Write

- [ ] user not yet in the conference: `createDelegation` (becomes head delegate); any conference
      state. → F-09
- [ ] head delegate, until applied: `updateDelegation` (texts, apply/withdraw, reset entry code,
      hand over head delegate), `deleteDelegation`. Applying needs enough members, wishes, complete
      data and the registration window.
- [ ] PC: `updateDelegation` any time (the update ability has no `applied` guard for them).
- [ ] PC: no `deleteDelegation` (only admin and the pre-apply head delegate). → F-20
- [ ] PC: the assignment draft and `applyAssignment` create, move, dissolve delegations.

## Delegation member (`delegationMember`)

Read

- [ ] co-delegate: each other, `assignedCommitteeId` only once released.
- [ ] supervisor of any member of the delegation: all members of that delegation, same mask.
- [ ] PC, admin: all of the conference.
- [ ] team without PC role: nothing directly (they reach people through the delegation's
      members relation only as far as this table allows, so not at all).

Write

- [ ] user not yet in the conference: `createDelegationMember(conferenceId, entryCode)` joins a
      delegation that has not applied; the code is the only check. → F-02
- [ ] self, until the delegation applied: leave (`deleteDelegationMember`).
- [ ] head delegate, until applied: remove a member.
- [ ] head delegate, any time, for members without a committee: the `update` ability — used by
      `updateDelegationMemberCommittee` / `updateManyDelegationMemberCommittee`. → F-10
- [ ] PC: remove any member; move any member to a committee of the conference (single, bulk, or
      the assistant's `assignCommitteesToDelegationMembers`, which also checks the committee seats
      the delegation's nation — the single and bulk moves do not). → F-10
- [ ] PC: `createAppliedDelegationMember(userId, conferenceId, roleId)` places **any account** in an
      assigned delegation, clearing another registration of theirs in the conference, without the
      person's involvement. → F-01

## Single participant (`singleParticipant`)

Read

- [ ] self: own row, role only once released.
- [ ] supervisor: the people they supervise, same mask.
- [ ] PC, admin: all of the conference.

Write

- [ ] user: `createSingleParticipant` for a custom role of the conference (edits an existing own
      entry instead of failing); any state. → F-09
- [ ] self, until applied: `updateSingleParticipant` (texts, wishes, apply), `deleteSingleParticipant`.
- [ ] PC: update and delete any; `createAppliedSingleParticipant(userId, …)` places any account
      with a role. → F-01

## Supervisor (`conferenceSupervisor`)

Columns: `plansOwnAttendenceAtConference`, `connectionCode`.

Read

- [ ] self: own row with the code.
- [ ] PC, admin: all, with codes.
- [ ] supervised person: their supervisors, without the code.
- [ ] co-supervisor: the other supervisors of a shared person, without the code.

Write

- [ ] user: `createConferenceSupervisor` for themselves, any conference, any state, as long as they
      hold no other part in it. → F-09
- [ ] PC: `createConferenceSupervisor(userId)` for any account. → F-01
- [ ] self, PC: `updateConferenceSupervisor` (attendance plan), `rotateSupervisorConnectionCode`.
- [ ] self: delete own supervisor row any time; PC: delete any.
- [ ] participant (delegate or single) of the conference: `connectToConferenceSupervisor(code)`
      attaches themselves; the code is the check. Team members and supervisors cannot be
      supervised. → F-02
- [ ] PC: connect anybody of the conference to a supervisor by code.
- [ ] supervised person, the supervisor, or PC: `disconnectFromConferenceSupervisor`.
- [ ] anybody with a part in the conference (delegate, single, supervisor, team):
      `previewConferenceSupervisor(code)` — supervisor's name, school, city. → F-02

## Role application (`roleApplication`, a delegation's wishes)

- [ ] member, supervisor of a member, PC, admin: read.
- [ ] head delegate until applied: create (role must be a nation or non-state actor of the
      conference), delete, swap ranks.
- [ ] PC: read only (no update or delete; the draft handles roles after applying). → F-20

## Waiting list (`waitingListEntry`)

Columns: `motivation`, `experience`, `requests`, `assigned`, `assignedAt`, `hidden`, `schoolId`.

- [ ] self: read own entry. No update, no delete by the entrant. → F-20
- [ ] user: `createWaitingListEntry` while the conference is in PREPARATION, the assignment is not
      released and they hold no seat.
- [ ] PC, admin: read, update (texts, hidden, assigned), delete.
- [ ] Seating from the list happens through `createAppliedDelegationMember` /
      `createAppliedSingleParticipant`.

## Conference (`conference`)

`MEMBERS_ONLY` = bank details, postal address, the template file ids (contract, consents, terms,
certificate) and `documentLayouts`. `TEAM_ONLY` = `linkToTeamWiki`, `linkToServicesPage`.

Read

- [ ] anybody: conferences in PARTICIPANT_REGISTRATION or PREPARATION, everything but
      MEMBERS_ONLY and TEAM_ONLY (incl. fee, image/logo/emblem files, info, dates, and the computed
      counts `totalParticipants`, `totalSeats`, `waitingListLength`, `nextDocumentNumber`). → F-19
- [ ] participant (delegate, single, supervisor): their conferences in any state, everything but
      TEAM_ONLY (so bank details, postal address, templates).
- [ ] team: everything. admin: everything.
- [ ] a conference in PRE, ACTIVE or POST is invisible to outsiders.

Write

- [ ] PM: `updateConference`, all arguments.
- [ ] PC and CL: `updateConference` limited to info/announcement, links, postal address, template
      files, `state`, `unlockPayments`, `unlockPostals`, `isOpenPaperSubmission`, `showCalendar`.
      → F-11
- [ ] PM, PC, CL: `setDocumentLayout`.
- [ ] admin: `seedNewConference`.
- [ ] PC: `conferencePlausibility` (too young/old, should (not) be supervisor, data missing — user
      rows through the caller's read ability).
- [ ] anybody who may read the conference: `getAllConferenceNations`; `conference.schools`
      (counts per school over the registrations the caller may read).

## Team (`teamMember`, `teamMemberInvitation`)

- [ ] team: read teammates' rows (role, user).
- [ ] PM: remove anybody; TC: remove anybody but PM. No role change without re-inviting. → F-20
- [ ] PM, TC: read invitations (token masked; TC not those for PM), create invitations
      (`createTeamMemberInvitations`, a known address is added to the team directly), revoke,
      regenerate (optionally re-sending the mail), `checkTeamInvitationEmails` (tells whether an
      address has an account). Only PM hands out PROJECT_MANAGEMENT.
- [ ] invited person: redeemed at login through the cookie set by `/auth/accept-invitation`.
- [ ] team: `recordSearch` (own global-search history; only the caller reads it).

## Papers (`paper`, `paperVersion`, `paperReview`, `reviewerSnippet`, `resolution`)

- [ ] author: read and update own papers; delete while DRAFT.
- [ ] paper roles: read and update every paper of the conference; PM deletes any.
- [ ] co-delegate, supervisor of a member: read the delegation's papers and versions that are not
      drafts.
- [ ] member of the delegation: `createPaper` in own name, for own delegation, on an agenda item
      of the conference.
- [ ] paper roles: `createPaperReview` (verdict + status change, mails the author), the reviewer
      hub queries, `findNextPaperToReview`, leaderboard (anonymised names), `flagCollection`.
- [ ] participant of the conference: `findGlobalIntroductionPapers`,
      `findGlobalPapersGroupedByCommittee`, `findPublicPaperContent` (as far as the read ability
      reaches).
- [ ] supervisor: `findSupervisedPapers`.
- [ ] reviews: author reads reviews of own papers; paper roles read all of the conference.
- [ ] reviewer snippets: own only.
- [ ] resolutions: participant and team read (and download the PDF); PM, PC, CL upload, retitle,
      retag, delete.

## Committees, roles, nations, places, calendar (reference data)

- [ ] anybody: read every committee, agenda item, conference role (nations, non-state actors,
      custom roles), nation, place (address, directions, site plan file), calendar day, calendar
      track, and every calendar entry without survey options — of **every** conference, in every
      state. → F-19
- [ ] participant who picked one of its survey options, and the team: calendar entries limited to
      survey options.
- [ ] PM: create and delete committees; PM + CL: update committees, seat nations
      (`setCommitteeNationSeat`), regional baselines, create/update/delete non-state actors and
      custom roles (deleting a held role is blocked), create/update/delete agenda items;
      service user: create agenda items.
- [ ] paper roles: `setAgendaItemReviewHelpStatus`.
- [ ] PC: create/update/delete places (with site plan upload), calendar days (also import),
      tracks, entries (every referenced id is checked to belong to the conference).
- [ ] PM + CL: `seatPlanningAssignments`.

## Surveys (`surveyQuestion`, `surveyOption`, `surveyAnswer`)

- [ ] participant: read published, non-hidden questions and their options of own conferences;
      read and change own answer; never delete it. → F-20
- [ ] PC: create/update/delete questions and options, read and change everybody's answers,
      answer on anybody's behalf (past the deadline and over the limit), `distributeUnansweredSurvey`.
- [ ] `surveyOption.countSurveyAnswers` is readable wherever the option is.

## Attendance and scanner (`attendanceSession`, `attendanceEntry`, `scanLookup`)

- [ ] self: read own attendance entries.
- [ ] team: read every entry and session of the conference.
- [ ] PC: start/end sessions, set an occasion on/off the certificates, `certificateOccasions`,
      update/delete entries.
- [ ] team (any role): `createAttendanceEntry(userId, conferenceId, sessionId)` for anybody who is
      in the conference (participants and team members alike), optionally storing an access card.
      → F-17
- [ ] team (any role): `scanLookup(conferenceId, code)` — code is an access card id of the
      conference or a user id of somebody with a part in it (delegate, single, supervisor, team,
      waiting list): answers name, birthday, part in the conference, seat, card id and statuses.
      Anybody else is "not found".

## Certificates

- [ ] self, or PC of the conference: `getCertificateJWT(conferenceId, userId)` — signed certificate
      with full name, conference and the check-in occasions attended; null until attendance is
      recorded.
- [ ] anybody: `getCertificateJWTPublicKeyObject`; `/validateCertificate/[jwt]` and `/vc/[jwt]`
      show what a presented certificate says.

## Payments (`paymentTransaction`, `userReferenceInPaymentTransaction`)

- [ ] payer: read own transfer references and whom they cover; covered person: read the references
      that cover them.
- [ ] PC: read and update (received at, amount) all of the conference.
- [ ] participant: `createPaymentTransaction` in own name, covering people whose user row they may
      read (themselves, co-delegates, supervised people, supervisors, …) who take part in the
      conference. PC: on anybody's behalf.

## Assignment draft (`assignmentReview`, `assignmentUnit`, `assignmentUnitMember`, `assignmentSingleRole`, `assignmentWeights`)

- [ ] PC, admin: everything; nobody else reads any of it.
- [ ] PC: rate/flag/disqualify/require applications, weights, plan roles for delegations, parts and
      singles, split/undo, convert singles, auto-assign, reset, discard, `applyAssignment`,
      `setAssignmentReleased` (both ways). Every role id is checked to be the conference's.
- [ ] PC: the sighting (`sightingDeck`, `sightingEntries`, `sightingNameMatches`,
      `sightingSchools`).

## Schools (`school`, `schoolSuggestion`)

- [ ] anybody: name, city, region, country of every school; `searchSchools`.
- [ ] PC of a conference a person of that school takes part in or waits for: the full row
      (address, website, contact name/email/phone, team `notes`), `updateSchool`, `mergeSchools`
      (across all conferences), `schoolMetrics`.
- [ ] PC: `conferenceSchools` (per-conference numbers), `analyzeSchoolSuggestions`,
      read/dismiss suggestions.
- [ ] Any registration mutation that takes `schoolName` creates a school row that everybody can
      then find by name.

## Possible duplicates (`possibleDuplicate`)

- [ ] PC of a conference one of the two accounts is managed in, admin: read the pair (score,
      reasons, status, both accounts' conference attendances by title) and decide it.
- [ ] PC: `scanPossibleDuplicates(conferenceId)`; every profile change rescans in the background.
      The comparison pool is everybody who attended a conference that is over or has a care note,
      across organizers. → F-13

## Emails (`conferenceEmailSetting`, `conferenceEmailText`, `conferenceEmailFooter`, `emailLog`)

- [ ] team: read which kinds are on, the texts and footers.
- [ ] PC: switch kinds (with "skip existing"), write texts and footers, `emailPreview` (rendered to
      the caller's own data), `openEmailCount`, `emailStats`, read the log (recipient user and the
      address the mail went to).
- [ ] the `send-emails` job with `x-jobs-secret`: `POST /api/jobs/send-emails`.

## Files (`storedFile`)

- [ ] a file's `url` (presigned GET, valid 12 h, reused 6 h) goes to whoever may read the file,
      which follows the row holding it: conference image, emblem, logo wherever the conference is
      readable; templates to participants and team; resolution PDFs to participants and team;
      site plans to anybody; an unclaimed upload to its uploader only. → F-08
- [ ] uploader, admin: `uploadedById`.
- [ ] PM: upload conference images; PM, PC, CL: templates and resolution PDFs; PC: site plans
      (`requestFileUpload`, then the row mutation claims the file: same uploader, same purpose,
      same conference).

## Statistics, nametags, participants table

- [ ] team (any role): `getConferenceStatistics` — aggregates over the whole conference: counts by
      age, gender, food preference, country and German zip prefix, status, papers, schools,
      waiting list, supervisors. → F-14
- [ ] PC: `participantsPage` (search/filter/sort over contact data and care status, answers ids),
      `nametagBins`, `nametagBinGroups`.
- [ ] user: `ownNametagTable`.

## Outside GraphQL

- [ ] user (any session): `POST /api/pdf` compiles Typst (resolution or raw source) to PDF. No
      conference, no rate limit. → F-15
- [ ] The API is same-origin only (`cors: false`); the SSR remote function cannot be called over
      HTTP.
- [ ] `/dashboard/[conferenceId]` and `/dashboard/[conferenceId]/seats` are public pages; every
      other authenticated route redirects to the provider.
- [ ] OIDC bearer tokens are accepted on the API (`allowBearerToken: true`).
- [ ] Jobs: `mail-sync` sends email, name, user id and conference memberships to Listmonk;
      `file-cleanup`, `invitation-cleanup`, `refresh-statistics` read the database directly.
- [ ] Logs: impersonation start/stop/revocation with actor and subject ids; email conflicts with
      masked addresses; Sentry with `SENTRY_SEND_DEFAULT_PII` deciding what it collects.
