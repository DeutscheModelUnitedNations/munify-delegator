import { browser } from '$app/environment';
import { fetchCurrentUser, fetchOptionalCurrentUser, type CurrentUser } from '$lib/api/currentUser';

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

function remember(user: CurrentUser | null) {
	if (browser && user) cached = user;
}

/** Awaited at the top of any component that needs to know who is signed in. */
export async function getCurrentUser(): Promise<CurrentUser> {
	if (cached) return cached;

	const user = await fetchCurrentUser();
	remember(user);
	return user;
}

/** The signed-in person, or null for a visitor. Only a signed-in person is cached. */
export async function getOptionalCurrentUser(): Promise<CurrentUser | null> {
	if (cached) return cached;

	const user = await fetchOptionalCurrentUser();
	remember(user);
	return user;
}

export type { CurrentUser };
