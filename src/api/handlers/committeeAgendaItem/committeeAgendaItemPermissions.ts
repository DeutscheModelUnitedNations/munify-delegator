import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	isTeamMemberOfConference,
	linkedChase,
	MIRRORED_CONFERENCE,
	readableConferenceRows,
	SEAT_PLANNING_ROLES,
	systemAdmin,
	teamConference,
	hop
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { assertAllowed } from '#api/services/authHelper/utils';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCommitteeAgendaItemAbilities() {
	// The linked CHASE mirrors it (`docs/plans/chase-link.md`), with only these columns.
	abilityBuilder.committeeAgendaItem.allow('read').when(
		linkedChase({
			where: { committee: { conference: MIRRORED_CONFERENCE } },
			columns: { id: true, title: true, committeeId: true }
		})
	);

	// Anyone who may read the conference (`readableConference`) reads its committees' agenda items:
	// they are part of the seat overview.
	abilityBuilder.committeeAgendaItem
		.allow('read')
		.when(liveWhere((args) => ({ committee: readableConferenceRows(args) })));
	abilityBuilder.committeeAgendaItem.allow(['update', 'delete']).when(systemAdmin);

	// Seat planning (project management and content lead) updates and deletes the agenda items of its
	// conference's committees.
	abilityBuilder.committeeAgendaItem.allow(['update', 'delete']).when(
		liveWhere((args) => {
			const committee = isTeamMemberOfConference({ ...args, roles: SEAT_PLANNING_ROLES });
			return hop(committee, (committee) => ({ committee }));
		})
	);
}

/**
 * Refuses (NOT_FOUND) unless the committee exists and the caller holds `planSeats` (project
 * management and content lead) in its conference. An integration creating agenda items (chase)
 * needs that team role in the conference, or a system admin account.
 */
export async function assertCanCreateAgendaItem({
	ctx,
	committeeId
}: {
	ctx: ApiContext;
	committeeId: string;
}) {
	await db.query.committee
		.findFirst({
			where: {
				id: committeeId,
				conference: await teamConference({ ctx, permission: 'planSeats' })
			},
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches the agenda item: `planSeats`
 * (project management and content lead) in its conference.
 */
export async function assertCanUpdateAgendaItem({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'committeeAgendaItem', action: 'update', id });
}

/**
 * Refuses (NOT_FOUND) unless the caller's delete ability reaches the agenda item: `planSeats`
 * (project management and content lead) in its conference.
 */
export async function assertCanDeleteAgendaItem({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'committeeAgendaItem', action: 'delete', id });
}

/**
 * Refuses (NOT_FOUND) unless the caller holds `reviewPapers` (the team but plain members) in the
 * agenda item's conference. Reviewers set the review help status without otherwise being able to update agenda
 * items.
 */
export async function assertCanSetAgendaItemReviewHelpStatus({
	ctx,
	agendaItemId
}: {
	ctx: ApiContext;
	agendaItemId: string;
}) {
	await db.query.committeeAgendaItem
		.findFirst({
			where: {
				id: agendaItemId,
				committee: { conference: await teamConference({ ctx, permission: 'reviewPapers' }) }
			},
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}
