import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDCDeriveType } from '$api/auth/oidc';

export const defineAbilitiesForNation = (
	oidc: OIDCDeriveType,
	{ can }: AbilityBuilder<AppAbility>
) => {
	// everyone should be able to see nations in the system
	can(['read', 'list'], 'Nation');
	// if (oidc && oidc.user) {
	// }
};
