import { browser } from '$app/env';
import { createPersistedState } from './persistedState.svelte.js';

/**
 * The conference whose team area this browser opened last, for the home page's way back into it.
 * Only a hint: whoever reads it checks the caller is still on that team before offering it.
 */
const lastTeamConference = createPersistedState<string | null>({
	key: 'lastTeamConference',
	initial: null
});

export function getLastTeamConferenceId(): string | null {
	return lastTeamConference.current;
}

/** Browser only: on the server this module's state is shared by every request */
export function rememberTeamConference(conferenceId: string) {
	if (!browser || lastTeamConference.current === conferenceId) return;
	lastTeamConference.current = conferenceId;
}
