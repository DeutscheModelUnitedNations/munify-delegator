import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import type { Context } from '#api/context';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	hasPartIn,
	isTeamMemberOfConference,
	systemAdmin,
	teamConference
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/**
 * The conferences whose schedule (calendar days, tracks, entries, places, site plans) the caller
 * may read: the team's always, a participant's once the team has switched the calendar on
 * (`showCalendar`), which is when the dashboard shows it. Undefined for an anonymous caller.
 */
export function calendarConference(ctx: Context) {
	return hasPartIn({ ctx, asParticipant: { showCalendar: true } });
}

export function registerCalendarDayAbilities() {
	// Whoever reads the conference's schedule (`calendarConference`) reads its days.
	abilityBuilder.calendarDay.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference ? { where: { conference } } : undefined;
	});
	abilityBuilder.calendarDay.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care (project management and participant care) updates and deletes its
	// conference's days; the mutations check the same through `assertCanManageCalendarDay`.
	abilityBuilder.calendarDay
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageParticipants` (project management and
 * participant care) in the conference, who add days to its calendar, by hand or by import.
 */
export async function assertCanCreateCalendarDay({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * Refuses (NOT_FOUND) unless the calendar day exists in a conference where the caller holds
 * `manageParticipants` (project management and participant care), who change and delete days and
 * put entries on them. Returns the day's conference id.
 */
export async function assertCanManageCalendarDay({
	ctx,
	calendarDayId
}: {
	ctx: ApiContext;
	calendarDayId: string;
}) {
	const day = await db.query.calendarDay.findFirst({
		where: {
			id: calendarDayId,
			conference: teamConference({ ctx, permission: 'manageParticipants' })
		},
		columns: { conferenceId: true }
	});
	if (!day) {
		throw apiError({ code: 'NOT_FOUND', message: m.calendarDayNotFound() });
	}
	return { conferenceId: day.conferenceId };
}
