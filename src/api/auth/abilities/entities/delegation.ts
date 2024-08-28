import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForDelegationEntity = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		can('read', 'Delegation', {
			OR: [
				{
					members: { some: { user: { id: oidc.user.sub } } },
					supervisors: { some: { user: { id: oidc.user.sub } } }
				}
			]
		});

		//TODO: Do we need to thighten permissions here?
		can('join', 'Delegation', { applied: false });

		// const user = oidc.user;
	}
};
