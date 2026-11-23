import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parentPort, workerData } from 'node:worker_threads';
import { createCanvas, loadImage, type Canvas } from '@napi-rs/canvas';
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader';
import { readPages, type ScanContent, type ScanPlatform } from '#lib/paperScan/intake/pages';
import type { ScanReading } from './scanReader';

/**
 * Reads one delivered scan off the main thread, started by `./scanReader`: the shared reading
 * (`#lib/paperScan/intake/pages`) on Node's canvas, pdf.js and code reader. Development runs this
 * file directly, production the bundle `bun run build:compute` writes to `build/compute/`.
 */
const require = createRequire(import.meta.url);

/** What pdf.js and the code reader load: beside the bundle (`tsdown.compute.config.ts`), else theirs. */
const copied = fileURLToPath(new URL('./scanReaderFiles/', import.meta.url));
const bundled = existsSync(copied);
const pdfjsFiles = bundled ? copied : `${dirname(require.resolve('pdfjs-dist/package.json'))}/`;
const codeReader = bundled
	? join(copied, 'zxing_reader.wasm')
	: require.resolve('zxing-wasm/reader/zxing_reader.wasm');

const scan: ScanContent = workerData;

/** More pages than this are no application documents, whoever scanned them. */
const MAX_PAGES = 200;

prepareZXingModule({
	overrides: {
		// by default it would be fetched from a CDN
		wasmBinary: new Uint8Array(readFileSync(codeReader)).buffer
	}
});

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
			{ data: new Uint8ClampedArray(data), width, height, colorSpace: 'srgb' },
			{ formats: ['QRCode'], tryHarder: true }
		);
		return found
			.filter(({ isValid }) => isValid)
			.map(({ text }) => ({ rawValue: text, format: 'qr_code' }));
	}
};

async function run(): Promise<ScanReading> {
	try {
		return { pages: await readPages({ scan, platform, maxPages: MAX_PAGES }) };
	} catch (error) {
		return { failed: error instanceof Error ? error.message : String(error) };
	}
}

void run().then((reading) => parentPort?.postMessage(reading));
