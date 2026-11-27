import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import {
	E2E_PAPER_ALAN_ID,
	E2E_PAPER_CARE_ID,
	E2E_PAPER_CONFERENCE_ID,
	E2E_PAPER_GRACE_ID,
	E2E_PAPER_SECOND_CONFERENCE_ID
} from '../seed/paperScanning';
import { drawQr } from '../../src/lib/api/pdfQr';
import { defaultLayout, squareInPoints } from '../../src/lib/helpers/documentLayout';
import { drawPaperPage } from '../../src/lib/paperScan/drawPaper';
import { pageAreas } from '../../src/lib/paperScan/pageAreas';
import { penOn } from '../../src/lib/paperScan/scanSimulation';
import { signedCodeLink } from '../../src/lib/signedCode/signedCode';

// Reading the paper: participant care uploads scans and the statuses follow,
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

/** Somebody's stored scans and details, as participant care reads them. */
async function gracePaper(page: Page) {
	return paperOf({ page, conferenceId, userId: E2E_PAPER_GRACE_ID });
}

async function paperOf({ page, ...who }: { page: Page; conferenceId: string; userId: string }) {
	const result = await gql(
		page,
		`query {
			conferenceParticipants(where: {
				conferenceId: { eq: "${who.conferenceId}" }, userId: { eq: "${who.userId}" }
			}) {
				postalScans { source fields file { fileName } }
				agreementDetails { field state source }
			}
		}`
	);
	return result.data?.conferenceParticipants?.[0];
}

/**
 * A scan as a sheet feeder makes it: each person's contract page (Grace's only, by default), of the conference they are in, printed with
 * its code and marks and filled in (box ticked, place, date and signature written), its blank back, then
 * a page without a code.
 */
async function scannedContract({
	page,
	origin,
	of = [{ conferenceId, userId: E2E_PAPER_GRACE_ID }]
}: {
	page: Page;
	origin: string;
	of?: { conferenceId: string; userId: string }[];
}) {
	const pdf = await PDFDocument.create();
	for (const person of of) await addContract({ page, origin, pdf, person });
	return Buffer.from(await pdf.save());
}

async function addContract({
	page,
	origin,
	pdf,
	person
}: {
	page: Page;
	origin: string;
	pdf: PDFDocument;
	person: { conferenceId: string; userId: string };
}) {
	const issued = await gql(
		page,
		`mutation ($c: ID!, $u: ID!, $p: [PrintedPageInput!]!) {
			issueDocumentCodes(conferenceId: $c, userId: $u, pages: $p) { code }
		}`,
		{
			c: person.conferenceId,
			u: person.userId,
			p: [{ document: 'contract', page: 0, ...A4, printedInk: [] }]
		}
	);
	const code: string = issued.data.issueDocumentCodes[0].code;

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
	const stray = pdf.addPage([A4.width, A4.height]);
	for (let line = 0; line < 20; line++) stray.drawText('no code', { x: 60, y: 760 - line * 20 });
}

test('a batch of scans marks a signed contract in, unattended, and ignores pages without a code', async ({
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
	const batch = page.getByRole('region', { name: /gescannte unterlagen|scanned documents/i });
	await batch
		.locator('input[type="file"]')
		.setInputFiles({ name: 'stapel.pdf', mimeType: 'application/pdf', buffer: scan });

	await expect(batch.getByText(/grace/i).first()).toBeVisible({ timeout: 60_000 });
	await expect(
		batch.getByText(/verbindliche anmeldung: unterschrieben|binding registration: signed/i)
	).toBeVisible();
	// neither the blank back nor the page without a code is a problem
	await expect(batch.getByText(/kein code|no code/i)).toHaveCount(0);
	await expect.poll(() => graceStatus(page)).toBe('DONE');

	// her page is kept as a scan of hers, with the details it says
	const paper = await gracePaper(page);
	expect(paper.postalScans).toEqual([
		{
			source: 'UPLOAD',
			fields: ['termsAccepted', 'termsPlaceDate', 'termsSignature'],
			file: { fileName: 'stapel_1.pdf' }
		}
	]);
	expect(paper.agreementDetails).toContainEqual({
		field: 'termsSignature',
		state: 'yes',
		source: 'SCAN'
	});

	// the same file again keeps nothing twice
	await batch
		.locator('input[type="file"]')
		.setInputFiles({ name: 'stapel.pdf', mimeType: 'application/pdf', buffer: scan });
	await expect(batch.getByText(/schon vorhanden|there already/i)).toBeVisible({
		timeout: 60_000
	});
	expect((await gracePaper(page)).postalScans).toHaveLength(1);

	// on her card: the scan, and the details in a tab of their own, which can be set by hand
	await page.goto(`/dashboard/${conferenceId}/team/user/${E2E_PAPER_GRACE_ID}`);
	await waitForHydration(page);
	await page.getByRole('tab', { name: /formalitäten|formalities/i }).click();
	const scans = page.getByRole('list', { name: /scans der unterlagen|scans of the documents/i });
	await expect(scans.getByText('stapel_1.pdf')).toBeVisible();
	const terms = (state: string) =>
		page.getByRole('button', {
			name: new RegExp(`^(vertragsbedingungen akzeptiert|.*terms.*): (${state})$`, 'i')
		});
	await expect(terms('.*')).toHaveCount(0);
	await page
		.getByRole('tab', { name: /details der einwilligungen|details of the agreements/i })
		.click();
	await terms('ja|yes').click();
	await page
		.locator('[popover]:popover-open')
		.getByRole('button', { name: /^(nein|no)$/i })
		.click();
	await expect
		.poll(async () =>
			(await gracePaper(page)).agreementDetails.find(
				(detail: { field: string }) => detail.field === 'termsAccepted'
			)
		)
		.toEqual({ field: 'termsAccepted', state: 'no', source: 'MANUAL' });
	// the status is the team's own
	expect(await graceStatus(page)).toBe('DONE');

	await page.getByRole('tab', { name: /^scans$/i }).click();
	// the tab mounts the list afresh; a click before it settles opens no dialog
	const confirmDelete = page
		.getByRole('dialog')
		.getByRole('button', { name: /^(löschen|delete)$/i });
	await expect(async () => {
		await scans.getByRole('button', { name: /löschen|delete/i }).click({ timeout: 2_000 });
		await expect(confirmDelete).toBeVisible({ timeout: 2_000 });
	}).toPass({ timeout: 15_000 });
	await confirmDelete.click();
	await expect.poll(async () => (await gracePaper(page)).postalScans).toEqual([]);
});

test('a scanner delivers over WebDAV with a login of its owner, for all their conferences', async ({
	page,
	baseURL
}) => {
	test.setTimeout(120_000);
	await loginAs(page, fixedTestUser(E2E_PAPER_CARE_ID), {
		startUrl: `/dashboard/${conferenceId}/team/postal-registration`
	});
	await waitForHydration(page);
	// the logins are on the profile, whatever conference they deliver into
	await page.getByRole('link', { name: /scanner einrichten|set up a scanner/i }).click();
	await expect(page).toHaveURL(/\/my-account\/scanners$/);
	await waitForHydration(page);
	const setup = page.locator('#main-content');
	await setup.getByLabel(/name des geräts|name of the device/i).fill('E2E Kopierer');
	await setup.getByRole('button', { name: /zugang anlegen|make a login/i }).click();
	const made = setup.getByRole('status');
	await expect(made).toContainText('E2E Kopierer');
	const [username, password] = await made.locator('code').allInnerTexts();

	const scan = await scannedContract({ page, origin: baseURL ?? 'https://localhost' });
	const deliver = (secret: string, data = scan) =>
		page.request.put('/api/scans/stapel.pdf', {
			data,
			timeout: 90_000,
			headers: {
				'content-type': 'application/pdf',
				authorization: `Basic ${Buffer.from(`${username}:${secret}`).toString('base64')}`
			}
		});
	expect((await deliver('wrong')).status()).toBe(401);
	const before = (await gracePaper(page)).postalScans.length;
	expect((await deliver(password)).status()).toBe(201);
	// it is taken in after the scanner was answered
	await expect
		.poll(async () => (await gracePaper(page)).postalScans.length, { timeout: 60_000 })
		.toBe(before + 1);
	const { postalScans } = await gracePaper(page);
	expect(postalScans).toContainEqual(expect.objectContaining({ source: 'WEBDAV' }));

	// a stack of several people and conferences: each page is its person's
	const mixed = await scannedContract({
		page,
		origin: baseURL ?? 'https://localhost',
		of: [
			{ conferenceId: E2E_PAPER_SECOND_CONFERENCE_ID, userId: E2E_PAPER_ALAN_ID },
			{ conferenceId, userId: E2E_PAPER_GRACE_ID }
		]
	});
	expect((await deliver(password, mixed)).status()).toBe(201);
	await expect
		.poll(async () => (await gracePaper(page)).postalScans.length, { timeout: 60_000 })
		.toBe(before + 2);
	const alan = await paperOf({
		page,
		conferenceId: E2E_PAPER_SECOND_CONFERENCE_ID,
		userId: E2E_PAPER_ALAN_ID
	});
	expect(alan.postalScans).toEqual([
		{
			source: 'WEBDAV',
			fields: ['termsAccepted', 'termsPlaceDate', 'termsSignature'],
			file: { fileName: 'stapel_1.pdf' }
		}
	]);

	// a device of its own has a login of its own, and revoking one leaves the other
	await setup.getByLabel(/name des geräts|name of the device/i).fill('E2E Zweitgerät');
	await setup.getByRole('button', { name: /zugang anlegen|make a login/i }).click();
	const revoke = (name: string) =>
		setup.getByRole('button', { name: new RegExp(`(widerrufen|revoke): ${name}`, 'i') });
	await expect(revoke('E2E Zweitgerät').first()).toBeVisible();
	await revoke('E2E Kopierer').first().click();
	await page
		.getByRole('dialog')
		.last()
		.getByRole('button', { name: /^(löschen|delete)$/i })
		.click();
	await expect(revoke('E2E Zweitgerät').first()).toBeVisible();
	await expect.poll(async () => (await deliver(password)).status()).toBe(401);
});

test('a scanner login is its owner’s alone, and only for who manages participants', async ({
	page,
	browser
}) => {
	const make = 'mutation { createScannerAccess(name: "E2E fremd") { id } }';
	// signed in elsewhere first: `loginAs` takes landing under /my-account for the profile it asks to complete
	await loginAs(page, fixedTestUser(E2E_PAPER_CARE_ID), { startUrl: '/dashboard' });
	const id = (await gql(page, make)).data.createScannerAccess.id;

	const other = await browser.newContext({ ignoreHTTPSErrors: true });
	const participant = await other.newPage();
	await loginAs(participant, fixedTestUser(E2E_PAPER_GRACE_ID), { startUrl: '/dashboard' });
	await participant.goto('/my-account/scanners');
	await waitForHydration(participant);
	await expect(participant.getByTestId('scanners-none')).toBeVisible();
	await expect(
		participant.getByRole('button', { name: /zugang anlegen|make a login/i })
	).toHaveCount(0);
	const codeOf = async (query: string) =>
		(await gql(participant, query)).errors?.[0]?.extensions?.code;
	expect(await codeOf(make)).toBe('FORBIDDEN');
	expect(await codeOf(`mutation { renewScannerAccess(id: "${id}") }`)).toBe('NOT_FOUND');
	expect(await codeOf(`mutation { deleteScannerAccess(id: "${id}") }`)).toBe('NOT_FOUND');
	const own = await gql(participant, '{ myScanners { allowed accesses { id } } }');
	expect(own.data.myScanners).toEqual({ allowed: false, accesses: [] });
	await other.close();
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

	const sheet = editor.getByRole('application');
	const onPage = (name: string) =>
		sheet.getByRole('button', { name: new RegExp(`^${name}:`, 'i') });
	const panel = editor.locator('aside');

	// DMUN's form with the default layout: every field clear, read empty
	await expect(panel.getByText(/alle felder liegen frei|every field is clear/i)).toBeVisible({
		timeout: 30_000
	});

	// the first page: the uses, and the marks shown but fixed
	await expect(onPage('als foto')).toBeVisible();
	await expect(editor.getByRole('img', { name: /ausrichtungsmarke|alignment mark/i })).toHaveCount(
		4
	);
	await expect(
		editor.getByRole('button', { name: /ausrichtungsmarke|alignment mark/i })
	).toHaveCount(0);

	// what the form has no use for is switched off, its place kept
	const birthday = panel.getByRole('checkbox', { name: /geburts|birth/i });
	await expect(birthday).toBeChecked();
	await expect(sheet.getByRole('button', { name: /geburts|birth/i })).toBeVisible();
	await birthday.uncheck();
	await expect(sheet.getByRole('button', { name: /geburts|birth/i })).toHaveCount(0);

	// the second: the purposes
	await editor.getByRole('button', { name: /nächste seite|next page/i }).click();
	await expect(editor.getByText(/seite 2 von 3|page 2 of 3/i)).toBeVisible();
	await expect(onPage('konferenzpresse')).toBeVisible();
	await expect(onPage('als foto')).toHaveCount(0);

	// a field put on another page shows there, over that page's own box, and is saved there once
	// moved off it
	await panel.getByRole('combobox', { name: /als foto/i }).selectOption({ label: 'Seite 2' });
	await expect(onPage('als foto')).toBeVisible();

	// over the field already there it would not read: the check says so and saving waits
	await expect(
		panel.getByRole('button', { name: /als foto.*(überdecken sich|overlap)/i })
	).toBeVisible();
	const save = editor.getByRole('button', { name: /^speichern$|^save$/i });
	await expect(save).toBeDisabled();
	// moved aside with the arrow keys, it can be saved
	await onPage('als foto').focus();
	await page.keyboard.press('Shift+ArrowRight');
	await page.keyboard.press('Shift+ArrowRight');
	await expect(save).toBeEnabled();
	// on the form's text, which an empty form would read as filled in: the checks tell at once
	await expect(onPage('als foto')).toHaveAccessibleName(/als ausgefüllt|unklar|filled in|unclear/i);
	await expect(panel.getByText(/felder mit problemen|fields with problems/i)).toBeVisible();
	await save.click();

	await expect
		.poll(async () => {
			const result = await gql(page, `query ($c: ID!) { conference(id: $c) { documentLayouts } }`, {
				c: conferenceId
			});
			const saved = result.data?.conference?.documentLayouts?.mediaConsent;
			return { page: saved?.mediaPhoto?.page, birthdayHidden: saved?.birthday?.hidden };
		})
		.toEqual({ page: 1, birthdayHidden: true });
});
