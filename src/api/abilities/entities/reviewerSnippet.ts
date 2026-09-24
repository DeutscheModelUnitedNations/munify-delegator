import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/services/oidcContext';

export const defineAbilitiesForReviewerSnippet = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	if (oidc && oidc.user) {
		const user = oidc.user;

		// Users can only manage their own snippets
		can(['read', 'list', 'update', 'delete'], 'ReviewerSnippet', {
			userId: user.sub
		});

		// Note: Create permission checked in resolver (uses logged in user's ID)
	}
};
