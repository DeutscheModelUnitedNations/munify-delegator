# Backend services

Business logic shared by several handlers, jobs or routes. Logic that only one handler uses lives
beside that handler, in `src/api/handlers/<entity>/<entity>Service.ts` (after `avv`: `<entity>.ts`
is the GraphQL layer, `<entity>Service.ts` the business logic). The authorization building blocks
live in one module, `authHelper.ts`, after `munify-chase`.

| Path              | What lives there                                                                                                                             |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `authHelper.ts`   | The ability building blocks (`isTeamMemberOf`, `isOwnUser`, …), the assertions, and the assignment-release rules; header has the role matrix |
| `OIDC.ts`         | The OIDC instance protecting the `(authenticated)` routes                                                                                    |
| `account/`        | Login-time user upsert, email conflicts, team invitation tokens                                                                              |
| `registration/`   | Application readiness, a user's participation in a conference, role application tidying/ranking, entry code generation                       |
| `seatPlanning.ts` | Seat planning guards                                                                                                                         |
| `files/`          | Stored files served from `/files/...` and the in-process reader behind them                                                                  |
| `email/`          | Mail sending and the notification mails                                                                                                      |
| `args.ts`         | Helper for optional GraphQL arguments in drizzle `set` calls                                                                                 |
