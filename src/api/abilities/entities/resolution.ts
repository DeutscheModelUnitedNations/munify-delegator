import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForResolution = (oidc: OIDC, { can }: AbilityBuilder<AppAbility>) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// Everyone participating in the conference (delegates, single participants,
		// supervisors and team members) may list and download its resolutions.
		can(['list', 'read'], 'Resolution', {
			conference: {
				OR: [
					{ delegationMembers: { some: { user: { id: user.sub } } } },
					{ singleParticipants: { some: { user: { id: user.sub } } } },
					{ conferenceSupervisors: { some: { user: { id: user.sub } } } },
					{ teamMembers: { some: { user: { id: user.sub } } } }
				]
			}
		});

		// Only the management of the conference the resolution belongs to may
		// create, edit or remove resolutions.
		can(['update', 'delete'], 'Resolution', {
			conference: { teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } } }
		});
	}
};
