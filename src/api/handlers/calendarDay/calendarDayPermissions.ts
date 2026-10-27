import { type ApiContext, abilityBuilder } from '#api/rumble.js';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	calendarConference,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '#api/services/authHelper.js';

export function registerCalendarDayAbilities() {
	// The schedule is for the people with a part in the conference (`calendarConference`).
	abilityBuilder.calendarDay.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference ? { where: { conference } } : undefined;
	});
	abilityBuilder.calendarDay.allow(['update', 'delete']).when(systemAdmin);

	abilityBuilder.calendarDay
		.allow(['update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));
}

/** Refuses unless the caller may add days to the conference's calendar, by hand or by import. */
export async function assertCanCreateCalendarDay(ctx: ApiContext, conferenceId: string) {
	await assertTeamRole(ctx, conferenceId, PARTICIPANT_CARE_ROLES);
}

/** The day `id`, if the caller may update it: a where clause matching nothing otherwise. */
export async function updatableCalendarDayWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.calendarDay.filter('update')).merge({ where: { id } }).sql.where;
}

/** The day `id`, if the caller may delete it: a where clause matching nothing otherwise. */
export async function deletableCalendarDayWhere(ctx: ApiContext, id: string) {
	return (await ctx.abilities.calendarDay.filter('delete')).merge({ where: { id } }).sql.where;
}
