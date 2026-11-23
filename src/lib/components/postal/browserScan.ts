import { BarcodeDetector } from 'barcode-detector';
import { loadSignedCodeKeys } from '#lib/api/signedCodeKeys';
import type { ScanPlatform } from '#lib/paperScan/intake/pages';
import type { CheckCode } from '#lib/paperScan/intake/people';
import { verifySignedCode } from '#lib/signedCode/signedCode';

/** What the shared reading of scans (`#lib/paperScan/intake`) takes of the browser. */

/**
 * Where pdf.js finds the decoders of the two formats scanners write that it does not decode itself:
 * JBIG2 (black and white, from most office scanners) and JPEG 2000. Without them such a page comes
 * out blank.
 */
const DECODERS: Record<string, () => Promise<{ default: string }>> = {
	'jbig2.wasm': () => import('pdfjs-dist/wasm/jbig2.wasm?url'),
	'openjpeg.wasm': () => import('pdfjs-dist/wasm/openjpeg.wasm?url')
};

/** pdf.js makes its factory with `new`, so this is a plain function answering the object. */
function DecoderFactory() {
	return {
		async fetch({ filename }: { filename: string }) {
			const decoder = DECODERS[filename];
			if (!decoder) throw new Error(`No ${filename} here`);
			const response = await fetch((await decoder()).default);
			if (!response.ok) throw new Error(`Loading ${filename} failed`);
			return new Uint8Array(await response.arrayBuffer());
		}
	};
}

function context2d(canvas: HTMLCanvasElement) {
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('No 2D canvas');
	return context;
}

let detector: BarcodeDetector | undefined;

export const browserPlatform: ScanPlatform<HTMLCanvasElement> = {
	async openPdf(data) {
		const [pdfjs, worker] = await Promise.all([
			import('pdfjs-dist'),
			import('pdfjs-dist/build/pdf.worker.min.mjs?url')
		]);
		pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
		return pdfjs.getDocument({ data, BinaryDataFactory: DecoderFactory });
	},
	async openImage({ bytes, type }) {
		const bitmap = await createImageBitmap(new Blob([bytes], { type }));
		return {
			width: bitmap.width,
			height: bitmap.height,
			drawOn: (canvas) => context2d(canvas).drawImage(bitmap, 0, 0, canvas.width, canvas.height),
			close: () => bitmap.close()
		};
	},
	createCanvas({ width, height }) {
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		return canvas;
	},
	forPdf: (canvas) => canvas,
	pictureOf: (canvas) => context2d(canvas).getImageData(0, 0, canvas.width, canvas.height),
	readCodes(picture) {
		detector ??= new BarcodeDetector({ formats: ['qr_code'] });
		return detector.detect(
			picture instanceof ImageData
				? picture
				: new ImageData(new Uint8ClampedArray(picture.data), picture.width, picture.height)
		);
	}
};

/** Checks a code in the browser, against the keys kept there. */
export const checkCode: CheckCode = async (text) =>
	verifySignedCode({ text, keys: await loadSignedCodeKeys() });
