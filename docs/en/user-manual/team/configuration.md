---
title: Setting up a conference
description: Creating and setting up a conference, with its settings, stages, features, templates, committees, seat planning and seats
---

# Setting up a conference

This page shows how the conference team sets up and maintains a conference: from creating it, through the settings, stages and templates, to committees, seat planning and seats. How the seats then go to delegations and single participants is covered in [Assignment](./assignment). How the team area is organised and which role may open what is covered in [The team area](./overview#the-team-area) and [Who can do what](./overview#team-roles).

## Creating a conference {#creating-a-conference}

Only system admins create new conferences. On the conference overview, **Create Conference** leads to the **Create Conference** page.

1. The conference's data comes from the **Conference Request** page, linked at the top right of **Create Conference**. There you enter the basic details, the committees with their nations, the non-state actors and the individual roles. **Add all UN member states** fills a committee with every state. The page saves nothing on the server, your input stays in this browser only. Times are read in the Europe/Berlin time zone. At the end you download the generated JSON.
2. An admin selects the file on **Create Conference**. It is checked right away. If something is wrong, **Validation Failed** appears with the places concerned, for example a state that is not a UN member, a duplicate abbreviation or an application deadline after the conference starts.
3. After **Validation Successful**, **Create Conference** creates the conference with its committees, seats, non-state actors and individual roles and opens its dashboard.

The file does not have to be perfect: everything can be changed afterwards in the [settings](#general-settings) and the [seat planning](#seat-planning). A new conference is set to **Before registration starts** and is therefore not public yet. The file brings no team along. An admin invites the first members in [Team Management](./overview#team-management).

## From a new conference to open registration {#setup-checklist}

This order follows from what DELEGATOR allows in each stage.

1. Invite the team. Without one, nobody but system admins can set the conference up. The settings are open to **Project Management**, **Participant Care** and **Content Lead**.
2. Fill in **General** (Project Management): name, location, conference language, images, the end of the application period, grace period, conference dates and time zone. Add the [age limits](#age-limits) and the [school rules](#school-rules).
3. Create committees and agenda items: Project Management creates committees, Content Lead also adds agenda items. Delegations later submit their papers on these agenda items.
4. Plan the seats (Project Management, Content Lead): the states in the committees, the non-state actors and the individual roles. This is best done now, while the conference is **Before registration starts**. After that, every change is public at once and can remove applications.
5. Enter the links, above all the link to the preparation guide, which visitors see without signing in too.
6. Enter the **Banking Information** (Project Management) before you allow payments.
7. Store the postal address and the templates: the four templates of the postal registration, place the fields on them and check them with **Test document**. You only need the certificate template after the conference.
8. Set the status to **Registration Phase** and save. From now on the conference is public and applications are possible.

What comes next is described in [Typical sequence](#typical-sequence).

## The settings {#general-settings}

The **Settings** page splits the configuration into tabs: **General**, **Committees and Agenda Items**, **Status & Features**, **Links & Content**, **Banking Information**, **Documents & Templates**. Each tab briefly explains at the top what it is for.

![The conference settings with their tabs and the save button](shot:team/configuration)

**Project Management**, **Participant Care** and **Content Lead** may open the page. Only Project Management may change everything. Participant Care and Content Lead change the status, the feature switches, the links, the postal address, the templates with their layout, and the resolutions. They see **General** and **Banking Information** locked, and a note at the top tells them what they can change.

### Saving with a preview {#saving}

Changes in the tabs are not saved right away. A tab with unsaved changes carries a yellow dot, and the button reads, for example, **Save settings (3 changes)**. It opens **Confirm Save** with every change, grouped by tab, old and new value side by side. Highlighted in yellow and explained are:

- the **Conference Status**, which immediately controls what everyone can see and use,
- the five switches under **Features**, which unlock or lock a feature for everyone immediately,
- fee, currency and bank details, which appear on payment requests already sent.

A newly picked file replaces the one stored so far, a removed one is listed as **removed**. Only **Save** writes it all.

If the end of the application period lies after the conference starts, the start after the end, or the participants' minimum age above their maximum age, you cannot save. The message is shown at the field concerned.

If saving made emails due, the page then asks **Send emails now?** and names which kinds are open and how many. This happens with **Allow Payments**, **Allow Postal Registration**, the status **After the conference** and a new certificate template. **Send {count} emails now** sends them, with **Later** you find them again on the [Emails](./communication#emails) page. Only Project Management and Participant Care, who may manage the emails, are asked.

:::note Outside the form
Committees and agenda items, resolutions and the layout on the templates save right away in their own windows. The save button only covers the form fields.
:::

### General {#general}

Only Project Management changes this tab.

- **Basics**: **Conference Name** (at least 3 characters), **Full Name**, **Location**, **Conference Language** and **Website**. Name, location and language appear on the conference's card in the overview. The language also shows as a notice before applying, so only people who speak it apply. The nations are also filed and printed in it on the nametag tables, whatever language each person's interface uses.
- **Images & logos**: the **Conference Image** for the card in the overview, the **Conference Emblem** (an SVG file for resolutions, otherwise the UN emblem) and the **Conference Logo** for the dashboard header (otherwise the emblem). Each image may be at most 1 MB and can be removed again.
- **Schedule**: **End of the application period** with a time, **Grace Period (in minutes)** (30 to begin with), **Conference start date**, **Conference end date** and the **Conference Timezone**, which places the "now" marker in the calendar (Europe/Berlin to begin with).

Participants only see the end of the application period, from then on the overview shows registration as closed. The grace period is a buffer for anyone just finishing: only after it does DELEGATOR stop taking applications. Below the field you see that moment in your time zone.

### Age limits {#age-limits}

Under **Age limits** in the **General** tab, Project Management sets **Participants' minimum age** (15 to begin with), **Participants' maximum age** (21 to begin with) and **Supervisors' minimum age** (21 to begin with). Ages are measured on the first conference day. An empty field switches the limit off.

What follows from them:

- Whoever is outside sees a notice when applying, on the waiting list and on the dashboard until the conference is over, and shows up in the [plausibility check](./maintenance#plausibility).
- Anyone can register and join a delegation. An application cannot be **sent**, though, while one of its people is outside the range. That person reads "With this age the application cannot be sent. If you have questions, contact the team."
- Supervisors outside their limit can only sign up without attending in person, and cannot confirm their own attendance later either. Participant Care can still confirm it in the [user card](./participants#user-card).

### Links & Content {#links}

- **Link to the preparation guide**: visitors see it on the conference's page without signing in, as long as the conference is public, and participants with a seat see it on their dashboard.
- **Team Wiki Link** and **Services Page Link**: they appear as **Team Wiki** and **Services** on the team's dashboard only.

An empty field hides the link. Project Management, Participant Care and Content Lead may change these.

### Banking Information {#payment-details}

Under **Participation fee** you find **Fee** and **Currency** (three letters, EUR to begin with), under **Bank account** the **Account Holder**, **Bank Name**, **IBAN** (22 characters without spaces) and **BIC**. Only Project Management changes them. Participants see these details when they [pay their fee](../participant/dashboard#payment), along with a QR code for the transfer.

## Status and stages {#stages}

In the **Status & Features** tab you pick the conference's stage under **Conference Status**. It never changes on its own, only when the team changes and saves it. Project Management, Participant Care and Content Lead may change it.

:::warning The status takes effect at once
Once saved, everyone sees the new stage. It opens or closes registration, makes the conference public or not, and makes emails due. Check the preview before you save.
:::

| Stage                          | What changes                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Before registration starts** | The conference is not public. Only the team, system admins and anyone already registered see it. Founding or joining delegations and applying are not possible. The seat planning can be changed freely.                                                                                                                                                     |
| **Registration Phase**         | The conference is public, even without signing in, with its [seats](#public-seats). Until the end of the application period plus the grace period, delegations can be founded and joined, and applications sent or withdrawn. After that, the dashboards show that the selection is running, and the team [reviews](./assignment#sighting) the applications. |
| **Preparation Phase**          | The conference stays public, and the [waiting list](./participants#waiting-list) is open. Until the [assignment is released](./assignment#finish-and-release), participants see that it is still in progress. Then they see their role and the cards under **Quick Links**, and whoever got no seat sees a rejection with the way onto the waiting list.     |
| **Active Conference**          | The conference is no longer public, and the waiting list is closed. Participants with a seat see their dashboard as in preparation.                                                                                                                                                                                                                          |
| **After the conference**       | The dashboard says thank you, shows the role and offers the certificate and the [adopted resolutions](#resolutions) for download. The cards under **Quick Links** such as **Fee Payment** or **Schedule** disappear. Supervisors can no longer sign up. The conference is listed among the past ones in the overview.                                        |

Supervisors are not bound to the application deadline: they can sign themselves up in every stage except **After the conference**.

The stages also make emails due. In the registration phase, a reminder becomes due three days before its end for everyone whose application is not sent yet. With **After the conference**, **Certificate available** becomes due as soon as a certificate template is stored, for everyone marked as attended. Which email becomes due when is described under [Emails](./communication#emails).

### Typical sequence {#typical-sequence}

1. Set **Registration Phase** once everything is [set up](#setup-checklist).
2. After the application period, [review](./assignment#sighting) the applications, [assign](./assignment#delegations) the seats and [apply](./assignment#finish-and-release) the assignment.
3. Set **Preparation Phase**. This opens the waiting list.
4. [Release](./assignment#releasing) the assignment. Only now do participants see their roles and the quick links.
5. Switch on **Allow Payments** and **Allow Postal Registration**, plus calendar, paper submission and messages as needed.
6. Set **Active Conference** for the conference itself.
7. Afterwards store the certificate template and set **After the conference**. The page then offers the certificate email.

### Features {#features}

Under **Features** you unlock individual parts regardless of the stage. Project Management, Participant Care and Content Lead may change them.

The cards under **Quick Links** on the participants' dashboard, such as **Fee Payment**, **Postal Registration**, **Paper Hub** or **Schedule**, only appear for people with a seat and for supervisors of someone with a seat. And only in **Preparation Phase** and **Active Conference** after the assignment is released. A switch you turn on earlier only shows from then on.

- **Allow Payments**: participants see [how and where to pay](../participant/dashboard#payment). For everyone with a seat who has not paid yet, the email **Participation fee unlocked** becomes due once the assignment is released. Open payments are also named in the reminder 14 days before the conference.
- **Allow Postal Registration**: participants download their [postal registration](../participant/dashboard#postal-registration). This only works when all four [templates](#documents) are stored. For everyone with a seat whose documents are not complete yet, **Postal registration unlocked** becomes due.
- **Paper Submission Open**: participants create papers on their committees' agenda items in the [Paper Hub](../participant/paper-hub) and save new versions. With the switch off, DELEGATOR refuses both with "Paper cannot be submitted because the paper mailbox is closed.", and the **Paper Hub** is missing from the quick links.
- **Show calendar for participants**: participants see the [schedule](./communication#calendar). The team always sees it.
- **Messages between participants and team**: unlocks the [messages](./communication#messages). Switched off, existing chats stay readable, but nobody writes anything new.

:::tip Release first, then the paperwork
**Participation fee unlocked** and **Postal registration unlocked** only become due once the assignment is released. If you allow payments before that, saving offers no emails. They then wait on the [Emails](./communication#emails) page until you send them after the release.
:::

### School rules {#school-rules}

The same tab holds the limits of the school rules. Only Project Management can change them.

- **Decide groups together up to** (16 to begin with): the applicants of one supervisor from the same school form a group. When one person of a delegation is linked to the supervisor, every member of that delegation from the same school counts too. Up to this size, all of them get a seat or none do. Larger groups are treated like everyone else.
- **Guaranteed seats per school abroad** (12 to begin with): at most this many people of one school abroad can get a guaranteed seat. Which school is a school abroad is set by Participant Care under [schools](./participants#schools).
- **Guaranteed seats of all schools abroad (%)** (20 to begin with): at most this share of all the conference's seats can go to schools abroad as guaranteed seats, all together.

The [assignment](./assignment#delegations) warns when a draft breaks a rule and never blocks anything. An empty field switches a rule off.

## Documents and templates {#documents}

The **Documents & Templates** tab holds everything DELEGATOR builds the participants' paperwork from. Project Management, Participant Care and Content Lead may change it.

- **Postal Registration**: the postal address participants send their documents to (**Name**, **Street**, **e.g. Apartment**, **ZIP**, **City**, **Country**). It is shown on the postal registration page and printed as the recipient address on the binding registration.
- **Postal Templates**: one PDF each for **Binding Registration**, **Parental Agreement** (only included for minors), **Media Usage Agreement** and **Terms & Conditions**. Participants can only download their postal registration when all four are stored.
- **Certificate of participation**: the PDF the certificates are printed on. Without it no certificate can be downloaded.

Every template has its own card showing whether it is **Stored**, **Missing**, **Uploaded on saving** or **Removed on save**. On the card:

- **Upload a PDF** or **Replace with a new PDF** picks a file of up to 10 MB. It is only uploaded with **Save settings**.
- The eye (**View the stored template**) opens the stored file.
- The bin (**Remove template**) removes it on the next save, **Undo removal** takes that back.
- **Place fields** and **Test document** only work once the template is saved ("Upload and save a template first", "Save the new template first"). The test document of the postal registration needs all four templates.

The question mark next to the headings (**Help on the PDF templates**) explains what goes on which template.

:::warning Replacing or removing templates
A new template applies at once to every document generated after it. If you remove a template of the postal registration, participants can no longer download their documents. Without a certificate template there are no certificates.
:::

### Placing fields on the template {#document-layouts}

The templates contain no placeholders. DELEGATOR writes the person's details onto the first page of the PDF in the Space Mono font, and where is up to you with **Place fields**. The window **Layout on the template:** with the document's name shows the page, and you drag each field to its spot:

| Document                         | Fields                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Certificate of participation** | **Name** (centred), **Check-in list** with the check-ins the person attended, **QR code** for the authenticity check |
| **Binding Registration**         | **Recipient address** (four lines for the window of an envelope), **Name**, **Date of Birth**                        |
| **Parental Agreement**           | **Name**, **Date of Birth**                                                                                          |
| **Media Usage Agreement**        | **Name**, **Date of Birth**, **Address**                                                                             |

You resize the check-in list and the QR code from their bottom right corner, and change the texts' font size with minus and plus below the page. **Default** puts everything back at the default positions, which also apply as long as you place nothing. **Generate test document** prints a sample with made-up details using the unsaved layout already. **Save** applies it at once to every document generated afterwards.

The terms and conditions are appended unchanged at the end, nothing is placed on them. Every page of the postal registration gets the page number, name, ID and a small signed QR code at the bottom right. The certificate can have any page size, landscape too.

:::tip Leave room
Leave room on your template where the fields go. **Test document** on the card shows the result with made-up details and the postal address as it currently stands in the form.
:::

### Adopted resolutions {#resolutions}

Below the templates, in the **Adopted resolutions** section, you upload the resolutions as PDF. Project Management, Participant Care and Content Lead may do so.

1. Under **Assign to committee (optional)**, pick a committee or **No committee**.
2. Under **Upload resolutions (PDF)**, pick one or more files, at most 50 at once and at most 10 MB each.

Each file is saved right away, not with the save button. If one fails, the others stay. A new resolution is named after its file. In the table you change **Title** and **Committee** directly, the title saves when you leave the field. Next to it you download a resolution or delete it after confirming.

Participants with a seat download the resolutions on their dashboard once the conference is over. When a MUNify CHASE is linked, resolutions adopted there appear on their own marked **From CHASE** and cannot be deleted here while the link is active.

## Committees and agenda items {#committees-and-seats}

In the **Committees and Agenda Items** tab you manage the conference's committees and their agenda items. **Project Management** creates and deletes committees, **Content Lead** also edits them and maintains the agenda items. Participant Care only views them. Every change saves right away.

![The committees of a conference with their agenda items](shot:team/committees)

Each card shows the number of states and the seats per delegation next to the name. At the top, **Open seat planning** leads to where you decide which states sit in a committee.

- **Add committee** creates a committee with **Name**, **Abbreviation** and **Seats per delegation**.
- **Edit** opens **Edit Committee** for the name and abbreviation, the **Seats per delegation** and the **Resolution Headline**, a custom headline for resolutions, for example to get a gendered article right in some languages ("Der Sicherheitsrat"). Left empty, there is none.
- **Create new Agenda Item** adds a topic with **Title** and **Teaser Text**. Delegations submit their papers on these topics. The pencil on a topic opens **Edit Agenda Item**, the bin **Delete Agenda Item**.
- **Delete** removes a committee after confirming.

**Seats per delegation** sets how many delegates of one delegation sit in this committee. Added up over all committees, this is the size of the delegation representing a state.

What happens:

- DELEGATOR refuses fewer seats per delegation than a delegation already has delegates in the committee ("At least 2 seats per delegation are required, …"). When the number drops, applications of delegations for this committee's states that are then too large for the role are removed.
- A committee cannot be deleted while delegates are assigned to it or papers are submitted on its agenda items. Otherwise its agenda items and every seat in it go too. States that only sat there are no longer a role, and the applications for them disappear, unless a delegation already holds the state. Resolutions and calendar tracks only lose their link to the committee.

:::warning Agenda items with papers
Deleting an agenda item with submitted papers deletes the papers too. The confirmation names how many and asks you to type the agenda item's title. This cannot be undone.
:::

## Seat planning {#seat-planning}

**Seat planning** distributes the seats of states and non-state actors across the committees. It decides which roles exist and how large the delegation for each one is. It has three tabs: **States**, **Non-State Actors** and **Individual roles**. **Project Management** and **Content Lead** may open and change it. Every change saves right away, there is no save button.

![The seat planning matrix with states as rows, committees as columns and the hints beside it](shot:team/seat-planning)

### States {#seat-planning-states}

The matrix lists every UN member state as a row and the committees as columns. Clicking a cell gives the state a seat in the committee or takes it away. The message that follows offers **Undo**, and a refused change jumps back and gives the reason. The **Σ** column shows the delegation size: the seats per delegation added up over every committee the state sits in. A size of 1 is marked yellow, since a delegation of a single person is impractical. A warning sign appears when the assigned delegation has more members than seats.

Above the matrix you search for a state by name or country code (**Search state**) and filter by regional group, delegation size or **No seat only**. Clicking a column header sorts. Pointing at a state shows its capital, region, regional group, languages, neighbours and whether it is landlocked. The last row counts the seats per committee.

What a click does:

- A first seat makes the state a role of the conference that delegations can apply for.
- Taking a seat away makes the delegation smaller. Applications of delegations that are then too large are removed. With the last seat the state is no longer a role, and every application for it disappears, unless a delegation already holds it.
- Seats with delegates already assigned are locked and show a padlock with their names.

### Non-state actors and individual roles {#roles}

Under **Non-State Actors** you create actors with **Name**, **Abbreviation**, **Description**, **Icon** and **Seats**, which is the size of their delegation. Name and abbreviation must be unique within the conference. Pick the icon from the Phosphor icons with the button in front of the field, or type its name (such as `tree`).

Under **Individual roles** you create roles for single participants, such as the conference press, with **Name**, **Description**, **Icon** and **Seats**. Here the **Seats** decide how many people can be given the role, and **Assigned** counts how many already have it. Below the table is the total over all individual roles.

Fields save when you leave them. A refused change resets the field. The plus in the last row creates a new role.

- DELEGATOR refuses fewer seats than the delegation assigned to an actor has members, or than an individual role is assigned. When an actor's seats drop, applications of delegations that are then too large are removed.
- An actor with an assigned delegation and an assigned individual role cannot be deleted. Deleting a role also removes the applications for it.

### Hints {#seat-planning-hints}

Beside the matrix, the **Hints** column collects what stands out:

- **Roles per delegation size** shows how many roles exist per size. Clicking a size filters the matrix to it.
- **Seats per committee** counts the seats. A click sorts the matrix by that committee.
- **Size limits** marks roles outside a **Min.** and **Max.** delegation size. The limits are only stored in your browser.
- Every delegation should be able to choose between at least three roles of exactly its size. The hints name sizes with too few roles, states that are one seat away, and single-seat roles.
- **Regional balance** compares each committee with its **Baseline** and suggests which state could gain or give up a seat. As the baseline you pick, per committee, **UN 193** (the default), **Human Rights Council**, **ECOSOC**, **Security Council** or **Manual** with your own targets per regional group, which **Apply targets** saves.
- **States without a seat** counts the states without a seat per regional group. A click filters the matrix to them.

:::warning After registration starts
Once the conference is no longer **Before registration starts**, the page shows **Registration has already started**. Every change is publicly visible at once in the [seat overview](#public-seats). Applications for roles that no longer fit the size of the delegation are removed.
:::

:::note Who sits where
Seat planning only decides which roles exist. Who holds which seat is on the **Seats** page. There participant care places people on seats and switches them, see [Giving out and switching seats](./participants#seats).
:::

## Public seat overview {#public-seats}

The **Seats of the Conference** page shows which roles the conference offers, in three tabs: **Committees and Agenda Items** with each committee's agenda items, **Nations Pool** with the states and their seats, and **Non-State Actors**. It is public as long as the conference is, so it can be seen without signing in. The team reaches it through **Seats of the Conference** on its dashboard, participants through their quick links. It follows every change in the seat planning right away.
