import { db } from '#api/db/db';
import { McpRefusal } from './toolResults';

/**
 * Who reaches which conference through the MCP server. The rules themselves confine every
 * operation (`isTeamMemberOf` with `ctx.mcp`); this answers up front, so an assistant learns
 * where it may work and a call about any other conference is refused before anything runs.
 */

/** Whose account an assistant acts with (from the verified token). */
export interface McpPrincipal {
	userId: string;
	isAdmin: boolean;
}

/**
 * The conferences an assistant may work in for `principal`: those that switched MCP on and have
 * the caller on their team, every one of those for a system admin. Empty for an account without
 * a user row (it never signed in to the app).
 */
export async function reachableConferences(principal: McpPrincipal) {
	const known = await db.query.user.findFirst({
		where: { id: principal.userId },
		columns: { id: true }
	});
	if (!known) return [];
	const conferences = await db.query.conference.findMany({
		where: principal.isAdmin
			? { mcpEnabled: true }
			: { mcpEnabled: true, teamMembers: { userId: principal.userId } },
		columns: { id: true, title: true, state: true, startConference: true, endConference: true },
		with: {
			teamMembers: { where: { userId: principal.userId }, columns: { role: true } }
		},
		orderBy: { startConference: 'desc' }
	});
	return conferences.map(({ teamMembers, ...conference }) => ({
		...conference,
		yourTeamRoles: teamMembers.map((member) => member.role)
	}));
}

/**
 * Refuses unless `principal` may work in the conference through MCP: it has switched MCP on and
 * the caller is on its team, or is a system admin.
 */
export async function assertCanUseMcpIn({
	principal,
	conferenceId
}: {
	principal: McpPrincipal;
	conferenceId: string;
}) {
	const known = await db.query.user.findFirst({
		where: { id: principal.userId },
		columns: { id: true }
	});
	const conference = known
		? await db.query.conference.findFirst({
				where: principal.isAdmin
					? { id: conferenceId, mcpEnabled: true }
					: { id: conferenceId, mcpEnabled: true, teamMembers: { userId: principal.userId } },
				columns: { id: true }
			})
		: undefined;
	if (!conference) {
		throw new McpRefusal(
			'This conference is not available: it does not exist, has not switched on AI assistants, or you are not on its team. Call whoami for the conferences you can work in.'
		);
	}
}
