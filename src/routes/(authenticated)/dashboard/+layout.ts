import type { GetMyActiveConferencesQueryVariables } from './$houdini';

export const _GetMyActiveConferencesQueryVariables: GetMyActiveConferencesQueryVariables = async (
	event
) => {
	const { user } = await event.parent();

	return {
		userId: user.sub
	};
};
