import type { DelegationAssignmentDataQueryVariables } from './$houdini';

export const _DelegationAssignmentDataQueryVariables: DelegationAssignmentDataQueryVariables =
	async (event) => {
		const { user } = await event.parent();

		return {
			userId: user.sub
		};
	};
