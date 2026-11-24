// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createCanvas } from '@napi-rs/canvas';
import { PDFDict, PDFDocument, PDFName, PDFRawStream, rgb } from 'pdf-lib';
import { describe, expect, test, vi } from 'vitest';
import { pdfText, renderPdfPage } from '#lib/paperScan/scanSimulation';
import { bytesSource, type ScanSource } from '../source';
import { PageError, ScanUnreadableError, SourceReadError } from '../errors';
import { pdfPages } from './pages';

const template = (name: string) =>
	new Uint8Array(readFileSync(`src/api/db/seed-data/templates/${name}.pdf`));
const latin1 = (text: string) => Uint8Array.from(text, (char) => char.charCodeAt(0));

/** A picture told by its width. */
function png(width: number) {
	const canvas = createCanvas(width, 10);
	canvas.getContext('2d').fillRect(0, 0, width, 10);
	return canvas.toBuffer('image/png');
}

/** A stack with a page per width, each showing a picture as wide. */
async function stack(widths: number[]) {
	const pdf = await PDFDocument.create();
	for (const width of widths) {
		pdf.addPage([width, 300]).drawImage(await pdf.embedPng(png(width)));
	}
	return pdf;
}

/** The same, every page listing the pictures of all. */
async function sharing(widths: number[]) {
	const pdf = await PDFDocument.load(await (await stack(widths)).save());
	const { context } = pdf;
	const all = PDFDict.withContext(context);
	for (const page of pdf.getPages()) {
		const listed = page.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
		for (const [key, value] of listed?.entries() ?? []) all.set(key, value);
	}
	const shared = context.register(context.obj({ XObject: all }));
	for (const page of pdf.getPages()) page.node.set(PDFName.of('Resources'), shared);
	return pdf;
}

const saved = async (pdf: PDFDocument, useObjectStreams = true) =>
	new Uint8Array(await pdf.save({ useObjectStreams }));

/** Every page as a file, and its number. */
async function cutAll(source: ScanSource, from?: number) {
	const pages: { page: number; bytes: Uint8Array<ArrayBuffer> }[] = [];
	for await (const { page, cut } of pdfPages({ source, from }))
		pages.push({ page, bytes: await cut() });
	return pages;
}

async function widths(source: ScanSource, from?: number) {
	const found: number[] = [];
	for (const { bytes } of await cutAll(source, from)) {
		const pdf = await PDFDocument.load(bytes);
		expect(pdf.getPageCount()).toBe(1);
		found.push(pdf.getPage(0).getWidth());
	}
	return found;
}

/** How wide the pictures anywhere in a file are. */
async function picturesIn(bytes: Uint8Array) {
	const { context } = await PDFDocument.load(bytes);
	return context
		.enumerateIndirectObjects()
		.map(([, object]) => object)
		.filter((object) => object instanceof PDFRawStream)
		.filter(({ dict }) => dict.get(PDFName.of('Subtype')) === PDFName.of('Image'))
		.map(({ dict }) => Number(String(dict.get(PDFName.of('Width')))));
}

describe('pdfPages', () => {
	test.each([
		['a table stream and object streams', true],
		['a table as text', false]
	])('cuts each page out of a file with %s', async (_, useObjectStreams) => {
		const source = bytesSource(await saved(await stack([100, 200, 300]), useObjectStreams));
		expect(await widths(source)).toEqual([100, 200, 300]);
		const pages = await cutAll(source);
		expect(pages.map(({ page }) => page)).toEqual([1, 2, 3]);
		expect(await Promise.all(pages.map(({ bytes }) => picturesIn(bytes)))).toEqual([
			[100],
			[200],
			[300]
		]);
	});

	test('goes on at a later page, in a tree of pages too', async () => {
		const pdf = await stack(Array.from({ length: 40 }, (_, index) => 100 + index));
		const source = bytesSource(await saved(pdf));
		expect(await widths(source, 38)).toEqual([137, 138, 139]);
		expect(await widths(source, 41)).toEqual([]);
	});

	test.each(['contract', 'guardianConsent', 'mediaConsent', 'termsAndConditions'])(
		'DMUN’s %s looks and reads the same, page by page',
		async (name) => {
			const bytes = template(name);
			const pages = await cutAll(bytesSource(bytes));
			expect(pages.length).toBeGreaterThan(0);
			for (const { page, bytes: cut } of pages) {
				const [whole, own] = await Promise.all([
					renderPdfPage({ bytes, page: page - 1, dpi: 50 }),
					renderPdfPage({ bytes: cut, page: 0, dpi: 50 })
				]);
				expect([own.width, own.height]).toEqual([whole.width, whole.height]);
				expect(Buffer.compare(Buffer.from(own.data), Buffer.from(whole.data))).toBe(0);
				const texts = await Promise.all([
					pdfText({ bytes, page: page - 1 }),
					pdfText({ bytes: cut, page: 0 })
				]);
				expect(texts[1].texts).toEqual(texts[0].texts);
			}
		}
	);

	test('takes no picture of another page along, though every page lists all of them', async () => {
		const bytes = await saved(await sharing([40, 50, 60]));
		expect((await picturesIn(bytes)).sort()).toEqual([40, 50, 60]);
		const pages = await cutAll(bytesSource(bytes));
		expect(await Promise.all(pages.map(({ bytes: cut }) => picturesIn(cut)))).toEqual([
			[40],
			[50],
			[60]
		]);
	});

	test('takes a form’s own pictures along, and no others it lists', async () => {
		const inner = await sharing([40, 50]);
		const pdf = await PDFDocument.create();
		const [form] = await pdf.embedPdf(await saved(inner), [1]);
		pdf.addPage([600, 300]).drawPage(form);
		const [{ bytes }] = await cutAll(bytesSource(await saved(pdf)));
		expect(await picturesIn(bytes)).toEqual([50]);
	});

	test('follows no link to another page, and keeps what was drawn on a page', async () => {
		const pdf = await stack([100, 200]);
		const [first, second] = pdf.getPages();
		const note = (subtype: string) =>
			pdf.context.register(
				pdf.context.obj({
					Type: 'Annot',
					Subtype: subtype,
					Rect: [0, 0, 10, 10],
					P: second.ref,
					Dest: [second.ref, 'Fit']
				})
			);
		first.node.set(PDFName.of('Annots'), pdf.context.obj([note('Link'), note('Ink')]));
		const [{ bytes }] = await cutAll(bytesSource(await saved(pdf)));
		expect(await picturesIn(bytes)).toEqual([100]);
		expect((await PDFDocument.load(bytes)).getPage(0).node.Annots()?.size()).toBe(1);
	});

	test('is the same file each time, so a page is known again', async () => {
		const source = bytesSource(await saved(await stack([100, 200])));
		const [once, again] = [await cutAll(source), await cutAll(source)];
		expect(once).toEqual(again);
	});

	test('takes what a page has from those it is among', async () => {
		const pdf = await stack([100]);
		const [page] = pdf.getPages();
		for (const key of ['MediaBox', 'Resources']) {
			const value = page.node.get(PDFName.of(key));
			if (value) pdf.catalog.Pages().set(PDFName.of(key), value);
			page.node.delete(PDFName.of(key));
		}
		const source = bytesSource(await saved(pdf));
		expect(await widths(source)).toEqual([100]);
		const [{ bytes }] = await cutAll(source);
		expect(await picturesIn(bytes)).toEqual([100]);
	});

	test('reads a file changed after it was written by what was added last', async () => {
		const before = await saved(await stack([100]), false);
		const text = Buffer.from(before).toString('latin1');
		const start = Number(/startxref\s+(\d+)/.exec(text)?.[1]);
		const root = /\/Root (\d+ 0 R)/.exec(text)?.[1] ?? '';
		const size = Number(/\/Size (\d+)/.exec(text)?.[1]);
		const [, pageNumber] = /(\d+) 0 obj\s*<<\s*\/Type \/Page\b[\s\S]*?endobj/.exec(text) ?? [];
		const page = new RegExp(`${pageNumber} 0 obj[\\s\\S]*?endobj`).exec(text)?.[0] ?? '';
		const changed = page.replace(/\/MediaBox \[[^\]]*\]/, '/MediaBox [ 0 0 777 300 ]');
		const at = before.length + 1;
		const added = `\n${changed}\n`;
		const table = `xref\n${pageNumber} 1\n${String(at).padStart(10, '0')} 00000 n \ntrailer\n<< /Size ${size} /Root ${root} /Prev ${start} >>\nstartxref\n${before.length + added.length}\n%%EOF`;
		const bytes = new Uint8Array([...before, ...latin1(added + table)]);
		expect(await widths(bytesSource(bytes))).toEqual([777]);
	});

	test('reads a file with something before it, and one whose table is broken', async () => {
		const whole = await saved(await stack([100, 200]), false);
		const shifted = new Uint8Array([...latin1('@PJL JOB\r\n'), ...whole]);
		expect(await widths(bytesSource(shifted))).toEqual([100, 200]);
		const text = Buffer.from(whole)
			.toString('latin1')
			.replace(/startxref\s+\d+/, 'startxref\n7');
		expect(await widths(bytesSource(latin1(text)))).toEqual([100, 200]);
	});

	test('goes on past a page that is not there', async () => {
		const text = Buffer.from(await saved(await stack([100, 200, 300]), false)).toString('latin1');
		const [second] = [...text.matchAll(/(\d+) 0 obj\s*<<\s*\/Type \/Page\b/g)].slice(1);
		// its object is another's
		const broken = text.replace(
			second[0],
			second[0].replace(second[1], '9'.repeat(second[1].length))
		);
		const pages: (number | string)[] = [];
		for await (const { page, cut } of pdfPages({ source: bytesSource(latin1(broken)) })) {
			pages.push(
				await cut().then(
					() => page,
					(error) => (error instanceof PageError ? `${page}!` : 'other')
				)
			);
		}
		expect(pages).toEqual([1, '2!', 3]);
	});

	test('says what cannot be opened, and when reading it failed', async () => {
		await expect(cutAll(bytesSource(latin1('%PDF-1.7 and nothing')))).rejects.toBeInstanceOf(
			ScanUnreadableError
		);
		const failing: ScanSource = {
			size: 1000,
			read: async () => {
				throw new Error('the bucket is down');
			}
		};
		await expect(cutAll(failing)).rejects.toBeInstanceOf(SourceReadError);
	});

	test('reads a little of a large file to get at one page', async () => {
		const pdf = await PDFDocument.create();
		for (let number = 0; number < 30; number++) {
			const canvas = createCanvas(600, 600);
			const context = canvas.getContext('2d');
			const noise = context.createImageData(600, 600);
			for (let at = 0; at < noise.data.length; at++)
				noise.data[at] = (at * 7919 * (number + 3)) % 251;
			context.putImageData(noise, 0, 0);
			pdf.addPage([600, 600]).drawImage(await pdf.embedJpg(canvas.toBuffer('image/jpeg', 95)));
		}
		pdf.getPage(0).drawRectangle({ x: 0, y: 0, width: 9, height: 9, color: rgb(0, 0, 0) });
		const bytes = await saved(pdf, false);
		let readBytes = 0;
		const read = vi.fn(async ({ from, to }: { from: number; to: number }) => {
			readBytes += to - from;
			return bytes.subarray(from, to);
		});
		for await (const { cut } of pdfPages({ source: { size: bytes.length, read }, from: 15 })) {
			await cut();
			break;
		}
		expect(bytes.length).toBeGreaterThan(5_000_000);
		expect(readBytes).toBeLessThan(bytes.length / 5);
	});
});
