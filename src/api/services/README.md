# Backend services

Business logic shared by several handlers, tasks or routes. Logic that only one handler uses lives
beside that handler instead, in `src/api/handlers/<entity>/` (e.g. `handlers/assignment/` holds the
draft, the prior-experience query and the matching worker bridge).

| Directory       | What lives there                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `auth/`         | Authorization rules (`authHelper`, the role matrix), the OIDC instance, login-time user upsert, email conflicts, invitation tokens |
| `assignment/`   | Role visibility until release (`assignmentVisibility`), seat planning guards                                                       |
| `registration/` | Application readiness, a user's participation in a conference, role application tidying/ranking, entry code generation             |
| `files/`        | Stored files served from `/files/...` and the in-process reader behind them                                                        |
| `email/`        | Mail sending and the notification mails                                                                                            |
| `args.ts`       | Helper for optional GraphQL arguments in drizzle `set` calls                                                                       |
