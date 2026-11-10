import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	conferenceParticipantWithRegistration,
	hop,
	NOTHING,
	isSystemAdmin,
	isTeamMemberOfConference,
	systemAdmin,
	type RuleArgs
} from '#api/services/authHelper/rules';
import { callerFacts, liveWhere, teamConferenceIdsIn } from '#api/services/authHelper/callerFacts';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * The columns everybody reads of every school: its name, where it is and whether it is an
 * Auslandsschule, so applicants can pick it. Schools are shared by every conference; the rest
 * (address, contact, the team's notes) is participant care's (`schoolOfCaredFor`).
 */
const PUBLIC_COLUMNS = {
	id: true,
	createdAt: true,
	updatedAt: true,
	name: true,
	city: true,
	region: true,
	country: true,
	isForeignSchool: true
};

/**
 * Matches a School row that a registered participant (`registeredParticipantIn`) or waiting list
 * entrant of a conference where the caller is participant care (project management and participant
 * care) names as their own - the same people `isCaredForUser` reaches.
 */
function schoolOfCaredFor(args: RuleArgs) {
	return hop(
		isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES }),
		(ofConference) => ({
			OR: [
				{ waitingListEntries: ofConference },
				{ participants: { ...ofConference, ...conferenceParticipantWithRegistration } }
			]
		})
	);
}

/**
 * `schoolOfCaredFor`, as long as nobody outside the caller's conferences names the school: a
 * school is shared by every conference, and deleting it takes it from everybody naming it.
 */
function deletableSchoolOfCaredFor(args: RuleArgs) {
	// a system admin deletes every school anyway
	if (isSystemAdmin(args.ctx)) return undefined;
	const caredFor = schoolOfCaredFor(args);
	const ofConference = isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES });
	if (!caredFor || !ofConference) return undefined;
	if (caredFor === NOTHING) return NOTHING;
	const elsewhere = { NOT: ofConference };
	return {
		AND: [
			caredFor,
			{ NOT: { waitingListEntries: elsewhere } },
			{ NOT: { participants: elsewhere } }
		]
	};
}

export function registerSchoolAbilities() {
	// System admins read, update and delete every school.
	abilityBuilder.school.allow(['read', 'update', 'delete']).when(systemAdmin);
	// Everybody, signed in or not, reads every school's `PUBLIC_COLUMNS`.
	abilityBuilder.school.allow('read').when(() => ({ columns: PUBLIC_COLUMNS }));
	// Participant care reads in full and updates the schools of the people of its conferences.
	abilityBuilder.school.allow(['read', 'update']).when(liveWhere(schoolOfCaredFor));
	// It deletes those of them nobody outside its conferences names (`deletableSchoolOfCaredFor`).
	abilityBuilder.school.allow('delete').when(liveWhere(deletableSchoolOfCaredFor));
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches every school in `ids`:
 * participant care (project management and participant care) reaches the schools the people of
 * its conferences name as their own (`schoolOfCaredFor`).
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
	const facts = await callerFacts(ctx);
	return { conferenceIds: teamConferenceIdsIn({ facts, roles: PARTICIPANT_CARE_ROLES }) };
}
