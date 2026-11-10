import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	assertTeamPermission,
	isTeamMemberOfConference,
	linkedChase,
	MIRRORED_CONFERENCE,
	PROJECT_MANAGEMENT_ROLES,
	readableConferenceRows,
	SEAT_PLANNING_ROLES,
	systemAdmin,
	teamConference
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { assertAllowed } from '#api/services/authHelper/utils';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCommitteeAbilities() {
	// The linked CHASE mirrors it (`docs/plans/chase-link.md`), with only these columns.
	abilityBuilder.committee.allow('read').when(
		linkedChase({
			where: { conference: MIRRORED_CONFERENCE },
			columns: { id: true, name: true, abbreviation: true, conferenceId: true }
		})
	);

	// Anyone who may read the conference (`readableConference`) reads its committees: they are part
	// of the seat overview.
	abilityBuilder.committee.allow('read').when(liveWhere(readableConferenceRows));
	abilityBuilder.committee.allow(['update', 'delete']).when(systemAdmin);

	// Project management deletes its conference's committees.
	abilityBuilder.committee
		.allow('delete')
		.when(
			liveWhere((args) => isTeamMemberOfConference({ ...args, roles: PROJECT_MANAGEMENT_ROLES }))
		);
	// Seat planning (project management and content lead) updates its conference's committees: names,
	// headline and seats. Which nations sit in them is checked by `assertCanPlanCommitteeSeats`.
	abilityBuilder.committee
		.allow('update')
		.when(liveWhere((args) => isTeamMemberOfConference({ ...args, roles: SEAT_PLANNING_ROLES })));
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageConference` (project management) in the
 * conference: creating and deleting committees is theirs, editing them seat planning's.
 */
export async function assertCanCreateCommittee({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageConference' });
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the committee: `planSeats`
 * (project management and content lead) in its conference.
 */
export async function assertCanUpdateCommittee({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'committee', action: 'update', id });
}

/**
 * Refuses (NOT_FOUND) unless the caller's delete ability reaches the committee: `manageConference`
 * (project management) in its conference.
 */
export async function assertCanDeleteCommittee({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'committee', action: 'delete', id });
}

/**
 * Refuses (NOT_FOUND) unless the caller holds `planSeats` (project management and content lead) in
 * the committee's conference. Returns the committee's conference.
 */
export async function assertCanPlanCommitteeSeats({
	ctx,
	committeeId
}: {
	ctx: ApiContext;
	committeeId: string;
}) {
	return db.query.committee
		.findFirst({
			where: {
				id: committeeId,
				conference: await teamConference({ ctx, permission: 'planSeats' })
			},
			columns: { conferenceId: true }
		})
		.then(assertFindFirstExists);
}
