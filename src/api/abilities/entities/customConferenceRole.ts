import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForCustomConferenceRole = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	// everyone should be able to see which custom roles are available in a conference
	can(['read', 'list'], 'CustomConferenceRole');

	if (oidc && oidc.user) {
		const user = oidc.user;

		// only the management of the conference the role is part of can CUD a role
		can(['update', 'delete'], 'CustomConferenceRole', {
			conference: { teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } } }
		});
	}
};
