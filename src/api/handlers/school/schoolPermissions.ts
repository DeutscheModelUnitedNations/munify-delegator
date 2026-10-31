import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamPermission,
	isSystemAdmin,
	isTeamMemberOf,
	registeredParticipantIn,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';
import type { Context } from '#api/context';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * The columns everybody reads of every school: its name and where it is, so applicants can pick
 * it. Schools are shared by every conference; the rest (address, contact, the team's notes) is
 * participant care's (`schoolOfCaredFor`).
 */
const PUBLIC_COLUMNS = {
	id: true,
	createdAt: true,
	updatedAt: true,
	name: true,
	city: true,
	region: true,
	country: true
};

/**
 * Matches a School row that a registered participant (`registeredParticipantIn`) or waiting list
 * entrant of a conference where the caller is participant care (project management and participant
 * care) names as their own - the same people `isCaredForUser` reaches.
 */
function schoolOfCaredFor(ctx: Context) {
	const conference = isTeamMemberOf({ ctx, roles: PARTICIPANT_CARE_ROLES });
	if (!conference) return undefined;
	return {
		OR: [
			{ waitingListEntries: { conference } },
			{ participants: registeredParticipantIn(conference) }
		]
	};
}

export function registerSchoolAbilities() {
	// System admins read, update and delete every school.
	abilityBuilder.school.allow(['read', 'update', 'delete']).when(systemAdmin);
	// Everybody, signed in or not, reads every school's `PUBLIC_COLUMNS`.
	abilityBuilder.school.allow('read').when(() => ({ columns: PUBLIC_COLUMNS }));
	// Participant care reads in full and updates the schools of the people of its conferences.
	abilityBuilder.school.allow(['read', 'update']).when((ctx) => grantWhere(schoolOfCaredFor(ctx)));
}

/**
 * Refuses (NOT_FOUND) unless the caller may update every school in `ids`, which participant care
 * may for the schools of its conferences' people (`schoolOfCaredFor`).
 */
export async function assertCanUpdateSchools({
	ctx,
	ids
}: {
	ctx: ApiContext;
	ids: readonly string[];
}) {
	const unique = [...new Set(ids)];
	const allowed = await db.query.school.findMany({
		...(await ctx.abilities.school.filter('update')).merge({ where: { id: { in: unique } } }).query
			.many,
		columns: { id: true }
	});
	if (allowed.length !== unique.length) {
		throw apiError({ code: 'NOT_FOUND', message: m.schoolNotFound() });
	}
}

/**
 * Refuses unless the caller may update the school (`assertCanUpdateSchools`). Returns the ids of
 * the conferences whose numbers of it they may see: those where they are participant care, or
 * every one (`undefined`) for a system admin. Managing a school is no reason to learn about the
 * conferences of other organizers.
 */
export async function assertCanReadSchoolMetrics({
	ctx,
	schoolId
}: {
	ctx: ApiContext;
	schoolId: string;
}) {
	await assertCanUpdateSchools({ ctx, ids: [schoolId] });
	if (isSystemAdmin(ctx)) return { conferenceIds: undefined };
	const caredFor = await db.query.conference.findMany({
		where: isTeamMemberOf({ ctx, roles: PARTICIPANT_CARE_ROLES }),
		columns: { id: true }
	});
	return { conferenceIds: caredFor.map((conference) => conference.id) };
}

/**
 * Refuses unless the caller holds `manageParticipants` in the conference: its schools page, with
 * every school's numbers.
 */
export async function assertCanReadConferenceSchools({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
