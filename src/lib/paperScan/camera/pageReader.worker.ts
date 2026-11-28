import { BarcodeDetector } from 'barcode-detector';
import { looksLikeSignedCode } from '#lib/signedCode/signedCode';
import type { CodeReader } from '../intake/findCodes';
import { readPicture } from '../intake/pages';
import { turnScan } from '../intake/turnScan';
import { AIM_SIDE } from '../picture';
import { aimAt } from './aim';
import type { PageReaderRequest, PageReaderResponse, PhotoReading } from './pageReaderProtocol';

/**
 * Reads the camera's pictures beside the page, so the preview stays smooth: aiming by small pictures
 * (`aimAt`), and reading the photo taken once the page lies still, as a scan is read (`readPicture`).
 */

/** A photo is read and kept with its longer side at most this: as scans are read, at 300 dpi. */
const PHOTO_SIDE = 3600;

let detector: BarcodeDetector | undefined;
const readCodes: CodeReader = (picture) => {
	detector ??= new BarcodeDetector({ formats: ['qr_code'] });
	return detector.detect(
		picture instanceof ImageData
			? picture
			: new ImageData(new Uint8ClampedArray(picture.data), picture.width, picture.height)
	);
};

/** `image` drawn on a canvas, its longer side at most `maxSide`, and its pixels. */
function drawn({ image, maxSide }: { image: ImageBitmap; maxSide: number }) {
	const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
	const canvas = new OffscreenCanvas(
		Math.max(1, Math.round(image.width * scale)),
		Math.max(1, Math.round(image.height * scale))
	);
	const context = canvas.getContext('2d', { willReadFrequently: true });
	if (!context) throw new Error('No 2D canvas');
	context.drawImage(image, 0, 0, canvas.width, canvas.height);
	return { canvas, picture: context.getImageData(0, 0, canvas.width, canvas.height) };
}

/** A photo, read; kept as a JPEG of what was read, turned upright by what its marks say. */
async function readPhoto(image: Blob | ImageBitmap): Promise<PhotoReading> {
	// a photo's Exif orientation is taken in here, so what is read is what is seen
	const bitmap = image instanceof Blob ? await createImageBitmap(image) : image;
	const { canvas, picture } = drawn({ image: bitmap, maxSide: PHOTO_SIDE });
	bitmap.close();
	const { read, turn } = await readPicture({ picture, readCodes });
	if (!read.codes.some(({ text }) => looksLikeSignedCode(text))) return { codes: read.codes };
	const jpeg = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
	const bytes = new Uint8Array(await jpeg.arrayBuffer());
	const upright =
		turn === 0 ? undefined : await turnScan({ scan: { bytes, type: 'image/jpeg' }, turn });
	return { codes: read.codes, file: { bytes: upright ?? bytes, type: 'image/jpeg' } };
}

async function answer(request: PageReaderRequest): Promise<PageReaderResponse> {
	if (request.kind === 'aim') {
		const { picture } = drawn({ image: request.image, maxSide: AIM_SIDE });
		request.image.close();
		return { id: request.id, kind: 'aim', aim: aimAt(picture) };
	}
	return { id: request.id, kind: 'read', photo: await readPhoto(request.image) };
}

addEventListener('message', (event: MessageEvent<PageReaderRequest>) => {
	const { id } = event.data;
	answer(event.data)
		.then((response) => {
			const bytes = response.kind === 'read' ? response.photo.file?.bytes : undefined;
			postMessage(response, { transfer: bytes ? [bytes.buffer] : [] });
		})
		.catch((error: unknown) => {
			const failed: PageReaderResponse = { id, kind: 'failed', error: String(error) };
			postMessage(failed);
		});
});
