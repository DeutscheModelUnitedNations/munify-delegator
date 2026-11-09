import { object, query, schemaBuilder } from '#api/rumble';
import { MCP_RESOURCE } from '$app/env/private';
import { assertCanSetMcpEnabled, registerMcpAuditEntryAbilities } from './mcpAuditEntryPermissions';
import { setMcpEnabled } from './mcpAuditEntryService';

registerMcpAuditEntryAbilities();

object({ table: 'mcpAuditEntry' });
query({ table: 'mcpAuditEntry' });

schemaBuilder.queryFields((t) => ({
	mcpServerUrl: t.string({
		description:
			'The address AI assistants connect to (the MCP server), or null while it is not set up for this app. Each conference still switches assistants on for itself (`setConferenceMcpEnabled`).',
		nullable: true,
		resolve: () => MCP_RESOURCE ?? null
	})
}));

schemaBuilder.mutationFields((t) => ({
	setConferenceMcpEnabled: t.field({
		description:
			"Switches AI assistants' access to a conference (the MCP server at `/mcp`) on or off. While it is off, no assistant sees anything of the conference, whoever connects. Project management only; FORBIDDEN for anyone else.",
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			enabled: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanSetMcpEnabled({ ctx, conferenceId: args.conferenceId });
			await setMcpEnabled({ conferenceId: args.conferenceId, enabled: args.enabled });
			return true;
		}
	})
}));
