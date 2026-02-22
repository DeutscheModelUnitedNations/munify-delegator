import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForAttendanceEntry = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// users can see their own attendance entries
		can('read', 'AttendanceEntry', {
			conferenceParticipantStatus: {
				user: {
					id: user.sub
				}
			}
		});

		// team members with PARTICIPANT_CARE or PROJECT_MANAGEMENT can manage attendance entries
		can(['read', 'list', 'update', 'delete'], 'AttendanceEntry', {
			conferenceParticipantStatus: {
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
			}
		});
	}
};
