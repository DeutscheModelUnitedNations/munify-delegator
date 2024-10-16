import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForConferenceParticipantStatus = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// users can see their own status
		can('read', 'ConferenceParticipantStatus', {
			user: {
				id: user.sub
			}
		});

		// if the user has a delegation and that delegation has a supervisor, they also can see the status
		can('read', 'ConferenceParticipantStatus', {
			user: {
				delegationMemberships: {
					some: {
						delegation: {
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
		});

		// if the user is a team member with the PARTICIPANT_CARE or PROJECT_MANAGEMENT role, they should be able to update the status
		can(['list', 'update'], 'ConferenceParticipantStatus', {
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
	}
};
