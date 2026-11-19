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

/** The paper as the seed leaves it: one submitted version, no review, no draft. */
async function resetPaper(paperId: string) {
	await sql('DELETE FROM paper_review_draft WHERE paper_id = $1', [paperId]);
	await sql('DELETE FROM paper_version WHERE paper_id = $1 AND id <> $2', [
		paperId,
		firstVersionId(paperId)
	]);
	await sql('DELETE FROM paper_review WHERE paper_version_id = $1', [firstVersionId(paperId)]);
	await sql("UPDATE paper SET status = 'SUBMITTED' WHERE id = $1", [paperId]);
	await sql("UPDATE paper_version SET status = 'SUBMITTED' WHERE id = $1", [
		firstVersionId(paperId)
	]);
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
		// A retry starts from what the failed attempt left: the paper as the seed has it
		await resetPaper(paperId);
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
		await resetPaper(paperId);
		await writeDraft({ request, token, paperId, content: 'Ein Entwurf zum Verwerfen.' });

		// the paper hub marks the paper
		await loginAs(page, fixedTestUser(E2E_DRAFTS_PEOPLE.reviewer), {
			startUrl: `/dashboard/${C}/paperhub`
		});
		await page.getByRole('button', { name: E2E_DRAFTS_COMMITTEE_NAME, exact: false }).click();
		await page.getByRole('button', { name: E2E_DRAFTS_AGENDA_ITEM_TITLE, exact: false }).click();
		// other specs leave drafts on the conference's other papers: look at this paper's row
		await expect(
			page.locator(`tr:has(a[href$="/paperhub/${paperId}"])`).getByTestId('review-draft-marker')
		).toHaveCount(1, { timeout: 30_000 });

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

	test('a browser draft that cannot be saved is discarded for good', async ({ page }) => {
		const paperId = E2E_DRAFTS_PAPER_IDS.discard;
		await resetPaper(paperId);
		const key = `reviewDraft_${paperId}`;
		const text = 'Ein Entwurf aus dem Browser.';

		await loginAs(page, fixedTestUser(E2E_DRAFTS_PEOPLE.reviewer), {
			startUrl: `/dashboard/${C}/paperhub/${paperId}#review`
		});
		await waitForHydration(page);
		// a review kept the way the editor kept it before drafts were stored on the server
		await page.evaluate(
			({ key, text }) =>
				localStorage.setItem(
					key,
					JSON.stringify({
						comments: {
							type: 'doc',
							content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
						},
						selectedStatus: 'CHANGES_REQUESTED',
						savedAt: Date.now()
					})
				),
			{ key, text }
		);

		// every attempt to store it on the server fails
		let failedSaves = 0;
		await page.route('**/api/graphql**', async (route) => {
			if (!route.request().postData()?.includes('savePaperReviewDraft')) return route.fallback();
			failedSaves++;
			await route.fulfill({ status: 500, body: 'refused' });
		});
		await page.reload();
		await waitForHydration(page);
		const review = page.locator('#review');
		await expect(review.locator('.ProseMirror')).toContainText(text, { timeout: 30_000 });
		await expect.poll(() => failedSaves, { timeout: 15_000 }).toBeGreaterThan(0);
		// a save that failed leaves the browser's copy in place
		expect(await page.evaluate((key) => localStorage.getItem(key), key)).not.toBeNull();

		await review.getByRole('button', { name: /Entwurf verwerfen|Discard draft/ }).click();
		await page
			.locator('.modal-action')
			.getByRole('button', { name: /Entwurf verwerfen|Discard draft/ })
			.click();
		await expect(review.locator('.ProseMirror')).not.toContainText(text);
		await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), key)).toBeNull();

		// and it does not come back
		await page.unroute('**/api/graphql**');
		await page.reload();
		await waitForHydration(page);
		await expect(review.locator('.ProseMirror')).toBeVisible({ timeout: 30_000 });
		await expect(review.locator('.ProseMirror')).not.toContainText(text);
		expect(await sql('SELECT id FROM paper_review_draft WHERE paper_id = $1', [paperId])).toEqual(
			[]
		);
	});

	test('a second tab does not overwrite what the first one saved unseen', async ({
		page,
		request
	}) => {
		const paperId = E2E_DRAFTS_PAPER_IDS.discard;
		await resetPaper(paperId);
		await writeDraft({ request, token, paperId, content: 'Grundlage.' });
		const storedText = async () =>
			(
				await sql<{ text: string }>(
					'SELECT comments::text AS text FROM paper_review_draft WHERE paper_id = $1',
					[paperId]
				)
			)[0]?.text ?? '';

		// both tabs open the same draft
		await openPaper(page, paperId);
		const second = await page.context().newPage();
		await second.goto(`/dashboard/${C}/paperhub/${paperId}#review`);
		await waitForHydration(second);
		await expect(second.getByTestId('review-draft-notice')).toBeVisible({ timeout: 30_000 });

		const typeInto = async (tab: Page, text: string) => {
			await tab.locator('#review .ProseMirror p').first().click();
			await tab.keyboard.press('End');
			await tab.keyboard.type(text);
		};

		// the first tab saves its edit
		await typeInto(page, ' Aus Tab A.');
		await expect.poll(storedText, { timeout: 10_000 }).toContain('Aus Tab A.');

		// the second, which never saw that, is refused and asks
		await typeInto(second, ' Aus Tab B.');
		await expect(second.getByTestId('review-draft-changed')).toContainText(
			/anderen Tab|another tab/,
			{ timeout: 10_000 }
		);
		expect(await storedText()).not.toContain('Aus Tab B.');

		// keeping its version replaces the stored one, knowingly
		await second
			.getByTestId('review-draft-changed')
			.getByRole('button', { name: /Meine Fassung behalten|Keep my version/ })
			.click();
		await expect.poll(storedText, { timeout: 10_000 }).toContain('Aus Tab B.');
		expect(await storedText()).not.toContain('Aus Tab A.');
		await expect(second.getByTestId('review-draft-changed')).toBeHidden();
		await second.close();
	});
});
