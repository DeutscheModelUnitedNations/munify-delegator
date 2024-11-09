import type { ConferenceOpenForRegistrationQueryVariables } from './$houdini';

export const _ConferenceOpenForRegistrationQueryVariables: ConferenceOpenForRegistrationQueryVariables =
	async (event) => {
		return {
			userId: (await event.parent()).user.sub
		};
	};
