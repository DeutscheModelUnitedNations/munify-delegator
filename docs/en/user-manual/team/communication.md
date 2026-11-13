---
title: Communication
description: Announcements, messages, emails, calendar and surveys of a conference
---

# Communication

This page shows how a conference's team reaches participants: with announcements on the dashboard, with chats, with automatic emails, with the schedule and with surveys. Their pages are in the team area, in the **Communication** group. How to find your way around the team area is under [The team area](./overview#the-team-area).

| Page                | Who opens it                                                   |
| ------------------- | -------------------------------------------------------------- |
| **Announcements**   | **Project Management**, **Participant Care**, **Content Lead** |
| **Messages**        | Every team member. The page only shows the inboxes you answer. |
| **Emails**          | **Project Management**, **Participant Care**                   |
| **Calendar**        | **Project Management**, **Participant Care**                   |
| **Surveys / Polls** | **Project Management**, **Participant Care**                   |

System administrators open every page.

## Announcements {#announcements}

Under **Announcements** you write what participants and the team should know. Each announcement has its own audience, starts as a draft and only goes out when you publish it. How participants see it is under [Conference information](../participant/dashboard#conference-information).

### Writing an announcement

**New announcement** opens the editor. You fill in the fields on the left, and on the right under **Preview** you see the announcement the way readers get it.

- **Title** (120 characters at most) and **Text** (10,000 characters at most) are required. The text understands Markdown.
- **Signature (optional)** goes below the text, for example "Your participant care team".
- **Audience**: at least one group, see below.
- **Importance**: **Normal**, **Important** or **Urgent**. An urgent announcement also shows as a bar on every page of the conference for as long as it is unread.
- **Pin to the top**: pinned announcements stay on top for everyone.
- **Notify the audience by mail**: the audience gets an email with the full text, see below.
- **Visible until (optional)**: after that the announcement disappears on its own and shows as **Expired** in the list.
- **Attachments**: up to five files, PDF or image, 10 MB each at most.

You enter times in the conference's time zone. **Save as draft** creates the announcement. Nobody sees it yet except the people who may open this page.

### The audience

Under **Audience** you add groups through the select fields. Whoever is in at least one of them sees the announcement.

- **Add a group …**: **All participants**, **Delegates**, **Single participants**, **Supervisors**, **Applicants without a seat**, **Seated participants**, **Waiting list**, **Payment open**, **Paperwork open**, **Minors** and **Adults**.
- **Add a committee …** and **Add a role …**: everybody seated in that committee or holding that role.
- **Add a survey answer …**: everybody who picked that answer in a survey.
- **Add the team …**: the **Whole team** or everybody with one team role. You reach the team only through this select, never through the other groups.

**All participants** are everybody registered and the waiting list while people register. From the preparation stage on, with the assignment released, they are only those with a seat and their supervisors. Whoever got no seat or is still waiting is then reached through **Applicants without a seat** and **Waiting list**. Minors and adults are counted on the first day of the conference. Somebody without a birthday on record is in neither group.

Below the selection you see how many people the audience reaches right now, split into delegates, single participants, supervisors, waiting list and team. The number follows the registrations. Whoever joins the audience later sees the announcement from then on too.

:::note Committees, roles and seats
**Committee**, **Role**, **Seated participants**, **Payment open** and **Paperwork open** apply to participants only once the assignment is [released](./assignment#finish-and-release). Until then every applicant counts among **Applicants without a seat**. That way an announcement never tells anybody their seat early. Supervisors count as **Seated participants** when they come along themselves and someone they supervise holds a seat.
:::

### Publishing

**Publish …** opens **Publish announcement**. It says how many people the announcement reaches right now and whether an email is sent. If nobody is in the audience the dialog warns you, but it does not stop the publication.

1. Under **When?** choose **Publish now** or **At a later time** with a date and time in the conference's time zone.
2. Confirm with **Publish now** or **Schedule publication**.

Published right away, the announcement appears on the audience's dashboards at once. A scheduled one stays in the list as **Scheduled** until its time and then appears on its own.

### The list

The list shows every announcement with its state (**Draft**, **Scheduled**, **Published**, **Expired** or **Archived**), its audience, who wrote and published it, and how many of its audience have read it. The buttons on each announcement:

- **Edit**: if you change the title or text of a published announcement, readers see "updated on" with the date. A new audience applies at once.
- **Take back**: the announcement disappears for everyone and becomes a draft again. This works for a scheduled one too.
- **Notify again** (only for a published announcement with email): after a confirmation the email goes once more, as it reads now, to everybody in the audience at this moment. It is meant for cases such as a correction.
- **Test mail to me**: the email goes to you alone, the way the audience would get it, whatever the announcement's state and whether it notifies by mail.
- **Duplicate**: a copy with audience and attachments is created as a draft, without **Visible until**.
- **Archive**: the announcement disappears for everyone. **Publish …** brings an archived one back.
- **Delete**: after a confirmation the announcement is gone for good.

### The announcement's email

When **Notify the audience by mail** is on, the next automatic run after publication sends an email to everybody in the audience at that time, for a scheduled announcement at its time. The email holds the title, the full text, the names of the attachments and a link to the announcements. It is owed for 24 hours. Whoever joins the audience after that only finds the announcement on the dashboard.

This email needs no switch on the [Emails](#emails) page: the decision is made on the announcement. Its card there carries **Decided per announcement**, and you change its text there like any other.

:::warning Emails cannot be recalled
An email that went out stays with its recipients, even if you edit, take back or delete the announcement afterwards. Check the text and the audience first, ideally with **Test mail to me**. Whoever already got the email does not get it again when you take the announcement back and publish it once more. That is what **Notify again** is for.
:::

## Messages {#messages}

With messages, participants and the team write to each other in the app. How this looks for participants is under [Messages](../participant/dashboard#messages).

### Switching them on

Messages are off at first. In the settings, in the **Status & Features** tab, switch on **Messages between participants and team** and save as described under [Saving with a preview](./configuration#saving). If you switch them off again, every chat stays readable, but nobody can write any more, not even the team. The **Messages** page then says so.

Delegates and single participants can write. Supervisors do not take part in the chats.

### Inboxes and functions

The team answers from inboxes it shares. Everyone answering an inbox reads along and can reply. Participants see a reply with the function and the name of the person who wrote it.

| Inbox                     | Who answers it                                                          |
| ------------------------- | ----------------------------------------------------------------------- |
| **Participant care**      | everybody with the role **Participant Care** or **Project Management**  |
| **Chairs**                | whoever holds the chair function in a committee, one per committee      |
| **Committee consultants** | whoever holds the consultant function in a committee, one per committee |
| **Trusted persons**       | all trusted persons of the conference together                          |
| **To me personally**      | one single trusted person                                               |

**Project Management** and **Team Coordinator** hand out functions on the [Team Management](./overview#team-management) page. The gavel icon **Functions** in a person's row opens **Functions of …**: there you tick **Chairs** and **Committee consultants** per committee, or make the person a **Trusted person** of the whole conference. Whoever answers no inbox only sees a hint about this on the **Messages** page.

:::note Trusted persons
Participants write to the trusted persons all together or to one of them by name. All trusted persons read the shared chat, only the person addressed reads a personal one. Nobody else reads along, not participant care, not project management and not system administrators. Trusted persons see participants by their role only, never by name. These chats cannot be reported.
:::

### Who can write to whom

| Who                               | To whom                                                                                                                                                                             | From when                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Delegates and single participants | **Participant care** and the trusted persons                                                                                                                                        | as soon as messages are on                   |
| Delegates and single participants | **Chairs** and **Committee consultants** of their committee. Whoever sits without a committee, such as a non-state actor or a single participant, reaches those of every committee. | as soon as the assignment is released        |
| Seated participants               | other seated participants, in a direct chat                                                                                                                                         | as soon as the assignment is released        |
| Members of a delegation           | their delegation's group                                                                                                                                                            | as soon as the delegation's role is released |
| The team, from an inbox           | every seated person the inbox reaches                                                                                                                                               | as soon as the assignment is released        |

In direct chats and delegation groups, participants see each other by role only. The team does not read these chats, except after a report. When a person loses their seat, nobody can write in their direct chats any more.

Before their first message, participants agree to the **Terms of the message service**. They cover respectful conduct, explain who reads along and apply once per account. The team writes without agreeing.

### Replying and new chats

On the **Messages** page the chats of your inboxes are on the left and the open chat on the right. If you answer several inboxes, you narrow the list with the inbox buttons, each with its number of unread messages. Once somebody from the inbox reads a chat, it counts as read for everyone in the inbox.

You see participants in the list by their role. Participant care also sees the name in the chat and opens the [user card](./participants#user-card) from there. Whoever answers a committee inbox only sees the role.

You start a new chat with **New message** once the assignment is released. You search for the person by country, committee or role. If several of your inboxes reach them, the app asks which one you write from.

### From the paper hub

In the [paper hub](./paper-hub) you write to the author of a paper directly. The button **Write to delegate** is on the paper and in the paper lists. It opens the person's chat with an inbox you answer that reaches them. If there are several, you pick one. Your next message links to the paper.

### Reports and suspensions

Participants can report a direct chat or their delegation group. Chats with the team cannot be reported. For participant care and project management, the **Messages** page has a **Reports** tab next to **Inboxes**:

1. Each open report shows the reason and who reported. **Read chat** opens the chat. A note above it says that you read it because of a report and names the people involved with role and name. You cannot write in this chat. The other person is not told who reported.
2. **Suspend from chats** on a person takes them out of every chat with other participants of this conference. They still reach the team and the team still reaches them. **Lift suspension** undoes it.
3. **Resolved** closes the report. Once none of the chat's reports is open, it is private again and participant care no longer reads it.

Resolved reports are folded away under **Resolved reports**.

### Notifications

When a message stays unread for a quarter of an hour, DELEGATOR can point it out by email. This email, **Unread messages**, is one of the automatic emails and, like them, is off at first. Switch it to automatic on the [Emails](#emails) page. It goes to participants and to team members whose inbox has something unread, and it never contains the message's text. No further one follows until the person reads. Participants switch it off for themselves below their chats with **Email about unread messages**.

## Emails {#emails}

DELEGATOR writes to participants, supervisors and the team at important steps. Which email is owed to whom right now follows from the state of the conference, for example a released assignment or a payment marked as done. It is only sent when you send it or switch its kind to automatic. Each email reaches each person at most once and appears in the log.

### The cards

The **Emails** page shows each kind of email as a card, grouped by topics such as **Application**, **Assignment result**, **Waiting list** or **Reminders**. Each card explains under **When**, **To whom** and **Content** what it does, and counts how many were sent, failed or skipped. A card with a changed text carries **Own text**.

### Sending or skipping open emails

When a card shows, say, **3 open**, three people should get this email right now.

- **Send now** sends them in the background, even if the kind is not switched to automatic. A message says how many there are. You can leave the page meanwhile.
- **Skip** asks first and then marks them as skipped. These people will not get the email any more, not automatically either. People who meet the condition later still get it.

:::warning Skipping is final
Skipped emails cannot be reopened. If you do need one of them, send it to the person by hand from their [user card](./participants#user-card).
:::

When an email fails, DELEGATOR tries it up to three times.

### Sending automatically

With **Send automatically** a kind goes out on its own regularly. A new conference sends nothing automatically until you switch it on.

1. Switch on **Send automatically** on the card.
2. If people already meet the condition, the page asks whether they get the email with the next automatic run (**Send to all 3 automatically**) or only people for whom it happens from then on (**Only future cases**). With **Only future cases**, the emails already due are skipped when you save.
3. The card gets a yellow border. Save with the button at the top right. **Confirm Save** lists every change and says for each switch how many people the email then goes to.

The switches and the sending speed only take effect when you save, as in the [settings](./configuration#saving). Texts and the footer save right away in their own windows.

Three kinds have no switch. **Announcement** carries **Decided per announcement** and goes out automatically when an announcement notifies by mail. **Team invitation** and **Badge found** carry **Sent by hand** and always go out when someone triggers the action: the invitation when a person without an account is invited in [Team Management](./overview#team-management) and whenever it is sent again, the found badge on every press of **Badge found** in the user card.

### All kinds at a glance

| Email                                      | Who gets it                                                                                   | When it becomes due                                                                             |
| ------------------------------------------ | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Delegation created**                     | the head delegate, with the code to join                                                      | when a delegation is created, while applications are open and the application has not been sent |
| **Joined a delegation**                    | the person who joined                                                                         | on joining, under the same conditions                                                           |
| **New member in the delegation**           | every member who was in the delegation before                                                 | on every join, under the same conditions                                                        |
| **Application received**                   | every member of the delegation, or the single participant                                     | when the application is sent, until the assignment is released                                  |
| **Acceptance**                             | delegates and single participants with a role, except those moving up from the waiting list   | when the assignment is released, and for everyone who gets a seat afterwards                    |
| **Rejection**                              | whoever sent an application and got no seat                                                   | when the assignment is released                                                                 |
| **Summary for supervisors**                | supervisors with at least one supervised person who applied                                   | when the assignment is released, once only                                                      |
| **Signed up for the waiting list**         | the person on the waiting list                                                                | on signing up, as long as they have no seat                                                     |
| **Moved up from the waiting list**         | the person who moved up                                                                       | when the team gives them a seat and the assignment is released                                  |
| **Postal registration unlocked**           | seated people and supervisors coming along whose documents are not complete                   | as soon as **Allow Postal Registration** is on, also for everyone who gets a seat later         |
| **Participation fee unlocked**             | seated people and supervisors coming along whose payment has not arrived                      | as soon as **Allow Payments** is on, also for everyone who gets a seat later                    |
| **Documents received**                     | the person whose documents are complete                                                       | as soon as all documents they need are marked as done                                           |
| **Payment received**                       | the person whose payment arrived                                                              | as soon as the payment is marked as done                                                        |
| **Problem with documents or payment**      | the person concerned, at most once per document                                               | as soon as a status is set to "Problem"                                                         |
| **New survey**                             | seated people who have not answered the survey                                                | as soon as a survey is published, until its deadline                                            |
| **Application not completed**              | people in an application that has not been sent                                               | 3 days before the application phase ends                                                        |
| **Reminder of open documents and payment** | seated people and supervisors coming along with open paperwork or payment, as far as unlocked | 14 days before the conference starts                                                            |
| **Get to know MUNify CHASE**               | everyone seated who is part of CHASE                                                          | 10 days before the conference starts, only while CHASE is linked                                |
| **MUNify DELEGATOR on the phone**          | everyone seated and supervisors coming along                                                  | 7 days before the conference starts                                                             |
| **Reminder of open surveys**               | seated people who have not answered the survey                                                | 3 days before a survey's deadline                                                               |
| **Feedback on a paper**                    | whoever wrote the paper, once per review                                                      | as soon as someone from the team gives feedback on the paper                                    |
| **Unread messages**                        | participants and team members with unread messages                                            | when a message has been unread for 15 minutes                                                   |
| **Announcement**                           | everybody in the audience at the next automatic run after publication                         | on publication with email and on **Notify again**, for 24 hours                                 |
| **Badge found**                            | the person the badge belongs to                                                               | on every press of **Badge found**                                                               |
| **Certificate available**                  | people marked as attended                                                                     | as soon as the conference is **After the conference** and a certificate template is uploaded    |
| **New person to supervise**                | the supervisor, once per newly connected person                                               | when someone connects using the supervisor code                                                 |
| **Supervisor connected**                   | the supervised person, once per supervisor                                                    | when someone connects using the supervisor code                                                 |
| **Welcome to the team**                    | whoever joins the team                                                                        | when added with an existing account, or on accepting an invitation                              |
| **Team invitation**                        | the invited email address                                                                     | when a person without an account is invited, and when the invitation is sent again              |

**Get to know MUNify CHASE** only shows on the page while a CHASE instance is linked. When a person has several emails of one kind open at once, such as several new supervised people or several open surveys, the sending bundles them into one email that names them all.

### Reminders

Reminders go out in their last days before a date, and only while there is still something to remind of. So nobody gets several at once, at least 2 days pass between two reminders to the same person. A later one waits that long, except on its last day: then it goes out anyway. If a deadline is moved, such as the end of the application phase or of a survey, the reminder goes out once more before the new date.

### Texts and placeholders

**Edit text** opens a kind's **Subject**, **Heading** and **Text**, in one tab per language, since every email goes out in the recipient's language.

- Separate paragraphs with a blank line. The greeting and the button are added automatically.
- **Placeholders** lists the placeholders this kind knows, such as `{name}` or `{conference}`. DELEGATOR fills them in when sending.
- Next to it you see a preview with made-up details, addressed to you.
- **Default text** resets the fields to the default, **Save** stores them for this language.

A field equal to the default is not stored as your own text. That way it follows when the default text is improved.

### Footer

The **Footer of all emails** appears under every email the conference sends, the automatic ones and those to the team, for example a signature or contact details. It too exists per language. `{conference}` stands for the conference's name. Saved empty, it is dropped in that language.

### Sending speed

Many mail services accept only so many emails per second. Under **Sending speed** you set **Emails per second at most**, a whole number from 1 to 1000. **Send now** and the automatic sending keep to it. Empty means **No limit**.

### Log

At the bottom, the **Log** shows the last 200 emails of the conference, automatic and sent by hand, with their status. Only participant care and project management see the log.

### After team actions

Some actions make emails due: [releasing and applying the assignment](./assignment#finish-and-release), and saving the settings when payments or postal registration are unlocked, the conference changes to **After the conference** or a certificate template is added. The page then asks **Send emails now?** and lists the open kinds. **Send 5 emails now** (with the number of emails) sends them, and with **Later** you find them again on the **Emails** page. Kinds switched to automatic go out with the next run at the latest. Only people who may manage the emails see the question.

Changes to a single person, such as a status or a supervisor link, ask nothing. Their emails wait on the **Emails** page, in the user card or for the automatic run.

### Single emails by hand

In the [user card](./participants#user-card), **Emails to send** lists what the person is owed right now, also of kinds not switched to automatic. From there you send one email on its own, for example after a change, when one went missing, or a reminder before its last days. DELEGATOR refuses what the person is no longer owed. An email sent by hand counts as sent. Only a reminder stays due for the automatic sending afterwards.

## Calendar {#calendar}

On the **Calendar** page participant care builds the conference's schedule. It has three tabs: **Calendar** to edit the entries, **Days & tracks** and **Places**. How participants see the schedule is under [Schedule](../participant/dashboard#schedule).

### Who sees the schedule

The whole team always sees the schedule. Participants see it once **Show calendar for participants** is on in the **Status & Features** tab of the settings. That applies to delegates, single participants and supervisors, with or without a seat, but not to the waiting list. So build the schedule at your own pace and only switch it on once it is ready.

### Days and tracks

A day has a name and a date. A track is a parallel strand of the programme, for example one per committee. Tracks belong to the whole conference and run on the days you tick.

1. In the **Days & tracks** tab, add the days with **Add day**.
2. Add the tracks with **Add track**. Under **Committees** and **Roles** you choose whom a track is for: whoever sits in one of these committees or holds one of these roles sees it on their dashboard as their track.
3. Tick in the table which track runs on which day. **Select all** and **Deselect all** set every tick. You change the order of the tracks by dragging.

Each track name can only occur once in the conference.

:::warning What goes with a removal
If you take a track off a day or delete it, entries that run on this track alone go with it. If entries run on it, the page asks first. **Delete day** deletes the day with all its entries. The tracks stay and simply no longer run on that day.
:::

### Entries

The **Calendar** tab shows all days side by side, each with the columns of its tracks. If the conference has no day yet, **Add day** leads to **Days & tracks**.

- **New entry:** drag across empty space. **Add entry** opens with the day, track and time.
- **Move:** drag an entry somewhere else, also to another day. A message names the new place and offers **Undo**.
- **Duration:** drag the top or bottom edge.
- **Several tracks:** drag the left or right edge. An entry across all tracks of a day is for everyone.
- **Edit:** a click opens **Edit entry**, with **Duplicate** and **Delete**.

Times snap to quarter hours. On the keyboard, Enter opens an entry, the arrow keys move it by a quarter hour or a track, with Shift they change its size, and Delete deletes it. **Whole day** shows all 24 hours instead of only the ones in use. When two entries on the same track overlap, the editor marks them.

An entry has a **Name**, **Day**, **Track** (from one track to another), **Start time**, **End time**, **Description**, **Color**, **Icon**, **Place** and **Room**. The end time has to be after the start time.

### Entries for survey answers only

Under **Visible to** you limit an entry to answers from [surveys](#surveys). Then only participants who picked one of these answers see it, for example for a workshop. Without a selection it shows **Everybody**, and everybody sees it. The team sees every entry. A survey answer an entry is limited to cannot be deleted.

### Copying, exporting and importing days

In the table under **Days & tracks**, every day has further buttons:

- **Copy entries to day**: copies all entries to a **Target day**. An entry keeps the tracks that also run on the target day. If none of them runs there, it is not copied.
- **Export day**: downloads the day with its tracks, entries and places as a file.
- **Edit day** and **Delete day**.

When adding a day you can pick such a file under **Import from file**, also one from another conference. The preview says how many tracks and entries come along. DELEGATOR reuses tracks and places of the same name and creates the missing ones.

### Places and site plans

In the **Places** tab you add, with **Add place**, the places entries can name: **Name**, **Address**, **Latitude** and **Longitude**, **Directions**, **Info / Warnings**, **Website** and a **Site plan (PDF)** of up to 10 MB. Paste a **Plus Code** from Google Maps, such as "84W3+7X Kiel", to fill in the coordinates. A short code needs the city name.

If you delete a place, the entries keep their other details, just without a place. Whoever sees the schedule sees the site plan.

### Time zone

Entry times show for everyone exactly as you enter them. The **Conference Timezone** in the **General** tab of the settings decides which day is today and where the marker for now sits in the schedule.

## Surveys {#surveys}

With surveys you ask for a choice, such as a workshop, a meal or an excursion. Each survey has options, which can be limited to a number of people. How participants answer is under [Surveys](../participant/dashboard#surveys).

### Creating a survey

1. **Create Survey** asks for **Title**, **Description** and **Deadline**. The deadline is in the conference's time zone. Each title can only occur once in the conference.
2. A new survey is a draft, invisible to participants. **Details** opens it.
3. In the **Settings** tab, under **Options**, add the answers with **Create Option**: **Title**, **Description** and **Capacity Limit**, 0 for unlimited.
4. Publish the survey with the button **Not visible for participants**. It then shows **Visible for participants**, and another click makes it a draft again.

Under **Survey Details**, **Edit** changes the title, description and deadline. **Show selection on dashboard** shows participants their choice even when the section is collapsed.

You can change a capacity limit later. If you lower it below the number of answers, the answers already given stay.

### What participants see

A published survey shows on the dashboard of every seated delegate and single participant while the conference is in the **Preparation Phase** or **Active Conference** stage. Until the deadline they pick an option and change it. DELEGATOR refuses a full option and an answer after the deadline. They see how full an option is.

Participant care sets or removes a person's answer in the [user card](./participants#user-card), in the **Surveys / Polls** tab, even after the deadline and beyond the capacity limit.

### Archiving and deleting

**Archive** takes a survey out of the participants' view, even if it is published. It moves into the folded list **Archived Surveys**. **Unarchive** brings it back.

Deleting only works from the inside out. An option cannot be deleted while somebody has picked it or a calendar entry is limited to it. A survey cannot be deleted while it still has options. DELEGATOR says each time what is in the way. If you only want a survey with answers out of sight, archive it.

### Results

The **Results** tab shows the **Participation** (how many seated people have answered), the **Distribution**, the **Option Comparison** and the **Answers Over Time**. Under **Answers** you find, per option, the people who picked it, and under **Not Yet Assigned Participants** every seated delegate and single participant without an answer.

Under **Export Data** you download CSV files with names, contact, role and committee: **All Survey Results**, **No answer** and one list per option.

### Distributing automatically

If people still have not answered after the deadline, **Distribute automatically** assigns them to the options:

1. The dialog says how many have not answered yet, and warns when there is not enough room for everybody.
2. **Distribute** gives each person an option with room left, so that the options fill up evenly. Answers already given stay as they are.
3. Whoever finds no room left stays without an answer.

When no option has room left, the button is disabled.

:::warning Distributing gives answers
Distributed answers count like chosen ones. They take effect right away on announcements, calendar entries and scanners that look at these options. An answer can only be taken back one by one in the user card.
:::

### Survey emails

Two automatic emails belong to surveys, both only to seated people who have not answered yet, and never for drafts and archived surveys: **New survey**, as soon as a survey is published, and **Reminder of open surveys**, 3 days before the deadline. If you move the deadline, DELEGATOR reminds once more before the new one. You switch both to automatic on the [Emails](#emails) page.

### Where survey answers also count

- An [announcement](#announcements) can address everybody who picked an answer.
- A [calendar entry](#calendar) can be visible for certain answers only.
- A checking session of the [scanner](./formalities#scanner) can expect answers under **Expected survey choice**. Whoever picked none of them is shown that as an open point when scanned.
