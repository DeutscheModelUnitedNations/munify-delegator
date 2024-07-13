import { treaty } from '@elysiajs/eden';
import type { App } from './api';
import { browser } from '$app/environment';

//TODO https://github.com/elysiajs/elysia/discussions/712
export function apiClient({
	fetch,
	origin
}: {
	fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	origin: string;
}) {
	return treaty<App>(origin, {
		fetch: {
			credentials: 'same-origin'
		},
		fetcher: fetch
	}).api;
}

/**
 * Helper for throwing errors if the response contains an error
 *
 * @param apiCall An api call to the api
 * @returns The data inside the response
 * @throws An error if the response contains an error
 */
export async function checkForError<T, E>(
	apiCall: Promise<{
		data: T | null;
		error: E | null;
	}>
) {
	const response = await apiCall;
	if (response.error) {
		if ((response.error as any)?.status === 401 && (response.error as any)?.message === "Token expired") {
			if (browser) {
				//TODO in case we don't have a refresh token, we should try to re-login to get a new one
				// easiest would be to just reload the page and hope the user is on a protected route to trigger
				// the login flow. This could result in loss of data in e.g. forms. A better solution would be nice.
				// We need to investigate how to handle this case.
				// reload page
				window.location.reload();
			}
		}
		throw new Error(JSON.stringify(response.error));
	}
	if (response.data === null) {
		throw new Error('Invalid state: Response data is null');
	}
	return response.data;
}
