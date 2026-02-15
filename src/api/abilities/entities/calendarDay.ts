import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForCalendarDay = (oidc: OIDC, { can }: AbilityBuilder<AppAbility>) => {
	can(['list', 'read'], 'CalendarDay');

	if (oidc && oidc.user) {
		const user = oidc.user;

		can(['update', 'delete'], 'CalendarDay', {
			conference: { teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } } }
		});
	}
};
