import type { Page } from '@playwright/test';
import pg from 'pg';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { callTool, mcpToken } from '../support/mcp';
import { E2E_POINTS, E2E_POINTS_SEEDED, E2E_POINTS_TITLES } from '../seed/discussionPoints';

// An agenda item's points for discussion: the team edits them, authors see them while writing and
// on their paper, reviewers next to the paper, the guide in a box where `{{Diskussionspunkte}}`
// stands (else below the title), and an assistant gets them with the committee text.

const C = E2E_POINTS.conference;
const P = E2E_POINTS.people;

async function sql<Row extends Record<string, unknown>>(statement: string, values: unknown[] = []) {
	const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
	await client.connect();
	try {
		return (await client.query<Row>(statement, values)).rows;
	} finally {
		await client.end();
	}
}

async function pointsOf(agendaItemId: string) {
	const rows = await sql<{ discussion_points: string[] }>(
		'SELECT discussion_points FROM committee_agenda_item WHERE id = $1',
		[agendaItemId]
	);
	return rows[0]?.discussion_points;
}

/** The points as the seed has them: a retry starts from what the failed attempt left. */
async function resetPoints() {
	await sql('UPDATE committee_agenda_item SET discussion_points = $2 WHERE id = $1', [
		E2E_POINTS.agendaItems.withPoints,
		E2E_POINTS_SEEDED
	]);
	await sql("UPDATE committee_agenda_item SET discussion_points = '{}' WHERE id = $1", [
		E2E_POINTS.agendaItems.withoutPoints
	]);
}

const box = (page: Page) => page.getByTestId('discussion-points');

test.describe('points for discussion', () => {
	test.beforeEach(resetPoints);
	test.afterAll(resetPoints);

	test('the content lead edits them with the agenda item', async ({ page }) => {
		await loginAs(page, fixedTestUser(P.contentLead), {
			startUrl: `/dashboard/${C}/team/configuration/committees`
		});
		const row = page.getByRole('listitem').filter({ hasText: E2E_POINTS_TITLES.withPoints });
		await expect(row).toContainText(/Punkte zur Diskussion: 2|Points for discussion: 2/);
		await row.getByRole('button', { name: /Bearbeiten|Edit/ }).click();

		const dialog = page.getByRole('dialog');
		const first = dialog.getByRole('textbox', {
			name: /Punkt zur Diskussion 1|Point for discussion 1/
		});
		await expect(first).toHaveValue(E2E_POINTS_SEEDED[0]);

		// Enter starts the next point; it moves to the front, the old first one goes
		await dialog
			.getByRole('textbox', { name: /Punkt zur Diskussion 2|Point for discussion 2/ })
			.press('End');
		await page.keyboard.press('Enter');
		// Enter added point 3; fill that field, not whatever has focus
		await dialog
			.getByRole('textbox', { name: /Punkt zur Diskussion 3|Point for discussion 3/ })
			.fill('Wer kontrolliert die Umsetzung?');
		await dialog.getByRole('button', { name: /Punkt 3 nach oben|Move point 3 up/ }).click();
		await dialog.getByRole('button', { name: /Punkt 1 entfernen|Remove point 1/ }).click();
		// a blank point is left out when saving
		await dialog.getByRole('button', { name: /Punkt hinzufügen|Add point/ }).click();
		await dialog.getByRole('button', { name: /Speichern|Save/ }).click();

		await expect
			.poll(() => pointsOf(E2E_POINTS.agendaItems.withPoints))
			.toEqual(['Wer kontrolliert die Umsetzung?', E2E_POINTS_SEEDED[1]]);
	});

	test('authors see them while writing and on their paper, reviewers next to it', async ({
		page
	}) => {
		await loginAs(page, fixedTestUser(P.delegate), {
			startUrl: `/dashboard/${C}/paperhub/${E2E_POINTS.paper}`
		});
		for (const point of E2E_POINTS_SEEDED) await expect(box(page)).toContainText(point);

		// a new paper: the box follows the agenda item picked, none for one without points
		await page.goto(`/dashboard/${C}/paperhub/newPaper`);
		await waitForHydration(page);
		const agendaItem = page.locator('select[name="agendaItemId"]');
		await agendaItem.selectOption({ label: E2E_POINTS_TITLES.withPoints });
		await expect(box(page)).toContainText(E2E_POINTS_SEEDED[1]);
		await agendaItem.selectOption({ label: E2E_POINTS_TITLES.withoutPoints });
		await expect(box(page)).toHaveCount(0);

		await loginAs(page, fixedTestUser(P.reviewer), {
			startUrl: `/dashboard/${C}/paperhub/${E2E_POINTS.paper}`
		});
		await expect(box(page)).toContainText(E2E_POINTS_SEEDED[0]);
	});

	test('the guide shows them where the placeholder stands, else below the title', async ({
		page
	}) => {
		await loginAs(page, fixedTestUser(P.delegate), {
			startUrl: `/dashboard/${C}/guide/${E2E_POINTS.pages.withPoints}`
		});
		const content = page.getByTestId('guide-content');
		await expect(box(page)).toContainText(E2E_POINTS_SEEDED[0]);
		await expect(content).not.toContainText('{{Diskussionspunkte}}');
		// in place of the placeholder: after the introduction, before the background
		const text = await content.innerText();
		expect(text.indexOf('Einleitung')).toBeLessThan(text.indexOf(E2E_POINTS_SEEDED[0]));
		expect(text.indexOf(E2E_POINTS_SEEDED[0])).toBeLessThan(text.indexOf('Hintergrund'));
		// its heading carries the anchor the table of contents links to (shown on wide screens)
		await expect(page.locator('#punkte-zur-diskussion')).toBeVisible();

		// a page without the placeholder and an agenda item without points: no box ...
		await page.goto(`/dashboard/${C}/guide/${E2E_POINTS.pages.withoutPoints}`);
		await waitForHydration(page);
		await expect(content).toContainText('Ein Punkt aus dem alten Guide');
		await expect(box(page)).toHaveCount(0);
		// ... until it has points: then they come first, below the title
		await sql('UPDATE committee_agenda_item SET discussion_points = $2 WHERE id = $1', [
			E2E_POINTS.agendaItems.withoutPoints,
			['Ein neuer Punkt']
		]);
		await page.reload();
		await expect(box(page)).toContainText('Ein neuer Punkt');
		const after = await content.innerText();
		expect(after.indexOf('Ein neuer Punkt')).toBeLessThan(after.indexOf('Ein Punkt aus dem alten'));
	});

	test('assistants read them with the committee text; guide editors set them, reviewers not', async ({
		playwright,
		baseURL
	}) => {
		const request = await playwright.request.newContext({ baseURL, ignoreHTTPSErrors: true });
		const resource = new URL('/mcp', baseURL).href;
		const reviewer = await mcpToken(request, P.reviewer, resource);
		const contentLead = await mcpToken(request, P.contentLead, resource);

		const context = await callTool({
			request,
			token: reviewer,
			name: 'agenda_item_context',
			args: { conferenceId: C, agendaItemId: E2E_POINTS.agendaItems.withPoints }
		});
		expect(context.isError).toBe(false);
		const read = JSON.parse(context.text);
		expect(read.discussionPoints).toEqual(E2E_POINTS_SEEDED);
		expect(read.discussionPointsSource).toBe('agendaItem');
		expect(read.committeeText.markdown).toContain('Einleitung zum Thema.');

		// the old guide's list in the text stands in for points the agenda item has none of
		const old = JSON.parse(
			(
				await callTool({
					request,
					token: reviewer,
					name: 'agenda_item_context',
					args: { conferenceId: C, agendaItemId: E2E_POINTS.agendaItems.withoutPoints }
				})
			).text
		);
		expect(old.discussionPoints).toEqual(['Ein Punkt aus dem alten Guide']);
		expect(old.discussionPointsSource).toBe('committeeText');

		const set = (token: string, discussionPoints: string[]) =>
			callTool({
				request,
				token,
				name: 'setAgendaItemDiscussionPoints',
				args: {
					conferenceId: C,
					agendaItemId: E2E_POINTS.agendaItems.withoutPoints,
					discussionPoints
				}
			});
		expect((await set(reviewer, ['Nicht erlaubt'])).isError).toBe(true);
		expect((await set(contentLead, ['Gut', '   '])).isError).toBe(true);
		expect((await set(contentLead, ['Von der Assistenz'])).isError).toBe(false);
		expect(await pointsOf(E2E_POINTS.agendaItems.withoutPoints)).toEqual(['Von der Assistenz']);
		await request.dispose();
	});
});
