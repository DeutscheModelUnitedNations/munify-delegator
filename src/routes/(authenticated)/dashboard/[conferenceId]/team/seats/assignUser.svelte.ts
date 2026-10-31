import { createContext } from 'svelte';
import { goto } from '$app/navigation';
import { page } from '$app/state';

const PARAM = 'assignUserId';

/**
 * The user a waiting list link asks to seat (`?assignUserId=`). Held as state and mirrored into the
 * URL on the next task, like the assignment board's parameters, rather than through
 * `sveltekit-search-params`: its navigation and the default it writes in an `$effect.pre` land
 * while the seat sections' first queries are pending, and Svelte trips its "Batch has scheduled
 * effects" invariant on the overlap.
 */
function createAssignUser() {
	let userId = $state(page.url.searchParams.get(PARAM));

	return {
		get userId() {
			return userId;
		},
		/** Forgets the user once they are seated, here and in the URL */
		clear() {
			userId = null;
			setTimeout(() => {
				// The browser's own URL: `page.url` does not follow shallow navigations.
				const url = new URL(location.href);
				if (!url.searchParams.has(PARAM)) return;
				url.searchParams.delete(PARAM);
				// eslint-disable-next-line svelte/no-navigation-without-resolve -- the current page's own URL, with other query parameters
				goto(url, { shallow: true, replace: true, state: page.state });
			});
		}
	};
}

type AssignUser = ReturnType<typeof createAssignUser>;

const [getAssignUser, setAssignUser] = createContext<AssignUser>();

/** Called once by the seats page; every seat button and its modal read the same state. */
export function provideAssignUser() {
	return setAssignUser(createAssignUser());
}

export { getAssignUser };
