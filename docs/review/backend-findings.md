# Backend review: findings, structure, PII inventory

Reviewed state: commit `26af3eb8` (branch `rumbbbbbbble`), working tree clean, 2026-10-27.
Scope: `src/api/handlers/**`, `src/api/services/**`, `src/api/db/schema/**`, `relations.ts`,
`hooks.server.ts`, the non-GraphQL routes under `src/routes/api`, the jobs, cross-checked against
`e2e/authorization/*.spec.ts`. Static reading only; no code was changed. The inventory of what each
actor may do is in [permissions.md](./permissions.md).

Severity: **critical** = PII of people outside the caller's conference reachable without a
relationship; **high** = PII of people in the conference reachable by a role that should not have
it; **medium** = wider than the role matrix in `authHelper.ts` says, or a guard that is weaker than
it looks; **low** = tidy-ups; **question** = looks intentional, confirm it is.

Tick a box once the item is decided (fixed, accepted, or rejected).

---

## Findings

### F-01 · critical · Participant care of any conference can read any account in full

**Accepted (2026-10-27):** direct placement of any account is how assignments work for now.

- [x] `src/api/handlers/user/userPermissions.ts:275` (`assertCanPreviewUsers`),
      `src/api/handlers/delegationMember/delegationMember.ts:101`
      (`createAppliedDelegationMember`), `singleParticipant.ts:106`
      (`createAppliedSingleParticipant`), `conferenceSupervisor.ts:37`
      (`createConferenceSupervisor` with `userId`), `conferenceParticipant.ts:47`
      (`updateConferenceParticipant` by `userEmail`).

What: `previewUserByIdOrEmail` turns any email address into a user id for anybody holding
PROJECT_MANAGEMENT or PARTICIPANT_CARE on _any_ conference. The three "place somebody directly"
mutations then take any user id and register that person in the caller's conference without the
person's consent or any relationship check (`placeUserInAssignedDelegation` only clears an existing
registration of theirs). From that moment `isManagedUser` matches, and the caller reads the whole
row: address, phone, birthday, emergency contacts and `globalNotes`, and may impersonate them.
A team of a small conference thereby reaches every account that ever registered anywhere,
including minors of other organizers' conferences ("Seed 10 · Other organizers" in the dev seed is
exactly that situation).

Why it matters: the role matrix says PC reads "the participants of their conference". The data
says: anyone PC can name. Consider: restrict direct placement to accounts that already have a
relation to the conference (waiting list, previous registration, an invitation the person
accepted), or make it a two-step flow the person confirms; restrict `previewUserByIdOrEmail` to
accounts already in the caller's conference or on its waiting list; and audit-log direct placements.

### F-02 · medium · Six-character codes are the only authorization for joins, previews and supervision

**Fixed (2026-10-27):** new codes are 8 characters (old 6-character ones still work), every lookup
by code counts misses per account (10 per 10 minutes, `codeGuessLimiter`), and the delegation
preview no longer returns the application texts. Not done: a stage check on `previewDelegation`
(see F-09).

- [x] `src/api/services/registration/entryCodeGenerator.ts` (6 chars, 20-letter alphabet =
      6.4 × 10⁷ codes), `delegation.ts:125` (`previewDelegation`),
      `delegationMember.ts:37` (`createDelegationMember`), `conferenceSupervisor.ts:106/220`
      (`connectToConferenceSupervisor`, `previewConferenceSupervisor`).

What: a delegation's entry code is unique per conference, a supervisor's connection code globally.
Any signed-in account may call `previewDelegation` for any conference with a guessed code and
learns the head delegate's full name, the application texts, the schools and the member count; a
hit on `createDelegationMember` joins the delegation and makes the caller a co-delegate, which
unlocks IDENTITY of every member (F-06). With a few hundred delegations in one conference, the
chance per guess is ~1 in 10⁵; there is no rate limit, lockout or logging on either preview.
`previewConferenceSupervisor` at least requires a part in the conference.

Consider: longer codes (8+ characters), a rate limit per account and IP on the preview and join
mutations, logging failed attempts, and requiring a part in the conference (or the conference
being open) for `previewDelegation` too.

### F-04 · medium · Participant care reads its own teammates like participants, care notes included

**Fixed (2026-10-27):** `isManagedUser` no longer includes the team. Team admins (project
management, team coordinators) read teammates without care notes; plain participant care reads
name and phone. Nobody but an admin edits a teammate's name, birthday or notes. Pinned in
`e2e/authorization/api-abilities.spec.ts`.

- [x] `src/api/services/authHelper.ts:152-163` (`isManagedUser` includes `teamMember`),
      `userPermissions.ts:84`.

What: PC/PM read everything of every team member of their conference, including `globalNotes`,
address, emergency contacts. A TEAM_COORDINATOR, whose job the team is, reads the same **minus**
care notes. The asymmetry suggests the team branch of `isManagedUser` was added for the team
members page and inherited the care-note column by accident. Also: `assertCanManageUser` lets PC
write care notes about teammates.

### F-05 · question · Supervisors read emergency contacts, gender, food preference, address and phone of the people they supervise

- [ ] `userPermissions.ts:96-104` (`WITHOUT_CARE_NOTES` for supervisors).

What: the comment says "contact details included"; the mask hands over everything but care
notes. A teacher reasonably needs phone and emergency contacts for a trip; gender, pronouns, food
preference and the full postal address are less obviously theirs. Also note that _anybody_ with a
delegate's consent (the connection code) becomes their supervisor: a classmate with the code sees
all of this. Decide the column list deliberately and write it as an explicit `columns` map.

### F-06 · medium · "Identity" includes email and birthday, and goes to co-delegates and paper reviewers

**Fixed (2026-10-27):** `IDENTITY` is split into `NAME`, `NAME_AND_EMAIL` and `IDENTITY`.
Co-delegates and reviewers reading authors get `NAME`; students and co-supervisors get a
supervisor's `NAME_AND_EMAIL`; the team and the duplicate check keep `IDENTITY`. The delegation
members table no longer shows emails and takes "of age" from the new
`conferenceParticipant.ofAgeAtConference` instead of the birthday. Pinned in the co-delegate e2e test.

- [x] `userPermissions.ts:31-42` (`IDENTITY`), rules at lines 127, 138, 156, 177.

What: co-delegates (other minors), the authors' reviewers (every team role but MEMBER) and
co-supervisors read `email`, `birthday`, `pronouns` and `locale`. The comment justifies birthday
with "the age checks" — that is a head-delegate concern, and a boolean would do. The existing e2e
test ("co-delegates see each other's names, not each other's contact details",
`e2e/authorization/api-abilities.spec.ts:148`) passes because it checks phone and emergency
contacts, not email or birthday. Consider splitting `IDENTITY` into a name-only
set for co-delegates/reviewers and a contact set for the team.

### F-07 · medium · A co-delegate reads the administrative status row of every co-delegate

- [ ] `conferenceParticipantPermissions.ts:31-37`; the table has no column masks.

What: payment status, guardian consent, media consent (and its status), terms, attendance, the
document number and the **access card id** of every member of the same delegation. The head
delegate's overview needs "has open issues", not the individual statuses. The access card id is
also what the scanner matches first (`scanLookupService.ts:32`), so a co-delegate knows what to
put on a forged badge. Mask everything but `id`, `userId`, `conferenceId`, `schoolId` (and perhaps
a derived "complete" flag) for co-delegates; review the supervisor rule the same way.

### F-08 · medium · Every `storedFile` row is readable by anybody who learns its id

**Fixed (2026-10-27):** the `storedFile` read rules now follow the row holding the file, through
reverse relations from `storedFile` to its holders: pictures wherever the conference is readable,
templates and resolutions for participants and team, site plans for anybody, unclaimed files for
the uploader. A new file field needs its own rule, so it is private by default.

- [x] `src/api/handlers/storedFile/storedFilePermissions.ts:15-27` (the `TODO(security)`).

What: the base read rule is unconditional; privacy rests on the holding row's column mask and on
file ids being unguessable. The author flagged it themselves. Today no file holds PII (templates,
logos, site plans, resolutions), so the risk is a future file field. Consider scoping the base rule
to files whose holding row the caller may read (or to the caller's conferences), so a new field is
safe by default.

### F-09 · medium · Registering is open in every conference state, which widens who is a "participant"

**Fixed (2026-10-27):** registering yourself as head delegate, single participant or supervisor,
and joining a delegation, now go through `assertRegistrationOpen`
(`src/api/services/registration/applicationReadiness.ts`), the same window as applying
(PARTICIPANT_REGISTRATION plus the grace period). Editing an existing registration and participant
care registering somebody else (`createConferenceSupervisor` with `userId`) stay open in every
stage. `e2e/authorization/api-abilities.spec.ts` pins it on the preparation conference.

- [x] `conferenceSupervisorService.ts:35` (`registerSupervisor`), `delegationService.ts:60`,
      `singleParticipantService.ts:83`; documented in `authHelper.ts:44-45`.

What: any account can register as supervisor, head delegate or single participant in a conference
in PRE, ACTIVE or POST. Being a participant unlocks `MEMBERS_ONLY` conference columns (bank
details, postal address, template files), the published surveys, the adopted resolutions, the
calendar and `findGlobalPapersGroupedByCommittee`, and lets the person attach themselves to
supervisors by code. Conferences hidden from the public (PRE, POST) are thereby not hidden from
anybody who registers into them. Bind registration to `PARTICIPANT_REGISTRATION` (plus the grace
period) like applying is, or at least refuse POST and PRE.

### F-10 · low · Committee moves by the head delegate are not tied to the delegation's seats

**Fixed (2026-10-27):** `updateDelegationMemberCommittee` and `updateManyDelegationMemberCommittee`
now refuse a committee that does not seat the delegation's assigned role (`assertCommitteeSeats`,
shared with the assistant's `assertCanAssignCommittees`), for every caller; the team's modal only
offered those committees anyway. The bulk move also checks the per-delegation seat limit now
(`assertSeatLimits`, in a transaction). `e2e/authorization/api-abilities.spec.ts` pins it with a
committee that does not seat the head delegate's nation (`E2E_UNSEATED_COMMITTEE_ID`). The head
delegate's update ability on unassigned members stays: the single move still swaps within their own
delegation, which is the seat distribution it is meant for.

- [x] `delegationMemberPermissions.ts:66-77` (head delegate `update` without `applied: false`),
      `delegationMemberPermissions.ts:131-145` (`authorizeDelegationMemberCommitteeMoves`),
      `delegationMemberService.ts:239` (`moveMemberToCommittee`).

What: the head delegate's update ability covers members without a committee at any time, and the
single/bulk committee moves only check that the committee belongs to the conference, not that it
seats the delegation's nation (only the assistant's `assignCommitteesToDelegationMembers` does).
A head delegate can thus seat their members into any committee and, through the swap logic,
displace others. Probably the self-service path is meant for the head delegate to distribute
seats; then check the committee seats the delegation's role there too.

### F-11 · question · Participant care and the content lead may change the conference state and the payment/postal unlocks

- [ ] `conferencePermissions.ts:72-96` (`CONFERENCE_CONTENT_ARGS` includes `state`,
      `unlockPayments`, `unlockPostals`).

What: the state machine (PRE → … → POST) and the unlocks drive what every participant sees and
which automatic mails go out. The matrix gives "the conference" to PM. Confirm PC/CL are meant to
move the conference between stages.

### F-12 · question · Impersonation of minors by participant care

- [ ] `userPermissions.ts:294-301`, `hooks.server.ts:112-135`, logging in `user.ts:236-252`.

What: PC of a conference may act as any delegate or single participant of it, including minors,
and everything they do (papers, surveys, payments references, profile edits) is written in the
minor's name. The only audit trail is `console.info` lines. Decide whether that is acceptable
for the care team or should be admin-only, and whether impersonated writes should be recorded
(an `actedBy` column, or at least a structured log that is retained).

### F-13 · question · The duplicate scan crosses organizers

- [ ] `src/api/handlers/possibleDuplicate/possibleDuplicates.ts`, `userPermissions.ts:45-59`.

What: the comparison pool is everybody who attended any conference that is over or carries a care
note, so PC of organizer A gets pairs with accounts that only ever took part with organizer B, and
reads their name, email, birthday and care notes while the pair is open. This is documented and
intended for one organization; it is worth a sentence in the privacy notice, and a thought if the
instance is ever shared.

### F-14 · low · Statistics are readable by every team role

- [ ] `statisticsPermissions.ts`.

What: aggregated only (age distribution, gender, diet, country and zip prefix), but small
conferences make some cells identifying (one vegan 15-year-old from one zip prefix). MEMBER and
REVIEWER do not need them.

### F-15 · low · `POST /api/pdf` compiles untrusted Typst for any signed-in account

**Partly fixed (2026-10-27):** each account may start 20 compiles in ten minutes
(`createAttemptLimiter` in `failureLimit.ts`, Redis or in-memory, answering 429), and a process runs
at most two at once (`createCompileSlots`, answering 503 instead of queueing). File access was
checked and is no concern: Typst 0.10 resolves every path inside the temp dir it compiles in,
absolute ones included, and refuses `..` out of it. The compiler runs with only `PATH` and a dead
HTTP(S) proxy (`compileEnv`), so it sees none of the app's secrets and cannot download `@preview`
packages (a package already in the server's cache still imports). Still open: the network is cut
only through the proxy variables, not by the OS; a compile's memory is not capped; and Typst
0.10 is old (newer releases add `--ignore-system-fonts` and package path flags).

- [x] `src/routes/api/pdf/+server.ts`, `pdfRequest.ts`.

What: any session qualifies, with no conference, up to 5 MB of source and a 30 s compile per
request, and no rate limit. Typst can read files relative to its working directory (`#read`,
`#image`); the compile runs in a temp dir, not a sandbox. Rate-limit per account and consider a
`--root` restricted to the temp dir.

### F-16 · low · Unauthenticated newsletter opt-out for any address

**Deferred (2026-10-27):** the unsubscribe links are built by the Listmonk templates, so a signed
token needs the mail sync to write it into the subscriber's attribs and the template to use it.
Left as a `TODO(security)` on `assertCanUpdateNewsletterPreferences` until the template can change
with it.

- [x] `user.ts:151`, `userPermissions.ts:261-272`.

What: standard for unsubscribe links and correctly answers `true` regardless. Just note that
anybody can switch anybody's newsletters off; a signed token in the link would avoid it.

### F-17 · low · Scanning creates participant rows for team members, and any team role records attendance

**Fixed (2026-10-27):** team members are not scanned in. `createAttendanceEntry` records only
delegates, single participants and supervisors (`assertParticipantToScan`, refusing the team with
`teamMembersAreNotScanned`), so the scanner creates no participant row for the team. `scanLookup`
still finds and names team members but no longer counts them as `inConference`; the scanner shows
them with a "team member, not scanned in" note, records nothing and hands out no card. Rows that
earlier scans created for team members are not cleaned up. Any team role still records attendance
(intended: the scanner is on every team member's dashboard).

- [x] `attendanceEntry.ts:129` (`ensureConferenceParticipant` after
      `assertUserInConference`, which includes team members).

What: the participant row is documented as "a person's part in a conference as delegate, single
or supervisor"; a scanned team member gets one too, and then has a payment status, consent
statuses and shows up in counts that filter by this table. Either exclude team members from the
scanner's participant-row creation or document that team members have rows.

### F-18 · medium · There is no deletion or retention path for accounts

**Deferred (2026-10-27):** the policy is still to be decided. A `TODO(privacy)` above the `user`
table (`src/api/db/schema/users.ts`) lists every reference that blocks a deletion, the copies that
would survive one, and the plan: retention job, anonymisation that keeps the row, deletion on
request, and loosening the team-side `restrict` keys.

- [x] `schema/participants.ts` (`userId: userRef('restrict')`), `schema/team.ts`,
      `schema/papers.ts` (`reviewerId`, `invitedById`, `createdById`, `recordedById` all
      `restrict`), `src/jobs/` (only invitations and files are cleaned).

What: no mutation or job deletes or anonymises a user; the foreign keys would refuse it while any
participation, review, invitation or scan exists. Addresses, birthdays, emergency contacts and
care notes of minors therefore stay forever, as do `emailLog.email` copies and `searchHistory`
labels. For a system holding minors' data a retention rule (e.g. anonymise participants N years
after their last conference, delete accounts that never applied) and a deletion request path are
expected. Decide the policy before the schema makes it harder.

### F-19 · low · Reference data of every conference is public, in every state

**Fixed (2026-10-27):** what the seat overview shows (committees, agenda items, conference roles)
follows the conference's own read rule (`readableConference`: public in PARTICIPANT_REGISTRATION
and PREPARATION, otherwise for the people with a part in it), so the conference and its seats stay
public while it takes registrations. The schedule (calendar days, tracks, entries, places and their
site plans) is for the team, and for participants once `showCalendar` is on (`calendarConference`),
as the dashboard shows it. `nextDocumentNumber` is participant care's
(`assertCanReadNextDocumentNumber`). `waitingListLength` and `totalParticipants` stay public: the
landing page shows them for public conferences.

- [x] `committeePermissions.ts:16`, `committeeAgendaItemPermissions.ts:16`,
      `conferenceRolePermissions.ts:15`, `placePermissions.ts:15`, `calendarDay/Track/Entry`,
      `conference.ts:46-85` (`nextDocumentNumber`, `waitingListLength`, `totalParticipants`).

What: committees, agenda items, roles, places (with address and site plan), calendar days, tracks
and open entries of conferences in PRE and POST are readable without a session, although the
conference row itself is not. `nextDocumentNumber` tells an anonymous visitor how many documents
were handed out. No PII, but unpublished planning leaks; scope these to the conference's own read
rule.

### F-20 · low · Asymmetries worth a deliberate decision

**Fixed (2026-10-27)**, each with the page that uses it:

- [x] PC may update but not delete a delegation (`delegationPermissions.ts:53-55`); only the
      pre-apply head delegate and admin may. → PC and PM delete their conference's delegations;
      "delete delegation" in the user card's delegation section.
- [x] a waiting-list entrant can neither change nor withdraw their entry
      (`waitingListEntryPermissions.ts`); only PC can. → the entrant updates and deletes their own
      entry until it is assigned; `hidden` and `assigned` stay PC's (`assertCanSetWaitingListFlags`).
      The waiting list page stays editable and offers "leave the waiting list".
- [x] a participant cannot delete a survey answer, only change it (`surveyAnswerPermissions.ts:20`).
      → `deleteSurveyAnswer(questionId, userId?)`: own answers until the question's deadline, PC
      any time; "withdraw answer" in the answer modal and the user card.
- [x] team roles cannot be changed, only removed and re-invited (`teamMemberPermissions.ts`).
      → `updateTeamMemberRole`, for whoever may remove the member and hand out the new role
      (`assertCanChangeTeamRole`, as for invitations); the role column of the team page is a select.
- [x] PC reads but cannot edit a delegation's wishes after applying (`roleApplicationPermissions.ts`).
      → PC and PM update and delete role applications of their conference; the user card's wish
      list removes and reorders them. Adding a wish there has no UI yet (`createRoleApplication`
      already allows it through the delegation's update ability).
- [x] PC can `updateDelegation` any time, including `applied` back to false and `resetEntryCode`,
      with no stage check. → taking an application back is refused outside
      PARTICIPANT_REGISTRATION, as the user card only offers it then. Rotating the entry code stays
      open: joining is bound to the registration stage now (F-09), so a new code changes nothing
      later on.

---

## Structure

Overall the three-way split (GraphQL layer / permissions / service) is followed consistently, the
services I read do not check permissions, every create checks the parent conference and every
foreign id is checked to belong where the row goes (`assertOfferedIn`, `assertCustomRolesOf`,
`assertReferences`, `assertSessionOfConference`, `assertSplitMembersOf`). Updates and deletes go
through the row's ability. The column-mask approach is sound and rumble's `search` only matches
columns every matching rule guarantees (`node_modules/@m1212e/rumble/out/index.mjs`, the
`columnMask.guaranteed` filter), so the trigram indexes on `user.phone`, `emergencyContacts` and
`globalNotes` are not an oracle.

Points to tidy:

- [x] **"Being in the conference" means four different sets of people.** Each helper below is right
      for its caller, but the old names did not say which set it meant, and F-04 and F-17 came
      from mixing them up. Renamed (2026-10-27, no logic changed); "participant" now always means
      delegate, single participant or supervisor:

      | Helper | Who it matches |
      | --- | --- |
      | `participatesIn` | participants |
      | `assertParticipantOrTeamMemberIn` (was `assertUserInConference`) | participants and the team |
      | `fetchParticipationsAndTeamMembership` (was `fetchUserParticipations`) | participants and the team, for the "already registered" conflict |
      | `isParticipantOrTeamMember` (was `isUserAlreadyRegistered`) | the same, as a yes/no |
      | `isCaredForUser` (was `isManagedUser`) | participants and waiting list of the conferences where the caller is participant care (no longer the team, since F-04) |

- [x] **`IDENTITY` is one constant for four audiences** (F-06). Split.
- [ ] **`conferenceParticipant` has no masks at all** (F-07) although it is the row that carries
      a minor's consents and card id.
- [ ] **Ability-free custom queries carry their own checks**: `previewDelegation`,
      `previewUserByIdOrEmail`, `conferencePlausibility`, `participantsPage`, the sighting, the
      statistics. These bypass the masks by design and are where F-01 lives. Keep a list of
      them (this document is one) and give each a sentence saying which columns it exposes and why
      the mask does not apply.
- [ ] **e2e coverage.** Pinned by `e2e/authorization/`: unreleased roles, impersonation bounds,
      management routes, writing on behalf of others, join codes hidden from reviewers,
      members-only templates, supervisor scope, school details, duplicate pairs, same-conference
      triggers. Not pinned: `scanLookup` (strangers are "not found"), `previewDelegation`, direct placement of outsiders
      (F-01), `storedFile` reads by id, the co-delegate status row (F-07), co-delegate email and
      birthday (F-06). Add a spec per accepted rule.
- [ ] **Primary keys not defaulted by the schema**: `attendanceSession.id` is chosen by the
      client (documented, guarded by `assertSessionOfConference`); `paymentTransaction.id` is a
      server-generated SEPA-safe reference (`paymentTransactionService.ts:63-71`, retried on
      clash). Both fine; a comment on the schema columns would save the next reader the lookup.
- [ ] **`stored_file.conferenceId` is not a foreign key** (documented) and `emailLog.email`,
      `searchHistory.label` keep copies of personal data outside the user row; include them in
      whatever retention rule F-18 produces.
- [ ] **Logging**: impersonation events, email conflicts (masked) and `console.error` of failed
      invitation redemption write user ids to stdout; Sentry collection depends on
      `SENTRY_SEND_DEFAULT_PII`. Fine, but list them in the processing record.

---

## PII inventory

### Where personal data lives

| Table                                                          | Personal data                                                                                                                                                                              | Of whom                        |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `user`                                                         | email, names, username, birthday, phone, full address, gender, pronouns, food preference, emergency contacts (free text: other people's names and numbers), care notes, newsletter consent | every account, minors included |
| `conference_participant`                                       | payment, consent (guardian, media, terms) statuses, attendance, document number, access card id, school                                                                                    | every participant              |
| `delegation`, `single_participant`, `waiting_list_entry`       | motivation and experience texts (free text written by minors), requests                                                                                                                    | applicants                     |
| `conference_supervisor`                                        | attendance plan, connection code                                                                                                                                                           | supervisors                    |
| `supervision`                                                  | who supervises whom                                                                                                                                                                        | both                           |
| `attendance_entry`                                             | when and by whom someone was scanned, check result                                                                                                                                         | participants, team             |
| `survey_answer`                                                | the person's choice (can be sensitive: diet, accommodation, accessibility, depending on the question)                                                                                      | participants                   |
| `paper*`, `paper_review`                                       | authored texts, reviewer identity and comments                                                                                                                                             | delegates, reviewers           |
| `payment_transaction`, `user_reference_in_payment_transaction` | who paid for whom, amounts, dates                                                                                                                                                          | participants                   |
| `possible_duplicate`                                           | that two accounts may be one person, score, reasons, who decided                                                                                                                           | across organizers              |
| `email_log`                                                    | recipient user, the address at send time, failures                                                                                                                                         | recipients                     |
| `search_history`                                               | which person a team member looked up (label as shown)                                                                                                                                      | team, looked-up people         |
| `team_member_invitation`                                       | invitee email, inviter, acceptor                                                                                                                                                           | team                           |
| `school`                                                       | contact name, email, phone of a school's contact person; the team's notes                                                                                                                  | school staff                   |
| `statistics_*` views                                           | aggregates by age, gender, diet, country, zip prefix                                                                                                                                       | small cells can identify       |
| `stored_file`                                                  | uploader id; the objects hold no PII today                                                                                                                                                 | team                           |

### Where it leaves the database

- [ ] **GraphQL** to browsers, as the permission inventory describes, including live
      subscriptions over the same rules.
- [ ] **Automatic mails** (`src/api/handlers/email/`): name, conference, role, statuses, survey
      names, review comments go to participants and supervisors; the supervisor summary lists the
      supervised students' names and roles.
- [ ] **Team mails** (invitations, welcome).
- [ ] **Listmonk** (`src/jobs/mailSync/`): email, formatted name, user id and conference
      memberships as subscriber attributes; subscribers no user claims are stripped of our lists.
- [ ] **Certificates** (`getCertificateJWT`, `/validateCertificate`, `/vc`): full name,
      conference, attended occasions, signed, verifiable offline by anyone holding the token.
- [ ] **Generated PDFs** (`pdfGenerator.ts`): contracts, consents, certificates with names,
      birthdays and document numbers, produced in the browser from data the reader may see.
- [ ] **Identity codes** (`issueIdentityCode`): the user's own id, signed, shown as QR.
- [ ] **Logs and Sentry**: user ids on impersonation and invitation failures; masked emails on
      conflicts; whatever `SENTRY_SEND_DEFAULT_PII` allows.
- [ ] **Statistics views** refreshed by the job, read by every team role (F-14).
- [ ] **S3**: no personal data today (F-08 says what would change that).
- [ ] **Redis pubsub**: only table names and row ids.

### Columns of minors that deserve the strictest audience

`user.birthday`, `user.emergencyContacts`, `user.street/zip/city`, `user.phone`,
`user.globalNotes`, `user.gender`, `conference_participant.guardianConsent` and
`mediaConsentStatus`, `conference_participant.accessCardId`, survey answers about diet or
accommodation, and the application texts. F-01, F-05, F-06 and F-07 are the places where
one of these currently reaches a reader outside participant care and the person themselves.
