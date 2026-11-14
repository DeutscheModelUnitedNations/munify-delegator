import { db } from '#api/db/db';
import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	hop,
	isTeamMemberOfConference,
	systemAdmin,
	TEAM_ADMIN_ROLES
} from '#api/services/authHelper/rules';
import { liveWhere } from '#api/services/authHelper/callerFacts';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * The abilities of committee functions (who chairs a committee, who advises its delegates). The
 * team reads its conference's; project management and team coordinators (`manageTeam`) hand them
 * out and take them away.
 */
export function registerTeamFunctionAbilities() {
	abilityBuilder.teamFunction.allow(['read', 'delete']).when(systemAdmin);

	abilityBuilder.teamFunction
		.allow('read')
		.when(
			liveWhere((args) => hop(isTeamMemberOfConference(args), (teamMember) => ({ teamMember })))
		);

	abilityBuilder.teamFunction.allow('delete').when(
		liveWhere((args) =>
			hop(isTeamMemberOfConference({ ...args, roles: TEAM_ADMIN_ROLES }), (teamMember) => ({
				teamMember
			}))
		)
	);
}

/**
 * Refuses unless the caller manages the team (`manageTeam`) the member is on: NOT_FOUND for a
 * member that does not exist, FORBIDDEN otherwise.
 */
export async function assertCanGiveTeamFunction({
	ctx,
	teamMemberId
}: {
	ctx: ApiContext;
	teamMemberId: string;
}) {
	ctx.mustBeLoggedIn();
	const member = await db.query.teamMember.findFirst({
		where: { id: teamMemberId },
		columns: { conferenceId: true }
	});
	if (!member) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	await assertTeamPermission({
		ctx,
		conferenceId: member.conferenceId,
		permission: 'manageTeam'
	});
}
