import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { assertCanManageCalendarDay, calendarConference } from './calendarDayPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCalendarEntryAbilities() {
	abilityBuilder.calendarEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Readers of the schedule see an entry when it has no survey options, or when they picked one
	// of them; the team sees every entry.
	abilityBuilder.calendarEntry.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference
			? { where: { NOT: { surveyOptions: true }, calendarDay: { conference } } }
			: undefined;
	});

	abilityBuilder.calendarEntry.allow('read').when((ctx) => {
		const id = callerUserId(ctx);
		const conference = calendarConference(ctx);
		return id && conference
			? {
					where: {
						surveyOptions: { surveyAnswers: { participant: { userId: id } } },
						calendarDay: { conference }
					}
				}
			: undefined;
	});

	abilityBuilder.calendarEntry.allow('read').when((ctx) => {
		const calendarDay = isTeamMemberOfConference({ ctx });
		return calendarDay ? { where: { calendarDay } } : undefined;
	});

	abilityBuilder.calendarEntry.allow(['update', 'delete']).when((ctx) => {
		const calendarDay = isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES });
		return calendarDay ? { where: { calendarDay } } : undefined;
	});
}

/**
 * Refuses (NOT_FOUND) unless the caller holds `manageParticipants` (project management and
 * participant care) in the day's conference. Triggers check that the named tracks, place and survey
 * options are that conference's and the tracks run on the day (INVALID_INPUT).
 */
export async function assertCanCreateCalendarEntry({
	ctx,
	calendarDayId
}: {
	ctx: ApiContext;
	calendarDayId: string;
}) {
	await assertCanManageCalendarDay({ ctx, calendarDayId });
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the entry: `manageParticipants`
 * (project management and participant care) in its conference. A trigger keeps a moved entry in
 * its conference.
 */
export async function assertCanUpdateCalendarEntry({ ctx, id }: { ctx: ApiContext; id: string }) {
	await db.query.calendarEntry
		.findFirst({
			...(await ctx.abilities.calendarEntry.filter('update')).merge({ where: { id } }).query.single,
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}
