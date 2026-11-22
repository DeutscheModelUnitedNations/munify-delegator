import { BarcodeDetector } from 'barcode-detector';
import { acceptScan, type ScanAcceptance } from '#lib/components/scanner/scanAcceptance';
import { readPageOfCode } from '#lib/paperScan/readScan';
import type { PageOutcome } from './paperBatch';

/**
 * Scans as files, page by page as pictures: a PDF (what a scanner's sheet feeder makes) rendered
 * at 300 dpi, a photo as it is. Large pictures are scaled down to `MAX_SIDE` pixels, which still
 * gives a page well over ten pixels to the millimetre.
 */
const MAX_SIDE = 3600;

function pictureOf({
	source,
	width,
	height
}: {
	source: HTMLCanvasElement | ImageBitmap;
	width: number;
	height: number;
}): ImageData {
	const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
	const canvas = document.createElement('canvas');
	canvas.width = Math.round(width * scale);
	canvas.height = Math.round(height * scale);
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('No 2D canvas');
	context.drawImage(source, 0, 0, canvas.width, canvas.height);
	return context.getImageData(0, 0, canvas.width, canvas.height);
}

async function* pdfPages(file: File) {
	const [pdfjs, worker] = await Promise.all([
		import('pdfjs-dist'),
		import('pdfjs-dist/build/pdf.worker.min.mjs?url')
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
	const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
	const pdf = await task.promise;
	try {
		for (let number = 1; number <= pdf.numPages; number++) {
			const page = await pdf.getPage(number);
			const points = page.getViewport({ scale: 1 });
			const scale = Math.min(300 / 72, MAX_SIDE / Math.max(points.width, points.height));
			const viewport = page.getViewport({ scale });
			const canvas = document.createElement('canvas');
			canvas.width = Math.round(viewport.width);
			canvas.height = Math.round(viewport.height);
			await page.render({ canvas, viewport }).promise;
			yield {
				page: number,
				picture: pictureOf({ source: canvas, width: canvas.width, height: canvas.height })
			};
			page.cleanup();
		}
	} finally {
		await task.destroy();
	}
}

/** The pages of a scanned file as pictures, numbered from 1; a photo is one page. */
export async function* pagesOf(file: File): AsyncGenerator<{ page: number; picture: ImageData }> {
	if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
		yield* pdfPages(file);
		return;
	}
	const bitmap = await createImageBitmap(file);
	try {
		yield {
			page: 1,
			picture: pictureOf({ source: bitmap, width: bitmap.width, height: bitmap.height })
		};
	} finally {
		bitmap.close();
	}
}

let detector: BarcodeDetector | undefined;

/**
 * What a scanned page comes to: its code checked as the camera checks it (`acceptance`), then its
 * fields read (`#lib/paperScan`).
 */
// fallow-ignore-next-line complexity
export async function readScannedPage({
	picture,
	acceptance
}: {
	picture: ImageData;
	acceptance: ScanAcceptance;
}): Promise<PageOutcome> {
	detector ??= new BarcodeDetector({ formats: ['qr_code'] });
	const codes = (await detector.detect(picture)).filter((code) => !!code.rawValue);
	if (codes.length === 0) return { kind: 'noCode' };
	let refusal = '';
	for (const code of codes) {
		const verdict = await acceptScan({ text: code.rawValue, format: code.format, acceptance });
		if (!verdict.accepted) {
			refusal = verdict.message;
			continue;
		}
		const readings = readPageOfCode({ picture, code: verdict.code });
		return readings
			? { kind: 'read', userId: verdict.userId, readings }
			: { kind: 'unreadable', userId: verdict.userId };
	}
	return { kind: 'refused', message: refusal };
}
