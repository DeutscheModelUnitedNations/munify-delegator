import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async (event) => {
	return {
		conferenceId: event.params.conferenceId
	};
};
