---
title: Statistics and maintenance
description: Statistics, the plausibility check, possible duplicate accounts, cleanup, helper, import and downloads in the team area
---

# Statistics and maintenance

This page describes the tools the team uses to keep an eye on a conference and look after its data. **Statistics** sits at the top of the navigation and is open to every team member. **Plausibility**, **Cleanup**, **Helper**, **Import** and **Downloads** sit under **Maintenance** and open only for **Project Management** and **Participant Care** (and system administrators). **AI access** sits under **Maintenance** too and has [a page of its own](./ai-access).

## Statistics {#statistics}

The **Statistics** page shows figures and charts about the whole conference. No figure names a person.

### How current the figures are

The figures are not worked out on every visit. The server recomputes them regularly in the background, and below the filter the page says when (**As of …, refreshed every 5 minutes**). What you just changed only shows up after the next refresh. Reloading does not bring it sooner. If the time stops moving, the refresh on the server is not running. Contact the administrators then.

### The filter

At the top left, **Filter** picks which registrations most cards count:

- **All**: every registration, applied or not.
- **Applied** and **Not Applied**: only registrations that sent their application, or only the others.
- **Accepted**: applicants with a role. A delegation member counts with their delegation's role, and a nation or a non-state actor both count as a role.
- **Rejected**: applicants without a role. Before an assignment is applied, that is every applicant.

Supervisors count by the people they supervise: as applied when one of them applied, and with a role when an applied one has a role. The filter remembers your choice in this browser.

These always show the whole conference, whatever the filter says: **Supervisor Overview**, **Waiting List**, **Postal & Payment Progress**, **Committee Fill Rates**, **Paper Overview** and the **Committee Assignment** chart.

### The cards

- **Days until the conference** and **Days until registration deadline**: counted to the start of the conference and to the end of the application phase, without the grace period.
- **Total Registrations**: every registration including supervisors, with **Applied**, **Accepted**, **Rejected** and **Not applied**.
- **Role Overview**: how many people are **With Role** and **Without Role** and how many delegations have a role (**Delegations Assigned**), split into **Delegation Members** and **Single Participants**. **Committee Assignment** counts members of applied nation delegations **With Committee** and **Without Committee**. Non-state actors are left out there, since only nations hold seats in committees.
- **Supervisor Overview**: a supervisor counts as **Accepted** once someone they supervise has a role. **Plans Attendance** means they want to come to the conference themselves. The **Detailed Breakdown** combines both.
- **Waiting List**: all entries, of which **Assigned** (with a seat) and **Unassigned**, plus **Visible** and **Hidden**.
- **Participant Distribution**: delegation members, single participants and supervisors.
- **Single Participants**: for each individual role, how many applied for it. It counts the wishes, not the assigned roles.
- **Postal & Payment Progress**: how far [postal registration](./formalities#postal-registration) and the [payment](./formalities#payments) are, as **Done**, **Pending** and **Problem**. It counts everyone who is expected to complete both: delegation members and single participants with a role, and supervisors who attend themselves. Someone with no status at all counts as pending. The **Completion Overview** shows who completed **Neither**, **Postal Only**, **Payment Only** or **Both**.
- **Committee Fill Rates**: for each committee, its seats (nations times seats per delegation) and how many of them members of applied delegations hold.
- **Paper Overview**: all papers by type, status and committee, and how many are **With Reviews** and **Without Reviews**. The card is missing while there are no papers.
- **Registration Timeline**: the registrations added up day by day. The members of a delegation count on the day the delegation was created.
- **Age Distribution** and **Committee Age Averages**: the age at the end of the conference. Anyone without a birthday is left out of the chart. A notice above it says how many that is.
- **Nationality Distribution**: the country of the address, not the citizenship. People without an address are left out. The pie chart shows the ten most common countries and groups the rest as **Other**, the bar chart the 15 most common.
- **School Statistics**: delegation members and single participants by their own school, as a bar chart of the 15 largest or as a table of all.
- **Diet** and **Gender**: each for delegation members, single participants, supervisors who attend themselves, and all team members. Team members count whatever the filter.
- **Geographic Distribution**: a map with markers per postal code area (the first three digits).

### Historical comparison {#history}

When you open the page, your browser stores a snapshot of the key figures once a day. It stays on your device and is not sent to the server. Under **Historical Comparison** you pick an earlier day. Some cards then show the value from back then under each figure, and the change since. On another device or in another browser the history starts empty.

## Plausibility {#plausibility}

The **Plausibility** page lists people where something does not add up. Each check has a box of its own with its rule and the number of findings. Clicking a name opens the person's [user card](./participants#user-card). The checks cover everyone registered in this conference, even if they have not applied yet. No check changes or sends anything: you decide what to do.

### Age limits {#age-limits}

At the top the page says which age limits the conference has. They are set in the [settings](./configuration) on the **General** tab under **Age limits**: **Participants' minimum age**, **Participants' maximum age** and **Supervisors' minimum age**. Age is measured on the first conference day, and an empty limit switches its check off. A check the limits switch off is missing from the page.

:::note What the age limits do
Whoever is outside the limits sees a notice when applying and on the dashboard, and shows up here. They can still register and join a delegation. An application cannot be sent, though, while someone in it is outside the limits, see [Age limits](./configuration#age-limits).
:::

- **Participant too young**: participants younger than the minimum age when the conference starts.
- **Participant too old**: participants above the maximum age who are still too young to be a supervisor. The box is missing when no age lies between the two limits.
- **Should be a supervisor**: participants above the maximum age who are old enough to supervise.
- **Should not be a supervisor**: supervisors younger than the supervisors' minimum age.

### Incomplete or invalid data {#incomplete-data}

**Incomplete or invalid data** lists participants and supervisors whose profile no longer satisfies the account form: a required detail is missing or invalid. The next time these people sign in, DELEGATOR sends them to their account page first to complete it.

### Possible duplicate accounts {#duplicates}

Someone with a care note who signs up again with a new account would otherwise leave the note behind on the old one. That is why DELEGATOR looks for accounts that may belong to the same person as an earlier account. Participant Care always makes the decision. The people concerned learn nothing of it.

**What is compared.** The people of this conference are compared with everyone who took part in a conference that is over, or carries a note. Name, date of birth, email address, phone number, emergency contact and address each add to the match. Names are compared across scripts too. No detail is enough alone: a pair only shows up from a 60% match. A match is a hint, not proof, since siblings and twins can look very much alike.

**When the search runs.** When a person changes their profile, or the team changes it, DELEGATOR compares that account again in the background. You check the whole conference with **Check again**, best after the application period has ended and before the [sighting](./assignment#sighting), so the notes are already with the right person there. The page then says how many possible duplicates it holds. A new check refreshes the percentages but changes no decision. An open pair it no longer finds disappears.

**Looking at a pair.** Each pair shows both accounts side by side: name, date of birth, email address, phone number, emergency contact, address, **Account since**, the **Global Notes** and the conferences each one took part in. The rows where the accounts are alike are marked, and the corner shows the match in percent. The **Possible duplicate accounts** box further up lists the open pairs, and a click jumps to the pair.

**Deciding.**

- **Same person** confirms the pair. It moves under **Confirmed** and carries a red link symbol.
- **Different people** dismisses the pair. It moves under **Dismissed pairs**, folded at the end.
- **Reopen** takes a decision back. The pair is open again, as if nobody had decided.

**What confirming does.**

- The notes follow the person: next to the account's own note, the user card shows every **Note on the linked account** at the top, and the warning in the [sighting](./assignment#sighting) counts them too.
- The user card's **Conferences** tab also lists the conferences of the linked accounts, marked with the other account's name.
- Confirmations carry over: if A and B are the same person, and B and C are, so are A and C. DELEGATOR creates and confirms such pairs itself. They read **Linked through other confirmed accounts** and have no buttons of their own. When you reopen or dismiss one of the pairs someone confirmed, DELEGATOR takes back the pairs that came from it.
- While a pair is open or confirmed, Participant Care may read the name and notes of the other account too, without its contact details.

**What dismissing does.** Nothing is linked. The names stay visible on the page so you can take the decision back, but the other account's note does not.

:::warning Contradicting decisions
If a confirmation would make one person of two accounts whose pair is already dismissed as different people, DELEGATOR refuses it: "A and B are marked as different people, but this confirmation would make them the same. Reopen their pair first." Check then which of the two decisions is wrong.
:::

## Cleanup {#cleanup}

On the **Cleanup** page, **Normalize Schools** unifies schools that applicants spelled in different ways. Only then do the statistics, the school rules and the school pages show correctly how many people come from one school. Best clean up after the application period has ended and before the [assignment](./assignment), so the school rules are right there. More about schools is under [Schools](./participants#schools).

The table lists every school a person of a sent application in this conference named as their own, with **Delegations**, **Delegation Members**, **Single Participants** and **Total Participants**. Supervisors and the waiting list do not count here.

### Suggestions {#school-suggestions}

When the page opens, DELEGATOR looks for very similar school names, such as another spelling, umlauts, word order or small typos. The groups it finds sit above the table under **Suggestions**, the most similar first. The arrows (or the arrow keys) move through them.

1. Pick the name that should stay. The one most participants named is preselected.
2. **Merge into "Name"** (Alt+Enter) merges the group into that school.

**Dismiss** hides the group. It does not come back as long as it consists of the same schools. The interface has no way to take that back. **Add to selection** puts the group's schools into the selection below, for example to give them a new name.

### Merging by hand {#merging-by-hand}

1. Click the schools in the table that belong together. They appear as a selection above the table. Clicking one of them takes it out again.
2. Enter the correct name under **New School Name**. For a single school its current name is filled in.
3. **Normalize Selected Schools** (Shift+Enter) merges them. With only one school the button reads **Rename Selected School** and renames it.

### What merging does {#merge-consequences}

- When you merge from the table, the school with the most participants stays and gets the chosen name. For a suggestion, the school you select stays. In both cases the others are deleted.
- Schools belong to all conferences. Every person and every waiting list entry that named one of the deleted schools names the remaining one afterwards, in **every** conference.
- What the remaining school lacks (address, website, contact) it takes from the others. The notes of all of them are joined. If one of the schools is marked as a school abroad, the merged one is too.
- Renaming changes the name for all conferences as well.

You can only merge schools you may edit, which are the schools of the people in your conferences. Otherwise the page reports **Failed to normalize schools**.

:::warning Cannot be undone
A merge cannot be taken back: the deleted schools are gone, and DELEGATOR no longer knows which person had named which of them. Check the selection first.
:::

## Helper {#helper}

The **Helper** page has one tool: **Toggle attendance of all participants**. **Set everyone to "Absent"** and **Set everyone to "Present"** set the attendance of everyone registered in this conference (delegation members, single participants and supervisors) to the same value, whatever was recorded before. The page asks for confirmation first.

Attendance decides who gets a [certificate](./formalities#certificates). Once the conference is over and the certificate is released, the **Certificate available** email becomes due for everyone counted as present. It goes out automatically if that kind is switched on, otherwise it waits on the [Emails](./communication#emails) page.

:::warning Overwrites every single entry
The helper applies to everyone registered, including those without a role or without a sent application, and replaces whatever was recorded before. There is no way back. Anyone who should count differently afterwards has to be changed one by one, for example through the [import](#import).
:::

## Import {#import}

On the **Import** page, **Import Attendance Data** takes the attendance over from CHASE. During the conference CHASE records who is in the committee at every roll call. From that, the import sets who attended here, and with it who gets a [certificate](./formalities#certificates).

### Where the data comes from {#import-source}

- **With a linked CHASE instance** (see [CHASE link](./overview#chase-link)), the page asks CHASE itself when it opens. A notice says when it read. **Read again** asks once more. If CHASE has not reported anything yet or cannot be reached, the notice says so.
- **Without a link**, you upload the JSON file CHASE offers as a presence export on its statistics page. If the file is not such an export, the page says **This file is not a presence export from CHASE. Please download it again from the statistics page in CHASE.**
- With a link, the upload sits under **Import from a file**, for example for a conference that ran on another CHASE instance. An uploaded file takes precedence. Reload the page to see the data from CHASE again.

### The preview {#import-preview}

The page splits everyone from CHASE into present and absent, in two groups:

- **Delegates** are recorded as present or absent at every roll call of their committee. They count as present when they were there for at least the set **Threshold** (20% at first) of the roll calls. Delegates without any record are not listed.
- **Non-State Actors** are only scanned when they enter a committee. They count as present once they reach the **Minimum check-ins** (3 at first), in any committee. Anyone never scanned in is listed as absent with 0 check-ins.

Threshold and minimum move people between the tables right away. Nothing is saved by that. Clicking a row shows every single record of the person with time, committee and status, and opens the participants table by their email address.

### Saving {#import-save}

Each table has its own **Save** button. After a confirmation it sets everyone in that table to present (under **Present**) or absent (under **Absent**). People are found by their email address. Anyone in no table stays as they are. An email address without an account in DELEGATOR is refused, and the other rows are saved anyway.

As with the [helper](#helper), the **Certificate available** email becomes due for everyone counted as present afterwards, once the conference is over and the certificate is released.

:::tip Resetting everyone
The import only changes who is in the tables. If everyone should start from the same state, reset them with the [helper](#helper) first and import afterwards.
:::

## Downloads {#downloads}

The **Downloads** page gathers the files the team needs outside DELEGATOR. Each file is made the moment you click, from the current state. It contains what your roles let you read, which is often names and email addresses. Handle the files accordingly.

### CSV settings {#csv-settings}

Under **CSV Export Settings** you choose the **Delimiter** and **Encoding** of this page's CSV files. Semicolon and UTF-8 are the default. For Excel the page recommends UTF-8 with BOM. Your browser remembers the choice. The files for the badge generator always use commas and UTF-8, since the generator reads nothing else.

### Badge data {#badges}

**Badge Data** provides CSV files for the badge generator. Download a file, open the generator with the arrow next to it (**Open badge generator**), upload the CSV there, choose nametag or placard and print the PDF.

- **Per committee**: the delegates with their nation and the committee's abbreviation.
- **Non-State Actors**, **Single Participants** (with an assigned role) and **Team Members**: name and role under the UN flag.
- **Supervisors**: only those with at least one supervised person holding a seat.
- **Placards (all committees)**: one placard for every seat at a committee's table, that is every nation of the committee and every non-state actor with someone in it, without names. Non-state actors without a committee get one placard each.

Besides name, pronouns and role, every nametag row carries the person's id and their photo consent in this conference. Rows are sorted by role, then by family name.

**NSA cards (PDF)** prints a card for every member of a non-state actor delegation, A6, four to an A4 sheet with cut lines. It carries the names, the actor and its icon and a signed QR code that the scanner in CHASE checks. The card is valid until the day after the conference ends. Downloading again voids nothing and gives the same cards. A lost card is replaced one at a time in the user card with **New card**. After that, the person's earlier cards no longer scan.

### Nametags by table {#badges-by-table}

The same nametags, split over the tables of the [on-site check-in](./formalities#check-in): one file per table, sorted like its table sign. The split follows the saved number of nametag groups, which you find under **View the split**. Team members are missing here, as they do not pick up their nametags at the entrance. While nobody holds a seat there are no tables.

### Registration lists {#registration-lists}

Four CSV files, sorted by role and name:

- **Delegations**: members of nation delegations with country and committee.
- **Non-State Actors**: members of non-state actor delegations.
- **Single Participants**: with an assigned role.
- **Supervisors**: all of them, with the column **Supervisor plans own attendance**.

The columns **Fee Payment**, **Terms & Conditions**, **Parental Agreement** and **Media Usage Agreement** are empty when everything is done, read `X` while something is pending and `P` on a problem. For adults the parental agreement stays empty. **Of Age** shows `Y` or `N`.

### Participant status {#participant-status}

**Download Participant Statuses** gives a CSV with one row per person holding a seat: members of nation and actor delegations, single participants with a role, and supervisors who attend themselves. It holds id, email address, name, role, committee, the supervisors, every single paperwork status, the photo consent, the payment, the attendance and two summaries: the state of the postal documents and which of postal and payment are still open. Column names and values are in English.

### Digital nametag QR code {#nametag-qr}

**Download QR code (PDF)** makes a sign for the Participant Care counter. The QR code opens the **Digital Nametag** page of whoever scans it. Someone with a question at the counter shows it, so the team can identify them quickly and securely.

### Committee and reference data {#committee-data}

- **Committee Data**: one CSV per committee of the delegates with nation (code and name), given and family name and email address.
- **All Nations**: every nation seated in a committee of the conference, with alpha-2 and alpha-3 code, name and regional group.

### Integration exports {#integration-exports}

**CHASE Seed Data** is a JSON file a CHASE instance reads the conference from: committees and topics, nations and non-state actors, delegates, single participants, supervisors and the team, each with name and email address. With CHASE linked, the link keeps it up to date anyway. The file then sits folded below and is only needed without the link.
