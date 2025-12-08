import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForPaper = (oidc: OIDC, { can }: AbilityBuilder<AppAbility>) => {
	if (oidc && oidc.user) {
		// const user = oidc.user;

		// TODO stricken this! This is just for testing purposes

		can(['list', 'read', 'update', 'delete'], 'Paper');
	}
};
