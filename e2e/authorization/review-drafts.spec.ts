import type { APIRequestContext } from '@playwright/test';
import pg from 'pg';
import { test, expect } from '../support/test';
import { callTool, listTools, mcpToken } from '../support/mcp';
import {
	E2E_DRAFTS_CONFERENCE_ID,
	E2E_DRAFTS_OFF_CONFERENCE_ID,
	E2E_DRAFTS_PAPER_IDS,
	E2E_DRAFTS_PAPER_SENTENCE,
	E2E_DRAFTS_PEOPLE
} from '../seed/reviewDrafts';

// Review drafts (src/api/handlers/paperReviewDraft/): an AI assistant writes one over MCP, and it
// stays its reviewer's. Nobody else reads or deletes it, it reaches no author, changes no status,
// and MCP offers no way to send a review.

const PAPER = E2E_DRAFTS_PAPER_IDS.api;

async function query<Row extends Record<string, unknown>>(sql: string, values: unknown[]) {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	try {
		return (await client.query<Row>(sql, values)).rows;
	} finally {
		await client.end();
	}
}

test.describe('review drafts over MCP', () => {
	const tokens = { reviewer: '', otherReviewer: '', management: '' };

	test.beforeAll(async ({ playwright, baseURL }) => {
		// the e2e server's certificate is self-signed (playwright.config.ts)
		const request = await playwright.request.newContext({ ignoreHTTPSErrors: true });
		for (const key of ['reviewer', 'otherReviewer', 'management'] as const) {
			tokens[key] = await mcpToken(request, E2E_DRAFTS_PEOPLE[key], new URL('/mcp', baseURL).href);
		}
		await request.dispose();
	});

	const upsert = (request: APIRequestContext, token: string, args: Record<string, unknown> = {}) =>
		callTool({
			request,
			token,
			name: 'upsertPaperReviewDraft',
			args: {
				conferenceId: E2E_DRAFTS_CONFERENCE_ID,
				paperId: PAPER,
				content: `Gut gelungen:\n\n> ${E2E_DRAFTS_PAPER_SENTENCE}\n\n> Ein Satz, den es nicht gibt.`,
				statusAfter: 'ACCEPTED',
				...args
			}
		});

	test('offers writing and deleting a draft, never sending a review', async ({ request }) => {
		const tools = await listTools({ request, token: tokens.reviewer });
		const byName = new Map(tools.map((tool) => [tool.name, tool]));
		expect(byName.get('upsertPaperReviewDraft')?.annotations).toMatchObject({
			readOnlyHint: false,
			destructiveHint: false,
			idempotentHint: true
		});
		expect(byName.get('deletePaperReviewDraft')?.annotations).toMatchObject({
			destructiveHint: true
		});
		for (const name of ['createPaperReview', 'savePaperReviewDraft', 'updatePaper']) {
			expect(byName.has(name)).toBe(false);
		}
	});

	test('writes the reviewer’s draft and reaches nobody else', async ({ request }) => {
		const { text, isError } = await upsert(request, tokens.reviewer);
		expect(isError).toBe(false);
		const saved = JSON.parse(text).upsertPaperReviewDraft;
		expect(saved.link).toContain(`/dashboard/${E2E_DRAFTS_CONFERENCE_ID}/paperhub/${PAPER}#review`);
		expect(saved.paperVersion).toBe(1);
		expect(saved.unmatchedQuotes).toEqual(['Ein Satz, den es nicht gibt.']);

		// no status change, no review, no mail
		expect(await query('SELECT status FROM paper WHERE id = $1', [PAPER])).toEqual([
			{ status: 'SUBMITTED' }
		]);
		expect(
			await query(
				'SELECT r.id FROM paper_review r JOIN paper_version v ON v.id = r.paper_version_id WHERE v.paper_id = $1',
				[PAPER]
			)
		).toEqual([]);
		expect(
			await query("SELECT id FROM email_log WHERE conference_id = $1 AND kind = 'PAPER_REVIEWED'", [
				E2E_DRAFTS_CONFERENCE_ID
			])
		).toEqual([]);

		// the reviewer reads it back
		const own = await callTool({
			request,
			token: tokens.reviewer,
			name: 'graphql_query',
			args: {
				conferenceId: E2E_DRAFTS_CONFERENCE_ID,
				query: `{ myPaperReviewDraft(paperId: "${PAPER}") { origin statusAfter comments } }`
			}
		});
		expect(JSON.parse(own.text).myPaperReviewDraft).toMatchObject({
			origin: 'MCP',
			statusAfter: 'ACCEPTED'
		});
		expect(own.text).toContain(E2E_DRAFTS_PAPER_SENTENCE);
	});

	test('another reviewer and project management neither read nor delete it', async ({
		request
	}) => {
		await upsert(request, tokens.reviewer);
		for (const token of [tokens.otherReviewer, tokens.management]) {
			const read = await callTool({
				request,
				token,
				name: 'graphql_query',
				args: {
					conferenceId: E2E_DRAFTS_CONFERENCE_ID,
					query: `{ myPaperReviewDrafts(conferenceId: "${E2E_DRAFTS_CONFERENCE_ID}") { id } myPaperReviewDraft(paperId: "${PAPER}") { id } }`
				}
			});
			expect(JSON.parse(read.text)).toEqual({ myPaperReviewDrafts: [], myPaperReviewDraft: null });
			const deleted = await callTool({
				request,
				token,
				name: 'deletePaperReviewDraft',
				args: { conferenceId: E2E_DRAFTS_CONFERENCE_ID, paperId: PAPER }
			});
			expect(JSON.parse(deleted.text).deletePaperReviewDraft).toBe(false);
		}
		const drafts = await query<{ reviewer_id: string }>(
			'SELECT reviewer_id FROM paper_review_draft WHERE paper_id = $1',
			[PAPER]
		);
		expect(drafts).toEqual([{ reviewer_id: E2E_DRAFTS_PEOPLE.reviewer }]);
	});

	test('is refused where assistants are off or the paper is of another conference', async ({
		request
	}) => {
		const off = await callTool({
			request,
			token: tokens.reviewer,
			name: 'upsertPaperReviewDraft',
			args: {
				conferenceId: E2E_DRAFTS_OFF_CONFERENCE_ID,
				paperId: E2E_DRAFTS_PAPER_IDS.off,
				content: 'Gut.',
				statusAfter: 'ACCEPTED'
			}
		});
		expect(off.isError).toBe(true);
		const elsewhere = await upsert(request, tokens.reviewer, { paperId: E2E_DRAFTS_PAPER_IDS.off });
		expect(elsewhere.isError).toBe(true);
		expect(
			await query('SELECT id FROM paper_review_draft WHERE paper_id = $1', [
				E2E_DRAFTS_PAPER_IDS.off
			])
		).toEqual([]);
	});

	test('refuses a verdict other than accepted or changes requested', async ({ request }) => {
		const { isError } = await upsert(request, tokens.reviewer, { statusAfter: 'DRAFT' });
		expect(isError).toBe(true);
	});

	test('every write moves the draft revision past the stored one', async ({ request }) => {
		await upsert(request, tokens.reviewer);
		// a stored revision ahead of the server's clock: a write that took only its own clock would
		// land on or before it, and the editor's revision check could not tell the two apart
		await query(
			"UPDATE paper_review_draft SET updated_at = now()::timestamp(3) + interval '1 hour' WHERE paper_id = $1",
			[PAPER]
		);
		const [{ stored }] = await query<{ stored: string }>(
			'SELECT updated_at::text AS stored FROM paper_review_draft WHERE paper_id = $1',
			[PAPER]
		);
		const { isError } = await upsert(request, tokens.reviewer);
		expect(isError).toBe(false);
		expect(
			await query<{ later: boolean }>(
				'SELECT updated_at > $2::timestamp(3) AS later FROM paper_review_draft WHERE paper_id = $1',
				[PAPER, stored]
			)
		).toEqual([{ later: true }]);
	});
});
