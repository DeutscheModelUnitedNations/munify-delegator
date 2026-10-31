import { db } from '#api/db/db';
import { type ApiContext, abilityBuilder } from '#api/rumble';
import {
	isTeamMemberOfConference,
	readableConference,
	SEAT_PLANNING_ROLES,
	systemAdmin,
	teamConference
} from '#api/services/authHelper/rules';
import { assertAllowed } from '#api/services/authHelper/utils';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCommitteeAgendaItemAbilities() {
	// Anyone who may read the conference (`readableConference`) reads its committees' agenda items:
	// they are part of the seat overview.
	abilityBuilder.committeeAgendaItem
		.allow('read')
		.when((ctx) => ({ where: { committee: { conference: readableConference(ctx) } } }));
	abilityBuilder.committeeAgendaItem.allow(['update', 'delete']).when(systemAdmin);

	// Seat planning (project management and content lead) updates and deletes the agenda items of its
	// conference's committees.
	abilityBuilder.committeeAgendaItem.allow(['update', 'delete']).when((ctx) => {
		const committee = isTeamMemberOfConference({ ctx, roles: SEAT_PLANNING_ROLES });
		return committee ? { where: { committee } } : undefined;
	});
}

/**
 * Refuses unless the committee exists and the caller is a service user (the chase integration,
 * any conference) or holds `planSeats` (project management and content lead) in its conference.
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
				...(ctx.hasRole('service_user')
					? {}
					: { conference: teamConference({ ctx, permission: 'planSeats' }) })
			},
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}

/** Refuses unless the caller may update the agenda item (seat planning of its conference). */
export async function assertCanUpdateAgendaItem({ ctx, id }: { ctx: ApiContext; id: string }) {
	await assertAllowed({ ctx, table: 'committeeAgendaItem', action: 'update', id });
}

/**
 * Refuses unless the caller holds `reviewPapers` (the team but plain members) in the agenda item's
 * conference. Reviewers set the review help status without otherwise being able to update agenda
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
				committee: { conference: teamConference({ ctx, permission: 'reviewPapers' }) }
			},
			columns: { id: true }
		})
		.then(assertFindFirstExists);
}
