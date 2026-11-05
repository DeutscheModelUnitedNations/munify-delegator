import { eq } from 'drizzle-orm';
import { db, schema } from '#api/db/db';
import { conferencePubsub, mcpAuditEntryPubsub } from '#api/pubsub';

/** Switches AI assistants' access to a conference (the MCP server) on or off. */
export async function setMcpEnabled({
	conferenceId,
	enabled
}: {
	conferenceId: string;
	enabled: boolean;
}) {
	await db
		.update(schema.conference)
		.set({ mcpEnabled: enabled, updatedAt: new Date() })
		.where(eq(schema.conference.id, conferenceId));
	conferencePubsub.updated(conferenceId);
}

/** One tool call an assistant made, for `recordMcpCall`. */
export interface McpCallRecord {
	conferenceId: string;
	userId: string;
	clientId: string | undefined;
	tool: string;
	arguments: Record<string, unknown>;
	outcome: (typeof schema.mcpCallOutcome.enumValues)[number];
	message: string | undefined;
	durationMs: number;
}

/** Writes a tool call into the conference's MCP log. */
export async function recordMcpCall(record: McpCallRecord) {
	await db.insert(schema.mcpAuditEntry).values({
		conferenceId: record.conferenceId,
		userId: record.userId,
		clientId: record.clientId ?? null,
		tool: record.tool,
		arguments: record.arguments,
		outcome: record.outcome,
		message: record.message ?? null,
		durationMs: record.durationMs
	});
	mcpAuditEntryPubsub.created();
}
