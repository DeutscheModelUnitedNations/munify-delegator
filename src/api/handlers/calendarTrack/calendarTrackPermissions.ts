import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';
import { calendarConference } from '#api/handlers/calendarDay/calendarDayPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors';

export function registerCalendarTrackAbilities() {
	// Whoever reads the conference's schedule (`calendarConference`) reads its tracks.
	abilityBuilder.calendarTrack.allow('read').when((ctx) => {
		const conference = calendarConference(ctx);
		return conference ? { where: { conference } } : undefined;
	});
	abilityBuilder.calendarTrack.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Participant care (project management and participant care) updates and deletes them.
	abilityBuilder.calendarTrack
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PARTICIPANT_CARE_ROLES })));
}

/** What a track names besides its conference. */
interface TrackReferences {
	calendarDayIds?: readonly string[] | null;
	committeeIds?: readonly string[] | null;
	conferenceRoleIds?: readonly string[] | null;
}

/** Whether every one of `ids` is found by `count` (the rows of the conference among them). */
async function allFound({
	ids,
	count
}: {
	ids: readonly string[] | null | undefined;
	count: (ids: string[]) => Promise<number>;
}) {
	const distinct = [...new Set(ids ?? [])];
	return distinct.length === 0 || (await count(distinct)) === distinct.length;
}

/**
 * Refuses (INVALID_INPUT) unless the days, committees and roles a track names are the
 * conference's, so a track cannot reach into another conference's schedule or seats.
 */
async function assertReferencesInConference({
	conferenceId,
	refs
}: {
	conferenceId: string;
	refs: TrackReferences;
}) {
	const found = await Promise.all([
		allFound({
			ids: refs.calendarDayIds,
			count: (ids) =>
				db.query.calendarDay
					.findMany({ where: { id: { in: ids }, conferenceId }, columns: { id: true } })
					.then((rows) => rows.length)
		}),
		allFound({
			ids: refs.committeeIds,
			count: (ids) =>
				db.query.committee
					.findMany({ where: { id: { in: ids }, conferenceId }, columns: { id: true } })
					.then((rows) => rows.length)
		}),
		allFound({
			ids: refs.conferenceRoleIds,
			count: (ids) =>
				db.query.conferenceRole
					.findMany({ where: { id: { in: ids }, conferenceId }, columns: { id: true } })
					.then((rows) => rows.length)
		})
	]);
	if (found.includes(false)) {
		throw apiError({ code: 'INVALID_INPUT', message: m.calendarTrackOtherConference() });
	}
}

/**
 * Refuses unless the caller holds `manageParticipants` (project management and participant care) in
 * the conference, and the days, committees and roles the track names are the conference's.
 */
export async function assertCanCreateCalendarTrack({
	ctx,
	conferenceId,
	refs
}: {
	ctx: ApiContext;
	conferenceId: string;
	refs: TrackReferences;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
	await assertReferencesInConference({ conferenceId, refs });
}

/**
 * Refuses unless the caller may update the track (participant care of its conference), and the
 * days, committees and roles it is given are its conference's.
 */
export async function assertCanUpdateCalendarTrack({
	ctx,
	id,
	refs
}: {
	ctx: ApiContext;
	id: string;
	refs: TrackReferences;
}) {
	const track = await db.query.calendarTrack
		.findFirst({
			...(await ctx.abilities.calendarTrack.filter('update')).merge({ where: { id } }).query.single,
			columns: { conferenceId: true }
		})
		.then(assertFindFirstExists);
	await assertReferencesInConference({ conferenceId: track.conferenceId, refs });
}
