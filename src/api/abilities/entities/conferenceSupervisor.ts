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

		// supervised participants should be able to see their supervisors
		can(['list', 'read'], 'ConferenceSupervisor', {
			OR: [
				{
					supervisedDelegationMembers: {
						some: {
							user: {
								id: user.sub
							}
						}
					}
				},
				{
					supervisedSingleParticipants: {
						some: {
							user: {
								id: user.sub
							}
						}
					}
				}
			]
		});

		// supervisors should be able to update/delete themselves
		can(['list', 'read', 'update', 'delete'], 'ConferenceSupervisor', {
			user: {
				id: user.sub
			}
		});

		// supervisors should be able to see other supervisors in the same conference (this should be strickened later)
		can(['list', 'read'], 'ConferenceSupervisor', {
			conference: {
				conferenceSupervisors: {
					some: {
						user: {
							id: user.sub
						}
					}
				}
			}
		});

		// supervisors should be able to see each others placeholders if they supervise the same delegation
		can(['list', 'read'], 'ConferenceSupervisor', {
			supervisedDelegationMembers: {
				some: {
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
				}
			}
		});

		// supervisors should be able to see each others placeholders if they supervise the same single participant
		can(['list', 'read'], 'ConferenceSupervisor', {
			supervisedSingleParticipants: {
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
	}
};
