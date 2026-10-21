import type { Exchange } from '@urql/core';
import { pipe, tap } from 'wonka';
import { browser } from '$app/env';
import { hasErrorCode } from './errorCodes';

const REDIRECTED_AT_KEY = 'loginRedirectedAt';

/** Within this long of the last redirect another is not made: a session the server keeps refusing would loop. */
const REDIRECT_COOLDOWN_MS = 10_000;

/** The sign-in that returns to `location`, which is a path on this site. */
export function loginUrl(location: { pathname: string; search: string; hash: string }) {
	return `/login?next=${encodeURIComponent(location.pathname + location.search + location.hash)}`;
}

/** Whether a redirect went out too recently for another; storage that cannot be read counts as never. */
function redirectedRecently(now: number) {
	try {
		const at = Number(sessionStorage.getItem(REDIRECTED_AT_KEY));
		return at > 0 && now - at < REDIRECT_COOLDOWN_MS;
	} catch {
		return false;
	}
}

function rememberRedirect(now: number) {
	try {
		sessionStorage.setItem(REDIRECTED_AT_KEY, String(now));
	} catch {
		// Without storage the cooldown is simply not enforced.
	}
}

/**
 * Sends the visitor to sign in when the API answers that nobody is: a session that ran out while
 * the page was open, rather than a toast saying so. Browser only; on the server the request's own
 * guards decide. The sign-in brings them back to where they were.
 */
export const loginRedirectExchange: Exchange = ({ forward }) => {
	return (operations) =>
		pipe(
			forward(operations),
			tap((result) => {
				if (!browser || !result.error || !hasErrorCode(result.error, 'UNAUTHENTICATED')) return;
				if (window.location.pathname.startsWith('/login')) return;
				const now = Date.now();
				if (redirectedRecently(now)) return;
				rememberRedirect(now);
				window.location.assign(loginUrl(window.location));
			})
		);
};
