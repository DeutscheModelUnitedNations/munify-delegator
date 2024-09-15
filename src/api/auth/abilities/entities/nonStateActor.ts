import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForNonStateActor = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	// everyone can see a nsa
	can(['list', 'read'], 'NonStateActor');

	if (oidc && oidc.user) {
		const user = oidc.user;

		// only the management of the conference the committee is part of can CUD a nsa
		can(['create', 'update', 'delete'], 'NonStateActor', {
			conference: { teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } } }
		});
	}
};
