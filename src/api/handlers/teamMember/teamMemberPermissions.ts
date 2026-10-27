import { db, schema } from '#api/db/db.js';
import { apiError } from '#api/services/errors/apiError.js';
import { m } from '#lib/paraglide/messages.js';
import type { TeamRole } from '#api/services/authHelper.js';
import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import {
	assertAllowedRow,
	assertMayGrantRole,
	isTeamMemberOfConference,
	PROJECT_MANAGEMENT_ROLES,
	systemAdmin,
	where
} from '#api/services/authHelper.js';

export function registerTeamMemberAbilities() {
	abilityBuilder.teamMember.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Team members can see each other.
	abilityBuilder.teamMember.allow('read').when((ctx) => where(isTeamMemberOfConference(ctx)));

	// Project management removes anybody from the team, or gives them another role.
	abilityBuilder.teamMember
		.allow(['update', 'delete'])
		.when((ctx) => where(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));

	// Team coordinators remove anybody but project management. Who joins, with which role, goes
	// through invitations (see `assertMayGrantRole`).
	abilityBuilder.teamMember.allow(['update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference(ctx, ['TEAM_COORDINATOR']);
		return team ? { where: { ...team, role: { ne: 'PROJECT_MANAGEMENT' } } } : undefined;
	});
}

/**
 * Refuses unless the caller may change team member `id` (the row's update ability) and hand out
 * `role` in its conference, the same as inviting somebody with it (`assertMayGrantRole`).
 */
export async function assertCanChangeTeamRole(ctx: ApiContext, id: string, role: TeamRole) {
	const member = await db.query.teamMember.findFirst({
		...(await ctx.abilities.teamMember.filter('update')).merge({ where: { id } }).query.single,
		columns: { conferenceId: true }
	});
	if (!member) throw apiError('NOT_FOUND', m.updateNotFoundOrForbidden());
	await assertMayGrantRole(ctx, member.conferenceId, role);
}

/** Refuses unless the caller may remove team member `id` from its team. */
export async function assertCanDeleteTeamMember(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.teamMember,
		(await ctx.abilities.teamMember.filter('delete')).merge({ where: { id } }).sql.where
	);
}
