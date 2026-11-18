import type { APIRequestContext, Page } from '@playwright/test';
import pg from 'pg';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { callTool, mcpToken } from '../support/mcp';
import {
	E2E_DRAFTS_AGENDA_ITEM_TITLE,
	E2E_DRAFTS_COMMITTEE_NAME,
	E2E_DRAFTS_CONFERENCE_ID,
	E2E_DRAFTS_PAPER_IDS,
	E2E_DRAFTS_PAPER_SENTENCE,
	E2E_DRAFTS_PEOPLE,
	firstVersionId
} from '../seed/reviewDrafts';

// The review editor and an assistant's draft: it opens filled in, its quotes are found in the
// paper, the reviewer's edits are saved and not silently replaced, a newer version is warned
// about, sending makes a review like any other and discarding leaves nothing behind.

const C = E2E_DRAFTS_CONFERENCE_ID;

async function sql<Row extends Record<string, unknown>>(statement: string, values: unknown[] = []) {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	try {
		return (await client.query<Row>(statement, values)).rows;
	} finally {
		await client.end();
	}
}

function writeDraft({
	request,
	token,
	paperId,
	content,
	overwriteAppEdits
}: {
	request: APIRequestContext;
	token: string;
	paperId: string;
	content: string;
	overwriteAppEdits?: boolean;
}) {
	return callTool({
		request,
		token,
		name: 'upsertPaperReviewDraft',
		args: {
			conferenceId: C,
			paperId,
			content,
			statusAfter: 'CHANGES_REQUESTED',
			...(overwriteAppEdits ? { overwriteAppEdits } : {})
		}
	});
}

async function openPaper(page: Page, paperId: string) {
	await loginAs(page, fixedTestUser(E2E_DRAFTS_PEOPLE.reviewer), {
		startUrl: `/dashboard/${C}/paperhub/${paperId}#review`
	});
	await expect(page.getByTestId('review-draft-notice')).toBeVisible({ timeout: 30_000 });
}

test.describe('review drafts in the editor', () => {
	let token: string;

	test.beforeAll(async ({ playwright, baseURL }) => {
		const request = await playwright.request.newContext({ ignoreHTTPSErrors: true });
		token = await mcpToken(request, E2E_DRAFTS_PEOPLE.reviewer, new URL('/mcp', baseURL).href);
		await request.dispose();
	});

	test('an assistant’s draft is edited, kept from being replaced and sent', async ({
		page,
		request
	}) => {
		const paperId = E2E_DRAFTS_PAPER_IDS.lifecycle;
		const written = await writeDraft({
			request,
			token,
			paperId,
			content: `Danke für euer Papier.\n\n> ${E2E_DRAFTS_PAPER_SENTENCE}\n\n- **Quellen** ergänzen`
		});
		expect(written.isError).toBe(false);

		await openPaper(page, paperId);
		const review = page.locator('#review');
		await expect(page.getByTestId('review-draft-notice')).toContainText(
			/KI-Assistenten|AI assistant/
		);
		const editor = review.locator('.ProseMirror');
		await expect(editor.locator('blockquote')).toHaveCount(1);
		await expect(editor.locator('strong', { hasText: 'Quellen' })).toBeVisible();

		// "Find in paper" finds the quote word for word
		await editor.locator('blockquote button').click();
		await expect(page.locator('.cite-highlight').first()).toBeVisible();

		// the reviewer's edit is saved as the draft ...
		await editor.locator('p').first().click();
		await page.keyboard.press('End');
		await page.keyboard.type(' Ergänzt in der App.');
		await expect(review.getByText(/Entwurf gespeichert|Draft saved/)).toBeVisible({
			timeout: 10_000
		});
		await expect
			.poll(
				async () =>
					(
						await sql('SELECT last_edited_via FROM paper_review_draft WHERE paper_id = $1', [
							paperId
						])
					)[0]
			)
			.toEqual({ last_edited_via: 'UI' });

		// ... which an assistant does not replace unless told to
		const refused = await writeDraft({ request, token, paperId, content: 'Ganz neu.' });
		expect(refused.isError).toBe(true);
		expect(refused.text).toContain('overwriteAppEdits');

		// a newer version makes the draft stale, which sending does not mind
		await sql(
			"INSERT INTO paper_version (id, version, content, paper_id, status) SELECT $1, 2, content, paper_id, 'SUBMITTED' FROM paper_version WHERE id = $2",
			[`${paperId}v2`, firstVersionId(paperId)]
		);
		await page.reload();
		await waitForHydration(page);
		await expect(page.getByTestId('review-draft-stale')).toContainText('1');
		await expect(page.getByTestId('review-draft-stale')).toContainText('2');
		await expect(editor).toContainText('Ergänzt in der App.');

		await review.getByRole('button', { name: /bewertung abgeben|submit review/i }).click();
		await page
			.locator('.modal-action')
			.getByRole('button', { name: /bewertung abgeben|submit review/i })
			.click();
		await expect(page.getByTestId('review-draft-notice')).toBeHidden({ timeout: 15_000 });

		// a review like any other: for the latest version, with the verdict and the text
		const reviews = await sql<{ status_after: string; version: number; text: string }>(
			`SELECT r.status_after, v.version, r.comments::text AS text FROM paper_review r
			 JOIN paper_version v ON v.id = r.paper_version_id WHERE v.paper_id = $1`,
			[paperId]
		);
		expect(reviews).toHaveLength(1);
		expect(reviews[0]).toMatchObject({ status_after: 'CHANGES_REQUESTED', version: 2 });
		expect(reviews[0]?.text).toContain('Ergänzt in der App.');
		expect(await sql('SELECT status FROM paper WHERE id = $1', [paperId])).toEqual([
			{ status: 'CHANGES_REQUESTED' }
		]);
		expect(await sql('SELECT id FROM paper_review_draft WHERE paper_id = $1', [paperId])).toEqual(
			[]
		);
	});

	test('a discarded draft is gone and the paper untouched', async ({ page, request }) => {
		const paperId = E2E_DRAFTS_PAPER_IDS.discard;
		await writeDraft({ request, token, paperId, content: 'Ein Entwurf zum Verwerfen.' });

		// the paper hub marks the paper
		await loginAs(page, fixedTestUser(E2E_DRAFTS_PEOPLE.reviewer), {
			startUrl: `/dashboard/${C}/paperhub`
		});
		await page.getByRole('button', { name: E2E_DRAFTS_COMMITTEE_NAME, exact: false }).click();
		await page.getByRole('button', { name: E2E_DRAFTS_AGENDA_ITEM_TITLE, exact: false }).click();
		await expect(page.getByTestId('review-draft-marker')).toHaveCount(1, { timeout: 30_000 });

		await openPaper(page, paperId);
		const review = page.locator('#review');
		await review.getByRole('button', { name: /Entwurf verwerfen|Discard draft/ }).click();
		await page
			.locator('.modal-action')
			.getByRole('button', { name: /Entwurf verwerfen|Discard draft/ })
			.click();
		await expect(page.getByTestId('review-draft-notice')).toBeHidden({ timeout: 15_000 });
		await expect(review.locator('.ProseMirror')).not.toContainText('Ein Entwurf zum Verwerfen.');

		expect(await sql('SELECT id FROM paper_review_draft WHERE paper_id = $1', [paperId])).toEqual(
			[]
		);
		expect(await sql('SELECT status FROM paper WHERE id = $1', [paperId])).toEqual([
			{ status: 'SUBMITTED' }
		]);
	});
});
