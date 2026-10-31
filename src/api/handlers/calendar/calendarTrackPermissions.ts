import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { assertAllowed, grantWhere } from '#api/services/authHelper/utils';
import { calendarConference } from './calendarDayPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCalendarTrackAbilities() {
	abilityBuilder.calendarTrack.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference ? { where: { conference } } : undefined;
	});
	abilityBuilder.calendarTrack.allow(['read', 'update', 'delete']).when(systemAdmin);

	abilityBuilder.calendarTrack
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageParticipants` (project management and
 * participant care) in the conference. Triggers check that the named days, committees and roles
 * are that conference's (INVALID_INPUT).
 */
export async function assertCanCreateCalendarTrack({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the track: `manageParticipants`
 * (project management and participant care) in its conference.
 */
export async function assertCanUpdateCalendarTrack({ ctx, id }: { ctx: ApiContext; id: string }) {
	await db.query.calendarTrack
		.findFirst({
			...(await ctx.abilities.calendarTrack.filter('update')).merge({ where: { id } }).query.single,
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}

/**
 * Refuses (NOT_FOUND) unless the caller's delete ability reaches the track: `manageParticipants`
 * (project management and participant care) in its conference.
 */
export async function assertCanDeleteCalendarTrack({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'calendarTrack', action: 'delete', id });
}
