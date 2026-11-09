// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { buildNsaCardsPdf, type NsaCardEntry } from './nsaCardsPdf';

const font = (weight: number) =>
	readFile(`node_modules/@fontsource/outfit/files/outfit-latin-${weight}-normal.woff`).then(
		(buffer) => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
	);

const card = (index: number): NsaCardEntry => ({
	givenName: 'Zoë',
	familyName: `Müller-Lüdenscheidt ${index}`,
	nsaName: 'Amnesty International',
	icon: null,
	cardNumber: 2,
	code: `HTTPS://DELEGATOR.EXAMPLE/ID/${'A'.repeat(180)}${index}`
});

describe('buildNsaCardsPdf', () => {
	it('sets four cards to a sheet', async () => {
		const bytes = await buildNsaCardsPdf({
			cards: [0, 1, 2, 3, 4].map(card),
			conferenceTitle: 'MUN-SH 2027',
			logo: null,
			cardLabel: (number) => `Card ${number}`,
			fonts: { regular: await font(400), bold: await font(700) }
		});
		expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
	});
});
