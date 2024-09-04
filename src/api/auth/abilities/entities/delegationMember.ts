import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForDelegationMemberEntity = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;
		can(['read', 'list'], 'DelegationMember', {
			OR: [
				{
					delegation: {
						members: { some: { user: { id: oidc.user.sub }, isHeadDelegate: true } },
						supervisors: { some: { user: { id: oidc.user.sub } } }
					}
				}
			]
		});

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
