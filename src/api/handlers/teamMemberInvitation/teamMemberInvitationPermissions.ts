import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PROJECT_MANAGEMENT_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin,
	type TeamRole
} from '#api/services/authHelper/rules';
import { assertCanGrantTeamRole } from '#api/handlers/teamMember/teamMemberPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerTeamMemberInvitationAbilities() {
	// System admins read, update and delete every invitation.
	abilityBuilder.teamMemberInvitation.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Masks the token: only its hash is stored, and nothing in the app needs even that back.
	const WITHOUT_TOKEN = { token: false };

	// Project management reads, updates and deletes every invitation of its conference.
	abilityBuilder.teamMemberInvitation.allow(['read', 'update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference({ ctx, roles: PROJECT_MANAGEMENT_ROLES });
		return team ? { where: team, columns: WITHOUT_TOKEN } : undefined;
	});

	// Team coordinators read, update and delete the invitations of their conference to any role but
	// project management, which they may not hand out (`assertCanGrantTeamRole`).
	abilityBuilder.teamMemberInvitation.allow(['read', 'update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference({ ctx, roles: ['TEAM_COORDINATOR'] });
		return team
			? { where: { ...team, role: { ne: 'PROJECT_MANAGEMENT' } }, columns: WITHOUT_TOKEN }
			: undefined;
	});
}

/**
 * Refuses unless the caller holds `manageTeam` (project management, team coordinators) in the
 * conference: may invite people to its team at all.
 */
export async function assertCanManageInvitations({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	await assertTeamPermission({ ctx, conferenceId, permission: 'manageTeam' });
}

/** Refuses unless the caller may hand out `role` on the conference's team (`assertCanGrantTeamRole`). */
export async function assertCanGrantInvitationRole({
	ctx,
	conferenceId,
	role
}: {
	ctx: ApiContext;
	conferenceId: string;
	role: TeamRole;
}) {
	await assertCanGrantTeamRole({ ctx, conferenceId, role });
}

/** Refuses unless the caller may update the invitation (its update ability); returns it. */
export async function assertCanUpdateInvitation({
	ctx,
	invitationId
}: {
	ctx: ApiContext;
	invitationId: string;
}) {
	return db.query.teamMemberInvitation
		.findFirst(
			(await ctx.abilities.teamMemberInvitation.filter('update')).merge({
				where: { id: invitationId }
			}).query.single
		)
		.then(assertFindFirstExists);
}
