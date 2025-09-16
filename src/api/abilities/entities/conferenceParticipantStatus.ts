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

		//TODO: this needs to be scoped to a conference!
		// currently the supervisor can see status of all conferences of the participant

		//TODO: this might be the case for other entities too?

		// if the user has a supervisor, they also can see the status
		can(['read', 'list'], 'ConferenceParticipantStatus', {
			user: {
				OR: [
					{
						delegationMemberships: {
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
					},
					{
						singleParticipant: {
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
				]
			}
		});

		// if the user has a delegation they can see the status of all members of that delegation
		can(['read', 'list'], 'ConferenceParticipantStatus', {
			user: {
				delegationMemberships: {
					some: {
						delegation: {
							members: {
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
		can(['read', 'list', 'update'], 'ConferenceParticipantStatus', {
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
