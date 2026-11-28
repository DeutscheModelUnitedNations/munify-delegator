import { chromium } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, waitForHydration } from '../support/auth';
import { pageOnDesk, writeY4m } from '../support/fakeCamera';
import { addContract, paperOf } from '../support/paperScans';
import {
	E2E_PAPER_ADA_ID,
	E2E_PAPER_CARE_ID,
	E2E_PAPER_CONFERENCE_ID
} from '../seed/paperScanning';
import { renderPdfPage } from '../../src/lib/paperScan/scanSimulation';

// The camera as a scanner: a page slid under it is read without anybody touching anything, and
// kept as the person's scan. Chromium films a video of the page lying on a desk.

const conferenceId = E2E_PAPER_CONFERENCE_ID;
const ada = { conferenceId, userId: E2E_PAPER_ADA_ID };

/** A 4K picture of Ada's filled-in contract lying on a desk, as a camera above it films it. */
async function filmedContract({ page, origin }: { page: Page; origin: string }) {
	const pdf = await PDFDocument.create();
	await addContract({ page, origin, pdf, person: ada });
	// the page 2000 pixels high, as a phone held over it sees it
	const sheet = await renderPdfPage({ bytes: await pdf.save(), dpi: 171 });
	return pageOnDesk({ page: sheet, width: 3840, height: 2160 });
}

test('a page lying under the camera is read and kept as her scan, hands-free', async ({
	page,
	baseURL
}, testInfo) => {
	test.setTimeout(120_000);
	const origin = baseURL ?? 'https://localhost';
	await loginAs(page, fixedTestUser(E2E_PAPER_CARE_ID), { startUrl: '/dashboard' });
	expect((await paperOf({ page, ...ada })).termsAndConditions).toBe('PENDING');

	const video = testInfo.outputPath('camera.y4m');
	writeY4m({ frames: [await filmedContract({ page, origin })], path: video });
	const browser = await chromium.launch({
		args: [
			'--use-fake-device-for-media-stream',
			'--use-fake-ui-for-media-stream',
			`--use-file-for-fake-video-capture=${video}`
		]
	});
	try {
		const context = await browser.newContext({
			baseURL,
			ignoreHTTPSErrors: true,
			permissions: ['camera']
		});
		const scanner = await context.newPage();
		await loginAs(scanner, fixedTestUser(E2E_PAPER_CARE_ID), {
			startUrl: `/dashboard/${conferenceId}/team/postal-registration`
		});
		await waitForHydration(scanner);
		await expect(scanner.getByText(/ganze seite|whole page/i)).toBeVisible();
		await scanner.getByRole('button', { name: /kamera starten|start camera/i }).click();

		// read once it lay still, and listed as kept
		const log = scanner.getByRole('region', {
			name: /mit der kamera gelesen|read with the camera/i
		});
		await expect(log.getByRole('button', { name: /ada/i })).toContainText(/gespeichert|stored/i, {
			timeout: 60_000
		});
		await expect
			.poll(async () => (await paperOf({ page, ...ada })).termsAndConditions)
			.toBe('DONE');
		const paper = await paperOf({ page, ...ada });
		expect(paper.postalScans).toEqual([
			expect.objectContaining({
				source: 'CAMERA',
				fields: ['termsAccepted', 'termsPlaceDate', 'termsSignature']
			})
		]);
		expect(paper.agreementDetails).toContainEqual({
			field: 'termsSignature',
			state: 'yes',
			source: 'SCAN'
		});

		// the same page still lying there is not taken again
		await expect(scanner.getByText(/nächste seite|next page/i).first()).toBeVisible();
		await scanner.waitForTimeout(2_000);
		await expect(log.getByRole('button')).toHaveCount(1);
		expect((await paperOf({ page, ...ada })).postalScans).toHaveLength(1);
	} finally {
		await browser.close();
	}
});
