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

`takeScan` is the one procedure, for the browser and the server: open, read every page, match pages to
people (`people.ts`, only signatures checked), keep each page as a file of its own, name what came to
nothing (`ScanProblem`). The callers bring ports:

|                                    | reads pages                                      | keeps                              |
| ---------------------------------- | ------------------------------------------------ | ---------------------------------- |
| `PaperBatch`                       | `readPages` with `browserPlatform`               | upload, `importPostalScan`         |
| `scanIngest`                       | `readPages` on a worker (`scanReader.worker.ts`) | `storeGeneratedFile`, `takeInPage` |
| `uploadScanFor` (participant card) | as `PaperBatch`, with an `owner`                 | as `PaperBatch`                    |

- The worker is built by `build:compute`, with pdf.js and the code reader bundled in and what they load
  (wasm, fonts) copied to `build/compute/scanReaderFiles`. Only `@napi-rs/canvas` (native code) is a
  runtime dependency. pdf.js decodes JBIG2 and JPEG 2000,
  which office scanners write, with wasm files: without `wasmUrl` / `BinaryDataFactory` those pages
  come out blank.
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
- **Pages that are nobody's are not stored.** Empty backs are left out silently. In the browser the
  rest is listed and toasted; of a scanner's delivery its owner is notified (`SCAN_PROBLEM`, mail and
  Slack).

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

## Scanners delivering by themselves

Network scanners send by email (SMTP with a login), to SMB or FTP folders, or to WebDAV; desktop
scanners save to a folder. The app takes the first, the third and the last:

- `scannerAccess`: a login per team member and device (username, random password, SHA-256 kept). It
  acts for its owner while their role holds `manageParticipants`, and goes with their team membership.
  Personal, so there is somebody to notify. It expires after 180 days unless its owner renews it, and
  project management sees and removes everybody's (`teamScannerAccesses`).
- `mayDeliver` (role, expiry, account) is asked at sign-in, when a delivery's turn comes and once it is
  received, so an open SMTP session outlives nothing. Whether the account is suspended at Logto is asked
  over the Management API (`isAccountActive`, remembered for 10 minutes; needs the `OIDC_M2M_*`
  credentials impersonation uses, and lets deliver while Logto cannot be asked).
- **Email**: `smtpReceiver.ts`, started by `hooks.server.ts` where `SCANNER_SMTP_PORT` is set. Takes
  mail only after AUTH and relays nothing. Addresses do not matter.
- **WebDAV**: `/api/scans/…` (`webdav.ts`), Basic auth over HTTPS, write-only.
  SvelteKit's CSRF check would refuse a file without a content type, so it is off in `vite.config.ts`
  and done by `crossSiteFormHandle` for every other route. It only exists in the built app: test
  WebDAV against `node build/index.js`.
- **Folder**: `FolderWatch.svelte`, Chromium only, polls while the page is open.

Email and WebDAV answer only once everything is stored, so a crash never loses what a scanner was told
arrived. `intakeGate` lets six deliveries at once into memory, three of a conference and two of a person;
the others are not read from the socket until it is their turn, and told to come back (452 / 503) after a
minute. Those let in are read one after the other.

### Deployment

`SCANNER_SMTP_PORT` (listen), `SCANNER_SMTP_HOST` and `SCANNER_SMTP_PUBLIC_PORT` (shown to people),
`SCANNER_SMTP_TLS`:

- `starttls` (default) / `implicit`: the app ends TLS with `SCANNER_SMTP_TLS_CERT` / `_KEY` (PEM files,
  re-read twice a day).
- `proxy`: a TCP router in front ends TLS (Traefik: an entrypoint with `HostSNI` and `tls`, forwarding
  to the port). Scanners then use TLS from the start. Never expose this port itself: logins would
  travel in the clear. STARTTLS is off there, not only hidden.

`APP_URL` puts the link into the notifications. WebDAV needs no setup; `BODY_SIZE_LIMIT` must allow
40 MB and a proxy must wait for long answers (a big stack takes minutes). Cloudflare's proxy gives up
after 100 seconds.
