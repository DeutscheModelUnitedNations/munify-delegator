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
	// System admins read, update and delete every team membership.
	abilityBuilder.teamMember.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Team members read the memberships of every team they are on.
	abilityBuilder.teamMember
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx })));

	// Project management changes the role of anybody on its team, or removes them.
	abilityBuilder.teamMember
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PROJECT_MANAGEMENT_ROLES })));

	// Team coordinators do the same for anybody on their team but project management. Which role
	// someone may be given is checked on top (`assertCanGrantTeamRole`).
	abilityBuilder.teamMember.allow(['update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference({ ctx, roles: ['TEAM_COORDINATOR'] });
		return team ? { where: { ...team, role: { ne: 'PROJECT_MANAGEMENT' } } } : undefined;
	});
}

/**
 * Refuses unless the caller may change team member `id` (the row's update ability) and hand out
 * `role` in its conference, the same as inviting somebody with it (`assertCanGrantTeamRole`).
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
	await assertCanGrantTeamRole({ ctx, conferenceId: member.conferenceId, role });
}

/**
 * Refuses unless the caller may hand out `role` on the conference's team: `manageTeam` (project
 * management, team coordinators) for any role, `manageConference` (project management) for project
 * management itself - otherwise a coordinator could promote themselves.
 */
export async function assertCanGrantTeamRole({
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
