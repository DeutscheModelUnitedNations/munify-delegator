import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForCommitteeAgendaItem = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	// everyone can see which committee agenda items exist and their details
	can(['list', 'read'], 'CommitteeAgendaItem');

	// creation is done by system level admins which have a permission wildcard in the main ability module

	if (oidc && oidc.user) {
		const user = oidc.user;
		// update and delete can only be done by the management of the conference the committee belongs to
		can(['update', 'delete'], 'CommitteeAgendaItem', {
			committee: {
				conference: {
					teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } }
				}
			}
		});
	}
};
