---
title: Reviewing papers
description: Finding submitted papers in the Paper Hub, reviewing them and following the progress
---

# Reviewing papers

In the Paper Hub the team reviews the delegations' papers: position papers, working papers and introduction papers. How participants write and submit them is described in [Paper Hub for participants](../participant/paper-hub).

:::tip Guided tours
In the Team View, on the page of a paper and on the snippets, **Take the tour** (in the navigation or behind the question mark in the header) starts a tour for reviewers. It differs from the tour participants see when they submit.
:::

## Overview {#overview}

You open the Paper Hub in the team area through **Paper Hub** in the navigation. If you also take part in the conference yourself, choose the **Team View** at the top.

A paper goes through these steps:

1. The team opens submission (see [Opening submission](#opening-submission)).
2. A delegation submits a paper. It is **Submitted** and appears in your lists.
3. You review it and give **Revisions requested** or **Accepted** (see [Reviewing a paper](#reviewing)).
4. The person who wrote it sees your feedback in the Paper Hub right away. The email about it becomes due (see [What the authors learn](#author-notification)).
5. If they resubmit, the paper is **Revised** and waits for the team again. This repeats until it is accepted.

Drafts do not show up in the lists and cannot be reviewed.

:::note Link with CHASE
If DELEGATOR is linked to a CHASE instance, accepted working papers appear there as drafts.
:::

## Who reviews {#who-reviews}

Every team role except **Member** reads and reviews papers: **Reviewer**, **Project Management**, **Participant Care**, **Team Coordinator** and **Content Lead**. System administrators may as well. Who holds which role is described in [Who may do what](./overview#team-roles).

With these roles you read every paper of the conference with every version and all feedback. Only project management may delete (see [Editing and deleting papers](#editing-and-deleting)).

## Who hears of new papers {#committee-notification}

When a delegation submits a paper on an agenda item, or submits a revised version again, the committee's chairs and consultants hear of it right away by email and on Slack. Slack messages only come when the conference has a Slack workspace (see [Setting up Slack](./communication#notifications)). That is everybody who holds the chair or consultant function in the committee and whose team role may read papers. With the role **Member** you get no notification. Introduction papers without an agenda item tell nobody.

The notification names the committee, the agenda item, the type of paper, the version, its status and the delegation's role. The status is **Submitted** as long as the paper has had no feedback, **Revised** after that. A link leads to the paper. Who wrote it and its text are never in it. Every submitted version tells again, a draft does not.

Whether you get it by email, on Slack or not at all you set under **Notifications** in your menu, per committee and function (see [Notifications](./communication#notifications)). Participant care adapts the text of the email **Paper submitted in a committee** on the [Emails](./communication#emails) page.

## Opening submission {#opening-submission}

Whether delegations may write papers is decided by the **Paper submission** switch in the [settings](./configuration#stages). Project management, participant care and the content lead set it.

- **Open:** delegates see the **Paper Hub** card on their dashboard and can write as soon as their delegation's role has been released.
- **Closed:** the card disappears. Every save of a paper is refused, drafts and the team's changes to the text included. You can still review.

DELEGATOR knows no deadline for papers. Tell participants yourself and close submission once it has passed.

## The team view {#team-view}

At the top is the **Paper Status Overview**: how many papers are submitted, revised, sent back for revisions and accepted, and under **Your Review Stats** your own **First Reviews** and **Follow-up Reviews**. Next to it are **Focus Mode** and **Manage Snippets**.

Below, you choose between **Papers**, **Flag Collection**, **Reviewer Leaderboard** and **Detailed Paper Statistics**.

### The paper lists {#paper-lists}

Under **Papers** every committee is a row you can expand, with the non-state actors' introduction papers in a row of their own. Each row shows how many papers have which status and, as a percentage, how many already have at least one review. Expanding a committee shows its agenda items. An agenda item opens the table of its papers with **Country**, **Type**, **Status**, **Submitted** and **Last updated on**.

- Clicking a column header sorts by it. Without a sort, the paper that has gone unchanged the longest is on top.
- Clicking a row opens the paper.
- Which committee and agenda item are open is kept in the address. A shared link opens the same place.

The lists are loaded when the page opens. To see newly submitted papers, reload the page.

### Focus Mode {#focus-mode}

**Focus Mode** shows only five papers per agenda item: first those without any review, each group with the earliest submitted on top. The status figures are blurred meanwhile. Your browser remembers whether the mode is on.

### Who needs help {#help-status}

In front of every agenda item is a button the team uses to agree where reviewers are still missing. Each click moves it on: **Help Needed**, then **Covered**, then back to unset. Everyone who reviews papers sees it. The committee shows how many of its topics need help (**2 need help**).

## Reviewing a paper {#reviewing}

1. Open the paper from the list. At the top are the delegation, status, type, version and the dates it was created and submitted.
2. Read the text. If the topic has **points for discussion**, they stand above the paper: what papers on this topic should answer; the delegation sees the same points. When you select a passage, **Quote** inserts it into your review as a quote. Next to every quote, **Find in paper** jumps back to the passage in the paper.
3. Write your comments under **Add Review**. Nothing can be submitted without comments (**Review comments are required**). Insert [snippets](#snippets) through the bookmark in the toolbar or by typing `/` and the name.
4. Under **New Status**, choose either **Revisions requested** or **Accepted**.
5. If your name should not appear on the review, switch on **Publish anonymously** and pick **Secretariat**, **Research Service** or **Custom name**. With **Custom name** you enter the name the review appears under. Your browser remembers the choice.
6. Click **Submit Review** and confirm in the **Confirm Review Submission** window.

The page then says **Your review was saved successfully**. If another paper of the same agenda item is waiting for a review, **Continue reviewing and jump to next paper** takes you there. Papers without any review come before revised ones, and among them the one left untouched the longest. Otherwise it says **You have reviewed all open papers in this topic.**

Below the form is the paper's **History** with every version and all earlier feedback. Click **Compare with another version** on two versions to see what changed between them.

:::warning Reviews are final
You can neither edit nor delete a submitted review. The new status applies at once, and the person who wrote the paper sees the review with your name, or with the chosen name for an anonymous one. The team always sees who wrote it.
:::

You can review any submitted paper, an accepted one again too. DELEGATOR refuses to review a draft.

:::tip Your review is kept
While you write, DELEGATOR saves your review of this paper as your draft whenever you pause. Below the form it then says **Draft saved**. When you come back, on another device too, your draft is back in the editor with the status you chose. A review your browser still kept the old way becomes your draft the first time you open the paper, unless it already has one.
:::

### Review drafts {#review-drafts}

You have at most one draft per paper. Only you see it. Neither the delegation nor anyone else on the team, project management included, reads it. A draft sends no email, changes no status and counts nowhere as a review.

An [AI assistant](./ai-access#review-drafts) can write a draft for you too. The editor then says **Draft (created by the AI assistant, …)** with the time. Read it, change it like your own review and send it with **Submit Review**. Only then do the authors learn of it. The submitted review looks like any other.

- **Find in paper** shows whether a quote stands word for word in the paper. It searches each paragraph, heading and list item on its own. A quote spanning two paragraphs is therefore not found, even when every word matches.
- If a new version was submitted after the draft, DELEGATOR warns: **This draft refers to version 1, the current one is version 2.** Check whether your review still fits. You can submit it all the same.
- If your draft changes elsewhere while you have the paper open, in another tab or by the assistant, DELEGATOR saves your changes again only once you chose. **Load the new draft** takes the stored version, **Keep my version** replaces it with yours. So no tab silently overwrites what another one saved.
- Once you edited a draft in DELEGATOR, the assistant does not replace it without your consent.
- **Discard draft** deletes the draft and empties the editor.

In the paper lists, a pencil marks the papers you have a draft ready for.

## What the authors learn {#author-notification}

In the Paper Hub, the person who wrote the paper sees the new status right away and your review under **History**. Apart from the team, only they see the review itself. Their supervisors see the status.

Every review makes the email **Feedback on a paper** due to the person who wrote the paper, once per review. It names the paper, who gave the feedback (the chosen name for an anonymous one) and the new status, and links to the paper. If this kind is switched to automatic on the [Emails](./communication#emails) page, it goes out with the next run on its own. Otherwise it waits there until someone sends it.

:::warning Replies go to you
If someone replies to this email, the reply goes to the address of the person who wrote the review. They then also see your email address. An anonymous review's email has no reply address.
:::

With the **Write to delegate** button you write to the person directly, from the list or from the paper. The button is there when the conference's messages are switched on and you look after a matching inbox. More in [Communication](./communication).

## Editing and deleting papers {#editing-and-deleting}

With **Edit** you switch a paper into edit mode and correct the text yourself. **Resubmit Paper** saves your version as a new version. The status stays as it is, and no email becomes due. The person who wrote the paper sees the new version in the history. **Viewer** switches back. Quoting only works outside edit mode.

Project management can delete any paper, submitted ones too:

1. At the bottom of the paper's page, expand the **Danger Zone**.
2. Type the title shown.
3. Click **Delete Paper Permanently**.

:::danger Permanent
The paper disappears with all its versions and all feedback. This cannot be undone. Deleting an agenda item loses its papers the same way (see [Committees and seats](./configuration#committees-and-seats)).
:::

If a working paper shows **Invalid Paper Format**, its content cannot be read as a resolution. Download it with **Download raw data**, contact the administrators and do not delete the paper.

## Snippets {#snippets}

Snippets are passages you need in reviews again and again. They are yours alone and work in every conference where you review papers.

1. In the team view, open **Manage Snippets**.
2. Click **Create Snippet**.
3. Enter a **Snippet Name** and the **Snippet Content** and save. Each of your snippets needs a name of its own.

Write parts you fill in differently each time in double curly braces, such as `{{section}}`. When you insert the snippet, DELEGATOR asks for the values under **Fill Placeholders** and inserts them with **Insert Snippet**.

In the list you edit or delete a snippet with the buttons in its row.

## Progress and statistics {#progress}

- **Flag Collection:** every nation and every non-state actor is a flag made of puzzle pieces. A nation has one piece per agenda item of its committees, a non-state actor three. A piece is unlocked when its paper is submitted and found once it has a review. If your review is the first for a piece, DELEGATOR shows you the piece found. You can filter by **All**, **Incomplete**, **Unlocked** and **Complete**.
- **Reviewer Leaderboard:** the ten people who most often reviewed a paper first, under made-up names. Your own row is marked **You**.
- **Detailed Paper Statistics:** the papers by status, type and committee, the review progress and the acceptance rate.

## Exporting {#export}

On a paper's page, **Export PDF** or **Export Typst** downloads it. A working paper is set as a resolution with its header, every other paper as a text document in the conference's design (logo, accent colour of the conference series). The export takes the text currently in the editor, including unsaved changes in edit mode.
