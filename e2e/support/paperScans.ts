import type { Page } from '@playwright/test';
import type { PDFDocument } from 'pdf-lib';
import { drawQr } from '../../src/lib/api/pdfQr';
import { defaultLayout, squareInPoints } from '../../src/lib/helpers/documentLayout';
import { drawPaperPage } from '../../src/lib/paperScan/drawPaper';
import { pageAreas } from '../../src/lib/paperScan/pageAreas';
import { penOn } from '../../src/lib/paperScan/scanSimulation';
import { signedCodeLink } from '../../src/lib/signedCode/signedCode';

/** Paper for the scanning specs: contracts printed with their codes and marks, and filled in. */

const A4 = { width: 595.28, height: 841.89 };

export async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'de' },
		data: { query, variables }
	});
	return res.json();
}

/** Somebody's stored scans and details, as participant care reads them. */
export async function paperOf({
	page,
	...who
}: {
	page: Page;
	conferenceId: string;
	userId: string;
}) {
	const result = await gql(
		page,
		`query {
			conferenceParticipants(where: {
				conferenceId: { eq: "${who.conferenceId}" }, userId: { eq: "${who.userId}" }
			}) {
				termsAndConditions
				postalScans { source fields file { fileName } }
				agreementDetails { field state source }
			}
		}`
	);
	return result.data?.conferenceParticipants?.[0];
}

/**
 * Adds `person`'s contract page to `pdf` as a sheet feeder scans it: printed with its code and marks
 * and filled in (box ticked, place, date and signature written), its blank back, then a page without
 * a code.
 */
export async function addContract({
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
