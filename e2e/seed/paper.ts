import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../../src/api/db/schema';

/**
 * A submitted position paper with one version (`<paperId>v1`), as a run should find it: the row
 * is upserted, the version inserted (delete the paper's versions first).
 */
export async function upsertSubmittedPaper(
	db: NodePgDatabase,
	{
		id,
		authorParticipantId,
		delegationId,
		agendaItemId,
		content
	}: {
		id: string;
		authorParticipantId: string;
		delegationId: string;
		agendaItemId: string;
		content: unknown;
	}
) {
	const paper = {
		id,
		authorParticipantId,
		delegationId,
		agendaItemId,
		status: 'SUBMITTED' as const,
		type: 'POSITION_PAPER' as const,
		firstSubmittedAt: new Date()
	};
	await db
		.insert(schema.paper)
		.values(paper)
		.onConflictDoUpdate({ target: schema.paper.id, set: paper });
	await db
		.insert(schema.paperVersion)
		.values({ id: `${id}v1`, version: 1, content, paperId: id, status: 'SUBMITTED' });
}
