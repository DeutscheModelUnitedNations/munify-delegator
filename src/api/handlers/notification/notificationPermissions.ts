import { db } from '#api/db/db';
import type { ApiContext } from '#api/rumble';
import { assertTeamPermission, isSystemAdmin } from '#api/services/authHelper/rules';
import { callerUserId } from '#api/services/authHelper/utils';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * Who may do what with the notifications. The settings are personal: everybody reads and changes
 * only their own, as the member of a team they are, and an AI assistant has none (`callerUserId`).
 * The Slack workspaces are the system admins'; which of them a conference is told in is its
 * project management's (`manageConference`). None of the tables has abilities: nothing reads
 * them but the fields here, and a bot token never leaves the API.
 */

/** The signed-in person whose notification settings a field is about; FORBIDDEN for an assistant. */
export function assertOwnNotifications(ctx: ApiContext) {
	ctx.mustBeLoggedIn();
	const userId = callerUserId(ctx);
	if (!userId) throw apiError({ code: 'FORBIDDEN', message: m.notificationsOnlyOwn() });
	return userId;
}

/** The caller's membership of the conference's team; NOT_FOUND when they are not on it. */
export async function assertOwnTeamMember({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	const userId = assertOwnNotifications(ctx);
	const member = await db.query.teamMember.findFirst({
		where: { conferenceId, userId },
		columns: { id: true, userId: true, role: true },
		with: { functions: { columns: { id: true, committeeId: true, kind: true } } }
	});
	if (!member) throw apiError({ code: 'NOT_FOUND', message: m.notificationsNotOnTeam() });
	return member;
}

/** Refuses (FORBIDDEN) unless the caller is a system admin: they keep the workspaces and tokens. */
export function assertCanManageSlackWorkspaces(ctx: ApiContext) {
	ctx.mustBeLoggedIn();
	if (!isSystemAdmin(ctx)) {
		throw apiError({ code: 'FORBIDDEN', message: m.accessDeniedSystemAdmin() });
	}
}

/**
 * Refuses (FORBIDDEN) unless the caller is project management of the conference
 * (`manageConference`): they pick the workspace its team is told in, and see which there are.
 */
export function assertCanPickSlackWorkspace({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	return assertTeamPermission({ ctx, conferenceId, permission: 'manageConference' });
}
