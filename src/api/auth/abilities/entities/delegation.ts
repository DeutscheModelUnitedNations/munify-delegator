import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForDelegationEntity = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		//TODO: thighten permissions here
		can('join', 'Delegation', {applied: false, });

		// const user = oidc.user;
	}
};
