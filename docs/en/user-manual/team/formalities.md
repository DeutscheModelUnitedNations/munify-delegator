---
title: Formalities and the conference on site
description: Ticking off payments and postal registration, preparing the check-in, working with the scanner and issuing certificates
---

# Formalities and the conference on site

Before anyone takes part in the conference, their fee has to be paid and their documents have to arrive by post. On site, participants collect their nametags, the team scans them at check-ins, and after the conference there are certificates. The team area has four pages for this under **Workflows**:

| Page                      | What for                                         | Who may open it                              |
| ------------------------- | ------------------------------------------------ | -------------------------------------------- |
| **Fee Payment**           | matching and confirming transfers                | **Project Management**, **Participant Care** |
| **Postal Registration**   | ticking off incoming letters                     | **Project Management**, **Participant Care** |
| **On-site check-in**      | nametag tables and the QR code for the entrance  | **Project Management**, **Participant Care** |
| **Entrance & Attendance** | scanner: checking people and recording check-ins | the whole team                               |

Whatever these pages leave to **Participant Care**, **Project Management** may do as well. You also find all of a person's statuses on their [user card](./participants#user-card): payment and documents in the **Formalities** tab, access card and attendance in the **Access & Attendance** tab.

## Payments {#payments}

### How participants pay

Once **Allow Payments** is on (see [Status and stages](./configuration#stages)), participants create a transfer reference on their dashboard and transfer the fee with it as the payment reference. What that looks like for them is described under [Payment](../participant/dashboard#payment).

- One reference can cover several people. The amount is then the **Fee** times the number of people.
- People can pay for themselves, their own delegation, the participants they supervise and supervisors they share a supervised person with. DELEGATOR refuses anything else.
- Someone who has paid makes no new reference and cannot be included in a new one.
- While no fee is set in the [Banking Information](./configuration#payment-details), no reference can be created.

A reference has 16 characters in groups of four with hyphens, such as `ACDE-FH34-…`. It contains no characters that are easy to mix up.

### Confirming a payment {#confirming-a-payment}

The **Fee Payment** page is made for working through a bank statement line by line:

1. At the top it shows the last confirmed transaction with its date. That way you see where you or someone else stopped.
2. Enter the reference from the payment reference line into **Reference Search**, exactly as it appears there. The command palette (Ctrl+K) also finds references and opens them on this page.
3. The page shows the reference, when it was created, the amount due for it and, under **Referenced Users**, everybody it covers. The icon in front of each name shows their payment status, the button behind it opens their user card.
4. Compare the amount with what arrived. If everything fits, click **Mark as Received** (Alt+A). The search field empties and is ready for the next reference.
5. If something does not fit, click **Mark as Problem**.

If the page finds nothing, it says **No transaction with this reference found**. The references opened last are listed next to the result, so you can jump back to one quickly.

### What the buttons do

**Mark as Received** stores today as the date of receipt and sets the payment status of **everybody** the reference covers to **Done**. The payer only counts if they are covered as well. **Mark as Problem** sets everybody covered to **Problem**.

| Status      | What follows                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pending** | The initial state. At the entrance, **Payment is still open** shows.                                                                                                                        |
| **Problem** | The email **Problem with documents or payment** becomes due. It names the payment and asks the person to contact participant care, without details. At the entrance the payment stays open. |
| **Done**    | The email **Payment received** becomes due. The person makes no new references and cannot be included in a new one. At the entrance the payment is no longer an open point.                 |

Both emails only become due for people with a seat once the assignment is released, and for supervisors who attend themselves and supervise someone with a seat. Whether they go out right away or wait on the [Emails](./communication#emails) page depends on whether the kind is set to automatic. Each of these emails reaches each person at most once.

### Undoing

The **Fee Payment** page cannot reset a confirmed reference: it then shows **The payment was already marked as received with transaction on …!** and only **Close**. You change a person's status on their user card in the **Formalities** tab under **Fee Payment**. Below it are their **Payment References**, whom they are shared with and whether they arrived.

:::warning What cannot be taken back
The status on the user card applies to this one person only, the reference stays marked as received. Resetting does not take back an email that was already sent. Once the person is back on **Pending**, they can create a new reference.
:::

## Postal registration {#postal-registration}

### What participants send

Once **Allow Postal Registration** is on, participants download their documents as a PDF, sign them and post the originals to the postal address from [Documents and templates](./configuration#documents). What that looks like for them is described under [Postal registration](../participant/dashboard#postal-registration). The PDF contains:

- the **Binding Registration**,
- the **Parental Agreement**, if the person is not yet 18 when the conference starts,
- the **Media Usage Agreement**,
- the terms and conditions, which are only appended and have no status of their own.

In the bottom right corner of every page is a QR code that names the person and the conference and is signed by DELEGATOR. If someone lacks their documents, participant care downloads them on the user card in the **Formalities** tab with **Download documents for postal registration**.

### The statuses per document

| Field                     | Values                                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Binding Registration**  | **Pending**, **Problem**, **Done**                                                                                                         |
| **Parental Agreement**    | as above, for minors only. For adults it says **No parental consent required**.                                                            |
| **Media Usage Agreement** | **Pending**, **Problem**, **Done**                                                                                                         |
| **Media Status**          | **Not set yet**, **No photos allowed**, **Partially allowed – check the consent form for details**, **Photos allowed without restriction** |
| **Document number**       | a number per person                                                                                                                        |

The **Media Status** says what the person ticked on the media usage agreement. It is part of the data for the printed nametags on the [Downloads](./maintenance#downloads) page.

### Working through a pile of letters {#processing-letters}

1. Open **Postal Registration**. You can scan with the camera, with a hand scanner that types into the search field, or search by name, email or ID.
2. Scan the QR code on one page of the letter. Next to the scanner, the person opens with their name, birthday and all statuses. Compare them with the letter.
3. If all required documents are there and signed and the person allows photos without restriction, click **Confirm all** (Alt+A). This sets **Binding Registration** and **Media Usage Agreement** to **Done**, for minors the **Parental Agreement** too, and the **Media Status** to **Photos allowed without restriction**.
4. If the person restricted photos, set the documents to **Done** one by one and then the **Media Status**: Alt+1 for no photos, Alt+2 for partially, Alt+3 for without restriction.
5. If the person has no **Document number** yet, the field is already open. **Save next number** (Alt+N) gives the number after the highest one in the conference. You can also enter one yourself and save it.
6. If a document is missing or faulty, set only that one to **Problem** and the others to **Done** one by one.
7. Esc closes the person, and the scanner is ready for the next letter.

:::tip Write the document number on the letter
Write the **Document number** you assigned on the sheets and file them in the order they arrived. That way you need not sort the letters by name: if you need an original later, its number is in the person's user card and you find it in the folder at once.
:::

Every change saves at once, without asking. To correct a wrong click, choose the right status, here or on the user card.

If participant care opens the QR code with a phone's camera app, it lands on this page with the person open. This page does not take the code of a digital nametag (**This code is not meant for this scanner.**), nor QR codes not signed by DELEGATOR, nor codes of another conference.

### What the statuses do

- Once **Binding Registration**, **Media Usage Agreement** and, for minors, the **Parental Agreement** are **Done**, the email **Documents received** becomes due.
- If one of these documents is set to **Problem**, **Problem with documents or payment** becomes due, at most once per document. It names the document, not the problem. You sort that out in person.
- At the entrance only the **Binding Registration** and, for minors, the **Parental Agreement** count. The media usage agreement holds nobody up there.

These emails, too, only become due for people with a seat after the release. 14 days before the conference starts, the email **Reminder of open documents and payment** reminds everybody whose unlocked documents or payment are still open.

## On-site check-in {#check-in}

Participants collect their nametags at the entrance. So that the queue spreads out, DELEGATOR splits them into tables by the first letter of their nation. Press, individual roles, non-state actors and supervisors always get one more table of their own. Everyone with open points is sent to participant care instead.

### Setting up the tables

On the **On-site check-in** page, **Number of nametag bins** sets how many tables there are for the nations (1 to 20). The **Split of the nametag tables** below follows the input at once: each table shows its letters, how many people it serves, and below that the nations and roles with their numbers. Only **Save** keeps the number. Only **Project Management** may save it.

- **Download QR code (PDF)** makes a sheet for the entrance saying “Please scan and have ready!”. The QR code leads to the participants' check-in page.
- **Preview page** shows that page as it looks on a phone.
- **Download table signs (PDF)** makes one sign per table, with the letters large and the nations and roles below.

:::warning Save first, then print
The participants' check-in page splits by the **saved** number, the downloads by the number in the field. So save before you print the table signs. The split also follows the assignment: when the assignment changes, nations can move to another table. Print the signs only once the assignment is settled.
:::

The nametags themselves and the NSA cards come from the [Downloads](./maintenance#downloads) page.

### The participants' check-in page

Participants scan the QR code at the entrance with their own phone. Their page shows their name, role, committee and the code of their digital nametag, and at the top where to go:

- the **Table** with its letters, when nothing is open,
- **Please go to participant care** with the open points,
- **Please go to participant care** and **You have no seat assigned yet.**, while the person has no seat or the assignment is not released.

When someone on the team changes a status, the page changes along at once. After a scan in any session, it shows **Already checked in** with the time for one hour.

### The entrance check {#entrance-check}

The server makes the check, whether at the scanner or on the check-in page. Open points are, in this order:

| Open point                                                                                                                          | When                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Team member: shown only, not scanned in.**                                                                                        | The person is on the team and does not take part.                                                                      |
| **This person is not part of the conference currently shown. The data displayed belongs to their account, not to this conference.** | The person takes part in this conference in no role and is not on its waiting list.                                    |
| **Payment is still open**                                                                                                           | The payment is not **Done**, so also while it is **Problem**.                                                          |
| **Binding registration is still open**                                                                                              | The binding registration is not **Done**.                                                                              |
| **Under 18, the guardian's consent is missing**                                                                                     | The person is under 18 on the day of the scan and the consent is not **Done**. Without a birthday they count as adult. |
| **Has not chosen …**                                                                                                                | Only in a session that [expects a survey choice](#sessions).                                                           |
| **This participant was already scanned in this session**                                                                            | Only when scanning in a session.                                                                                       |

With open points, the team can still record a person with **Record anyway**. That is not possible for team members, for people who do not take part, or for a second scan in the same session.

### The morning of the first conference day {#first-morning}

Beforehand:

1. **Project Management** saves the number of tables once the assignment is settled.
2. Download the table signs and the QR code and print them. Sort the printed nametags by the list per table.
3. Participant care starts a session of the type **Check** on **Entrance & Attendance**, such as “Check-in day 1”.
4. Everybody who scans opens the same page on their phone and clicks **Join** on that session.

At the entrance:

5. Participants scan the QR code at the entrance and go to their table or to participant care.
6. At the entrance check, apart from the tables, the team scans the code on their check-in page. If everything is in order, the check-in is recorded and the scanner is ready for the next person right away. The person's page now shows **Already checked in**.
7. With open points, you send the person to participant care and click **Dismiss** (Esc). Nothing is recorded then.

### Someone arrives without having paid {#unpaid-on-site}

1. The scan shows **Payment is still open**. Click **Dismiss** and send the person to participant care. Their check-in page tells them the same.
2. Participant care opens the person, for example with **Details** in the scan result, and sees under **Payment References** in the **Formalities** tab whether the person created a reference and whether it arrived.
3. If the money is there and only not confirmed, they confirm the reference on [Fee Payment](#confirming-a-payment). The person's check-in page then shows their table at once.
4. A new scan passes the check and is recorded. If the team decides to let the person in anyway, **Record anyway** records them. The scan is then marked as recorded with open points.

## The scanner {#scanner}

The **Entrance & Attendance** page scans participants at every occasion where the team wants to know who was there: at the entrance, at a ceremony, on an excursion. Every scan belongs to a session.

### Sessions {#sessions}

There are three ways to scan:

| Type       | What a scan does                                                                                                                                |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Check**  | Shows the person and open points. Without any, the scan is recorded and the next one continues right away, with open points only when asked to. |
| **Record** | Only records that the person was scanned, without stopping and without checking.                                                                |
| **Info**   | Shows the person and open points like the check, but stores nothing. For contact persons helping confused participants. Needs no session.       |

Only **Participant Care** and **Project Management** may **start a session**:

1. Under **Sessions**, click **New session**.
2. Choose the **Type of session**.
3. For a check, you can tick options of a survey under **Expected survey choice**. Whoever picked none of them gets **Has not chosen …** as an open point when scanned. This way you check, for example when boarding a bus, who signed up for this excursion.
4. Enter the **Session Name** and click **Start Session**.

Type and expected survey choice are fixed from the start. A session name exists only once per conference, regardless of upper and lower case. If it is taken, DELEGATOR answers **There is already a session with this name. Join it or choose another name.**

Anyone on the team can **Join**: running sessions are at the top of the list, with their type and since when they run. Several devices work in one session this way. The session itself knows who was scanned, so a person counts once, whatever the device. **Start info** is open to everybody at any time.

- **Switch session** (the arrow on the left) leaves the session on this device only. It keeps running for everybody else.
- **End Session** ends it for every device. Only participant care may do that.
- Participant care renames a session by clicking its name, in the bar at the top or in the list.
- Only participant care sees ended sessions. **Reopen** continues one, and its earlier scans stay. Do not start a new session for the same occasion, reopen the old one instead.

### What can be scanned

- the QR code of the **digital nametag** from a person's dashboard or check-in page. It is valid for ten minutes and renews itself while it is shown. An expired code answers **This code has expired. Ask the person to reopen the page and show it again.**
- the barcode of a **printed nametag**
- a person you find by name or email through the search field, or their ID. A hand scanner types into this field too.

Not accepted are the QR code of the application documents and NSA cards (**This code is not meant for this scanner.**), QR codes without a signature and codes of another conference. NSA cards are checked by MUNify CHASE.

If someone on the team opens a nametag's code with a phone's camera app, participant care lands on the user card, everybody else on this page. If a session is running there, it counts as a scan in it, otherwise the person is shown in **Info** mode.

### What a scan shows and does

With **Check** and **Info**, the person appears next to the camera: name, birthday, role and committee, the statuses **Fee Payment**, **Binding Registration** and **Attendance**, then **Everything is in order** or **Open points** with the list.

- **Everything is in order** in a **Check** session: the scan is recorded, and the scanner is ready right away. In **Info** mode nothing is recorded then either.
- **Open points** during a check: **Dismiss** (Esc) records nothing, **Record anyway** (Alt+A) records the person with the note that there were open points.
- For a team member, and for open points in **Info** mode, **Understood, continue** (Alt+A) moves on. Nothing is recorded.

Participant care can correct the given name, family name and birthday right there by clicking them. **Details** opens the user card.

With **Record**, the scanner shows nobody, every scan goes straight into the **Last scans** list. It shows the last five scans of this device with where they stand. Clicking a name shows the person again, with **Record** on their user card, and records no new scan.

What the scanner can report:

| Message                                                                     | Meaning                                                                        |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Attendance recorded**                                                     | The scan is stored.                                                            |
| **This participant was already scanned in this session**                    | They were recorded already, on this or another device. It stays one scan.      |
| **No participant found with this ID.**                                      | With **Check** and **Info**: the code belongs to nobody in this conference.    |
| **This user does not take part in the conference.**                         | With **Record**: the code belongs to nobody who takes part in this conference. |
| **Team members are not scanned in; the scanner records participants only.** | A team member was scanned with **Record**.                                     |
| **Network error — retrying automatically**                                  | The scan waits on the device and is sent again.                                |

The bar at the top counts this device's scans, how many are **synced**, **pending** and failed.

:::note Recording is not attendance
A scan does not set a person's **Attendance** to **Present**. Attendance decides about the certificate and is set separately, see [Certificates](#certificates).
:::

### Without a connection

The device checks the codes itself, so the scanner detects false codes offline too. For that, the page must have been online once, otherwise it says **The check for codes is not available yet (no connection so far). Try again in a moment.**

- **Record** works offline. The scans wait in the device's browser and go out once it is connected again, also after reloading the page. A session started offline comes into being with the first scan sent.
- **Check** and **Info** need a connection: **Checking needs a connection. Record mode also works offline.**
- If the name of a session started offline was taken in the meantime, its scans wait until you rename it.
- **Download Backup** saves this device's scans in the session as a file.

If you leave a session with scans not sent yet, DELEGATOR asks **Some scans have not been sent yet. End the session anyway?** Confirming loses these scans on the device.

### Scanned people and the export

For participant care, the **Scanned people** list of the running session is below the scanner, with the scans of all devices. In the **Sessions** list, **Show people** opens the same list for every session, ended ones included. Each session there also shows how many scans it has.

- The search finds by name, email or access card number.
- Each line shows the time, **scanned by** and the access card ID. A warning icon marks scans recorded with open points.
- The bin removes a scan after asking **Remove the scan of … from this session? They can be scanned again afterwards.**
- **Export CSV** downloads every scan of the session, whatever the search, with **Time Stamp**, **Given Name**, **Family Name**, **E-mail**, **Access Card ID**, **Check passed**, **Scanned by** and **User ID**. For sessions of the type **Record**, **Check passed** stays empty.

All scans of a person across all sessions are in the **Attendance Log** in the **Access & Attendance** tab of their user card.

### Access cards and a lost card {#access-cards}

In the **Access & Attendance** tab of the user card, participant care enters the **Access Card ID**. A number belongs to one person per conference: **This access card belongs to somebody else already.** The command palette (Ctrl+K) also finds people by their card number.

When someone hands in a found card:

1. Type or scan the number into the command palette and open the person.
2. In the **Access & Attendance** tab, click **Badge found** next to the number and confirm **Send notification?**.
3. The email **Badge found** goes out at once, even if nothing else is sent automatically. It asks the person to collect the card from participant care.

Every confirmation sends the email again. You change its text on the [Emails](./communication#emails) page.

## Certificates {#certificates}

Once the conference is **After the conference**, participants download their certificate of participation on the dashboard, see [After the conference](../participant/dashboard#certificate). It is printed on the template from [Documents and templates](./configuration#documents), laid out as set under [Placing the fields on a template](./configuration#document-layouts).

### Who gets a certificate

Only people whose **Attendance** is **Present** get a certificate. Everybody else gets none, and the dashboard tells them it is not available yet. No scan sets attendance. These do:

- the user card in the **Access & Attendance** tab, with **Present** or **Absent**,
- the [Import](./maintenance#import) of attendance data,
- the [Helper](./maintenance#helper), which sets all participants to **Present** or **Absent** at once.

Participant care downloads a person's certificate on their user card in the **Formalities** tab with **Download certificate**.

### Which sessions it lists

The certificate lists the scanner sessions the person was scanned in, in the order they started. It never mentions sessions they missed, not even in the signed data.

In the **Sessions** list on **Entrance & Attendance**, every session has the **On certificate** switch. Every session people were scanned in is on it at first. Take off sessions that do not belong there, such as test runs. Participant care may do that.

:::warning Decide before the downloads
The list is written into the certificate and signed when it is downloaded. Whoever has their certificate already keeps the list from back then. So decide which sessions belong on the certificate before the conference is set to **After the conference**.
:::

### Checking a certificate

The QR code on the certificate leads to a public page that anyone can open without signing in. It shows **The certificate is valid.** with the name, conference, dates and, under **Took part in**, the sessions, or **The certificate is invalid.** It still checks certificates that DELEGATOR issued in an older format.

### The email

The email **Certificate available** becomes due for everybody marked **Present** once the conference is **After the conference** and a certificate template is uploaded. Whoever is set to **Present** only later gets it then. When you save the status or a new template in the settings, the page offers to send the emails right away. Otherwise they wait on the [Emails](./communication#emails) page.
