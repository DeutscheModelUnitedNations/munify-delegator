import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForCommittee = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	// everyone can see a committee
	can(['list', 'read'], 'Committee');

	if (oidc && oidc.user) {
		const user = oidc.user;

		// only the management of the conference the committee is part of can CUD a committee
		can(['update', 'delete'], 'Committee', {
			conference: { teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } } }
		});
	}
};
