import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForNonStateActor = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	// everyone can see a nsa
	can(['list', 'read'], 'NonStateActor');

	if (oidc && oidc.user) {
		const user = oidc.user;

		// the management and the content lead can edit and delete a nsa; deleting is part of the
		// seat planning and is blocked while delegations are assigned (assertNonStateActorDeletable)
		can(['update', 'delete'], 'NonStateActor', {
			conference: {
				teamMembers: {
					some: { user: { id: user.sub }, role: { in: ['PROJECT_MANAGEMENT', 'CONTENT_LEAD'] } }
				}
			}
		});
	}
};
