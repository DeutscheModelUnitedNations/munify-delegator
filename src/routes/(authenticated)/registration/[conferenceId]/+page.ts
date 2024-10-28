import type { ConferenceRegistrationQueryVariables } from './$houdini';

export const _ConferenceRegistrationQueryVariables: ConferenceRegistrationQueryVariables = async (
	event
) => {
	const userId = await event.parent();
	return {
		userId
	};
};
