---
title: The team area
description: How a conference's team works, who may do what, team management, tables and views, impersonation and the link to CHASE
---

# The team area

This page explains what holds for every team page: how you get into the team area and find your way around it, what each role may do, how you put the team together, how the big tables work, how you act on behalf of a participant, and what the link to MUNify CHASE means for you.

## Getting in and finding your way {#the-team-area}

Everything a conference's team works on lives in one shared team area. On the conference dashboard, the **Team** card leads in. Your role in this conference is shown in its top right corner. The card opens the first page of the navigation you may open. That is **Statistics**, which every role sees.

Next to the team card are further cards:

- **Team Wiki**, **Services** and **Preparation**, once the conference has set these links in the [settings](./configuration)
- **Seats of the Conference**, the public overview of committees, topics, nations and non-state actors
- **App Documentation**, if the server has a link for it
- **Schedule**, which the team always sees, even while it is still hidden from participants
- **Paper Hub**, if you may review papers
- **Link to CHASE**, while a CHASE instance is linked (see [below](#chase-link))

On the home page, a button with the conference's name leads straight back into the team area you last opened in this browser, as long as you are still on its team.

### The side navigation

On the left, the navigation lists every page your role lets you open. At the very top, **Back to Dashboard** returns to the conference. Below it come the everyday pages (**Statistics**, **Settings**, **Seats**, **Participants**, **Waiting List**, **Schools**, **Team Management**, **Paper Hub**), then the collapsible groups **Workflows**, **Communication** and **Maintenance**. At the very bottom, **Manual for this page** opens the matching section of this manual in a new tab. On pages without a section of their own the link reads **User manual**.

Three entries draw attention with a dot: **Messages** when an inbox you answer has unread messages or a reported chat waits for Participant Care, **Plausibility** while possible duplicate accounts wait for a decision, and **Cleanup** while suggested school merges are open.

What you see depends only on your role in **this** conference. A role in another conference counts for nothing here. A page you may not open is missing from the navigation and answers with **You don't have access to this page.**, even when you call its address directly. System administrators may open every page, even without a place on the team.

### The command palette {#command-palette}

Project Management and Participant Care use the command palette to find pages, people and settings without clicking through the navigation. Open it with Ctrl+K (⌘+K on a Mac) or with **Search** at the top of the header.

From two letters on, it searches the conference for:

| Group                      | What it finds                                                                                                      | What choosing a result opens                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Participants**           | people of the conference, the team and the waiting list included, by name or email and by their access card number | the person's user card                                                                           |
| **Delegations**            | delegations by their members' schools                                                                              | the head delegate's user card, without one the participants table                                |
| **Schools**                | schools by name and place, only if you may open the **Schools** page                                               | the school's page                                                                                |
| **Seats**                  | nations, non-state actors and single roles by name                                                                 | the user card of the head delegate or the person in the seat, without one the participants table |
| **Committees**             | committees by name or abbreviation                                                                                 | the committees in the settings                                                                   |
| **Fee Payment**            | payments by their identifier                                                                                       | the **Fee Payment** page with that payment                                                       |
| **Pages**                  | the team area pages you may open, also through keywords such as "post" or "money"                                  | the page                                                                                         |
| **Configuration**          | single fields of the settings                                                                                      | the matching settings tab                                                                        |
| **Not in this conference** | people with an account who do not take part in this conference, as far as you may see them                         | their user card                                                                                  |
| **Help**                   | the manual for the page you are on                                                                                 | the manual in a new tab                                                                          |

With no search term, the palette shows the first pages, the way into the manual and, under **Recent searches**, your last five results. What you just searched for on another device it offers for a few seconds as **Search from another device**. So you can look a person up on your phone and carry on at your laptop. With **Scan a code with the camera** you scan a nametag or an application document, and the palette opens the person's user card.

## Roles and rights {#team-roles}

Each person holds exactly one role on a conference's team. Someone who needs more rights gets another role. The roles are:

- **Project Management**: leads the conference. It may open every page and is the only role that changes the basic settings, creates and deletes committees, switches on [AI access](./ai-access) and makes others project management. A team always has at least one person in project management.
- **Participant Care**: looks after everything about the participants: the tables, the assignment, payments, documents, on-site check-in, communication and maintenance.
- **Content Lead**: plans the seats and maintains the committees with their topics and the conference's content, such as links, templates, status, announcements and resolutions.
- **Team Coordinator**: puts the team together. They invite, change roles and functions and remove members, except project management.
- **Reviewer**: reviews the submitted papers in the Paper Hub. These are mostly the chairs and the committee consultants.
- **Member**: the basic role for everyone on the team without a special task in DELEGATOR. It opens only the pages every role opens, that is **Statistics**, **Messages** and **Entrance & Attendance**.

System administrators are not a team role. In every conference they may do everything project management may, and some more.

### Which pages each role opens

The pages at the top of the navigation:

| Page                                                  | Project Management | Participant Care | Content Lead | Team Coordinator | Reviewer | Member |
| ----------------------------------------------------- | :----------------: | :--------------: | :----------: | :--------------: | :------: | :----: |
| [**Statistics**](./maintenance#statistics)            |         ✓          |        ✓         |      ✓       |        ✓         |    ✓     |   ✓    |
| [**Settings**](./configuration)                       |         ✓          |        ✓         |      ✓       |                  |          |        |
| **Seats**                                             |         ✓          |        ✓         |              |                  |          |        |
| [**Participants**](./participants#participants-table) |         ✓          |        ✓         |              |                  |          |        |
| [**Waiting List**](./participants#waiting-list)       |         ✓          |        ✓         |              |                  |          |        |
| [**Schools**](./participants#schools)                 |         ✓          |        ✓         |              |                  |          |        |
| [**Team Management**](#team-management)               |         ✓          |                  |              |        ✓         |          |        |
| [**Paper Hub**](./paper-hub)                          |         ✓          |        ✓         |      ✓       |        ✓         |    ✓     |        |

**Workflows**:

| Page                                                         | Project Management | Participant Care | Content Lead | Team Coordinator | Reviewer | Member |
| ------------------------------------------------------------ | :----------------: | :--------------: | :----------: | :--------------: | :------: | :----: |
| [**Seat planning**](./configuration#seat-planning)           |         ✓          |                  |      ✓       |                  |          |        |
| [**Assignment**](./assignment)                               |         ✓          |        ✓         |              |                  |          |        |
| [**On-site check-in**](./formalities#check-in)               |         ✓          |        ✓         |              |                  |          |        |
| [**Postal Registration**](./formalities#postal-registration) |         ✓          |        ✓         |              |                  |          |        |
| [**Fee Payment**](./formalities#payments)                    |         ✓          |        ✓         |              |                  |          |        |
| [**Entrance & Attendance**](./formalities#scanner)           |         ✓          |        ✓         |      ✓       |        ✓         |    ✓     |   ✓    |

**Communication**:

| Page                                               | Project Management | Participant Care | Content Lead | Team Coordinator | Reviewer | Member |
| -------------------------------------------------- | :----------------: | :--------------: | :----------: | :--------------: | :------: | :----: |
| [**Announcements**](./communication#announcements) |         ✓          |        ✓         |      ✓       |                  |          |        |
| [**Messages**](./communication#messages)           |         ✓          |        ✓         |      ✓       |        ✓         |    ✓     |   ✓    |
| [**Calendar**](./communication#calendar)           |         ✓          |        ✓         |              |                  |          |        |
| [**Surveys / Polls**](./communication#surveys)     |         ✓          |        ✓         |              |                  |          |        |
| [**Emails**](./communication#emails)               |         ✓          |        ✓         |              |                  |          |        |

**Maintenance**:

| Page                                           | Project Management | Participant Care | Content Lead | Team Coordinator | Reviewer | Member |
| ---------------------------------------------- | :----------------: | :--------------: | :----------: | :--------------: | :------: | :----: |
| [**Plausibility**](./maintenance#plausibility) |         ✓          |        ✓         |              |                  |          |        |
| [**Cleanup**](./maintenance#cleanup)           |         ✓          |        ✓         |              |                  |          |        |
| [**Helper**](./maintenance#helper)             |         ✓          |        ✓         |              |                  |          |        |
| [**Import**](./maintenance#import)             |         ✓          |        ✓         |              |                  |          |        |
| [**Downloads**](./maintenance#downloads)       |         ✓          |        ✓         |              |                  |          |        |
| [**AI access**](./ai-access)                   |         ✓          |                  |              |                  |          |        |

On **Messages**, each person sees only the inboxes they answer. Which those are also follows from their [functions](#functions).

### What holds within the pages

Several roles open some pages, but not every role may change everything there:

| What                                                                                               | Who                                                                            |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Changing **General**, **Banking Information** and the limits of the school rules in the settings   | **Project Management**                                                         |
| Changing **Status & Features**, **Links & Content**, **Documents & Templates** and the resolutions | **Project Management**, **Participant Care**, **Content Lead**                 |
| Creating and deleting committees                                                                   | **Project Management**                                                         |
| Editing committees and agenda items                                                                | **Project Management**, **Content Lead** (Participant Care only views them)    |
| Inviting to the team, giving roles and functions, removing members                                 | **Project Management**, **Team Coordinator** (not for project management)      |
| Making someone project management or inviting them as such                                         | **Project Management**                                                         |
| Saving, changing, deleting shared table views and making them the default                          | **Project Management**, **Participant Care**                                   |
| Shared views for every conference                                                                  | system administrators                                                          |
| The command palette                                                                                | **Project Management**, **Participant Care**                                   |
| Acting on behalf of participants                                                                   | **Project Management**, **Participant Care**, system administrators for anyone |
| **Sync now** while CHASE is linked                                                                 | system administrators                                                          |

If you may open the settings but not change a tab, you see it locked, and a note at the top tells you what you can change.

## Team management {#team-management}

On the **Team Management** page, **Project Management** and **Team Coordinators** put the team together. It has two tabs, **Team Members** and **Pending Invitations**, and the **Invite Members** button in the top right. A new conference has no team yet: an administrator invites the first members here.

### The members table

**Team Members** is a table like the other big tables, with search, filters, grouping, export and saved views (see [Tables](#tables)). It shows **Family Name**, **Given Name**, **E-mail**, **Role** and **Profile** (**Complete**, or **Incomplete** when the person has not filled in their profile yet). Show **Phone** and **On the team since** through the columns when you need them.

At the end of each row are:

- **Participant File**: opens the person's user card.
- **Functions**: opens their [functions](#functions).
- **Impersonation**: for system administrators only, see [Impersonation](#impersonation).
- **Delete**: takes the person off the team.

### Inviting members

1. Click **Invite Members** and enter one or more addresses under **Email Addresses**, separated by commas, semicolons or new lines. At most 100 at once.
2. **Check Emails** shows what will happen to each address:
   - **Account exists**: the person already has an account and joins the team right away.
   - **New user**: the person gets an invitation by email.
   - **Pending invitation** or **Already member**: the address cannot be invited again.

   If the server has an organisation domain set, addresses of other domains carry the mark **External**, and a warning shows above the list. They are invited all the same.

3. Choose the **Role** for each address. **Member** is preselected. Untick anyone you do not want to invite.
4. **Send Invitations** carries it all out. A message counts how many people were added directly and how many invitations were sent. If an address fails, DELEGATOR reports it on its own with the reason, and the other addresses still go through.

DELEGATOR refuses an address when it is not a valid email address, the person is on the team already, an invitation for them is still open, or they already take part in the conference. Team Coordinators cannot invite anyone as **Project Management**. Such addresses get an error message, the other invitations go out.

:::warning Account exists means on the team right away
Anyone who already has an account is on the team as soon as you click **Send Invitations**, without an invitation email and without confirming anything. They see the pages of their role at once. Whether they hear about it depends on the [welcome email](#welcome-mail).
:::

### The invitation email

A person without an account gets the **Team invitation** email with the inviter's name, the role, a link to accept and the date until which the link is valid. A link is valid for seven days. This email always goes out right away, it has no switch. You can change its text on the [Emails](./communication#emails) page like any other.

When the person clicks the link, they sign in or create an account and land on the conference dashboard, now as a team member in the invited role. If they were signed in already, the invitation applies at once.

- The link only works for the invited address. Someone signing in with an account under another email address does not join the team and sees the page **Invitation for another email address**. A forwarded link is of no use to anyone else.
- Each link can be redeemed once.
- If the person has started taking part in the conference meanwhile, they do not join the team. The invitation then stays open.
- An expired, revoked or already used link leads to an error page.

### Pending invitations

The **Pending Invitations** tab lists every invitation that is neither accepted nor revoked, with **E-mail**, **Role**, **Status** (**Account exists** or **New user**), **Expires** and **Invited by**. Expired invitations stay in it, faded and marked **expired**. DELEGATOR deletes them 30 days after they expired.

- **Copy Link** creates a new link, again valid for seven days, and copies it so you can send it yourself.
- **Resend invitation** also creates a new link and sends it with the invitation email.
- **Revoke invitation** makes the invitation unusable. It disappears from the list.

:::note A new link replaces the old one
Copying and resending each create a new link. The link sent before stops working. So always give the person the newest one.
:::

Team Coordinators see and manage only invitations to roles other than **Project Management**.

### Changing roles and removing members

Change the **Role** right in the table, with the selection in the row. The change applies at once. The person's side navigation follows as soon as they reload the page.

**Delete** asks **Are you sure you want to remove this team member?** and then takes the person off the team right away. Their account stays, but they can no longer open any page of this conference's team area.

Note that:

- Team Coordinators cannot make anyone project management, and can neither change nor remove members of project management. If DELEGATOR refuses a role change, the selection jumps back to the previous role.
- The team always keeps at least one person in project management. Anyone trying to demote or remove the last one gets the message **The team needs at least one person in project management. Make someone else project management first.** Only system administrators may remove the last project management.

### Functions {#functions}

Besides their role, a person on the team can hold functions. **Functions** in their row opens a window with a switch per function, and each switch saves right away:

- **Trusted person**: participants can turn to the trusted persons in confidence, to all of them together or to one of them. Nobody else reads these messages, not participant care and not project management either.
- Under **In the committees**, **Chairs** and **Committee consultants** for each committee.

Whoever holds a function answers that function's inbox in the [messages](./communication#messages), under their own name. **Project Management** and **Team Coordinators** give functions.

### The welcome email {#welcome-mail}

DELEGATOR owes every new team member, whether added directly or through an invitation, the **Welcome to the team** email: who added them, in which role, and a link to the dashboard. It is an automatic email and, like all others, switched off at first. So it only goes out when someone sends it on the [Emails](./communication#emails) page or switches on **Send automatically** there. Someone who leaves the team and comes back later gets it again.

### One part per conference {#one-part}

A person takes part in a conference in exactly one way: in a delegation, as a single participant, as a supervisor or on the team. Someone on the team therefore cannot apply to this conference, and someone taking part cannot join its team. DELEGATOR then refuses the invitation with **This person already takes part in the conference and cannot join its team as well.** For someone to switch, their other part has to end first.

## Tables {#tables}

The team's big tables all work the same way: [**Participants**](./participants#participants-table), [**Waiting List**](./participants#waiting-list), [**Schools**](./participants#schools) and the members table in [Team management](#team-management). They search, filter, sort and group on the server, not in your browser.

What you may not read is not in the table either. In the participants table, for example, team members' address, gender and food preference stay empty for everyone who does not manage the team, and filtering by them reveals nothing.

The page's address holds the open view, your changes to it, the search and the page. A copied link therefore shows others the same table, as far as they may open it.

### Searching, filtering and sorting

- **Search**: every word you type has to occur in one of the searched columns, such as the name or the email address. For schools the search also finds similar spellings.
- **Filters** opens the filter builder. **Add condition** adds a condition: a **Column**, a **Condition** such as **contains**, **is any of**, **is empty**, or for dates **in the last** and **this month**, and a **Value**. **Add group** puts conditions together, one level deep. Clicking **and** or **or** between the conditions switches how they are joined. Incomplete conditions count for nothing. The filter mark in a column header filters by that column directly.
- **Sorting**: clicking a column header sorts by that column. With Shift held, you sort by up to five columns one after the other. Empty values always come last.

### Grouping

**Group** sorts the rows into groups by a column's values, with **Group by …**, and up to three levels through **Add another level**. Dates are grouped **by day**, **by month** or **by year**, numbers in ranges. Each group shows how many entries it holds and can be expanded and collapsed, all at once with **Expand all** and **Collapse all**. Columns where nearly every row has a value of its own, such as names or email addresses, cannot be grouped.

### Columns and display

**Columns** shows under **Shown columns** which columns are visible, and lets you show more and change their order. Drag a column's edge in the header to change its width, and **Reset column widths** restores them all. The name column and the buttons at the end of each row always stay visible. Under **Settings** (the gear) you choose the **Table size**, and at the bottom of the table under **Per page** how many rows a page shows.

### Selecting and exporting

Select rows with the boxes at the start of each row, and with the box in the header **Select all on this page**. Above the table it then reads, for example, **3 selected** with **Clear selection**.

**Export** offers **CSV**, **JSON** and **Print**. The export holds the shown columns. If something is selected, it holds only the selection, otherwise every row matching the search and the filter.

:::warning Exports contain personal data
An exported file leaves DELEGATOR, and with it the rights that apply there. Only share it with people who are authorized to see it. The printout carries a note saying so.
:::

## Saved views {#saved-views}

A view saves how a table looks: filter, sorting, grouping, columns and page size. The views menu above the table shows the open view. Once you have changed it, it carries a yellow dot (**View changed**).

The menu lists:

- **Table's built-in view**: the view every table has
- **Shared views**: views everyone who may open this table sees
- **My views**: views only you see, no administrator either

A star marks everyone's default, a bookmark your own default, a globe a view for every conference.

### Saving a view

1. Set the table up the way you need it.
2. Choose **Save as a new view …** in the menu.
3. Enter a name under **Name of the view** (at most 80 characters) and choose **Only for me** or **Share with the team**. With **Offer in every conference**, the view appears with this table in every conference, not just this one. A shared view can be made everyone's default right away with **Make it everyone's default**.

Only **Project Management** and **Participant Care** save shared views, and only system administrators save shared views for every conference. Team Coordinators therefore save only their own views in the members table.

### Changing views

Depending on the view and your rights, the menu offers:

- **Save changes to “…”** and **Discard changes**, once you have changed a view. Anyone may discard, since it only affects your own table.
- **Rename** and **Delete view**. A shared view disappears for everyone when deleted, so DELEGATOR asks first.
- **Make it everyone's default** and **No longer everyone's default** for shared views.
- **Make it my default** and **No longer my default**. You can make the built-in view your default too, with **Use the table's built-in view as my default**.
- **Share with the team …** turns your own view into a shared one.
- **Copy as my own view …** turns a shared view into your own, which you can change freely.

A table opens with your own default. Without one, with this conference's default, otherwise with the default for every conference, otherwise with the built-in view. If a saved view no longer fits the table, it opens as the built-in view.

:::tip Ready-made views
The participants table comes with two shared views for every conference: **Warteliste**, everyone still waiting for a seat in the order they signed up, and **Offene Probleme**, every accepted participant whose payment or documents are not complete yet. Their names are German.
:::

## Impersonation {#impersonation}

With **Impersonation** you see and use DELEGATOR as if you were another person.

**Who may act as whom:**

- **Project Management** and **Participant Care** act as participants of their conference: delegates, single participants and supervisors. Not as anyone who is on any team, and not as anyone who also takes part in, or waits on the waiting list of, a conference you do not look after. Impersonation applies everywhere, not just in this conference.
- System administrators act as anyone but themselves.

**How it works:**

1. Open the person's user card. If you may act as them, the header of the card shows the button with the detective (**Impersonation**). System administrators also find it in the members table in [Team management](#team-management).
2. A click reloads DELEGATOR and shows you the conference overview as the person sees it.
3. The header now shows a yellow button with the detective. Hover over it to read **Acting as: …** with the person's address and your own.
4. Clicking that button ends the impersonation and takes you back to the conference overview as yourself.

:::warning Everything counts as the person's action
While impersonating, you act as this person. Whatever you submit, change or delete is done in their name and has the same consequences as if they had done it themselves. Your own system rights do not apply meanwhile: as an administrator, you are no administrator while acting as a participant.
:::

DELEGATOR checks the impersonation again on every request. It ends on its own as soon as you would no longer be allowed it, for example because you left the team or the person has joined a team. While impersonating, you cannot start a second one (**You are already acting as someone else. Stop that first.**). If impersonation is not set up on the server, DELEGATOR says **Impersonation is not set up on this server.**

## Link to CHASE {#chase-link}

DELEGATOR can be linked to an instance of MUNify CHASE, the app for the sessions during the conference. The link applies to the whole server, not to a single conference. It is set up in the server's configuration, and a team has nothing to do for it.

**What goes to CHASE:** every conference that is not yet **After the conference** appears in CHASE on its own, with committees, agenda, roles and team. The participants follow only once you [release the assignment](./assignment#finish-and-release). Accepted working papers then go across as well.

**What comes back:**

- Resolutions adopted in CHASE are stored by DELEGATOR as PDFs in your conference's header among the [adopted resolutions](./configuration#resolutions), marked **From CHASE**. While the link is active, CHASE keeps them up to date and you cannot delete them. A title and committee you change here are kept. If a resolution no longer counts as adopted in CHASE, it disappears here too.
- The [**Import**](./maintenance#import) page reads the attendance from CHASE when you open it. DELEGATOR stores none of it on its own, you apply it there.

Besides, CHASE checks the NSA cards you print under [**Downloads**](./maintenance#downloads) or in a person's user card, and the **Get to know MUNify CHASE** email exists on the [Emails](./communication#emails) page only while the link is active.

### The CHASE card on the dashboard

While a CHASE instance is linked, every team member sees the **Link to CHASE** card on the conference dashboard:

- **Open the conference in CHASE** leads to the conference in CHASE.
- Next to it, it says when DELEGATOR last read from CHASE (**Last read from CHASE: …** or **Nothing read from CHASE yet**).
- Before the assignment is released, a note reminds you that the participants only appear in CHASE afterwards.
- Whoever may read papers sees, under **Accepted working papers that do not go to CHASE**, every accepted working paper CHASE does not take over, with the reason: **no agenda item** or **the delegation has no seat in this committee**.

### Sync now

System administrators find the **Sync now** button on the card and on the **Link to CHASE** page. It makes DELEGATOR read everything from CHASE again and asks CHASE to do the same with DELEGATOR. It is not normally needed, since both sides hear changes right away. If CHASE cannot be reached at the moment, DELEGATOR still syncs on its side and says so in the message.

System administrators open the **Link to CHASE** page through the button of the same name on the conference overview. It shows which address DELEGATOR is linked to, **Last notice from CHASE**, **Last full sync** and the last error, plus **Open CHASE**. Without a link, it explains which server settings it needs.

:::note When the link ends
If the administration removes the link from the configuration, it ends at the server's next start. The resolutions from CHASE then stay as ordinary resolutions and can be deleted again.
:::
