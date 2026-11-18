/**
 * Fixtures for the working paper specs (e2e/papers/working-paper.spec.ts).
 *
 * Two working paper drafts of the paper delegate, on the agenda item of their committee:
 * - one whose content is a resolution (a preamble and an operative clause), for the author to
 *   reopen in the resolution editor, extend and submit;
 * - one whose content is no resolution at all, which the editor refuses to open.
 *
 * The spec submits the first one, so every run drops the versions and starts it as a draft again.
 */
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { inArray } from 'drizzle-orm';
import * as schema from '../../src/api/db/schema';

export const E2E_WORKING_PAPER_ID = 'e2e00000paper00000000002';
const E2E_WORKING_PAPER_VERSION_ID = 'e2e00000paperversion0002';
export const E2E_INVALID_WORKING_PAPER_ID = 'e2e00000paper00000000003';
const E2E_INVALID_WORKING_PAPER_VERSION_ID = 'e2e00000paperversion0003';

export const E2E_WORKING_PAPER_PREAMBLE = 'unter Hinweis auf die seeded Präambel der E2E-Tests,';
export const E2E_WORKING_PAPER_OPERATIVE =
	'beschließt, den seeded operativen Absatz beizubehalten;';

export async function seedWorkingPapers(
	db: NodePgDatabase,
	{
		authorParticipantId,
		delegationId,
		agendaItemId
	}: { authorParticipantId: string; delegationId: string; agendaItemId: string }
) {
	const papers = [E2E_WORKING_PAPER_ID, E2E_INVALID_WORKING_PAPER_ID].map((id) => ({
		id,
		type: 'WORKING_PAPER' as const,
		status: 'DRAFT' as const,
		authorParticipantId,
		delegationId,
		agendaItemId,
		firstSubmittedAt: null
	}));
	for (const paper of papers) {
		await db
			.insert(schema.paper)
			.values(paper)
			.onConflictDoUpdate({ target: schema.paper.id, set: paper });
	}
	// A submitted run leaves versions behind and would make the next submit a revision
	await db
		.delete(schema.paperVersion)
		.where(
			inArray(schema.paperVersion.paperId, [E2E_WORKING_PAPER_ID, E2E_INVALID_WORKING_PAPER_ID])
		);

	// The resolution editor stores its snapshot as is: an object, not a JSON string
	const resolution = {
		committeeName: 'E2E Test Committee',
		preamble: [{ id: 'e2e-preamble-1', content: E2E_WORKING_PAPER_PREAMBLE }],
		operative: [
			{
				id: 'e2e-operative-1',
				blocks: [{ type: 'text', id: 'e2e-operative-1-text', content: E2E_WORKING_PAPER_OPERATIVE }]
			}
		]
	};
	await db.insert(schema.paperVersion).values([
		{
			id: E2E_WORKING_PAPER_VERSION_ID,
			version: 1,
			status: 'DRAFT',
			content: resolution,
			paperId: E2E_WORKING_PAPER_ID
		},
		{
			id: E2E_INVALID_WORKING_PAPER_VERSION_ID,
			version: 1,
			status: 'DRAFT',
			// What a position paper's editor stores: a document, but no resolution
			content: { type: 'doc', content: [{ type: 'paragraph' }] },
			paperId: E2E_INVALID_WORKING_PAPER_ID
		}
	]);
}
