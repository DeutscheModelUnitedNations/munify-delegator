# Messages

Chats, inboxes, trusted persons, reports and hiding, write rules, messaging terms. Indexed from
`CLAUDE.md` ("Architecture docs").

- **People of a conference write each other inside the app** (`#api/handlers/chat/`, tables in
  `schema/messages.ts`), once the conference switched it on (`conference.messagingEnabled`, a
  feature switch of `updateConference`). A `chat` is `DIRECT` (two seated participants), `DELEGATION`
  (a delegation's group) or `TEAM` (one participant and a team inbox); `chatMessage` is append-only.
  Delegation members and single participants take part, supervisors do not.
- **Participants know each other by role, never by name.** A `ChatContact` (`chatContacts.ts`) is a
  seated person as role, committee and, among several sharing both, a number (`numberContacts`).
  A message names its participant author only by `authorParticipantId`; `authorName` is filled
  where the reader may know it: a team member writing from an inbox, a member of the reader's own
  delegation group, anybody for participant care. `chat.people` (names and accounts) answers
  participant care only. Never expose a user row through a chat relation.
- **Team inboxes are shared** (`chat.inbox`): `PARTICIPANT_CARE`, one per conference, answered by
  the participant care roles; `CHAIR` and `CONSULTANT`, one per committee, answered by whoever holds
  that **committee function** (`teamFunction`, `#api/handlers/teamFunction/`, handed out by
  `manageTeam` on the team members page; in the caller's facts as `teamFunctions`); and
  `TRUSTED_PERSON`, answered by the conference's trusted persons (see below). An inbox reads
  as one (`chat.teamReadAt`); a person's reading is `chatRead`. An inbox files a settled chat in
  its **archive** (`chat.teamArchivedAt`, `setChatArchived`, for whoever answers the inbox): that
  reads it, the list hides it until asked, and the next message from either side empties the
  column (`sendMessage`), so the chat is back. The participant is not told (`chat.archived` and
  `teamArchivedAt` answer the team side only). `inboxReaches`
  (`#lib/helpers/chat.ts`) says which inbox and person write each other: participant care anybody
  with a registration, a committee's inboxes the people seated there and those seated without a
  committee.
- **What is written to the trusted persons stays with them.** A trusted person is a team function
  without a committee (`teamFunction.kind = 'TRUSTED_PERSON'`, the switch on top of the functions
  dialog). Participants reach them at any time while messaging is on: all of them together (a
  `TRUSTED_PERSON` chat without `trustedUserId`) or one of them by full name (`trustedUserId`;
  `chatInboxes` names each by their function's id, `trustedPersonId`, never by account, and
  `chat.trustedPersonName` is the label). The shared chat is read by every trusted person of the
  conference, a personal one by that person alone (`trustedChats`, `holdsTrustedInbox`): not by
  participant care, not by a system admin (`adminChats` leaves the inbox out), not by an assistant
  (`callerUserId`). Nobody learns the participant's name there, participant care included
  (`knowsPeopleOf`), and a team chat cannot be reported. `chat.trustedUserId` has no relation on
  purpose and answers only its own person. Anything new that reads chats has to keep this.
- **Who reads a chat** is `chatPermissions.ts`: its parties; for a team chat whoever answers its
  inbox; participant care a chat between participants only while a report is open
  (`chat.underReview`, set by `reportChat`, cleared when the last report is resolved:
  `resolveChatReports` settles all of a chat's at once, with an internal note,
  `chatReport.resolutionNote`). There it gets everybody of the chat by role and name
  (`chat.contacts`, `chat.people`), the members of a delegation's group included, each with the
  settled reports there were before about their chats (`earlierReports`). A system
  admin reads what the team reads, never a private chat. `chatSide` answers how the caller relates
  to a chat (`PARTICIPANT`, `TEAM`, `REVIEW`); `REVIEW` never writes.
- **Participant care hides messages, it never deletes them.** While a report of a chat between
  participants is open, participant care (and a system admin) hides one message
  (`hideChatMessage`) or everything one person wrote into the chat so far (`hideChatMessagesOf`),
  with a reason for the team (`#api/handlers/chat/chatModeration.ts`). Hiding is final and keeps
  the text as evidence: `chatMessage.hiddenAt` / `hiddenById` / `hiddenReason` / `hiddenReportId`
  (the oldest report open then), and the `chat_message_hidden` migration's trigger refuses changing
  a message's text, unhiding it or hiding in a team chat. The parties' read rule is split in two
  (`chatPermissions.ts`): their hidden messages come with `body`, `hiddenReason`, `hiddenById` and
  `hiddenReportId` masked, so they read a placeholder (`ChatBubble`, `lastMessagePreview`) and
  cannot filter or search by the text either. `body` is a nullable field for that reason. Once
  the report is settled and the chat private again, participant care reads what was hidden on the
  report (`chatReport.hiddenMessages`, `SettledReports`); the record goes with the chat when it is
  deleted. Nobody is notified of a hiding.
- **Who may write right now** is `writeRefusal` (`#lib/helpers/chat.ts`, shared with the pages
  through `chat.writeRefusal`): nobody while messaging is off; participants each other and their
  delegation only once the roles are released, while both hold a seat, neither blocked the other
  (`chatBlock`) and the writer is not suspended (`conferenceParticipant.messagingSuspended`, set by
  participant care). The team is always reached.
- **A participant agrees to the terms before their first message.** The terms of the message
  service are the app's, one YAML file per version with every text in both languages
  (`#api/handlers/messagingTerms/terms/v<version>.yaml`, read by `terms.ts` and checked by the zod
  schema in `messagingTermsDocument.ts`): sections with an id, an icon, a title, a one-sentence
  `summary`, the paragraphs and an optional `callout`, plus the `confirmations` to tick.
  `messagingTerms` answers them in the caller's locale with a `contentHash` of exactly that text.
  `sendChatMessage` refuses a party without an acceptance that holds with `TERMS_NOT_ACCEPTED`
  (`assertAcceptedTerms`); the composer then shows `MessagingTermsModal`, and
  `acceptMessagingTerms` takes the version, revision and hash the reader was shown and every
  confirmation (INVALID_INPUT otherwise) and adds a row to `messaging_terms_acceptance` (version,
  revision, locale, hash, confirmations; one per account, for every conference; never changed). An acceptance
  holds for the current version with every confirmation it asks for (`acceptanceHolds`). The team
  writes without. **Raise `version` (in a new file, keeping the old one) when the terms change in
  meaning**, and everybody is asked again; raise `revision` for wording only. `terms/revisions.json`
  pins each revision's hash, so `terms.test.ts` fails on a text changed without either.
- **Mails notify, they do not relay.** `UNREAD_MESSAGES` is an automatic mail like any other (see
  "Automatic emails"): `unreadMessages.ts` finds, for the people of the page the sweep reads (`loadUnreadOfParticipants`, `loadUnreadOfTeam`), the oldest message they have not
  read, and once it has waited `UNREAD_MESSAGE_MAIL_MINUTES` the reader is owed one mail, keyed by
  that message, without the text. A participant turns it off for themselves
  (`user.messageNotificationEmails`); the team chooses per inbox, and hears on Slack too (see
  "Team notifications").
- **The pages** are `dashboard/[conferenceId]/messages` (participants) and `team/messages` (the
  inboxes the caller answers, and the reports for participant care), both built from
  `#lib/components/chat/` (see CLAUDE-UI.md). `WriteToDelegateButton` opens the chat of a team
  inbox with a participant from wherever the team meets them (a paper, the paper tables) and
  attaches the paper to the first message. `e2e/authorization/messages.spec.ts` pins the rules
  down, `e2e/messages/` the flows; the dev seed's `seed-dev/messages.ts` has every state.
