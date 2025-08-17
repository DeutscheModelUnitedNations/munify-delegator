import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForRoleApplication = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// team members can see which applications exist
		can(['read', 'list'], 'RoleApplication', {
			delegation: {
				conference: {
					teamMembers: {
						some: {
							user: {
								id: user.sub
							},
							role: { in: ['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT'] }
						}
					}
				}
			}
		});

		// delegation members can see the applications of their delegations
		can(['read', 'list'], 'RoleApplication', {
			delegation: {
				members: {
					some: {
						user: {
							id: user.sub
						}
					}
				}
			}
		});

		can(['update', 'delete'], 'RoleApplication', {
			delegation: {
				members: {
					some: {
						user: {
							id: user.sub
						},
						isHeadDelegate: true
					}
				}
			}
		});

		// delegation supervisors can see the applications of their delegations
		can(['read', 'list'], 'RoleApplication', {
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
	}
};
