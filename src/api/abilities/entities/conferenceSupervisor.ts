import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForConferenceSupervisor = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// team members should be able to see the supervisors of their conferences
		can(['list', 'read', 'update', 'delete'], 'ConferenceSupervisor', {
			conference: {
				teamMembers: {
					some: {
						user: {
							id: user.sub
						},
						role: {
							in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT']
						}
					}
				}
			}
		});

		// other supervisors should be able to see the supervisors of their delegations
		can(['list', 'read'], 'ConferenceSupervisor', {
			delegations: {
				some: {
					supervisors: {
						some: {
							user: {
								id: user.sub
							}
						}
					}
				}
			}
		});

		// delegates should be able to see their supervisors
		can(['list', 'read'], 'ConferenceSupervisor', {
			delegations: {
				some: {
					members: {
						some: {
							user: {
								id: user.sub
							}
						}
					}
				}
			}
		});

		// supervisors should be able to update/delete themselves
		can(['list', 'read', 'update', 'delete'], 'ConferenceSupervisor', {
			user: {
				id: user.sub
			}
		});
	}
};
