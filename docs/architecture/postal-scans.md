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
- `frames.ts`: the camera's photos of a page: one that leaves nothing unclear settles it, photos that
  disagree leave the field unclear, and after three the page goes with what it says.
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
- **A span to write in** below 5 mm (`LEAST_ROOM`), or not inside its field, is refused: the client names it,
  and the code signs it. Such a field is left to a person.
- **Other print** raises what counts as a mark; less is "unclear". No mark is ever made of it.
- **Not measured** (the browser could not render): every field of the page is left to a person
  (`UNKNOWN_PRINT`). `issueDocumentCodes` takes `printedInk: []` for a page without any.

The layout editor checks with the same functions. Print is an extra record per field, which older versions
skip; clean fields (all of DMUN's 2026 forms) take no room in the code.

Fields not placed for the conference's template are read where they are not: an empty form can then
read as signed. The layout editor checks that (`layoutCheck.ts`).

## Camera (`src/lib/paperScan/camera/`, `#lib/components/scanner/pageCamera.svelte.ts`)

The postal registration's "whole page" mode, for whoever has no scanner: the phone is laid over the pages
and becomes one. Pages are slid under it one after the other; each is read, kept and beeped for, and
nobody touches anything unless something went wrong. Nothing of it runs on the page's thread but the
camera: a worker (`pageReader.worker.ts`, ES module, `worker.format` in `vite.config.ts`) does the reading,
so the preview stays smooth.

- **Aiming** (`aim.ts`): about eight times a second a small picture of the preview (`AIM_SIDE`, 1280 px,
  `previewPicture`) is looked at for the corner marks only, with two variants (`aimMarkers`), no code. What
  the marks say is the hint (`trackAim`): no page, too dark, closer, farther (the missing mark would lie
  outside the picture), which corner is covered (three marks), hold still. The marks are drawn over the
  preview, a dashed one where the missing one should be (`missingMark`).
- **One photo** once the page lay still (marks moved less than 1.2 % of the picture) for 350 ms, 1.2 s with one
  mark covered; two missing never. `takePhoto` takes the camera's own still (Image Capture, Chromium: full
  sensor, focused, without the flash), else a frame of the video, which is then streamed at 4K
  (`openScannerCamera`). The worker reads it as a scan is read (`readPicture`, at most 3600 px) and gives it
  back as the JPEG it read, turned upright.
- **Settling** (`frames.ts`): more photos only while fields stay unclear, three at most; three without a code
  give the page up.
- **The next page**: once a page is taken, the camera waits for one that left the picture or whose marks
  moved more than 5 % (`MOVED`, the marks both pictures show): a page slid away, or the next slid over it.
  A photo that shows the page taken last again is nothing new and says nothing.
- **Taking in** (`cameraIntake.ts` beside the route): each page by itself, as it comes, in the order read:
  its photo is kept as the person's scan (`keepScan`, source `CAMERA`, through `importPostalScan`, so
  unattended as a batch: what is clear is entered, nothing set back), also unreadable (`readings: null`), as
  the evidence. Nobody confirms anything. The page's line goes into the list under the scanner
  (`CameraLog`), those that went wrong first; a line opens the person.
- **Telling**: a page read clearly beeps (`scanSounds.ts`, Web Audio, woken by the person's first gesture)
  and flashes green; then it may go. Unclear fields, no readable code, a refused code, a page not kept
  (`differs`, not registered, offline) sound a low double tone, and the picture turns red with what is
  wrong (`ScanAlert`): the camera reads nothing more until **Weiter** is pressed, so the page is taken out of
  the stack first. The screen stays on while it reads (`wakeLock.ts`).
- Measured on a desktop with simulated photos: aiming ~100 ms a picture in the worker, a photo read ~150–250 ms.
  `aim.test.ts` keeps the aiming from growing slow unnoticed.

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
| camera (`pageCamera`)              | `readPicture` in `pageReader.worker.ts`       | `keepScan`, page by page      |

- **Splitting** (`pdf/`): a PDF is read by its table, object by object, from a `ScanSource` (ranges of a bucket
  object, a `Blob`): 2.7 GB with 3,000 pages take 5 s and 110 MB. Only a file with a broken table is read as a
  whole, up to 100 MB. A page comes out the same bytes each time, with nothing of another: only the pictures, fonts,
  patterns, states and colours its content names (scanners list those of every page on each), likewise of the
  forms, patterns and Type3 fonts it draws with, and nothing that leads to other pages. What one such thing
  holds itself comes whole: the letters of a font, the shapes JBIG2 pictures share (`JBIG2Globals`). Encrypted
  files are not opened. The latest objects read are kept (96 MB), so a page's picture is read
  once though it is asked for twice. Nothing unpacks to more than any scan has (64 MB for tables and object
  streams, 16 MB for a page's content, which is then a broken page), and an object said to lie beyond the end
  is not there, rather than a read that fails the whole file.
- **Delivered scans are split and read in processes of their own** (`scanProcess.ts`): drawing a page with
  pdf.js on `@napi-rs/canvas` leaks native memory (80 MB at 300 dpi) that no garbage collection frees, and
  whoever made a PDF decides what opening it takes. A process ends once it takes 600 MB (`tookTooMuch`), and
  the next goes on. They get none of the app's environment; the splitter asks the app for the parts of the file
  it needs, and cuts the next page once one is stored. Exiting by themselves they hang now and then (Node 26),
  so whoever is done with one kills it. **Measure memory under a cap**
  (`systemd-run --user --scope -p MemoryMax=2G …`).
- **They run in a sandbox** (`scanSandbox.ts`): Landlock, set up by `setpriv` before Node starts. They write
  nothing, read only programs, libraries and their own code, and cannot look into the app's process, whose
  environment holds the secrets. The network is not kept from them. It needs util-linux 2.40 and a kernel with
  Landlock (both there in the image under Docker's default seccomp profile). **Without, nothing is opened**:
  an error is logged once, and what was delivered waits as it came, no attempt counted, until the sandbox
  works (tried again with each delivery and once a minute) or another replica takes it.
  `SCANS_WITHOUT_SANDBOX=true` opens scans all the same where there is none (a warning; the e2e suite, as CI's
  `setpriv` is older), and uses it where there is. What a worker newly loads from disk has to lie in a path
  listed there: try it in the image. Development has no sandbox.
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
- **A page is kept the right way up** (`turnScan.ts`), whichever way it was fed in. Reading needs no turning
  (`readPaper` goes by the marks); the marks then say how the page lies (`uprightTurn`, also on pages without
  fields), and the file how it is shown: a PDF's `/Rotate`, a JPEG's or PNG's Exif orientation. What was
  scanned stays as it is, and is never straightened: it is the evidence. The reader does it (`ReadPage.upright`),
  so a delivered file is opened in its process only; the page is still named by the file as it came. WebP,
  pages without a readable code, and scans kept before stay as they lie.
- **An empty page is told before any code is looked for** (`isBlank`): the back of a sheet scanned on both
  sides, half of a stack, would otherwise go through every variant of `findCodes` (some 0.4 s each). A printed
  page's marks alone are far more ink than that allows (`pipeline.test.ts`).
- **Pages without a code are ignored**, as no documents, except where a person said whose the file is. Only a
  file without any is told of (`noCode`). So a page whose code cannot be read in a stack goes unnoticed.
- **Pages that are nobody's are not stored**: of another conference, not registered, not readable. In the
  browser they are listed and toasted; of a scanner's delivery its owner is notified (`SCAN_PROBLEM`, mail
  and Slack).

## Before it is sent (`#lib/components/postalGuide/`)

Whoever downloads the documents first watches what makes them hard to scan (staples, sleeves, crumpled,
odd paper, covered marks); see "Postal Guide" in CLAUDE-UI.md. Only the app
asks for it, `issueDocumentCodes` does not.

## Data

- `postalScan`, one page → `conferenceParticipant` (cascade) and `storedFile`. The scan goes with the person's
  part in the conference; `file-cleanup` then removes the bytes. Keeping one clears the file's
  `uploadedById`, so only participant care reads it, not whoever uploaded it. AI assistants read none
  (`handledScans`).
- `agreementDetail`: one row per field (`AGREEMENT_FIELDS`), `yes`/`no`/`unclear`, `SCAN` or `MANUAL`.
  Scans fill it in (`planDetails`): unattended, nothing clear is taken back and no choice changed, what
  a person set is never touched and counts over what is read when the statuses are made. The statuses on `conferenceParticipant` stay what the team works
  with; setting a detail changes no status. Details from earlier scans complete a document whose pages
  come one after the other (`proposePaperChange`'s `known`).
- **A document marked as a problem is only taken as in by a person** (`confirm`): unattended it stays, with a
  note. Newly marking one forgets what scans told of it (`forgetRejectedDetails`), and deleting a scan forgets
  what only it told (`detailsToForget`); what a person set stays, and so do the other statuses.
- `applyPaperReadings` writes details and statuses together, under a lock on the participant row.

The dev seed (`seed-dev/postalScans.ts`, `scannerAccesses.ts`) has scans and details in every state for the
personas of the conferences with statuses, and scanner logins on profiles; it prints one that works. Its pages
are printed as the app prints them (marks, a code signed with `CERTIFICATE_SECRET` through `createCodeSigner`),
filled in as planned and scanned a little crooked, so they read as real ones (`postalScans.test.ts`).

**Where the fields were read** is not stored: opening a scan (`ScanPreview`) draws its kept file in the
browser and looks for its code and marks again (`scanZones` → `pageZones`, the same alignment and boxes
`readPaper` reads), which on the same file finds the same zones; the stored `readings` colour them.

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

A file goes to the bucket as it comes in (`storeStream`, parts of 8 MB, one sent while the next comes in), whatever its size, and is queued; then
the scanner is answered: what it was told arrived is never lost, and it waits for no page to be read.
`intakeGate` lets 20 uploads come in at once, four of a person; the others are not read from the socket until
it is their turn, and told to come back (503) after a minute, or at once while 500 files or 100 GB of the person
wait. What is no scan (415) or too large (413: 20 GB, 40 MB for a picture) is refused. **Nothing in front of the
route may clone the request**: what is not read of a clone is kept in memory (Paraglide's handle is left out).

`scanQueue` then works through `scan_task`s (`scanTaskService`): a file's `SPLIT` makes a `PAGE` of each page as it
goes, and a `FINISH` once it is through. Each app process does one `SPLIT` and `SCAN_READERS` (default 2) `PAGE`s or `FINISH`es at a time, each page read
in a reader process of its own (`createPageReaders`),
woken by a delivery and once a minute; people take turns (`deliveryTurns`), a split after 200 pages. A split goes
on after the last page it made, and deletes the file once it is through: only its pages are kept. `FINISH` waits for
the pages, tells the owner once of all that came to nothing, and removes the delivery.

A process holds its task (`FOR UPDATE SKIP LOCKED`, then `held_by` and `due_at`, 5 minutes, renewed each minute), so
replicas share the queue and another takes over from one that died; whoever lost the hold changes nothing more (a
split asks every 15 s, a `FINISH` before it tells anybody). **Every time of the queue is the database's** (`now()`),
so replicas whose clocks differ take no hold that has not run out. A `FINISH` is due once the last page is done, or
at once where the pages were done while the file was split; it is looked at again after 5 minutes for the one whose
last page was done just as the split ended. On
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

- `BODY_SIZE_LIMIT` (64 MB in the image) holds for every route, and SvelteKit has no limit for one alone. It
  refuses a body said to be larger (`Content-Length`) before it reads anything, so `webdav.ts` reads such a PUT
  off the Node request (`platform.req`), which nothing else reads then: a scanner that says how large its file
  is may send up to 20 GB. One that sends without a length (chunked) is cut off at `BODY_SIZE_LIMIT` and told 413. Outside the built app (`vite dev`) there is no limit.
- Delivered scans need the sandbox ("They run in a sandbox" above). To try it in the app's container:
  `setpriv --no-new-privs --landlock-access fs --landlock-rule path-beneath:execute,read-file,read-dir:/usr
--landlock-rule path-beneath:execute,read-file,read-dir:/lib node --version`.
- `SCAN_READERS` pages are read at once per instance, each process up to some 0.7 GB (600 MB resident before it
  hands over, plus the page in hand). Reading is CPU-bound: set it to the cores an instance has to spare.
- Node gives up a request after 5 minutes (`server.requestTimeout`, no variable), so a file must be through by
  then: some 3.7 GB at 100 Mbit/s. A proxy has limits of its own (Traefik: `readTimeout`, 60 s by default).
- The bucket should drop unfinished multipart uploads (a lifecycle rule): those of a process that died are left.
