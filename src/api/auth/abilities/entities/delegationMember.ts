import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForDelegationMember = (
	oidc: OIDCDeriveType,
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
				supervisors: { some: { user: { id: user.sub } } }
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
				}
			}
		});
	}
};
