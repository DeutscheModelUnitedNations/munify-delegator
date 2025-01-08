import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForPaymentTransaction = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// team members should be able to see the payment transactions of their conferences
		can(['read', 'list', 'update'], 'PaymentTransaction', {
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
	}
};
