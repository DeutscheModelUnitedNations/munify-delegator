---
title: AI access
description: Letting AI assistants work with a conference without personal data ever reaching them
---

# AI access

AI assistants such as Claude or ChatGPT get used anyway. So that nobody has to download participant lists and paste them into a chat, an assistant can connect to DELEGATOR directly. It then works with your account and may do exactly what you may. Personal data never reaches it.

The **AI access** page in the team area (group **Maintenance**) can only be opened by **Project Management** and system administrators.

## Switching it on {#switching-on}

AI access starts switched off for every conference. Project Management switches it on on the **AI access** page, with **Allow AI assistants for this conference**. The switch takes effect right away, without saving. While it is off, no assistant sees anything of this conference, whoever connects it. Once you switch it off, DELEGATOR refuses every call about this conference from then on.

Once it is on, every member of the team may connect. The assistant acts with the roles of the person who connected it: someone who only holds Participant Care can do through the assistant only what Participant Care may (see [Who can do what](./overview#team-roles)). System administrators count as holding every team role in every conference that is switched on, even when they are not on its team. Their assistant reaches no further than the conferences that are switched on.

## Connecting an assistant {#connecting}

**Connect** shows the address of the MCP server. It is the same for every conference. Add it in your AI app as an MCP server (in Claude, for example, as a custom connector) and sign in with your DELEGATOR account in the window that follows. An assistant can then work with every conference that is switched on and whose team you are on. Ask it first which ones those are and which roles you hold there.

If the page says instead that no MCP server is set up yet, the server is missing its configuration. Contact the administrators.

## What an assistant sees {#what-an-assistant-sees}

An assistant reads the conference, committees, roles, delegations, applications, payment and document statuses, surveys, the schedule, papers and resolutions. It sees people only as ids with their status, roles and seats, whether they are minors, their school, city, region and country.

Everything else about people arrives as `[redacted]`:

- names, email addresses, phone numbers and addresses
- birthday, gender, pronouns and diet
- emergency contacts, access codes such as entry and connection codes, and invitation links
- every free text by or about people, such as care notes, motivation texts, sighting notes and comments on papers

When an assistant counts people by gender or diet, it leaves out groups of fewer than five and writes `<5` there. It counts these two only alone or with each other, never together with a status, school, city, country, committee or role, since it knows those for every person.

An assistant cannot filter, sort or search by redacted details either. A question like "Who is called Miller?" is refused by DELEGATOR before it runs.

:::tip Working with ids
An assistant knows people only as ids and cannot tell you who is meant. Ask it for what it sees about a person, such as their delegation, role or school, and find them in the team area with that.
:::

## What an assistant can do {#what-an-assistant-can-do}

For common questions an assistant has tools of its own: an overview of the participants with their paperwork, counts by up to three attributes, and an overview of the assignment with seats, holders, the size of the draft and warnings. Beyond that it can ask any read query the team area's pages use.

It can change much of what the team's pages change, with one tool for each action:

- committees, agenda items, roles and seat planning
- the [assignment](./assignment#draft-apply-release) in the draft: sighting (stars, flag, **Must get a seat**, disqualifying, priority), weighting, planning roles, splitting delegations, converting single participants, assigning automatically, resetting and discarding the draft
- the committees and seats of individual delegates
- the schedule with its days, tracks, entries and places
- surveys and their options
- participant statuses, their school, payments and waiting list entries
- decisions about possible duplicate accounts
- the conference's settings
- the tables' shared views

An assistant filters, sorts and groups a view only by columns without personal data, and saves no personal views. An assistant does not write notes or other texts about people. Those stay in the team area. It cannot apply or release the assignment, that only happens on the [Assignment](./assignment#finish-and-release) page.

:::warning Preview first, then run
An assistant does not run right away what reaches people outside the team. That covers the conference stage, the calendar for participants, messages between participants and team, unlocking payments, postal registration or paper submission, participant statuses such as payment, documents and attendance, the status of payments, setting everybody's attendance at once, and distributing a survey. The assistant first gets a preview and has to confirm the call explicitly. A good assistant asks you before it does. Only confirm what you would do yourself.
:::

## The log {#the-log}

**Log** lists every call an assistant made about this conference, the latest 200 first: **Time**, **Person**, **Tool**, **Outcome** (**Done**, **Refused** or **Error**) and **Details** with what the call passed. New calls show up without reloading. A preview is listed too, as **Done**.

**Refused** means DELEGATOR declined the call, for example because the assistant tried to filter by redacted details, an input was invalid or the person's roles were not enough. **Error** means something unexpected went wrong. Questions about no conference, such as which conferences are reachable, are not in the log. When someone not on the team, or anyone while the switch is off, tries to reach the conference, DELEGATOR refuses without an entry here.
