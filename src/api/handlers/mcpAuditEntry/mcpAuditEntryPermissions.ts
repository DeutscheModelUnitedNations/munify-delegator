import { abilityBuilder, type ApiContext } from '#api/rumble';
import {
	assertTeamPermission,
	isTeamMemberOfConference,
	PROJECT_MANAGEMENT_ROLES,
	systemAdmin
} from '#api/services/authHelper/rules';
import { grantWhere } from '#api/services/authHelper/utils';

export function registerMcpAuditEntryAbilities() {
	abilityBuilder.mcpAuditEntry.allow(['read', 'update', 'delete']).when(systemAdmin);
	// Project management reads what assistants did in its conference. Nobody changes the log: the
	// MCP server writes it.
	abilityBuilder.mcpAuditEntry
		.allow('read')
		.when((ctx) => grantWhere(isTeamMemberOfConference({ ctx, roles: PROJECT_MANAGEMENT_ROLES })));
}

/**
 * Refuses (FORBIDDEN) unless the caller holds `manageConference` (project management) in the
 * conference: switching AI assistants' access on or off is the leadership's decision.
 */
export function assertCanSetMcpEnabled({
	ctx,
	conferenceId
}: {
	ctx: ApiContext;
	conferenceId: string;
}) {
	return assertTeamPermission({ ctx, conferenceId, permission: 'manageConference' });
}
