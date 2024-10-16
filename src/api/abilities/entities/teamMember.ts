import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForTeamMember = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// team members should be able to see each other
		can(['read', 'list'], 'TeamMember', {
			conference: { teamMembers: { some: { user: { id: user.sub } } } }
		});

		can(['update', 'delete'], 'TeamMember', {
			conference: { teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } } }
		});
	}
};
