import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	PROJECT_MANAGEMENT_ROLES,
	assertTeamPermission,
	isTeamMemberOfConference,
	systemAdmin,
	type TeamRole
} from '#api/services/authHelper/rules';
import { assertMayGrantRole } from '#api/handlers/teamMember/teamMemberPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';

export function registerTeamMemberInvitationAbilities() {
	abilityBuilder.teamMemberInvitation.allow(['read', 'update', 'delete']).when(systemAdmin);

	// Only the hash of an invitation's token is stored, and nothing in the app needs even that back.
	const WITHOUT_TOKEN = { token: false };

	// Project management manages every invitation of its conference.
	abilityBuilder.teamMemberInvitation.allow(['read', 'update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES);
		return team ? { where: team, columns: WITHOUT_TOKEN } : undefined;
	});

	// Team coordinators manage the invitations they may hand out - everything but project management.
	abilityBuilder.teamMemberInvitation.allow(['read', 'update', 'delete']).when((ctx) => {
		const team = isTeamMemberOfConference(ctx, ['TEAM_COORDINATOR']);
		return team
			? { where: { ...team, role: { ne: 'PROJECT_MANAGEMENT' } }, columns: WITHOUT_TOKEN }
			: undefined;
	});
}

/** Refuses unless the caller may invite people to the team of `conferenceId` at all. */
export async function assertCanManageInvitations(ctx: ApiContext, conferenceId: string) {
	await assertTeamPermission(ctx, conferenceId, 'manageTeam');
}

/** Refuses unless the caller may hand out `role` on the team of `conferenceId`. */
export async function assertCanGrantInvitationRole(
	ctx: ApiContext,
	conferenceId: string,
	role: TeamRole
) {
	await assertMayGrantRole(ctx, conferenceId, role);
}

/** An invitation the caller may change, or an error. */
export async function assertCanUpdateInvitation(ctx: ApiContext, invitationId: string) {
	return db.query.teamMemberInvitation
		.findFirst(
			(await ctx.abilities.teamMemberInvitation.filter('update')).merge({
				where: { id: invitationId }
			}).query.single
		)
		.then(assertFindFirstExists);
}
