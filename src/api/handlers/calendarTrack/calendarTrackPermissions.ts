import { type ApiContext, abilityBuilder } from '#api/rumble.js';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRoleForCalendarDay,
	calendarConference,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper.js';

export function registerCalendarTrackAbilities() {
	// The schedule is for the people with a part in the conference (`calendarConference`).
	abilityBuilder.calendarTrack.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference ? { where: { calendarDay: { conference } } } : undefined;
	});
	abilityBuilder.calendarTrack.allow(['read', 'update', 'delete']).when(systemAdmin);

	abilityBuilder.calendarTrack.allow(['update', 'delete']).when((ctx) => {
		const calendarDay = isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES);
		return calendarDay ? { where: { calendarDay } } : undefined;
	});
}

/** Refuses unless the caller may add tracks to the day. */
export async function assertCanCreateCalendarTrack(ctx: ApiContext, calendarDayId: string) {
	await assertTeamRoleForCalendarDay(ctx, calendarDayId);
}

/** The track `id`, if the caller may update it: a where clause matching nothing otherwise. */
export async function updatableCalendarTrackWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.calendarTrack.filter('update')).merge({ where: { id } }).sql.where;
}

/** The track `id`, if the caller may delete it: a where clause matching nothing otherwise. */
export async function deletableCalendarTrackWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.calendarTrack.filter('delete')).merge({ where: { id } }).sql.where;
}
