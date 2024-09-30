import { getApi } from './apiState.svelte';
import { checkForError } from '$api/client';

let logoutUrl = $state<string | undefined>(
	(await checkForError(getApi().auth['logout-url'].get())).logoutUrl
);

export function getLogoutUrl() {
	if (logoutUrl === undefined) {
		throw new Error('Logout URL not set');
	}
	return logoutUrl;
}
