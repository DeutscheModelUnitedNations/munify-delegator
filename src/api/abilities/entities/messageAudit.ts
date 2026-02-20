import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForMessageAudit = (oidc: OIDC, { can }: AbilityBuilder<AppAbility>) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// Users can see messages they sent
		can(['list', 'read'], 'MessageAudit', {
			senderUser: { id: user.sub }
		});

		// Users can see messages they received
		can(['list', 'read'], 'MessageAudit', {
			recipientUser: { id: user.sub }
		});

		// Team members with PROJECT_MANAGEMENT or PARTICIPANT_CARE can see audits in their conferences
		can(['list', 'read'], 'MessageAudit', {
			conference: {
				teamMembers: {
					some: {
						user: { id: user.sub },
						role: { in: ['PROJECT_MANAGEMENT', 'PARTICIPANT_CARE'] }
					}
				}
			}
		});
	}
};
