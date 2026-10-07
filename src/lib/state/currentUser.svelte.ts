import { browser } from '$app/environment';
import { fetchCurrentUser, type CurrentUser } from '$lib/api/currentUser';

/**
 * The signed-in person, fetched once per browser session.
 *
 * Deliberately cached only in the browser, unlike chase, which keeps the singleton on both sides.
 * Module state on the server is shared by every request the process serves, so caching there would
 * hand one visitor's identity to the next.
 *
 * Plain, not `$state`: it is written once per session and never rendered, and as state every read
 * after an `await` (which is every read, since callers await it) trips `await_reactivity_loss`.
 */
let cached: CurrentUser | undefined;

/** Awaited at the top of any component that needs to know who is signed in. */
export async function getCurrentUser(): Promise<CurrentUser> {
	if (browser && cached) return cached;

	const user = await fetchCurrentUser();
	if (browser) cached = user;
	return user;
}

export type { CurrentUser };
