import { snakeCase, pgEnum, text, integer, jsonb, index } from 'drizzle-orm/pg-core';
import { defaultIdAndCreatedAt } from './helpers';
import { user } from './users';
import { conferenceRef } from './conference';

/** The AI assistants' access through the MCP server (`src/api/mcp/`). */

/** How a tool call ended: answered, refused before it ran (a rule, a guard), or failed. */
export const mcpCallOutcome = pgEnum('mcp_call_outcome', ['OK', 'REFUSED', 'ERROR']);

/**
 * One tool call an assistant made through the MCP server, kept for the conference's project
 * management. Append-only. The arguments are stored as the assistant sent them, which holds no
 * personal data: the tools take ids and refuse personal values (`src/api/mcp/`).
 */
export const mcpAuditEntry = snakeCase.table(
	'mcp_audit_entry',
	{
		...defaultIdAndCreatedAt,
		conferenceId: conferenceRef('cascade'),
		/** Whose account the assistant acted with; kept when the account goes. */
		userId: text().references(() => user.id, { onDelete: 'set null', onUpdate: 'cascade' }),
		/** The OAuth client the assistant connected with. */
		clientId: text(),
		tool: text().notNull(),
		arguments: jsonb().notNull(),
		outcome: mcpCallOutcome().notNull(),
		/** Why it was refused or failed, as the assistant was told. */
		message: text(),
		durationMs: integer().notNull()
	},
	(table) => [
		index('mcp_audit_entry_conference_id_created_at_idx').on(table.conferenceId, table.createdAt)
	]
);
