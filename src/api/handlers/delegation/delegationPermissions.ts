import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	idIn,
	isTeamMemberOfConference,
	ledDelegationIds,
	linkedChase,
	maskedUntilRelease,
	ownDelegations,
	PARTICIPANT_CARE_ROLES,
	RELEASED_MIRRORED_CONFERENCE,
	releasedIds,
	supervisedDelegations,
	systemAdmin,
	type DelegationInConference,
	type RuleArgs
} from '#api/services/authHelper/rules';
import { liveRule, liveWhere } from '#api/services/authHelper/callerFacts';
import { assertFindFirstExists } from '@m1212e/rumble';

/** The column masked from participants until release: the delegation's assigned role. */
const DELEGATION_ASSIGNMENT = { assignedRoleId: false } as const;

/**
 * The two read rules of a participant's way to some delegations (`maskedUntilRelease`): all of them
 * without the assigned role, those of released conferences with it.
 */
function registerParticipantReads(
	delegations: (args: RuleArgs) => DelegationInConference[] | undefined
) {
	abilityBuilder.delegation.allow('read').when(
		liveRule((args) => {
			const rows = delegations(args);
			return maskedUntilRelease({
				filter: rows && { id: idIn(rows.map((row) => row.id)) },
				assignmentColumns: DELEGATION_ASSIGNMENT
			});
		})
	);
	abilityBuilder.delegation.allow('read').when(
		liveWhere((args) => {
			const rows = delegations(args);
			return rows && { id: idIn(releasedIds({ facts: args.facts, rows })) };
		})
	);
}

export function registerDelegationAbilities() {
	// The linked CHASE mirrors it (`docs/plans/chase-link.md`): only these columns, and people only
	// once the assignment is released.
	abilityBuilder.delegation.allow('read').when(
		linkedChase({
			where: { conference: RELEASED_MIRRORED_CONFERENCE },
			columns: { id: true, conferenceId: true, assignedRoleId: true }
		})
	);

	abilityBuilder.delegation.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Delegates read their own delegation, supervisors the ones they supervise; `assignedRoleId`
	// stays masked until the assignment is released.
	registerParticipantReads(ownDelegations);
	registerParticipantReads(supervisedDelegations);

	// The head delegate may update and delete their delegation until it has applied.
	abilityBuilder.delegation.allow(['update', 'delete']).when(
		liveWhere((args) => {
			const led = ledDelegationIds(args);
			return led && { id: idIn(led), applied: false };
		})
	);

	// Participant care (project management and participant care) reads, updates and deletes the
	// delegations of its conference, applied or not.
	abilityBuilder.delegation
		.allow(['read', 'update', 'delete'])
		.when(
			liveWhere((args) => isTeamMemberOfConference({ ...args, roles: PARTICIPANT_CARE_ROLES }))
		);

	// Every team member reads the delegations of their conference, without `entryCode`: only the
	// members, their supervisors and participant care hand out the join code.
	abilityBuilder.delegation.allow('read').when(
		liveRule((args) => {
			const team = isTeamMemberOfConference(args);
			return team ? { where: team, columns: { entryCode: false } } : undefined;
		})
	);
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the delegation: its head delegate
 * until it has applied, or `manageParticipants` (project management and participant care) in its
 * conference at any time. Returns it with its members, conference and role applications, which
 * `updateDelegation` judges the change by.
 */
export async function assertCanUpdateDelegation({ ctx, id }: { ctx: ApiContext; id: string }) {
	const updatable = (await ctx.abilities.delegation.filter('update')).merge({ where: { id } });
	return db.query.delegation
		.findFirst({
			...updatable.query.single,
			with: {
				members: { with: { participant: { columns: { userId: true } } } },
				conference: true,
				appliedForRoles: true
			}
		})
		.then(assertFindFirstExists);
}

export type UpdatableDelegation = Awaited<ReturnType<typeof assertCanUpdateDelegation>>;

/**
 * Refuses (NOT_FOUND) unless the caller's delete ability reaches the delegation: its head delegate
 * until it has applied, or `manageParticipants` (project management and participant care) in its
 * conference at any time. Returns its id with its members' participant rows, which lose their
 * membership with it.
 */
export async function assertCanDeleteDelegation({ ctx, id }: { ctx: ApiContext; id: string }) {
	const deletable = (await ctx.abilities.delegation.filter('delete')).merge({ where: { id } });
	const delegation = await db.query.delegation
		.findFirst({
			...deletable.query.single,
			columns: { id: true },
			with: { members: { columns: { conferenceParticipantId: true } } }
		})
		.then(assertFindFirstExists);
	return {
		id: delegation.id,
		participantIds: delegation.members.map((member) => member.conferenceParticipantId)
	};
}
