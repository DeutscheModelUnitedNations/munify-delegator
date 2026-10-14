import { type ApiContext, abilityBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRoleForCalendarDay,
	isTeamMemberOfConference,
	systemAdmin
} from '$api/services/authHelper';

export function registerCalendarTrackAbilities() {
	// Ported from abilities/entities/calendarTrack.ts
	abilityBuilder.calendarTrack.allow('read');
	abilityBuilder.calendarTrack.allow(['update', 'delete']).when(systemAdmin);

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
