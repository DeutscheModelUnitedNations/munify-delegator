import { db, schema } from '$api/db/db';
import { type ApiContext, abilityBuilder } from '$api/rumble';
import {
	assertAllowedRow,
	assertTeamRole,
	isTeamMemberOfConference,
	PAPER_ROLES,
	SEAT_PLANNING_ROLES,
	systemAdmin
} from '$api/services/authHelper';
import { m } from '#lib/paraglide/messages.js';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerCommitteeAgendaItemAbilities() {
	// Ported from abilities/entities/committeeAgendaItem.ts
	abilityBuilder.committeeAgendaItem.allow('read');
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
	await assertAllowedRow(
		schema.committeeAgendaItem,
		(await ctx.abilities.committeeAgendaItem.filter('update')).merge({ where: { id } }).sql.where,
		m.updateNotFoundOrForbidden
	);
}

/** Refuses unless the caller's delete ability matches the agenda item. */
export async function assertCanDeleteAgendaItem(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.committeeAgendaItem,
		(await ctx.abilities.committeeAgendaItem.filter('delete')).merge({ where: { id } }).sql.where
	);
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
