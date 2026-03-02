import type { PageLoad } from './$types';

export const load: PageLoad = async (event) => {
	return {
		conferenceId: event.params.conferenceId,
		userId: event.params.userId
	};
};
