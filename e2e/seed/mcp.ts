/**
 * Fixtures for the MCP spec (e2e/authorization/mcp.spec.ts).
 *
 * Two conferences with the same participant care member on the team: one that switched AI
 * assistants on, with a delegate whose name must never reach an assistant, and one that did not.
 * Every run switches them back to exactly that and drops the first one's MCP log.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';
import { makeSeedUser } from '../../src/api/db/seed-data/user';
import { makeSeedDelegation } from '../../src/api/db/seed-data/delegation';
import { makeSeedDelegationMember } from '../../src/api/db/seed-data/delegationMember';
import { makeSeedTeamMember } from '../../src/api/db/seed-data/teamMember';
import { upsertConference } from './conference';
import { upsertParticipant } from './participant';
import { upsertTeamMember } from './teamMember';
import { COMPLETE_PROFILE, upsertUsers } from './user';

export const E2E_MCP_CONFERENCE_ID = 'e2e00000conference0000010';
export const E2E_MCP_OFF_CONFERENCE_ID = 'e2e00000conference0000011';
export const E2E_MCP_CARE_ID = 'e2e-mcp-care';
export const E2E_MCP_DELEGATE_ID = 'e2e-mcp-delegate';
/** The delegate's family name, which no answer may contain. */
export const E2E_MCP_DELEGATE_FAMILY_NAME = 'Geheimname';
const E2E_MCP_DELEGATION_ID = 'e2e00000delegationmcp0001';

export async function seedMcp(db: NodePgDatabase) {
	for (const [id, title, enabled] of [
		[E2E_MCP_CONFERENCE_ID, 'E2E MCP Conference', true],
		[E2E_MCP_OFF_CONFERENCE_ID, 'E2E MCP Off Conference', false]
	] as const) {
		await upsertConference(db, { id, title, state: 'PREPARATION', nations: {} });
		await db
			.update(schema.conference)
			.set({ mcpEnabled: enabled })
			.where(eq(schema.conference.id, id));
	}
	await db
		.delete(schema.mcpAuditEntry)
		.where(eq(schema.mcpAuditEntry.conferenceId, E2E_MCP_CONFERENCE_ID));

	await upsertUsers(db, [
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_MCP_CARE_ID,
			givenName: 'E2E',
			familyName: 'McpCare'
		},
		{
			...makeSeedUser(),
			...COMPLETE_PROFILE,
			id: E2E_MCP_DELEGATE_ID,
			givenName: 'Vertraulich',
			familyName: E2E_MCP_DELEGATE_FAMILY_NAME,
			globalNotes: 'Eine Notiz nur für die Teilnehmendenbetreuung'
		}
	]);
	await upsertTeamMember(db, E2E_MCP_CONFERENCE_ID, E2E_MCP_CARE_ID, 'PARTICIPANT_CARE');
	// `upsertTeamMember` keys the row by the user alone, which would move it between the two
	const offTeamMember = {
		...makeSeedTeamMember({
			conferenceId: E2E_MCP_OFF_CONFERENCE_ID,
			userId: E2E_MCP_CARE_ID,
			role: 'PARTICIPANT_CARE'
		}),
		id: 'e2e-team-mcp-off-care'
	};
	await db
		.insert(schema.teamMember)
		.values(offTeamMember)
		.onConflictDoUpdate({ target: schema.teamMember.id, set: offTeamMember });

	const delegation = {
		...makeSeedDelegation({ conferenceId: E2E_MCP_CONFERENCE_ID, applied: true }),
		id: E2E_MCP_DELEGATION_ID,
		entryCode: 'MCPCODE1',
		motivation: 'Eine Motivation, die niemand außerhalb sehen soll'
	};
	await db
		.insert(schema.delegation)
		.values(delegation)
		.onConflictDoUpdate({ target: schema.delegation.id, set: delegation });
	const member = {
		...makeSeedDelegationMember({
			delegationId: delegation.id,
			conferenceParticipantId: await upsertParticipant(
				db,
				E2E_MCP_CONFERENCE_ID,
				E2E_MCP_DELEGATE_ID
			),
			isHeadDelegate: true
		}),
		id: 'e2e00000delegationmembermcp1'
	};
	await db
		.insert(schema.delegationMember)
		.values(member)
		.onConflictDoUpdate({ target: schema.delegationMember.id, set: member });
}
