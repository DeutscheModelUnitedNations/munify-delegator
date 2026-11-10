import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	caredForVia,
	idIn,
	linkedChase,
	maskedUntilRelease,
	RELEASED_MIRRORED_CONFERENCE,
	releasedIds,
	type RuleArgs,
	systemAdmin
} from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { liveRule, liveWhere } from '#api/services/authHelper/callerFacts';
import { assertFindFirstExists } from '@m1212e/rumble';

/** The column masked from participants until release: the single participant's assigned role. */
const SINGLE_PARTICIPANT_ASSIGNMENT = { assignedRoleId: false } as const;

/** The caller's own single participant registrations; undefined for an anonymous caller. */
function ownRegistrations({ ctx, facts }: RuleArgs) {
	return callerUserId(ctx) ? facts.singleParticipations : undefined;
}

/** The single participants the caller supervises; undefined for an anonymous caller. */
function supervisedRegistrations({ ctx, facts }: RuleArgs) {
	if (!callerUserId(ctx)) return undefined;
	return facts.supervised.flatMap(({ singleParticipantId, conferenceId }) =>
		singleParticipantId ? [{ id: singleParticipantId, conferenceId }] : []
	);
}

/**
 * The two read rules of a participant's way to some single participants (`maskedUntilRelease`): all
 * of them without the assigned role, those of released conferences with it.
 */
function registerParticipantReads(
	registrations: (args: RuleArgs) => readonly { id: string; conferenceId: string }[] | undefined
) {
	abilityBuilder.singleParticipant.allow('read').when(
		liveRule((args) => {
			const rows = registrations(args);
			return maskedUntilRelease({
				filter: rows && { id: idIn(rows.map((row) => row.id)) },
				assignmentColumns: SINGLE_PARTICIPANT_ASSIGNMENT
			});
		})
	);
	abilityBuilder.singleParticipant.allow('read').when(
		liveWhere((args) => {
			const rows = registrations(args);
			return rows && { id: idIn(releasedIds({ facts: args.facts, rows })) };
		})
	);
}

export function registerSingleParticipantAbilities() {
	// The linked CHASE mirrors it (`docs/plans/chase-link.md`): only these columns, and people only
	// once the assignment is released.
	abilityBuilder.singleParticipant.allow('read').when(
		linkedChase({
			where: { conference: RELEASED_MIRRORED_CONFERENCE },
			columns: { id: true, conferenceParticipantId: true, assignedRoleId: true }
		})
	);

	abilityBuilder.singleParticipant.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Everyone reads their own registration, supervisors those they supervise; `assignedRoleId` stays
	// masked until the assignment is released.
	registerParticipantReads(ownRegistrations);
	registerParticipantReads(supervisedRegistrations);

	// Participant care (project management and participant care) reads, updates and deletes the
	// single participants of its conference (through the person's part in it, which holds the
	// conference).
	abilityBuilder.singleParticipant
		.allow(['read', 'update', 'delete'])
		.when(liveWhere((args) => caredForVia(args, 'participant')));

	// Everyone updates and withdraws their own registration until it is sent in.
	abilityBuilder.singleParticipant.allow(['update', 'delete']).when(
		liveWhere((args) => {
			const rows = ownRegistrations(args);
			return rows && { id: idIn(rows.map((row) => row.id)), applied: false };
		})
	);
}

/**
 * Lets a signed-in caller register themselves as a single participant; the role being a custom
 * role of the conference is the database's check (`single_participant_same_conference`,
 * `single_participant_role_kind`). Whether they may register at all (not already in the conference
 * otherwise, the registration window) is the service's. Returns the caller's id, who is the one
 * registered.
 */
export function assertCanCreateSingleParticipant(ctx: ApiContext) {
	return { callerId: ctx.mustBeLoggedIn().sub };
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the single participant - their
 * own registration until it is sent in, or `manageParticipants` (project management and
 * participant care) in its conference. The roles it applies for being custom roles of its
 * conference is the database's check (`single_participant_role_wish_same_conference`,
 * `single_participant_role_wish_role_kind`).
 */
export async function assertCanUpdateSingleParticipant({
	ctx,
	id
}: {
	ctx: ApiContext;
	id: string;
}) {
	// Checked up front: the role changes go to the join table directly, so an update that matched
	// no row would otherwise not stop them.
	await db.query.singleParticipant
		.findFirst({
			...(await ctx.abilities.singleParticipant.filter('update')).merge({ where: { id } }).query
				.single,
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}

/**
 * Refuses unless the caller holds `manageParticipants` (project management and participant care) in
 * the conference, who place a user straight into a role. The role being one of its custom roles is
 * the database's check (`single_participant_same_conference`, `single_participant_role_kind`).
 */
export async function assertCanCreateAppliedSingleParticipant({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageParticipants' });
}
