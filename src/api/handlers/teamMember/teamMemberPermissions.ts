import { db } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import type { TeamRole } from '#api/services/authHelper/rules';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	isTeamMemberOfConference,
	PROJECT_MANAGEMENT_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';

export function registerTeamMemberAbilities() {
	abilityBuilder.teamMember.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Team members can see each other.
	abilityBuilder.teamMember
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx })));

	// Project management removes anybody from the team, or gives them another role.
	abilityBuilder.teamMember
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PROJECT_MANAGEMENT_ROLES })));

	// Team coordinators remove anybody but project management. Who joins, with which role, goes
	// through invitations (see `assertMayGrantRole`).
	abilityBuilder.teamMember.allow(['update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference({ ctx, roles: ['TEAM_COORDINATOR'] });
		return team ? { where: { ...team, role: { ne: 'PROJECT_MANAGEMENT' } } } : undefined;
	});
}

/**
 * Refuses unless the caller may change team member `id` (the row's update ability) and hand out
 * `role` in its conference, the same as inviting somebody with it (`assertMayGrantRole`).
 */
export async function assertCanChangeTeamRole({
	ctx,
	id,
	role
}: {
	ctx: ApiContext;
	id: string;
	role: TeamRole;
}) {
	const member = await db.query.teamMember.findFirst({
		...(await ctx.abilities.teamMember.filter('update')).merge({ where: { id } }).query.single,
		columns: { conferenceId: true }
	});
	if (!member) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	await assertMayGrantRole({ ctx, conferenceId: member.conferenceId, role });
}

/**
 * Refuses to hand out a team role the caller may not grant: project management and team
 * coordinators manage the team, but only project management (or an admin) makes somebody project
 * management - otherwise a coordinator could promote themselves.
 */
export async function assertMayGrantRole({
	ctx,
	conferenceId,
	role
}: {
	ctx: ApiContext;
	conferenceId: string;
	role: TeamRole;
}) {
	await assertTeamPermission({
		ctx,
		conferenceId,
		permission: role === 'PROJECT_MANAGEMENT' ? 'manageConference' : 'manageTeam'
	});
}
