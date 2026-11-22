import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import {
	E2E_PAPER_CARE_ID,
	E2E_PAPER_CONFERENCE_ID,
	E2E_PAPER_GRACE_ID
} from '../seed/paperScanning';
import { drawQr } from '../../src/lib/api/pdfQr';
import { defaultLayout, squareInPoints } from '../../src/lib/helpers/documentLayout';
import { drawPaperPage } from '../../src/lib/paperScan/drawPaper';
import { pageAreas } from '../../src/lib/paperScan/pageAreas';
import { penOn } from '../../src/lib/paperScan/scanSimulation';
import { signedCodeLink } from '../../src/lib/signedCode/signedCode';

// A conference that reads its paper: participant care uploads scans and the statuses follow,
// unattended; the layout editor places the fields to read, page by page, the marks fixed.

const conferenceId = E2E_PAPER_CONFERENCE_ID;
const A4 = { width: 595.28, height: 841.89 };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'de' },
		data: { query, variables }
	});
	return res.json();
}

/** Grace's postal status as stored. */
async function graceStatus(page: Page) {
	const result = await gql(
		page,
		`query {
			conferenceParticipants(where: {
				conferenceId: { eq: "${conferenceId}" }, userId: { eq: "${E2E_PAPER_GRACE_ID}" }
			}) { termsAndConditions }
		}`
	);
	return result.data?.conferenceParticipants?.[0]?.termsAndConditions;
}

/**
 * A scan as a sheet feeder makes it: Grace's contract page, printed with its code and marks and
 * filled in (box ticked, place, date and signature written), then a blank back.
 */
async function scannedContract({ page, origin }: { page: Page; origin: string }) {
	const issued = await gql(
		page,
		`mutation ($c: ID!, $u: ID!, $p: [PrintedPageInput!]!) {
			issueDocumentCodes(conferenceId: $c, userId: $u, pages: $p) { code }
		}`,
		{ c: conferenceId, u: E2E_PAPER_GRACE_ID, p: [{ document: 'contract', page: 0, ...A4 }] }
	);
	const code: string = issued.data.issueDocumentCodes[0].code;

	const pdf = await PDFDocument.create();
	const sheet = pdf.addPage([A4.width, A4.height]);
	const layout = defaultLayout('contract');
	drawPaperPage({ page: sheet, document: 'contract', layout, pageIndex: 0 });
	const square = squareInPoints({ placement: layout.code, ...A4 });
	await drawQr({
		pdf,
		page: sheet,
		text: signedCodeLink({ origin, code }),
		box: { x: square.left, top: square.bottom + square.side, side: square.side },
		corporate: false
	});
	const pen = penOn(sheet);
	for (const area of pageAreas({ document: 'contract', layout, page: 0, size: A4 }).areas) {
		if (area.field === 'termsAccepted') pen.cross(area);
		else pen.write({ x: area.x + 2, line: area.y + area.height, length: area.width * 0.6 });
	}
	pdf.addPage([A4.width, A4.height]);
	return Buffer.from(await pdf.save());
}

test('a batch of scans marks a signed contract in, unattended, and lists the page without a code', async ({
	page,
	baseURL
}) => {
	test.setTimeout(90_000);
	await loginAs(page, fixedTestUser(E2E_PAPER_CARE_ID), {
		startUrl: `/dashboard/${conferenceId}/team/postal-registration`
	});
	await waitForHydration(page);
	expect(await graceStatus(page)).toBe('PENDING');

	const scan = await scannedContract({ page, origin: baseURL ?? 'https://localhost' });
	await page.getByRole('button', { name: /scans hochladen|upload scans/i }).click();
	const dialog = page.getByRole('dialog');
	await dialog
		.locator('input[type="file"]')
		.setInputFiles({ name: 'stapel.pdf', mimeType: 'application/pdf', buffer: scan });

	await expect(dialog.getByText(/grace/i).first()).toBeVisible({ timeout: 60_000 });
	await expect(
		dialog.getByText(/verbindliche anmeldung: unterschrieben|binding registration: signed/i)
	).toBeVisible();
	await expect(dialog.getByText(/kein code gefunden|no code found/i)).toBeVisible();
	await expect.poll(() => graceStatus(page)).toBe('DONE');
});

test('the layout editor places the fields page by page and keeps the marks fixed', async ({
	page
}) => {
	test.setTimeout(90_000);
	await loginAs(page, fixedTestUser(E2E_PAPER_CARE_ID), {
		startUrl: `/dashboard/${conferenceId}/team/configuration?tab=documents`
	});
	await waitForHydration(page);

	// DMUN's media consent (three pages), stored through the settings form
	await page.locator('input[name="mediaConsentBasePDF"]').setInputFiles({
		name: 'einwilligung.pdf',
		mimeType: 'application/pdf',
		buffer: readFileSync('src/api/db/seed-data/templates/mediaConsent.pdf')
	});
	await page
		.getByRole('button', { name: /einstellungen speichern|save settings/i })
		.last()
		.click();
	const preview = page.locator('.modal-open, dialog[open]').first();
	await preview.getByRole('button', { name: /^(speichern|save)$/i }).click();

	await page
		.getByRole('button', { name: /felder platzieren|place fields/i })
		.nth(2)
		.click();
	const editor = page.getByRole('dialog', { name: /einwilligung bildnutzung|media usage/i });
	await expect(editor.getByText(/seite 1 von 3|page 1 of 3/i)).toBeVisible({ timeout: 30_000 });

	// the first page: the uses, and the marks shown but fixed
	await expect(editor.getByRole('button', { name: /^als foto$/i })).toBeVisible();
	await expect(editor.getByRole('img', { name: /ausrichtungsmarke|alignment mark/i })).toHaveCount(
		4
	);
	await expect(
		editor.getByRole('button', { name: /ausrichtungsmarke|alignment mark/i })
	).toHaveCount(0);

	// the second: the purposes
	await editor.getByRole('button', { name: /nächste seite|next page/i }).click();
	await expect(editor.getByText(/seite 2 von 3|page 2 of 3/i)).toBeVisible();
	await expect(editor.getByRole('button', { name: /^konferenzpresse$/i })).toBeVisible();
	await expect(editor.getByRole('button', { name: /^als foto$/i })).toHaveCount(0);

	// a field put on another page shows there, and is saved there
	await editor.getByRole('combobox', { name: /als foto/i }).selectOption({ label: 'Seite 2' });
	await expect(editor.getByRole('button', { name: /^als foto$/i })).toBeVisible();
	await editor.getByRole('button', { name: /^speichern$|^save$/i }).click();

	await expect
		.poll(async () => {
			const result = await gql(page, `query ($c: ID!) { conference(id: $c) { documentLayouts } }`, {
				c: conferenceId
			});
			return result.data?.conference?.documentLayouts?.mediaConsent?.mediaPhoto?.page;
		})
		.toBe(1);
});
