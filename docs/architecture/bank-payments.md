# Bank payment sync

Participants pay by bank transfer with their payment reference (`payment_transaction.id`, e.g.
`ACDE-FHJK-MNPR-TUVW`) in the purpose. The `bank-payment-sync` job reads the transfers from
BuchhaltungsButler, which pulls DMUN's bank accounts, and settles the payments it can.

## Pieces

| Where                                                     | What                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `src/jobs/bankPaymentSync.ts`                             | The run: reads pages of transactions, hands incoming ones on, logs a summary             |
| `src/jobs/apis/buchhaltungsbutler/`                       | `POST /transactions/get` of BuchhaltungsButler's REST API v1 (Basic auth + `api_key`)    |
| `src/api/handlers/bankTransfer/bankTransferService.ts`    | `handleIncomingTransfer`: find the named payments, `decideTransfer`, apply, record       |
| `src/api/handlers/paymentTransaction/paymentReference.ts` | The reference alphabet, and `paymentReferenceCandidates` (references in a purpose)       |
| `bank_transfer` table                                     | One row per (transfer, payment it names): amount, booking day, sender, purpose, `result` |
| `team/payments/` (`reviewCases.ts`, `ReviewCase.svelte`)  | The payments page: review cases, reference lookup, what the sync confirmed               |

## Rules

- **Every account, no account matching.** References are unique across conferences, so the
  reference alone says whose payment it is.
- **A reference counts anywhere in the purpose.** The purpose is upper-cased and stripped of
  everything but letters and digits; every 16 characters in a row of the reference alphabet are a
  candidate, and the candidates that are payment ids are the payments named.
- **Settled** (`RECEIVED`): all named payments open (no `recievedAt`, nobody covered `DONE`) and the
  transfer's amount their sum (to half a cent). `applyPaymentStatus(DONE)` with the booking day as
  `recievedAt`, so the "payment received" mail follows as from the payments page.
- **Otherwise everybody covered becomes `NEEDS_HUMAN_REVIEW`**: `AMOUNT_MISMATCH` for open payments,
  `ALREADY_RECEIVED` for settled ones (paid twice; `recievedAt` stays). A person resolves it on the
  payments page (below) or the user card. No mail is sent for the status, and participants and
  supervisors see it as pending (`participantFacingStatus`, `#lib/helpers/administrativeStatus`).
- **The sender and the purpose are kept** (`counterparty` from `to_from`, `purpose`), so the
  review shows them; they name people, so the MCP classification redacts both.
- **Once per transfer, all or nothing.** A transfer with a `bank_transfer` row is skipped, so a
  person's decision is never overwritten. Each transfer is settled in one transaction under an
  advisory lock on its id (overlapping runs wait for each other): the check, the decision (on the
  payments re-read once everybody they cover is locked, so a status changed by hand at that moment
  is waited for), the status writes (`writePaymentStatus`) and the `bank_transfer` rows commit
  together; the pubsub announcements follow the commit. Transfers without a known reference leave
  no row and open no transaction.
- **Where a run starts:** after the highest recorded transfer id (`id_by_customer_from`, `0` on
  the first run, so the API answers in id order), but never
  before `--lookback-days` (default 60) ago, so a first run reads two months, not the whole history.
  Daily is enough; `--dry-run` logs what would happen without writing.
- **What a run logs:** a `Matched a bank transfer` line per payment a transfer named (transfer
  and payment ids, result), and always one closing `Bank payment sync done` line in counts only
  (`SyncSummary`): transactions `read` in `pages`, `outgoing`, `unreadable`, `incoming`,
  `withoutReference`, `handledBefore`, `matchedTransfers`, `received` with `receivedAmount` (euros),
  `flagged` split into `alreadyReceived` / `amountMismatch`, the booking range `bookedFrom`–`bookedTo`
  and where it started (`dateFrom`, `afterId`). No sender, purpose or single amount reaches the log.
  `read: 0` on a weekend is normal; `incoming` with all `withoutReference` means the connection
  works and nobody paid with a reference yet.

## The payments page

`team/payments/+page.svelte`, for participant care:

- **Zur Prüfung**: every payment with somebody covered on `NEEDS_HUMAN_REVIEW`, grouped by the
  newest transfer that did not settle it (`reviewCases`, one case per `externalId`; a payment
  flagged by hand is a case of its own). The kind follows the rows: `ALREADY_RECEIVED` is "paid
  twice", otherwise the transfer's amount against the payments' sum. Deciding writes through
  `updatePaymentTransaction` (all received, problem, back to pending) or `receivePaymentFor`
  (only some covered people paid: they become `DONE`, the others `PENDING`, the payment stays open;
  `paidDecisions`). Live, so a decided case leaves the list.
- **Referenz nachschlagen**: the lookup by reference, for transfers without a recognised one.
- **Automatisch bestätigt** (collapsed, fetched only when opened): `RECEIVED` rows, newest first,
  25 at a time, counted by `bankTransfersCount`.

The dev seed's preparation conference has one case of each kind (`CROWD_REVIEW_CASES`, transfer
ids from 51).

## Running it

```bash
delegator-jobs bank-payment-sync --dry-run
delegator-jobs bank-payment-sync --lookback-days 60
```

Needs the app's `DATABASE_URL` and `REDIS_URL` (live pages hear of the changes) and
`BUCHHALTUNGSBUTLER_API_CLIENT`, `_API_SECRET`, `_API_KEY` (optional `_API_URL`), see
`.env.example`; the URL has to be `https://`, since the requests carry the secret and key.
BuchhaltungsButler offers no webhooks and no sandbox; its rate limit (100
requests/minute per customer) is far above what a run needs (one request per 500 transactions).

## Not covered

- How fresh the bank data is depends on BuchhaltungsButler's bank sync (and its PSD2 consent,
  renewed every 90–180 days). A lapsed consent means no new transfers, not an error.
- Transfers without a reference, or with a mistyped one, still have to be matched by hand on the
  payments page.
- The spec's transaction example has no payer IBAN; nothing here needs it.
