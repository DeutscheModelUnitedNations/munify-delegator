import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForTeamMember = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// team members should be able to see each other
		can(['read', 'list'], 'TeamMember', {
			conference: { teamMembers: { some: { user: { id: user.sub } } } }
		});
	}
};
