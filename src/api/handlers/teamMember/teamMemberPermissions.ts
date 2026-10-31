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

	// Every team member reads the memberships of their conference.
	abilityBuilder.teamMember
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx })));

	// Project management updates and deletes anybody on its team (a role change, a removal).
	abilityBuilder.teamMember
		.allow(['update', 'delete'])
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PROJECT_MANAGEMENT_ROLES })));

	// Team coordinators update and delete anybody on their team but project management. Which role
	// someone may be given is checked on top (`assertCanGrantTeamRole`).
	abilityBuilder.teamMember.allow(['update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference({ ctx, roles: ['TEAM_COORDINATOR'] });
		return team ? { where: { ...team, role: { ne: 'PROJECT_MANAGEMENT' } } } : undefined;
	});
}

/**
 * Refuses (NOT_FOUND) unless the caller's update ability reaches team member `id` (project
 * management for anybody, team coordinators for anybody but project management), and (FORBIDDEN)
 * unless they may hand out `role` in its conference, the same as inviting somebody with it
 * (`assertCanGrantTeamRole`). Returns the membership's conference id.
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
	return { conferenceId: member.conferenceId };
}

/**
 * Refuses (FORBIDDEN) unless the caller may hand out `role` on the conference's team: `manageTeam`
 * (project management, team coordinators) for any role, `manageConference` (project management) for
 * project management itself - otherwise a coordinator could promote themselves.
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
