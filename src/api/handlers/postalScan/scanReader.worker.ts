import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import { readScanPage, type ScanPlatform } from '#lib/paperScan/intake/pages';
import type { ReaderAnswer, ReaderQuestion } from './scanReader';
import { createInbox, runProcess, say, tookTooMuch } from './scanProcessWorker';

/**
 * Reads pages of delivered scans in a process of its own (`./scanReader`), one after the other: the shared
 * reading (`#lib/paperScan/intake/pages`) on Node's canvas, pdf.js and code reader. Drawing a page leaks
 * native memory no garbage collection reaches (some 80 MB at 300 dpi), so it ends once it took too much.
 * Development runs this file directly, production the bundle `bun run build:compute` writes to
 * `build/compute/`.
 */
const require = createRequire(import.meta.url);

/** What pdf.js and the code reader load: beside the bundle (`tsdown.compute.config.ts`), else theirs. */
const copied = fileURLToPath(new URL('./scanReaderFiles/', import.meta.url));
const bundled = existsSync(copied);
const pdfjsFiles = bundled ? copied : `${dirname(require.resolve('pdfjs-dist/package.json'))}/`;
const codeReader = bundled
	? join(copied, 'zxing_reader.wasm')
	: require.resolve('zxing-wasm/reader/zxing_reader.wasm');

/** Loaded first: failing that is no page's fault. */
const codeReaderLoaded = prepareZXingModule({
	overrides: {
		// by default it would be fetched from a CDN
		wasmBinary: new Uint8Array(readFileSync(codeReader)).buffer
	},
	fireImmediately: true
});

/** A picture's pixels as the code reader takes them: its own where they are such already. */
function pixelsOf(data: ArrayLike<number>) {
	if (data instanceof Uint8ClampedArray && data.buffer instanceof ArrayBuffer) {
		return new Uint8ClampedArray(data.buffer, data.byteOffset, data.length);
	}
	return Uint8ClampedArray.from(data);
}

const platform: ScanPlatform<Canvas> = {
	async openPdf(data) {
		const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
		// its worker, on this thread: it would otherwise look for the file beside the bundle
		await import('pdfjs-dist/legacy/build/pdf.worker.mjs');
		return pdfjs.getDocument({
			data,
			wasmUrl: join(pdfjsFiles, 'wasm/'),
			standardFontDataUrl: join(pdfjsFiles, 'standard_fonts/'),
			cMapUrl: join(pdfjsFiles, 'cmaps/'),
			cMapPacked: true
		});
	},
	async openImage({ bytes }) {
		const image = await loadImage(Buffer.from(bytes));
		return {
			width: image.width,
			height: image.height,
			drawOn: (canvas) =>
				canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height),
			close: () => undefined
		};
	},
	createCanvas: ({ width, height }) => createCanvas(width, height),
	releaseCanvas(canvas) {
		canvas.width = 0;
		canvas.height = 0;
	},
	// TYPE-SAFETY-EXCEPTION: pdf.js renders into any canvas with a 2D context; it is typed for the
	// browser's, and Node's (@napi-rs/canvas) is the one it uses there.
	forPdf: (canvas) => canvas as unknown as HTMLCanvasElement,
	pictureOf(canvas) {
		const { width, height } = canvas;
		const { data } = canvas.getContext('2d').getImageData(0, 0, width, height);
		// copied out once: reading the canvas's own pixels crosses into native code each time
		return { width, height, data: new Uint8ClampedArray(data) };
	},
	async readCodes({ data, width, height }) {
		const found = await readBarcodes(
			// the picture's own pixels where they are some already: a copy is 35 MB at 300 dpi
			{
				data: pixelsOf(data),
				width,
				height,
				colorSpace: 'srgb'
			},
			{ formats: ['QRCode'], tryHarder: true }
		);
		return found
			.filter(({ isValid }) => isValid)
			.map(({ text }) => ({ rawValue: text, format: 'qr_code' }));
	}
};

const nextQuestion = createInbox<ReaderQuestion>();

runProcess(async () => {
	await codeReaderLoaded;
	for (;;) {
		const page = await readScanPage({ scan: await nextQuestion(), platform });
		const leaving = tookTooMuch();
		await say({ page, leaving } satisfies ReaderAnswer);
		if (leaving) return;
	}
});
