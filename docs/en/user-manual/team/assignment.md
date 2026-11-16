---
title: Assignment
description: Review applications, hand out roles, apply the assignment and release it
---

# Assignment

Under **Assignment** the team hands out the conference's seats: nations and non-state actors to delegations, individual roles to single participants. **Project Management** and **Participant Care** can open and edit the page (see [Who can do what](./overview#team-roles)).

The work is spread across the tabs **Introduction**, **Sighting**, **Weighting**, **Single participants**, **Assignment** and **Finish**. You can switch between them at any time and work in any order. The **Introduction** sums up the process and links every tab. In the top right corner the page always shows how many changes are planned (**6 planned changes**, a click takes you to the finish tab), and whether the assignment is **Released** or **Not released**.

## Draft, apply, release {#draft-apply-release}

The assignment runs in three separate steps:

1. **Draft**: everything you plan in the tabs sits as a draft on top of the real applications. It changes nothing in the registrations. The whole team sees and edits it together, and changes by others show up without reloading. You can discard it at any time.
2. **Apply**: in the **Finish** tab you write the draft into the registrations. Only then are delegations split and merged and roles given or taken away. Afterwards the draft is empty, ratings and weights are kept.
3. **Release**: the release only decides whether participants and supervisors see their roles. Until then their [dashboard](../participant/dashboard#after-applying) only shows **The assignment is still in progress**. Releasing sends no emails, the page offers you the result emails afterwards.

:::tip Seat planning comes first
Which roles exist, with how many seats, is set beforehand in the [seat planning](./configuration#seat-planning) and the [committees](./configuration#committees-and-seats). The assignment only hands out what is set up there. A nation has as many seats as its committees give it together.
:::

:::note With an AI assistant
An [AI assistant](./ai-access#what-an-assistant-can-do) can edit the draft: rate, flag, plan roles, split, assign automatically and discard the draft. It does not write notes. Only a person on this page can apply and release.
:::

## Typical order of work {#typical-order}

The **Introduction** suggests working through the tabs from left to right:

1. **Sighting**: every application gets stars. You flag what stands out, and mark applications that must get a seat or should get none.
2. **Weighting**: you set how rating, flags and experience count in the automatic distribution, and save.
3. **Single participants**: you hand out the individual roles. Whoever should get a nation instead, you turn into a delegation here.
4. **Assignment**: you hand out the nations and non-state actors, one group size at a time. For each size you can assign automatically and adjust the result by hand. What does not fit, you split.
5. **Finish**: you check the planned changes, resolve whatever prevents applying, apply the draft and release the assignment.

After the release you send the result emails, and the delegations distribute their members across the committees (see [After applying](#after-applying)).

## Sighting {#sighting}

In the **Sighting** you go through every sent application one by one, delegations and single participants in one deck: the delegations first, the largest at the front, then the single participants. On the right it says how many applications the deck holds with the chosen filters and how many there are in total (**20 of 250**).

![The sighting with an application card, stars, flag, note and the strip of all applications below](shot:team/assignment-sighting)

### The application card

A delegation appears under its codename, so the rating stays about the application. The card shows:

- the members with **Age** at the start of the conference, gender and **Previous conference participations**, the head delegate with a crown, and below them the average age and the sum of previous participations,
- under **School / Institution** the people's schools. A click opens the school's page (see [Schools](./participants#schools)),
- the supervisors. A click opens their user card,
- under **Wishes** the roles wished for. A delegation's wishes are numbered, a single participant's have no order,
- **Motivation** and **Experience**, as the application wrote them.

For single participants, name, age, gender and previous participations are in the header. Clicking a name opens the [user card](./participants#user-card).

A red warning next to a name points to a note by participant care, for example about earlier behavior. This includes notes of an older account confirmed to be the same person (see [Duplicate accounts](./maintenance#duplicates)). Hover over the sign to read the note.

### Rating

In the top right corner of the card you rate the application:

- **Stars**: clicking a star gives that many stars. Clicking the same star again takes half a star off, which is how you give half stars. The cross in front clears the rating. Unrated applications count as **Not reviewed yet**.
- **Flag**: marks an application that stands out to you. How much a flag counts is set in the [weighting](#weighting). Without a bonus there it has no effect on the automatic distribution.
- **Must get a seat** (pin): the automatic distribution seats this application before all others, and the finish tab warns if it would be left out. For schools abroad it counts as a guaranteed seat (see [School rules](#school-rules)).
- **Disqualify**: the automatic distribution gives it no role, and in the **Assignment** tab it only shows up with **Show disqualified**. You can still assign it by hand.

The card's border shows where it stands: red disqualified, green must get a seat, yellow flagged.

**Must get a seat** and **Disqualify** rule each other out: setting one removes the other. Below, the **Note** field holds whatever the team should know. The note is saved when you leave the field, everything else right away. All of it applies to the whole team, and the board later shows the note as an icon on the card.

### Prioritizing a wish {#prioritizing}

Next to each wish is a target. Clicking it prioritizes that wish: the automatic distribution treats it like a first wish, and for single participants prefers it to their other wishes. One wish per application is prioritized, a second click takes the priority back. Only a role the application wished for can be prioritized. On the board the wish carries the same target, and the finish tab points it out when an application would get another role.

### School rules on the card

When the application belongs to a group that is decided together, the card names it: **Decided together: 6 applicants from …, supervised by …**. When people come from a school abroad, it shows how many guaranteed seats that school already has and how many all schools abroad have together. Setting **Must get a seat** updates the count with this application right away. A number above its limit turns the note yellow. What the rules mean is under [School rules](#school-rules).

### Moving through the applications

Below the card, a bar shows how many applications are rated (green), only flagged (yellow) and disqualified (red). A slider jumps to any place in the deck. Below it, a strip shows the applications around the current one, colored by status, dark green for those that must get a seat. Next to it you see how many come before and after. **Previous**, **Next** and **Next unreviewed** turn the cards with a click, the middle shows the position (**12 of 250**).

:::tip Keyboard shortcuts

- **←** and **→**: previous and next application
- **N**: next unreviewed application
- **1** to **5**: give whole stars
- **Ctrl/⌘ + D**: clear the rating

The keys do nothing while you are typing in a field.
:::

### Filtering and searching

The **Status** field limits the deck to **All**, **Not reviewed yet**, **Rated**, **Flagged**, **Disqualified** or **With a note**. **Not reviewed yet** are applications without stars that are not disqualified, one that is only flagged counts too. The school field next to it searches for schools and filters by one of them or by **No school**. A delegation matches when any of its people has that school. The cross with the school's name removes the filter.

The search finds applications by codename and id, school, motivation and experience, and by names and email addresses of members and supervisors. It respects the filters. Instead of the card it shows the best matches with the field that matched. A click, or Enter for the first, opens the application in the deck and clears the search.

## Weighting {#weighting}

The automatic distribution looks for the distribution with the lowest total cost for all open groups of one size at once (the Hungarian method). In the **Weighting** you set how ratings, flags and experience count towards that cost. Lower costs are better. The weighting applies to the whole conference.

- **Rating**
  - **Average rating** (default 2.5): the number of stars from which an application counts as better or worse than average. Applications without a rating are treated as if they had exactly this rating.
  - **How much the rating counts** (default 1): how many cost points each star of distance from the average is worth. Well rated groups are seated more often, and their wishes prevail more often in contested roles. At 0 the rating is ignored.
- **Flags**
  - **Bonus for flags** (default 0): taken off the cost of flagged applications. A negative value works against them. At 0, flags have no effect.
  - **Effect of the flag bonus** (default **Seating only**): with **Seating only** the bonus only decides who is left out when there are more groups than roles. With **Seating and weight of wishes** the wishes of flagged groups also count more in contested roles.
- **Experience**
  - **Modifier for experienced participants** (default 0): added to the cost of groups whose members were seated at an earlier conference, scaled by their share of the group. Experienced means having got a role with the same account at a conference that ended before this one. Positive values count against experienced groups, negative values in their favour.
  - **Effect of the modifier** (default **Seating and weight of wishes**): the same choice as for flags.

The wishes themselves always count: a seat wished for further down costs much more than a first wish, a [prioritized wish](#prioritizing) as much as a first wish. The distribution only hands a group a role it did not wish for once none of its wishes is left free.

Next to the form, the **Example costs** show what a few typical applications would cost with your values, and **What these settings do** describes the effect in words. Both follow your input right away. **Reset to defaults** only fills in the default values. Nothing is stored until you click **Save**. The weighting takes effect the next time you assign automatically, it does not change what is already in the draft.

## Single participants {#single-participants}

In the **Single participants** tab you hand out the individual roles, such as the conference press. On the left is the pool of single participants without a role, those marked **Must get a seat** first, then the rated ones from the best down, then the rest. On the right are the individual roles with their seats (**2 / 3 seats**). If the conference has none, it says **This conference has no individual roles.**

Each card shows name, school, rating, previous participations, flag and pin, and the wishes. The wish the person currently holds is marked green. If they hold a role they did not wish for, their wishes are yellow with a warning sign. The arrow opens the application in the sighting. The search above the pool finds names, schools, codenames, texts and notes.

- Drag a person onto a role to give it to them, or back into the pool to take it away. People who did not apply for that role are listed first in it. An individual role also takes more people than it has seats, and the finish tab then warns.
- Drag a person onto **Turn into a delegation** to make them a delegation of their own. In the [Assignment](#delegations) tab they then show up as a group of one and can get a nation or a non-state actor. **Revert** in that box undoes it, together with any role planned there.
- **Assign automatically** hands out the free seats of the individual roles to every single participant without a role, and says how many got one. Each person only gets a role they applied for. If none of those is free, they stay without a role. Who is left out when a role has too many applicants is decided by rating, flag and experience according to the [weighting](#weighting). Disqualified applications are left out, those marked **Must get a seat** go first, and a prioritized wish comes before the others. Roles planned by hand stay as they are.

Below the pool, the **School rules** card shows where the draft breaks a rule (see [School rules](#school-rules)).

## Assignment {#delegations}

In the **Assignment** tab you hand out nations and non-state actors to delegations.

![The assignment board with the group sizes on top, the pool without a role on the left and the roles with their seats on the right](shot:team/assignment-delegations)

### Group size and pool

On top you pick the **Group size**. The board then shows, under **Without a role** on the left, the groups of that many people that have no role yet, and on the right the roles with exactly that many seats, in alphabetical order. A group is a whole delegation, one part of a split delegation, or a single participant turned into a delegation. A dot on a size means roles are still free there, a green size has all its roles taken. When you open it, the board picks the smallest size with open groups.

The pool is ordered like this: first the applications marked **Must get a seat**, then the rated ones from the best down, then the rest. Groups whose applied role you take away are listed on top. The pool search finds names, schools, codenames, texts and notes, and points out matches at other group sizes (**More matches at group size 3, 2**). The **Show disqualified** toggle shows disqualified applications.

### The cards

Each card shows the size, the people (head delegate first), their schools, the rating, previous participations and the wishes. Badges mark a **Part of a split** and a **Single as delegation**, icons the pin, the flag and a note that shows when you hover over it. The wish matching the role the group is on is marked green. If it is on a role it did not wish for, its wishes are yellow with a warning sign, and it is listed first in its role. The border shows where it stands: red disqualified, yellow flagged, dashed a planned change. The arrow opens the application in the sighting.

### Assigning by hand

Drag a group onto a role to give it that role, or back into the pool to take it away. While you drag, the roles with enough free seats are highlighted. A full role does not take the group, and the board says **This role does not have enough free seats.** A group that already holds a role is moved the same way, into the pool or onto another role. Applying then takes its old role away.

When several groups are on the same role, applying merges them into one delegation: into the delegation already holding the role, else into the largest one going there whole, else into a new one.

### Splitting delegations

If a delegation does not fit the free roles, split it with the button **Split the delegation across several roles** on its card. This works for whole delegations of at least two people. The dialog **Split …** starts with the first member on their own and the rest together. Drag each member into the part it should end up in, add parts with **Add part**, remove one with **Remove part**, or divide into equal parts with the round buttons at the bottom. You need at least two parts with members, then confirm with **Split**.

Each part then shows up as a group of its own size, without a role, and is assigned on its own. A role planned for the whole delegation is dropped, and splitting again replaces the earlier split. Applying dissolves the original delegation, and every part becomes a delegation of its own, a part without a role too. A part that shares its role with another group is merged with that group instead. **Undo the split and merge the delegation back together** on a part drops the split together with the roles planned for its parts.

If someone joins the delegation after it was split, the board warns on top that members are in no part. As long as that is the case, the draft cannot be applied. Split the delegation again then.

### Assigning automatically

**Assign automatically (3)** distributes every open group of the chosen size in one pass, following the [weighting](#weighting), and says how many got a role. It works like this:

- It only uses roles with **exactly** as many free seats as the group has members. A role a group would only partly fill is not offered at that group size, so the group stays in the pool.
- Wishes come first: the distribution seats as many groups as possible on one of their wishes. Only what is left over goes to groups without a free wish.
- Applications marked **Must get a seat** are seated before all others whenever a role fits. Which role still follows their wishes.
- Disqualified applications, and groups that already hold or are planned for a role, stay as they are.
- It does not follow the [school rules](#school-rules). Check the **School rules** card afterwards.

The result lands in the draft just like an assignment by hand, so you can check and change it.

### Resetting the roles of one seat count

**Reset roles with 3 seats** takes the role off every group in the draft that sits on a role with that many seats, without asking. This includes delegations holding their role from an earlier apply: if you apply afterwards, they lose it. **Discard draft** on the finish tab restores the state from before the reset, but discards everything else too.

### School rules {#school-rules}

Below the pool, the **School rules** card shows where the draft breaks the conference's rules about schools. The finish tab and the apply dialog show the same warnings.

- **Deciding together**: the applicants of one supervisor from the same school all get a seat or none do, up to a group size of 16. They include every member from that school of a delegation in which the supervisor is linked to at least one person. Larger groups are treated like everyone else. The board warns about groups of which only some would get a seat or are disqualified, and names the applications without a seat.
- **Guaranteed seats**: a guaranteed seat is a person in an application marked **Must get a seat**. A school abroad gets at most 12 guaranteed seats, and every person counts for their own school. All schools abroad together get at most 20 % of the conference's seats as guaranteed seats. The board warns when one school, or all of them together, are above that.

The rules only warn and stop nothing. The numbers above are the defaults. Project Management sets the limits in the [settings](./configuration#stages), leaving one empty switches its rule off. Whether a school is a school abroad is set by participant care on the school's page (see [Schools](./participants#schools)).

## Finish and release {#finish-and-release}

In the **Finish** tab you check what the draft does, apply it and release the assignment.

![The finish tab with the planned changes and the release](shot:team/assignment-finish)

### Checking the planned changes

Under **Planned changes** the page counts **Role changes**, **Merges**, **New delegations**, **Dissolved delegations** and **Individual roles**. Below, it lists every group affected with **Application**, **Before**, **After** and **Wish** (which wish the new role was, or **not wished**), and every individual role that changes. Parts of a split, singles as delegations and groups that are **merged** are labelled. If the draft plans nothing, it says **No planned changes.**

### What prevents applying {#blocking-problems}

Under **These problems prevent applying** the page lists what you have to resolve first. While anything is listed there, **Apply assignment** cannot be clicked.

- **… has 3 seats but 4 people are planned for it.** Take the role off a group or split differently.
- **The split of … leaves 1 member(s) without a part.** Someone joined after the split. Split the delegation again.
- **… would be dissolved but has already submitted papers.** Applying would delete the delegation, for example because all its members move to other delegations or because it is split. Plan it so the delegation stays.

### Warnings

The following do not prevent applying:

- An individual role given more often than it has seats (**… has 2 seats but is given 3 times.**).
- **Applications that must get a seat would be left out**: every application of the conference marked **Must get a seat** is checked, not only those on the board. After the codename is the group size you find it under, or **Single participants**. A split delegation only counts as seated if every part gets a seat.
- **Applications would not get their prioritized role**: an application with a seat, but not on its prioritized wish.
- **Every seat would be taken**: after applying, no seat would be left free.
- **Groups are split** and **Too many guaranteed seats at schools abroad** (see [School rules](#school-rules)).

:::tip Leave a few seats free
A few free seats help with the unforeseen and are easy to fill from the [waiting list](./participants#waiting-list) later. Whoever moves up from the waiting list gets the email **Moved up from the waiting list** once the assignment is released.
:::

### Applying

**Apply assignment** opens the dialog **Apply the assignment?**. It shows the warnings about seats and school rules again, how many seats will be free afterwards, and whether the assignment is not released yet. With **Apply assignment** you write the draft into the registrations in one step. Applying:

- splits and merges delegations, or creates new ones from converted single participants. Members are moved rather than created anew, so supervision, school and statuses are kept. Every delegation then has one head delegate: a merged one keeps its own, a new one gets the former head delegate among its members, otherwise another person.
- gives new delegations a new entry code and the motivation and experience of the application their members come from. They take over no role wishes.
- turns converted single participants into delegation members, and their registration as a single participant goes away. A converted person without a planned role stays registered as a single participant.
- gives and takes away roles. Members whose role changes lose the committee they were seated in.
- deletes delegations left without members.
- clears the draft. Ratings and weights stay.

:::warning Cannot be undone
Applying cannot be taken back. Deleted delegations lose their rating, note and role wishes, and so do converted single participants. You can only change roles afterwards with a new draft and a new apply.
:::

If the assignment is already released, participants see the result right away and the page offers the result emails. Otherwise the release card reminds you that nobody sees the result yet. If a converted single participant is withdrawn while applying, it stops with **The applications changed while the assignment was being applied. Please apply it again.** and nothing is written.

### Discarding the draft

**Discard draft** deletes every planned change after asking, without applying anything. Ratings, notes, priorities and weights are kept.

### Releasing and hiding {#releasing}

The card at the bottom shows whether the assignment is released:

- **Assignment not released**: participants do not see which role they got yet, and count as neither accepted nor rejected. Right after applying the card turns yellow and reminds you to release.
- **Assignment released**: participants see their role.

**Release assignment** asks **Release the assignment?** first. Then participants and supervisors see the applied roles and committees, and whoever sent an application and got no seat counts as rejected. Their dashboard shows **Application Rejected**, and they can put themselves on the waiting list (see [Not accepted](../participant/dashboard#not-accepted)).

**Hide assignment** takes the release back after asking **Hide the assignment again?**. Participants then no longer see their role, and result emails not sent yet are no longer due. Emails already sent cannot be taken back. Once released, later changes become visible as soon as you apply them.

:::warning The draft is never visible
Participants only ever see what has been applied and released. If you keep planning after the release, nothing changes for them until you apply again.
:::

### Result emails {#result-emails}

Neither applying nor releasing sends emails. After releasing, and after every apply of an assignment that is already released, the page asks **Send emails now?** and lists what has become due, with the number of open emails per kind:

- **Acceptance**: to every delegate and single participant with a role. If someone later gets another role, a new acceptance becomes due.
- **Rejection**: to everyone who sent an application and got no seat, once per person.
- **Summary for supervisors**: to supervisors with at least one supervised person who sent an application. It goes out once, later changes are not resent.
- **Moved up from the waiting list**: to people who got a seat from the waiting list, instead of the acceptance.

The question only shows when something is due and you may send emails. **Send 12 emails now** sends them right away. With **Later** you send or skip them later on the [Emails](./communication#emails) page. Kinds set to automatic there go out at the latest with the next run, even if you do nothing here.

## After applying {#after-applying}

- **Committees**: when a delegation represents a nation, its head delegate distributes the members across the committees (see [Committee assignment](../participant/dashboard#committee-assignment)). Participant care can change a person's committee in their [user card](./participants#user-card) under **Committee Assignment**. If a later apply changes a delegation's role, its members lose their committee and the head delegate distributes them again.
- **Planning further**: you can start a new draft and apply it at any time. Delegations with a role sit in their role on the board and can be moved like any other group.
- **Withdrawn applications**: the sighting, the board and applying only consider sent applications. If an application is withdrawn, it drops out, and whatever was planned for it is not applied.
- **Free seats**: after applying you fill seats from the [waiting list](./participants#waiting-list). Whoever moves up that way gets the email **Moved up from the waiting list** once the assignment is released.
