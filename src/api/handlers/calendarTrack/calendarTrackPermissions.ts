import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import {
	assertTeamPermissionForCalendarDay,
	calendarConference
} from '#api/handlers/calendarDay/calendarDayPermissions';

export function registerCalendarTrackAbilities() {
	// The schedule is for the people with a part in the conference (`calendarConference`).
	abilityBuilder.calendarTrack.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference ? { where: { calendarDay: { conference } } } : undefined;
	});
	abilityBuilder.calendarTrack.allow(['read', 'update', 'delete']).when(systemAdmin);

	abilityBuilder.calendarTrack.allow(['update', 'delete']).when((ctx) => {
		const calendarDay = isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return calendarDay ? { where: { calendarDay } } : undefined;
	});
}

/** Refuses unless the caller may add tracks to the day. */
export async function assertCanCreateCalendarTrack({
	ctx,
	calendarDayId
}: {
	ctx: ApiContext;
	calendarDayId: string;
}) {
	await assertTeamPermissionForCalendarDay({ ctx, calendarDayId });
}
