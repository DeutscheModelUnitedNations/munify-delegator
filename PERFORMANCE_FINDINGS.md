# Performance findings: slowness since the rumble migration

Investigated 2026-11-02 on `delegator.munify.cloud` and locally.

## Symptoms

- The app feels much slower than before the rumble-based setup, worst on the dashboard,
  also noticeably on the team pages.
- Only for signed-in users: anonymous queries against production answer in ~120 ms
  (`{__typename}`, `conferences`), and so do static files.
- In the browser, signed-in GraphQL requests spend ~1.2 s in "Waiting" (time to first byte),
  even tiny queries answering an empty list (33 B). Firefox marks every one as slow.
- The conference selector (`/dashboard`) sent 1,509 requests in ~4.4 minutes.

## 1. Every signed-in request is introspected at Logto (main cause)

- The sign-in sends no `resource` parameter (`src/env.ts`: "Sign in sends none"; `OIDC_RESOURCE`
  is only used for the impersonation's token exchange). Without one, Logto issues an **opaque**
  access token instead of a JWT.
- Since the move to `@m1212e/sveltekit-oidc` (`a3e74d12`), its `handle` hook calls
  `processTokens` from `@m1212e/oidc` on every request. An opaque token cannot be verified
  against the JWKS, so it falls through to `introspectRemaining`, a request to Logto's
  introspection endpoint. Nothing caches the answer.
- So every GraphQL `GET` and every `POST /api/graphql/stream` waits on a round trip to Logto
  before any work starts. The previous setup skipped access token verification for opaque
  tokens, which is why this is new.
- Locally it does not show: oidc-mock issues JWTs, verified locally, and runs on the same host.
  Signed-in queries answer in ~3 ms there, so the resolvers and ability SQL are not the problem.
- This hits every page; pages with many live queries pay it many times over.

**To confirm:** check the `auth_oidc_access_token` cookie on production. If it does not start
with `eyJ`, it is opaque.

**Fix options:**

- Send `OIDC_RESOURCE` as `resource` at sign-in, so Logto issues JWT access tokens that are
  verified locally (the expected audience then becomes the resource, not the client id).
  Unverified whether `makeOIDC` accepts a sign-in `resource` today; it may need adding to the
  library.
- Or cache introspection results per access token until it expires (in the library or a hook).
  Quicker, but still one Logto call per token.

## 2. The dashboard re-fetches far more than it needs

Reproduced locally (`dev-team-pm`, `/dashboard`, 60 s): 339 GraphQL requests.

| Requests | Operation                     |
| -------: | ----------------------------- |
|       61 | `POST /api/graphql/stream`    |
|       42 | `DelegationmembersQuery`      |
|       42 | `SingleparticipantsQuery`     |
|       42 | `ConferencesupervisorsQuery`  |
|       42 | `TeammembersQuery`            |
|       40 | `ConferenceQuery`             |
|       32 | `ConferencesQuery`            |
|       28 | `ConferenceparticipantsQuery` |

- The per-card queries of `fetchMyConferenceParticipation` (via `ConferenceSelectorCard`) run
  ~4× more often than one round per card would need, and traffic continues in bursts after the
  page has loaded, with no data changing.
- Every live query is a query `GET` plus a subscription `POST`, doubling the count; with
  finding 1, each of them waits on Logto, which is why the dashboard is the worst page.

**Suspected mechanism (not proven):** rumble's live result
(`makeGraphQLQueryRequest` in `@m1212e/rumble/out/client.mjs`) subscribes its pipeline through
Svelte's `createSubscriber`. When the readers of a result drop to zero and come back (an async
`$derived` tearing down and recreating its render effects), the pipeline restarts, and with the
client's `cache-and-network` policy (`src/lib/api/client.ts`) each restart sends a fresh network
query and a fresh subscription.

## 3. The subscription stream reconnects (supervisor dashboard)

- The supervisor dashboard's repeating `Conference` / `Delegation` / `DelegationMembers` triplets
  are one per supervised delegation card (`SupervisedDelegationCard.svelte`): by design.
- But several `GET /api/graphql/stream` requests failed with `NS_ERROR_NET_PARTIAL_TRANSFER`,
  each followed by a new `PUT` reservation: the stream is being cut and rebuilt, re-sending every
  subscription. Possible causes: a proxy timeout on the long-lived response, or the stream
  requests landing on different app instances (they need sticky sessions). Not investigated
  further.

## Recommended order

1. Stop introspecting on every request (finding 1): affects every signed-in page.
2. Find out why live results restart and re-fetch (finding 2).
3. Check the proxy / instance setup for the stream (finding 3).
