import { db } from '#api/db/db.js';
import { type ApiContext, abilityBuilder } from '#api/rumble.js';
import {
	assertTeamRole,
	isTeamMemberOfConference,
	PAPER_ROLES,
	readableConference,
	SEAT_PLANNING_ROLES,
	systemAdmin,
	assertAllowedById
} from '#api/services/authHelper.js';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCommitteeAgendaItemAbilities() {
	// The topics are part of the seat overview: readable wherever their committee's conference is.
	abilityBuilder.committeeAgendaItem
		.allow('read')
		.when((ctx) => ({ where: { committee: { conference: readableConference(ctx) } } }));
	abilityBuilder.committeeAgendaItem.allow(['update', 'delete']).when(systemAdmin);

	// Scoped through the committee, since an agenda item has no direct conference relation.
	abilityBuilder.committeeAgendaItem.allow(['update', 'delete']).when((ctx) => {
		const committee = isTeamMemberOfConference(ctx, SEAT_PLANNING_ROLES);
		return committee ? { where: { committee } } : undefined;
	});
}

/**
 * The chase integration creates agenda items with the `service_user` OIDC role; the conference's
 * project management may add them by hand.
 */
export async function assertCanCreateAgendaItem(ctx: ApiContext, committeeId: string) {
	const committee = await db.query.committee
		.findFirst({ where: { id: committeeId }, columns: { conferenceId: true } })
		.then(assertFindFirstExists);
	if (!ctx.hasRole('service_user')) {
		await assertTeamRole(ctx, committee.conferenceId, SEAT_PLANNING_ROLES);
	}
}

/** Refuses unless the caller's update ability matches the agenda item. */
export async function assertCanUpdateAgendaItem(ctx: ApiContext, id: string) {
	await assertAllowedById(ctx, 'committeeAgendaItem', 'update', id);
}

/**
 * Reviewers get this on top of the update ability, which they do not otherwise hold for agenda
 * items - hence a role check rather than an ability filter.
 */
export async function assertCanSetAgendaItemReviewHelpStatus(
	ctx: ApiContext,
	agendaItemId: string
) {
	const agendaItem = await db.query.committeeAgendaItem
		.findFirst({
			where: { id: agendaItemId },
			with: { committee: { columns: { conferenceId: true } } }
		})
		.then(assertFindFirstExists);

	await assertTeamRole(ctx, agendaItem.committee.conferenceId, PAPER_ROLES);
}
