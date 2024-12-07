import type { ConferenceRegistrationQueryVariables } from './$houdini';

export const _ConferenceRegistrationQueryVariables: ConferenceRegistrationQueryVariables = async (
	event
) => {
	const { user } = await event.parent();
	return {
		userId: user.sub
	};
};
