import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidcPlugin';
import { conference } from '$lib/paraglide/messages';

export const defineAbilitiesForDelegation = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// the delegates of a delegation should be able to see it
		can('read', 'Delegation', {
			members: { some: { user: { id: user.sub } } }
		});
		// the supervisors of a delegation should be able to see it
		can('read', 'Delegation', {
			supervisors: { some: { user: { id: user.sub } } }
		});

		// the head delegate of a delegation should be able to update/delete it
		can(['update', 'delete'], 'Delegation', {
			applied: false,
			members: { some: { user: { id: user.sub }, isHeadDelegate: true } }
		});

		// project management and partiticipant care team members should be able to see the delegations of their conferences
		can(['list', 'read', 'update'], 'Delegation', {
			conference: {
				teamMembers: {
					some: {
						user: {
							id: user.sub
						},
						OR: [{ role: 'PROJECT_MANAGEMENT' }, { role: 'PARTICIPANT_CARE' }]
					}
				}
			}
		});

		// team members should be able to see the delegations of their conferences
		can(['read', 'list'], 'Delegation', {
			conference: {
				teamMembers: {
					some: {
						user: {
							id: user.sub
						}
					}
				}
			}
		});
	}
};
