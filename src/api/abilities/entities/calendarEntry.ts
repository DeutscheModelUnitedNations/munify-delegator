import type { AbilityBuilder } from '@casl/ability';
import type { AppAbility } from '../abilities';
import type { OIDC } from '$api/context/oidc';

export const defineAbilitiesForCalendarEntry = (
	oidc: OIDC,
	{ can }: AbilityBuilder<AppAbility>
) => {
	can(['list', 'read'], 'CalendarEntry');

	if (oidc && oidc.user) {
		const user = oidc.user;

		can(['update', 'delete'], 'CalendarEntry', {
			calendarDay: {
				conference: {
					teamMembers: { some: { user: { id: user.sub }, role: 'PROJECT_MANAGEMENT' } }
				}
			}
		});
	}
};
