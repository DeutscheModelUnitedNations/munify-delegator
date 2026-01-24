import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForTeamMemberInvitation = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// Team members with PROJECT_MANAGEMENT or TEAM_COORDINATOR role can manage invitations
		can(['read', 'list'], 'TeamMemberInvitation', {
			conference: {
				teamMembers: {
					some: { user: { id: user.sub }, role: { in: ['PROJECT_MANAGEMENT', 'TEAM_COORDINATOR'] } }
				}
			}
		});

		can(['update', 'delete'], 'TeamMemberInvitation', {
			conference: {
				teamMembers: {
					some: { user: { id: user.sub }, role: { in: ['PROJECT_MANAGEMENT', 'TEAM_COORDINATOR'] } }
				}
			}
		});
	}
};
