import type { MyConferenceparticipationQueryVariables } from './$houdini';

export const _MyConferenceparticipationQueryVariables: MyConferenceparticipationQueryVariables =
	async (event) => {
		const { user } = await event.parent();

		return {
			userId: user.sub
		};
	};
