import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import {
	E2E_AGENDA_ITEM_ID,
	E2E_CONFERENCE_ID,
	E2E_PAPER_DELEGATE_USER_ID,
	E2E_PAPER_DELEGATION_ID
} from '../seed/seed';
import {
	E2E_INVALID_WORKING_PAPER_ID,
	E2E_WORKING_PAPER_ID,
	E2E_WORKING_PAPER_OPERATIVE,
	E2E_WORKING_PAPER_PREAMBLE
} from '../seed/workingPapers';

// Working papers are written in the resolution editor (@deutschemodelunitednations/munify-resolution-editor),
// whose clauses are textareas named by their placeholders, not the rich text editor of the other
// paper types.
const PREAMBLE_PLACEHOLDER = /unter Hinweis auf die Charta der Vereinten Nationen/;
const OPERATIVE_PLACEHOLDER = /beschließt, einen Überwachungsmechanismus einzurichten/;

type StoredResolution = {
	committeeName: string;
	preamble: { content: string }[];
	operative: { blocks: { type: string; content?: string }[] }[];
};

type StoredPaper = {
	id: string;
	type: string;
	status: string;
	versions: { version: number; content: StoredResolution }[];
};

async function gql<T>(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', { data: { query, variables } });
	const body = (await res.json()) as { data?: T; errors?: unknown };
	expect(body.errors, JSON.stringify(body)).toBeUndefined();
	return body.data as T;
}

/** The content of the paper's newest version. */
function latestContent(paper: StoredPaper) {
	return [...paper.versions].sort((a, b) => b.version - a.version)[0]?.content;
}

/** The text of each operative clause's first block. */
function operativeTexts(resolution: StoredResolution) {
	return resolution.operative.map((clause) => clause.blocks[0]?.content);
}

test('a delegate writes a new working paper in the resolution editor and submits it', async ({
	page
}) => {
	// Every run adds a paper to the same delegation; the marker finds this run's
	const marker = `E2E ${Date.now()}`;
	const preamble = `unter Hinweis auf ${marker},`;
	const operative = `beschließt, ${marker} umzusetzen;`;

	await loginAs(page, fixedTestUser(E2E_PAPER_DELEGATE_USER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/paperhub/newResolution`
	});
	await waitForHydration(page);

	await expect(page.getByText('Resolutions-Editor', { exact: true })).toBeVisible({
		timeout: 15_000
	});
	// The resolution opens with the committee the delegate sits in
	await expect(page.getByText('E2E Test Committee,', { exact: true }).first()).toBeVisible();

	await page.locator('select[name="agendaItemId"]').selectOption(E2E_AGENDA_ITEM_ID);

	// Both sections start empty, each offering its first clause; the preamble's comes first
	const addFirstClause = page.getByRole('button', { name: 'Ersten Absatz hinzufügen' });
	await expect(addFirstClause).toHaveCount(2);
	await addFirstClause.first().click();
	await page.getByPlaceholder(PREAMBLE_PLACEHOLDER).fill(preamble);
	await addFirstClause.click();
	await page.getByPlaceholder(OPERATIVE_PLACEHOLDER).fill(operative);

	// The live preview renders the clauses as the resolution will read
	await expect(page.locator('.resolution-preview').getByText(marker).first()).toBeVisible();

	await page.getByRole('button', { name: 'Papier einreichen' }).click();
	await page.waitForURL(new RegExp(`/paperhub$`), { timeout: 15_000 });

	const { papers } = await gql<{ papers: StoredPaper[] }>(
		page,
		`query ($d: ID!) {
			papers(where: { delegationId: { eq: $d }, type: WORKING_PAPER }) {
				id type status versions { version content }
			}
		}`,
		{ d: E2E_PAPER_DELEGATION_ID }
	);
	const created = papers.find((paper) =>
		latestContent(paper)?.preamble?.some((clause) => clause.content === preamble)
	);
	expect(created, JSON.stringify(papers)).toBeDefined();
	expect(created?.status).toBe('SUBMITTED');
	const content = latestContent(created!);
	expect(content.committeeName).toBe('E2E Test Committee');
	expect(content.preamble.map((clause) => clause.content)).toEqual([preamble]);
	expect(operativeTexts(content)).toEqual([operative]);
});

test('an author reopens a working paper draft in the resolution editor, extends it and submits it', async ({
	page
}) => {
	const added = `ersucht, den in Lauf ${Date.now()} ergänzten Absatz zu prüfen;`;

	await loginAs(page, fixedTestUser(E2E_PAPER_DELEGATE_USER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/paperhub/${E2E_WORKING_PAPER_ID}`
	});
	await waitForHydration(page);

	// The stored resolution is back in the editor, clause by clause
	await expect(page.getByPlaceholder(PREAMBLE_PLACEHOLDER)).toHaveValue(
		E2E_WORKING_PAPER_PREAMBLE,
		{ timeout: 15_000 }
	);
	const operativeClauses = page.getByPlaceholder(OPERATIVE_PLACEHOLDER);
	await expect(operativeClauses).toHaveCount(1);
	await expect(operativeClauses).toHaveValue(E2E_WORKING_PAPER_OPERATIVE);

	// The last "add clause" button is the operative section's, below its clauses. Matched by its
	// text: the library's icons are not aria-hidden, so their glyph is part of the button's name.
	await page
		.locator('button', { hasText: /^\s*Absatz hinzufügen\s*$/ })
		.last()
		.click();
	await expect(operativeClauses).toHaveCount(2);
	await operativeClauses.last().fill(added);

	await page.getByRole('button', { name: 'Papier einreichen' }).click();
	await expect(page.getByText(/erfolgreich eingereicht|submitted successfully/i)).toBeVisible({
		timeout: 15_000
	});

	const { paper } = await gql<{ paper: StoredPaper }>(
		page,
		`query ($p: ID!) { paper(id: $p) { id type status versions { version content } } }`,
		{ p: E2E_WORKING_PAPER_ID }
	);
	expect(paper.type).toBe('WORKING_PAPER');
	expect(paper.status).toBe('SUBMITTED');
	const content = latestContent(paper);
	expect(content.preamble.map((clause) => clause.content)).toEqual([E2E_WORKING_PAPER_PREAMBLE]);
	expect(operativeTexts(content)).toEqual([E2E_WORKING_PAPER_OPERATIVE, added]);
});

test('a working paper whose content is no resolution is offered as a download, not opened', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_PAPER_DELEGATE_USER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/paperhub/${E2E_INVALID_WORKING_PAPER_ID}`
	});
	await waitForHydration(page);

	await expect(page.getByText('Ungültiges Papierformat')).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText('Resolutions-Editor', { exact: true })).toHaveCount(0);

	const download = page.waitForEvent('download');
	await page.getByRole('button', { name: 'Rohdaten herunterladen' }).click();
	expect((await download).suggestedFilename()).toBe(
		`paper-${E2E_INVALID_WORKING_PAPER_ID}-raw-data.json`
	);
});
