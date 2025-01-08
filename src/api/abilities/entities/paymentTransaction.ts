import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForPaymentTransaction = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	// everyone should be able to see nations in the system
	// can(['read', 'list'], 'PaymentTransaction');
	// if (oidc && oidc.user) {
	// }
};
