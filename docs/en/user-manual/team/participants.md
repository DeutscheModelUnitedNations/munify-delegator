---
title: Participants, waiting list and schools
description: The participants table, the user card, giving out seats, the waiting list and the schools of a conference
---

# Participants, waiting list and schools

This page shows how Participant Care works with the people of a conference: who has registered, what is still open for a person, who gets a seat and which school everyone comes from. You find the pages **Participants**, **Waiting List**, **Seats** and **Schools** at the top of the navigation in the team area. **Project Management** and **Participant Care** may open them.

How filters, groups, columns and saved views work in the tables is explained under [Tables](./overview#tables) and [Saved views](./overview#saved-views). This page covers what these tables show and what you do with the people in them.

## The participants table {#participants-table}

The **Participants** page lists everyone who has a part in the conference, one row per person. The **Type of Participation** column says how they take part:

| Type of Participation      | Who that is                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| **Delegation Member**      | A member of a delegation, whether the delegation has applied yet or holds a role                    |
| **Individual Participant** | Someone with an individual application or an individual role                                        |
| **Supervisor**             | Supervisors who registered                                                                          |
| **Team Member**            | A member of the conference team                                                                     |
| **Waiting List**           | Someone on the waiting list who has no other registration in the conference and no seat from it yet |

Someone who applied, got no seat and then joined the waiting list keeps the row of their registration. Whether they wait is then shown in the **On the waiting list** column.

### Columns and statuses

At first you see the name, **E-mail**, **Type of Participation**, **Nation**, **Committee**, **Fee Payment**, **Postal Registration**, **Attendance** and **Accepted**. More columns are in the column picker, for example **School / Institution**, **Head Delegate**, **Assigned Role** (for individual participants), **Attendance Plan** (for supervisors), **Filing number**, **Access Card ID**, **Age at Conference** or **Birthday during Conference**.

- **Nation** shows the delegation's state or non-state actor, **Committee** the member's committee.
- **Accepted** means the person has a seat. For delegation members their delegation holds a role, for individual participants they do themselves, supervisors count once someone they supervise has a seat, and the team always counts. The team sees this as soon as the assignment is [applied](./assignment#finish-and-release). Participants only see their role once it is released.
- **Fee Payment**, **Terms & Conditions**, **Guardian Consent** and **Media Status** (the media usage agreement) read **Done**, **Pending** or **Problem**. For adults, guardian consent reads **Not required**.
- **Postal Registration** sums up the documents: **Problem** as soon as one of them has a problem, **Done** once terms and conditions, media usage and, for minors, guardian consent are done, otherwise **Pending**.
- **Open issues** marks accepted people outside the team whose fee payment or postal registration is not done yet.
- **On the waiting list since** and **Seated from the waiting list on** show when the person signed up and when they got a seat from the waiting list.
- **Participations** counts how often the person held a seat in any conference.

For team members, city, country, gender and diet stay empty, except for **Project Management**.

### Views

Before **Preparation Phase** the table shows everyone, from then on only accepted people, sorted by family name. DELEGATOR comes with two shared views, whose names are German:

- **Warteliste** (waiting list): everyone still waiting for a seat, in the order they signed up.
- **Offene Probleme** (open issues): accepted people whose payment or documents are not complete.

### Selection and export

Tick the boxes at the start of rows to select them. Above the table you then see **3 selected** with the note **The export holds only the selection.**, and **Clear selection** empties it. There are no other bulk actions. **Export** downloads the visible columns as **CSV** or **JSON** or opens **Print**. Without a selection the export holds every row that matches the search and the filter, not only the current page.

Clicking a row opens the person's [user card](#user-card).

## The user card {#user-card}

The user card brings together everything the conference knows about a person. It opens as a side panel when you click a person in the participants table, the waiting list, on the **Seats** page, on a school's page, under **Team Members**, on a payment reference, in the sighting or in the command palette (Ctrl+K). A click anywhere in the row is enough. Inside the card, too, the rows of the delegation members, the supervisors and the supervised students open their card, and a paper under **Papers** opens the paper. The address in the browser then names the person, so a copied link opens the same card. **Open in new tab** shows the card as a page of its own, the **Participant File**.

If the person is not part of the conference shown, a note at the top says that the data belongs to their account and not to this conference.

### The left column

On the left, whichever tab is open, you see who the person is: the flag or icon of their role with the committee (hover for the name), name, pronouns and, until they have a seat, how far they have come: **Waiting list**, **Registered, not applied**, **Applied** or **No seat**. Below are the phone number, email address and **Emergency Contacts**, birth date with the age when the conference starts (**under age** is highlighted), gender, **Diet**, **School**, **Supervisors** and **Address**, then the account: **Username**, **Email language**, **Account created** and the **Newsletter** subscriptions. A click on a detail copies it (the **Address** with the name, as on a letter), the phone number and the email address call or write and have a button to copy. What the person did not enter although you need it reads **missing**, and for an incomplete address it says which part. On a narrow screen the name, flag and open formalities are above the tabs and the details in the **Person** tab.

Only the person changes their details, in their account. You see **Edit** only on your own card or as an administrator. The email address comes from the sign-in account and cannot be changed here. Participant Care corrects names and birth dates at the entrance in the [scanner](./formalities#scanner).

**Change school** next to the school picks an existing school, enters a new one or removes it. This is the person's school in this conference. It counts in the numbers per school and in the assignment's [school rules](./assignment). The school's name leads to [its page](#schools).

- **Possible duplicate account** and **Confirmed duplicate account** lead to the [Plausibility](./maintenance#duplicates) page, where you decide whether two accounts belong to the same person.
- Once the person has a seat, it lists which formalities are still open: **Fee Payment**, **Binding Registration**, for minors the **Parental Agreement**, the **Media Usage Agreement** and, once that has arrived, the **Media Status**. A click opens the **Formalities & access** tab. The bar shows how many are done. Once all are, nothing is listed here and the tab carries a green check.
- **Global Notes** sit highlighted in yellow in the column so nobody misses them. Notes on accounts confirmed to be the same person appear below as **Note on the linked account (…)**.

The three dots next to the name open **More actions**:

- **Generate Badge** (only when the person holds something a badge shows) opens **Nametag and placard**: **Open prefilled in the badge generator** or **Download CSV**.
- **Impersonation** signs you in as this person, if you may. See [Impersonation](./overview#impersonation).
- **Edit Notes**, **Copy User-ID** and **Remove Participant** (see [Removing a participation](#removing-a-participation)).

:::note Global notes
Notes belong to the account, not to the conference. They are there in every conference the person takes part in later. Only Participant Care and Project Management of a conference the person is registered for or waits for may read and write them. The person never sees them, and nobody on the team reads notes about team members. Add the date, the conference and the author to every note.
:::

### The tabs

Which tabs a card has depends on how the person takes part. The card opens on **Formalities & access** once the person has a seat, before that on **Registration & seat**. Team members without a participant status only have the **History**. When you switch to another person, the tab you picked last stays open if they have it too.

| Tab                      | When it appears                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **Registration & seat**  | with a registration or a waiting list entry                                                                      |
| **Formalities & access** | once the person has a participant status                                                                         |
| **Program & papers**     | with a seat (supervisors: once someone they supervise has a seat), not for the team; also with a submitted paper |
| **History**              | always                                                                                                           |

#### Registration & seat

What the person submitted and what the team made of it:

- For a delegation member, the delegation with its entry code, the **Members' schools**, the **Applied for Roles** list and **Motivation** and **Experience**. Its actions are described under [Delegations](#delegations).
- For individual participants, the roles applied for and the texts and, during the registration phase, **Revoke Application**.
- For supervisors, the **Connection Code** (see [Supervisors](#supervisors)).
- The **Review**: stars, flags and note from the [sighting](./assignment#sighting), read only. The **Open** button opens the application there.
- The **Waiting List** entry: since when, with which school, motivation, experience and **Requests**. While the person still waits, **Assign seat** leads to the **Seats** page (see [Giving a seat from the waiting list](#seating-from-the-waiting-list)).

And what the person holds in the conference: their delegation's role and the members with their committees, their individual role or the people they supervise. The actions are described under [Delegations](#delegations) and [Supervisors](#supervisors).

#### Formalities & access

Everything that has to be settled before the conference, and during and after the conference participation and the access card at the top. How payments and postal registration work is explained under [Payments](./formalities#payments) and [Postal registration](./formalities#postal-registration).

- **Payment**: the **Fee Payment** and each **Payment reference** of the person: whether it arrived, who paid for them, and **Open in Fee Payment**.
- **Postal Registration**: **Binding Registration**, **Parental Agreement** (only for people under age on the first conference day, never for supervisors) and **Media Usage Agreement**, with the **Media Status** beside it (**Photos not set**, **No photos**, **Photos partially**, when the consent form has to be checked for details, **Photos allowed**). Below are the **Filing number** the originals are filed under. **Assign next filing number** gives the number after the highest one in the conference. **Download documents** creates the documents for the postal registration as a PDF. At the very bottom, always open, are the tabs **Scans**, **Attendance Log** (for people with a seat) and **Details of the agreements**.
- Every status is **Pending**, **Problem** or **Done**. A click on the state opens the choice, and an open one has the **Done** button to settle it right away.
- **On site**: participation, the access card and **Download** for the **Certificate of participation** (only for people who participated).

- **Participation**: the switch changes between **Participated** and **Did not participate**. After the conference only people who participated get a certificate, and only then does the certificate email become due.
- **Access Card ID**: the number of the access card. The pencil opens the field, **Save** (the floppy disk) keeps it. If another person already carries that number, DELEGATOR refuses.
- **Badge found** (once there is a number) asks **Send notification?** and then emails the person right away that their badge waits for them at Participant Care. Every confirmation sends it again.
- **NSA card** (only for members of a non-state actor): **Print** creates the card with its current number. **New card** and then **Void earlier cards** is for a lost card: the new one gets the next number, and earlier cards no longer scan.
- **Attendance Log** (tab at the very bottom): every scan of the person with the check-in, the time and who scanned. **Delete attendance entry** removes a scan. See [Check-in](./formalities#check-in).

:::warning Changing a status makes emails due
Once the assignment is released and the person has a seat, a status makes emails due: **Done** for the payment the confirmation that it arrived, complete documents the confirmation of the postal registration, and **Problem** for payment, terms and conditions, media usage or guardian consent one email about that problem each. They go out with the next automatic run if that kind is set to **Send automatically**. Otherwise they wait on the [Emails](./communication#emails) page and in the card in the **History** tab.
:::

#### Program & papers

- **Papers**: the person's submitted papers with their status, **Versions** and **Reviews**. A click opens the paper in the [Paper Hub](./paper-hub).
- **Surveys / Polls**: the person's answers to the [surveys](./communication#surveys). You can answer for them or delete their answer with **Withdraw answer**. Participant Care may also pick full options and answer after the deadline.
- **Calendar**: the schedule as the person sees it, with the entries of their survey choices. **Next on the schedule** shows where they have to be now and next.

#### History

**Emails to send** shows Participant Care what the person is owed right now, with **Sent automatically** or **Switched off** and when it was last sent. **Send** (or **Send again**) asks **Send this email?** and sends it right away, in the person's language and with the conference's text. That helps when an email is switched off, did not arrive, or a reminder should go out earlier. An email sent by hand counts as sent, only a reminder still goes out automatically when its time comes. **Emails** below lists every email the conference sent the person or tried to, failed ones included.

**Conferences** lists every other conference the person took part in, with role and dates. Accounts confirmed to be the same person bring their conferences along, marked **as …** with the other account's name. A conference's name opens the person's card in that conference.

### Removing a participation {#removing-a-participation}

**Remove Participant** under **More actions** exists only for delegation members, individual participants and supervisors. To confirm, type the full name as the window shows it and click **Permanently remove**.

DELEGATOR then deletes the person's delegation membership, individual registration or supervisor registration in this conference and their participant status with all formalities. If papers or payments name the person, their participant status stays so those records stay theirs. The account, the global notes and a waiting list entry stay.

:::warning Remove delegation members through the delegation
**Remove Participant** appoints no new head delegate and deletes no empty delegation. For delegation members, use **Remove member** in the **Registration & seat** tab instead (see [Delegations](#delegations)).
:::

## Delegations, individual participants and supervisors {#delegations}

A delegation has no card of its own. You work on it in the card of one of its members, in the **Registration & seat** tab.

In the **Registration & seat** tab:

- **Entry Code** with a button to copy. **Rotate Code** hands out a new code after asking, and the old one stops working.
- **Applied for Roles**: **Move up** changes the order of the wishes, **Delete** removes a wish.
- **Revoke Application** (only in the **Registration Phase**) takes the completed application back. The delegation can then change it and complete it again.
- **Delete Delegation** deletes the delegation after asking, with its memberships, role wishes and papers. The members' participant statuses stay.

:::warning Deleting a delegation
This cannot be undone. Every member loses their registration, and the delegation's papers are gone. If only one person leaves, remove only them.
:::

Also there:

- The delegation's role and each member's committee (in the member list), or **No assignment yet**. Whether the application is completed is shown under **Registration**.
- **Committee Assignment** (only for states): pick a committee the state sits in for every member. If the committee is already full for the delegation, DELEGATOR swaps: the member whose seat went unchanged the longest gets the seat the person leaves. **Reset** takes every member's committee away, **Done** closes the window.
- **Head Delegate**: pick another member and click **Confirm**.
- **Delegation Members**: **Remove member** takes a person out of the delegation. If they led it, another member takes over. If nobody is left, the delegation is deleted together with its papers. Role wishes the delegation is now too small for are dropped.
- **Make supervisor**: if a member is too old for a delegation on the first conference day but old enough to supervise it, the card shows a note with this button. The person leaves the delegation (with a new head delegate, or an empty delegation deleted), is registered as a supervisor who attends in person, and supervises every remaining member. Whoever supervised them so far no longer does.

You change a delegation's role and committees on the [Seats](#seats) page or in the [assignment](./assignment).

### Individual participants {#single-participants}

The **Registration & seat** tab shows the roles applied for and the texts, during the registration phase with **Revoke Application**, and the individual role or **No assignment yet**.

### Supervisors {#supervisors}

- The **Registration & seat** tab shows the **Connection Code** students use to connect with the supervisor. **Rotate Code** hands out a new code. Students already connected stay connected.
- In the **Registration & seat** tab you switch whether the person comes to the conference themselves (**Supervisor plans own attendance**). Below, **Delegations** lists the supervised delegations with entry code and members, and **Individual Participants** the supervised individuals. **Remove supervision** ends a connection after asking.
- In a student's card, **Assign Supervisor** on the left (in the **Person** tab on narrow screens) connects a supervisor: find them in the list and click **+**. Supervisors and team members cannot be supervised.

A new connection makes two emails due: one to the supervisor saying who joined, and one to the student saying who supervises them. From then on the supervisor sees the person's data and status.

## Giving out and switching seats {#seats}

The **Seats** page shows every role of the conference with its seats: the states with one column per committee, the non-state actors, the individual roles under **Single Participants** and the **Supervisors**. Initials stand for a person in a seat, a click opens their card. The **Delegation Members** icon at the end of a row shows the delegation's members, their schools and the entry code. New roles are created in the [seat planning](./configuration#seat-planning).

### Putting someone in a seat

1. Click a free seat (**+**, tooltip **Add Participant**).
2. In the window, enter the **email or user-id** or part of the name and pick the person from the suggestions. **Already in this conference** warns when they already take part. Below you see which seat they go to.
3. Click **Add Participant**.

What happens next depends on the seat:

- **State or non-state actor**: the person joins the delegation holding this role, for a state in the chosen committee. If that delegation does not exist yet, DELEGATOR creates it and the person becomes head delegate. If the person was already in a delegation or registered individually, they lose that registration first, a delegation membership as if they had left the delegation. DELEGATOR refuses when the role has no seat left (**The role has no seat left: its delegation is already complete.**), when the committee is full for the delegation (**The committee has no seat left for this delegation.**), or when the person is a supervisor or on the team.
- **Individual role**: the person becomes an individual participant with this role. Anyone already registered in the conference in any way, even with an application that got no seat, is refused (**The user already has a different role in the conference and cannot be assigned as single participant.**).
- **Supervisor**: the person is registered as a supervisor. In the window you choose whether they attend themselves. Anyone already taking part is refused.

If the person is on the waiting list, their entry gets the date they got the seat, and their school from the waiting list becomes their school in the conference.

A yellow seat with a warning sign means someone in the delegation has no committee yet. A dotted hourglass (**Committee Assignment**) means the delegation is full but its committees are not assigned yet.

### Switching seats

1. Turn on **Switch seats** at the top.
2. Click a person in a delegation, then another person (**Switch with …**) or a free seat (**Move here**).
3. The window shows who goes where. If a head delegate is affected, choose under **Head delegates afterwards** who leads each delegation afterwards.
4. Click **Confirm**.

Delegation and committee are swapped. The person keeps their participant status, their supervisors and their school. If the seat was taken in the meantime, DELEGATOR refuses (**This seat is already taken.**) and you can try again. Switching works only between delegation members.

:::note Who sees what
What you change here applies at once. Participants only see role and committee once the assignment is [released](./assignment#finish-and-release). A change to a single person does not ask about emails. Whatever emails it makes due wait on the [Emails](./communication#emails) page, in the person's card or for the automatic sending.
:::

## The waiting list {#waiting-list}

People put themselves on the waiting list while the conference is in **Preparation Phase** ([what it looks like for them](../participant/registration#the-waiting-list)). Someone who applied can do so only once the assignment is released and they got no seat. Someone with a seat cannot sign up. Everyone waiting gets a confirmation email once that kind is sent.

### The table

The **Waiting List** page first shows everyone who still waits and is not hidden, in the order they signed up. **Position** is their place in that order. Hidden entries and entries already given a seat have no position. Further columns are **Time Stamp** (when they signed up), **Seated on**, **Given a seat**, the contact details, **Age at Conference**, **Participations**, **School / Institution**, the texts **Motivation**, **Experience** and **Special Wishes**, and **Hidden**. Clicking a row opens the person's card.

Every row ends with three buttons:

- **Assign seat** leads to the **Seats** page to give the person a seat.
- **Hide** or **Show** takes the entry out of the list you work through, or brings it back. The person stays on the waiting list. Hide entries you are not considering for now rather than deleting them.
- **Delete** takes the person off the waiting list after **Are you sure?**.

The table shows hidden entries and entries given a seat once you change the **Hidden** or **Given a seat** filter.

### Giving a seat from the waiting list {#seating-from-the-waiting-list}

1. On the waiting list, click **Assign seat** for the person (or in their card, in the **Registration & seat** tab).
2. The **Seats** page opens with the note **Assign person:** and the name. The **+** of the free seats are highlighted.
3. Click the free seat. The person is already selected in the window.
4. Click **Add Participant**.

Then:

- The waiting list entry gets the date (**Seated on**, in the participants table **Seated from the waiting list on**) and leaves the list of people waiting. If the person later gets another seat, the first date stays.
- The school from the waiting list becomes the person's school in the conference.
- An earlier application without a seat, in a delegation or as an individual, is removed when they get a delegation seat.
- Once the assignment is released, the person sees their role, and the **Moved up from the waiting list** email becomes due instead of the usual acceptance. It goes out automatically if that kind is switched on, otherwise send it on the [Emails](./communication#emails) page or in the card.

## Schools {#schools}

A school is shared by every conference. Every person names their own school in each conference, also inside a delegation. People waiting name it on the waiting list. Delegations have no school of their own, their schools are their members'. A school is always optional.

### The schools table

The **Schools** page lists every school of every conference, first sorted by participants in this conference. For this conference it counts **Delegations**, **Participants** (delegation members and individual participants), **Applied**, **Seated**, **Supervisors** and **Waiting List**, across every conference **Conferences** and **Participants overall**. **School abroad** shows whether it is a school abroad. Clicking a row opens the school's page.

### A school's page

- **Metrics**: how many conferences, **Participants in total**, **Acceptance rate** and **Attendance rate**, and for every conference delegations, participants, applied, seated, **Attended**, supervisors, waiting list and **From the waiting list**. You can open another conference if you are Participant Care or Project Management there.
- The school's details: name, **School abroad**, address, **Contact person** (for example the supervising teacher or the school office) and **Notes**. Only the team sees the notes, in later conferences too.
- **People in this conference**: who names the school here, with their type of participation, how far they got (**Application not yet submitted**, **Applied**, **Seated**) and **Attended**. A click opens their card.

### Who may do what

| What                                            | Who                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Read name, place and **School abroad**          | everyone, since applicants pick their school from the list                                              |
| Read address, contact person, notes and metrics | Participant Care and Project Management of any conference                                               |
| Change a school                                 | Participant Care and Project Management of a conference where someone names the school or waits with it |
| Delete a school                                 | the same, as long as nobody from another conference names the school                                    |

If you may only view a school, a note above the form says so and the fields are locked.

### Schools abroad

People of a school abroad can get a guaranteed seat ahead of the regular assignment. Counted are the people in applications marked **Must get a seat** in the [sighting](./assignment#sighting). The conference limits this per school abroad and for all schools abroad together ([limits of the school rules](./configuration#stages)). The assignment warns when a draft goes past the limits and blocks nothing.

### Merging and deleting duplicate schools

You merge one school written two ways on the [Cleanup](./maintenance#cleanup) page. All people and waiting list entries of **every** conference naming one of the schools then name the merged school. DELEGATOR fills empty details such as the address or contact person from the other schools, joins the notes of all of them, and if one of them was a school abroad, the merged one is too. The other schools are deleted. You need the right to change every one of the schools.

**Delete school** on a school's page is for a typo nobody needs. Everyone who named the school is left without one.

:::warning Merge rather than delete
Deleting cannot be undone, and the people lose their school. If it is only a different spelling, merge the schools.
:::

## Typical workflows {#workflows}

### Someone cancels shortly before the conference

1. Open the card of the person cancelling.
2. If they are a delegation member, click **Remove member** next to them in the **Registration & seat** tab. A new head delegate is appointed, an empty delegation deleted together with its papers. Otherwise use **Remove Participant** under **More actions**.
3. Open the **Waiting List**. The first row (**Position** 1) has waited longest.
4. Read their motivation and **Requests** in their card and click **Assign seat**.
5. Put them in the freed seat as described under [Giving a seat from the waiting list](#seating-from-the-waiting-list).
6. Send them the **Moved up from the waiting list** email if it does not go out automatically, and with a new head delegate keep the [committee assignment](#delegations) in mind.

### Someone switches delegation

1. Open the **Seats** page and turn on **Switch seats**.
2. Click the person, then the person they swap with, or a free seat of the new delegation.
3. Choose under **Head delegates afterwards** who leads the delegations and click **Confirm**.

Participant status, supervisors and school stay with the person. Without **Switch seats** it also works through the free seat and **Add Participant**. The old membership then ends like leaving, with a new head delegate and an empty delegation deleted.

### Correcting a person's details

- The person changes their name, contact details, address, diet and emergency contacts themselves in their account. Ask them to. Administrators can also change them in the card with **Edit**.
- Participant Care corrects names and birth dates at the entrance in the [scanner](./formalities#scanner).
- You change the school in the left column with **Change school** (pencil).
- You change statuses and documents in the **Formalities & access** tab. Remember that this can [make emails due](#user-card).

### A supervisor is missing students

1. Open the supervisor's card. The **Registration & seat** tab lists the delegations and individual participants they already supervise.
2. If someone is missing, send the supervisor their **Connection Code** from the **Registration & seat** tab so the students connect themselves.
3. Or open the student's card, click **Assign Supervisor** on the left and pick the supervisor with **+**.
4. Check in the supervisor's card that everyone is listed.

For a delegation you connect every member on their own. Every connection makes the two emails to supervisor and student due.
