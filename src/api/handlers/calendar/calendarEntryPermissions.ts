import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	isOwnParticipation,
	isTeamMemberOfConference,
	systemAdmin,
	hop
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { assertCanManageCalendarDay, calendarConference } from './calendarDayPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCalendarEntryAbilities() {
	abilityBuilder.calendarEntry.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Readers of the schedule see an entry when it has no survey options, or when they picked one
	// of them; the team sees every entry.
	abilityBuilder.calendarEntry.allow('read').when(
		liveWhere((args) => {
			const calendarDay = calendarConference(args);
			return hop(calendarDay, (calendarDay) => ({ NOT: { surveyOptions: true }, calendarDay }));
		})
	);

	abilityBuilder.calendarEntry.allow('read').when(
		liveWhere((args) => {
			const own = isOwnParticipation(args);
			const calendarDay = calendarConference(args);
			return own && calendarDay
				? { surveyOptions: { surveyAnswers: own }, calendarDay }
				: undefined;
		})
	);

	abilityBuilder.calendarEntry.allow('read').when(
		liveWhere((args) => {
			const calendarDay = isTeamMemberOfConference(args);
			return hop(calendarDay, (calendarDay) => ({ calendarDay }));
		})
	);

	abilityBuilder.calendarEntry.allow(['update', 'delete']).when(
		liveWhere((args) => {
			const calendarDay = isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES });
			return hop(calendarDay, (calendarDay) => ({ calendarDay }));
		})
	);
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
