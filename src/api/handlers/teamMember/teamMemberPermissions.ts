import { schema } from '#api/db/db.js';
import { abilityBuilder, type ApiContext } from '#api/rumble.js';
import {
	assertAllowedRow,
	isTeamMemberOfConference,
	PROJECT_MANAGEMENT_ROLES,
	systemAdmin,
	where
} from '#api/services/authHelper.js';

export function registerTeamMemberAbilities() {
	abilityBuilder.teamMember.allow(['read', 'delete']).when(systemAdmin);

	// Team members can see each other.
	abilityBuilder.teamMember.allow('read').when((ctx) => where(isTeamMemberOfConference(ctx)));

	// Project management removes anybody from the team.
	abilityBuilder.teamMember
		.allow('delete')
		.when((ctx) => where(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));

	// Team coordinators remove anybody but project management. Who joins, with which role, goes
	// through invitations (see `assertMayGrantRole`).
	abilityBuilder.teamMember.allow('delete').when((ctx) => {
		const team = isTeamMemberOfConference(ctx, ['TEAM_COORDINATOR']);
		return team ? { where: { ...team, role: { ne: 'PROJECT_MANAGEMENT' } } } : undefined;
	});
}

/** Refuses unless the caller may remove team member `id` from its team. */
export async function assertCanDeleteTeamMember(ctx: ApiContext, id: string) {
	await assertAllowedRow(
		schema.teamMember,
		(await ctx.abilities.teamMember.filter('delete')).merge({ where: { id } }).sql.where
	);
}
