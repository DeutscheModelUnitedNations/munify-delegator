import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForConference = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	// everyone can see which conference exist and their details
	can(['list', 'read'], 'Conference');

	// creation is done by system level admins which have a permission wildcard in the main ability module

	if (oidc && oidc.user) {
		const user = oidc.user;
		// update and delete can only be done by the management of the conference
		can(['update', 'delete'], 'Conference', {
			teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } }
		});
	}
};
