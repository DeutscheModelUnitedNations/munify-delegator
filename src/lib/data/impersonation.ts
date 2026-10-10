/**
 * Impersonation is stalled for the move to `@m1212e/sveltekit-oidc`.
 *
 * The old implementation swapped the session cookies itself, which the library now owns; see the
 * comment on `startImpersonation` in `src/api/handlers/user.ts` for what a new implementation
 * would have to look like. Until then the API rejects both mutations, so the UI that would call
 * them is hidden rather than left to fail. Flip this back to `true` together with that handler.
 */
export const IMPERSONATION_ENABLED = false;
