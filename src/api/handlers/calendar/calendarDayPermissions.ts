import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	hasPartInConference,
	isTeamMemberOfConference,
	systemAdmin,
	teamConference,
	type RuleArgs
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

/**
 * Matches the rows (by their own `conferenceId`) of the conferences whose schedule (days, tracks,
 * entries, places, site plans) the caller reads: as team member always, as participant once
 * `showCalendar` is on. Undefined for an anonymous caller.
 */
export function calendarConference(args: RuleArgs) {
	return hasPartInConference({ ...args, asParticipant: (conference) => conference.showCalendar });
}

export function registerCalendarDayAbilities() {
	abilityBuilder.calendarDay.allow('read').when(liveWhere(calendarConference));
	abilityBuilder.calendarDay.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care (project management and participant care) updates and deletes its
	// conference's days; the mutations check the same through `assertCanManageCalendarDay`.
	abilityBuilder.calendarDay
		.allow(['update', 'delete'])
		.when(
			liveWhere((args) => isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES }))
		);
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
			conference: await teamConference({ ctx, permission: 'manageParticipants' })
		},
		columns: { conferenceId: true }
	});
	if (!day) {
		throw apiError({ code: 'NOT_FOUND', message: m.calendarDayNotFound() });
	}
	return { conferenceId: day.conferenceId };
}
