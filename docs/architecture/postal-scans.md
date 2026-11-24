# Postal scans

The signed application documents of the postal registration: reading them, keeping the scans, the
details of what a person agreed to, and scanners delivering by themselves.

## Reading (`src/lib/paperScan/`)

Every main page carries four ArUco marks and a signed QR code that says whose page it is, where the
marks are and where the fields are (`areas`). Nothing else is drawn; the fields sit on the template's
own boxes and lines (placed in the layout editor).

- `picture.ts`: variants of a picture that are easier to read (light evened out, less noise, sharper).
  `brightnessAt` takes the darker of red and green: any pen is dark in one of them, and the yellow
  highlight of DMUN's templates is as bright in both as paper. Never bring blue in.
- `markers.ts`: marks are collected over the variants, their corners refined to a fraction of a pixel.
  At most 5 of 36 bits may be wrong, the dictionary's unique decoding radius.
- `readPaper.ts`: three of the four marks are enough (least squares over all corners found); boxes
  outside the triangle they span are left unclear, since the perspective drifts there. A picture
  too small, noisy or blurred never says a field is _empty_, only "unclear". A box counts as ticked
  only with ink in its middle, so the frame of a page aligned a little off is no consent.
- `frames.ts`: the camera wants two pictures that agree.
- `pipeline.test.ts` + `scanSimulation.ts` read DMUN's templates back through simulated scans and
  photos (shadow, blur, noise, covered corner). **A wrong answer is worse than "unclear"**: add a case
  there for every misreading found.

A scan is never compared with the blank form: the template may have changed since the page was printed,
and print comes back from a scan thicker, thinner and a little off, by more than a signature adds (5 % of a
field came back as 2 to 7 %), so ink is not subtracted either. The browser that generates the PDF measures
each field's print (`printedInkOf`, on the page before codes and marks) and the code carries it:

- **Lines**: the field is cut to the highest part without a line of the template (`clear`), so a template's
  line may lie inside it.
- **Boxes**: told by their middle. A frame inside the box is fine as long as the middle stays clear of it in
  a scan aligned 0.3 mm off; that takes a placement up to about 0.3 mm off.
- **Other print** raises what counts as a mark; less is "unclear". No mark is ever made of it.
- **Not measured** (the browser could not render): every field of the page is left to a person
  (`UNKNOWN_PRINT`). `issueDocumentCodes` takes `printedInk: []` for a page without any.

The layout editor checks with the same functions. Print is an extra record per field, which older versions
skip; clean fields (all of DMUN's 2026 forms) take no room in the code.

Fields not placed for the conference's template are read where they are not: an empty form can then
read as signed. The layout editor checks that (`layoutCheck.ts`).

## Taking a file in (`src/lib/paperScan/intake/`)

A file may be gigabytes and mix people and conferences, so **the page is the unit**, and no more than one is
in memory. `scanPages` cuts a file into pages, each a file of its own; `takePage` takes one in: read it, tell
whose it is (`people.ts`, only signatures checked), keep it, name what came to nothing (`ScanProblem`).
`takeScan` does so for a whole file in the browser. The callers bring ports:

|                                    | reads a page                                  | keeps                         |
| ---------------------------------- | --------------------------------------------- | ----------------------------- |
| `PaperBatch`                       | `readScanPage` with `browserPlatform`         | upload, `importPostalScan`    |
| `scanQueue` (`pageTask`)           | a process of its own (`scanReader.worker.ts`) | `takeInPage`, the page's file |
| `uploadScanFor` (participant card) | as `PaperBatch`, with an `owner`              | as `PaperBatch`               |

- **Splitting** (`pdf/`): a PDF is read by its table, object by object, from a `ScanSource` (ranges of a bucket
  object, a `Blob`): 2.7 GB with 3,000 pages take 5 s and 110 MB. Only a file with a broken table is read as a
  whole, up to 100 MB. A page comes out the same bytes each time, with nothing of another: only the pictures it
  draws (scanners list those of every page on each), and nothing that leads to other pages. Encrypted files are
  not opened.
- **Delivered scans are split and read in processes of their own** (`scanProcess.ts`): drawing a page with
  pdf.js on `@napi-rs/canvas` leaks native memory (80 MB at 300 dpi) that no garbage collection frees, and
  whoever made a PDF decides what opening it takes. A process ends once it takes 600 MB (`tookTooMuch`), and
  the next goes on. They get none of the app's environment; the splitter asks the app for the parts of the file
  it needs, and cuts the next page once one is stored. **Measure memory under a cap**
  (`systemd-run --user --scope -p MemoryMax=2G …`).
- They are built by `build:compute`, with pdf.js and the code reader bundled in and what they load (wasm,
  fonts) copied to `build/compute/scanReaderFiles`. Only `@napi-rs/canvas` (native code) is a runtime
  dependency. pdf.js decodes JBIG2 and JPEG 2000, which office scanners write, with wasm files: without
  `wasmUrl` / `BinaryDataFactory` those pages come out blank.
- **A page is stored once.** Every printed page has a code of its own (person, print, the fields on it),
  so `pageKey` is the hash of the code, unique per person, whatever file, stack, device or way in the
  page comes by. A page scanned again is judged by what it says (`judgeRescan`): nothing new is dropped
  (`known`), signed since or read better takes the old scan's place (`replaced`), something missing that
  was there leaves the old one and tells (`differs`). The server decides, under a lock on the participant
  row, and checks the code itself; the browser asks before it uploads (`importPostalScan` without
  `fileId`). A new print has new codes: another document. Pages without a code, or
  without fields (their code is that of the print's other such pages), go by file and page number.
- With an `owner` (upload on the participant card) a page without a code is theirs, one of somebody else
  is refused.
- **Each page stands by itself.** A page is told by its own code, whatever is around it, and one that cannot be
  cut, read or stored keeps no other from it (`PageError`, `ReadPage.error`).
- **Pages without a code are ignored**, as no documents, except where a person said whose the file is. Only a
  file without any is told of (`noCode`). So a page whose code cannot be read in a stack goes unnoticed.
- **Pages that are nobody's are not stored**: of another conference, not registered, not readable. In the
  browser they are listed and toasted; of a scanner's delivery its owner is notified (`SCAN_PROBLEM`, mail
  and Slack).

## Data

- `postalScan`, one page → `conferenceParticipant` (cascade) and `storedFile`. The scan goes with the person's
  part in the conference; `file-cleanup` then removes the bytes. Keeping one clears the file's
  `uploadedById`, so only participant care reads it, not whoever uploaded it. AI assistants read none
  (`handledScans`).
- `agreementDetail`: one row per field (`AGREEMENT_FIELDS`), `yes`/`no`/`unclear`, `SCAN` or `MANUAL`.
  Scans fill it in (`planDetails`): unattended, nothing clear is taken back and no choice changed, what
  a person set is never touched. The statuses on `conferenceParticipant` stay what the team works
  with; setting a detail changes no status. Details from earlier scans complete a document whose pages
  come one after the other (`proposePaperChange`'s `known`).
- `applyPaperReadings` writes details and statuses together, under a lock on the participant row.

The dev seed (`seed-dev/postalScans.ts`, `scannerAccesses.ts`) has scans and details in every state for the
personas of the conferences with statuses, and scanner logins on profiles; it prints one that works.

## Scanners delivering by themselves

Network scanners send by email, to SMB or FTP folders, or to WebDAV; desktop scanners save to a folder. The
app takes WebDAV, and folders through the browser (an SMB folder is one, once a computer has it as a drive):

- `scannerAccess`: a login per person and device (username, random password, SHA-256 kept), on their profile
  (`/my-account/scanners`). It does what its owner might by hand, and no more: a page is kept where they
  manage the participants (`conferencesToDeliverInto`, `manageParticipants`) of the conference its code names,
  asked when the page is taken in, so one stack may mix conferences. Nobody else sees or changes it (a system
  admin only by impersonating the owner). It expires after 180 days unless renewed, and goes with the account.
  A system admin's role is in their session only, so their scanner delivers where they are on the team.
- `mayDeliver` (some conference, expiry, account) is asked at sign-in, when a delivery's turn comes and once it
  is received, so a slow upload outlives nothing. Whether the account is suspended at Logto is asked over the
  Management API (`isAccountActive`, remembered for 10 minutes; needs the `OIDC_M2M_*` credentials
  impersonation uses, and lets deliver while Logto cannot be asked).
- What comes to nothing is told in the conference it is of; what is of none, along with that or in the first of
  the owner's conferences where they want to hear of it (`tellScanProblems`).
- **WebDAV**: `/api/scans/…` (`webdav.ts`), Basic auth over HTTPS, write-only.
  SvelteKit's CSRF check refuses a file without a content type (403, before any hook runs) and stays on
  for every route, so a device has to send one, or a proxy in front adds it for `/api/scans/`
  (`application/octet-stream`). The check only exists in the built app: test WebDAV against
  `node build/index.js`.
- **Folder**: `FolderWatch.svelte`, Chromium only, polls while the page is open.

A file goes to the bucket as it comes in (`storeStream`, parts of 8 MB), whatever its size, and is queued; then
the scanner is answered: what it was told arrived is never lost, and it waits for no page to be read.
`intakeGate` lets 20 uploads come in at once, four of a person; the others are not read from the socket until
it is their turn, and told to come back (503) after a minute, or at once while 500 files or 100 GB of the person
wait. What is no scan (415) or too large (413: 20 GB, 40 MB for a picture) is refused. **Nothing in front of the
route may clone the request**: what is not read of a clone is kept in memory (Paraglide's handle is left out).

`scanQueue` then works through `scan_task`s (`scanTaskService`): a file's `SPLIT` makes a `PAGE` of each page as it
goes, and a `FINISH` once it is through. Each app process does one `SPLIT` and one `PAGE` or `FINISH` at a time,
woken by a delivery and once a minute; people take turns (`deliveryTurns`), a split after 200 pages. A split goes
on after the last page it made, and deletes the file once it is through: only its pages are kept. `FINISH` waits for
the pages, tells the owner once of all that came to nothing, and removes the delivery.

A process holds its task (`FOR UPDATE SKIP LOCKED`, then `held_by` and `due_at`, 5 minutes, renewed each minute), so
replicas share the queue and another takes over from one that died; whoever lost the hold changes nothing more. On
SIGTERM it lets go at once, and that attempt does not count. What fails (bucket, database, a process that ended) is
tried again after 2, 4, 8 and 16 minutes, then given up: a page is told of as failed, a split leaves its pages.
Taking a page in twice changes nothing. A revoked or expired login delivers nothing more, but what is queued is
taken in, as far as its owner's roles reach then. `scanTaskService.test.ts` checks the locks with
`TEST_DATABASE_URL`, a migrated database, and is skipped without.

**What waits is stored whole**, pages of nobody included, and nobody reads it. The file itself is no `stored_file`;
`file-cleanup` knows it by its delivery. Its pages are: the one that is kept becomes the scan, the others are
removed by `file-cleanup` once a day old.

### Deployment

`APP_URL` puts the link into the notifications. WebDAV needs no setup, but what is in front of it decides how
large a file may be:

- `BODY_SIZE_LIMIT` (64 MB in the image) is for every route: SvelteKit has no limit for one alone.
- Node gives up a request after 5 minutes (`server.requestTimeout`, no variable), so a file must be through by
  then: some 3.7 GB at 100 Mbit/s. A proxy has limits of its own (Traefik: `readTimeout`, 60 s by default).
- The bucket should drop unfinished multipart uploads (a lifecycle rule): those of a process that died are left.
