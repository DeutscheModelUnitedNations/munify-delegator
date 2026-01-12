import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForDelegationMember = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// other delegates should be able to access their co-delegates
		can(['read', 'list'], 'DelegationMember', {
			delegation: {
				members: { some: { user: { id: user.sub } } }
			}
		});

		// supervisors should be able to see the delegates of their supervised delegations
		can(['read', 'list'], 'DelegationMember', {
			delegation: {
				members: {
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
			}
		});

		// team members should be able to see the delegation members of their conferences
		can(['read', 'list', 'update', 'delete'], 'DelegationMember', {
			conference: {
				teamMembers: {
					some: {
						user: {
							id: user.sub
						},
						role: { in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
					}
				}
			}
		});

		// only the head delegate should be able to kick delegates
		can('delete', 'DelegationMember', {
			delegation: {
				members: {
					some: {
						isHeadDelegate: true,
						user: {
							id: user.sub
						}
					}
				},
				applied: false
			}
		});

		// people are free to leave the delegation on their own
		can('delete', 'DelegationMember', {
			user: {
				id: user.sub
			},
			delegation: {
				applied: false
			}
		});

		// Head delegate can update members that don't have a committee assigned yet
		can('update', 'DelegationMember', {
			assignedCommitteeId: null,
			delegation: {
				members: {
					some: {
						isHeadDelegate: true,
						userId: user.sub
					}
				}
			}
		});
	}
};
