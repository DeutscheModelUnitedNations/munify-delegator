import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import type { Picture } from '../picture';
import type { FieldReading } from '../readPaper';
import { readPageOfCode } from '../readScan';
import { isBlank } from './blank';
import { messageOf, PageError } from './errors';
import { findCodes, type CodeReader } from './findCodes';
import type { ScanFileType } from './scanFile';

/**
 * Reading a scanned page, the same in the browser and on the server, which each bring
 * their own canvas, pdf.js and code reader (`ScanPlatform`).
 */

/** A picture file opened, to be drawn on a canvas. */
export interface OpenedImage<C> {
	width: number;
	height: number;
	drawOn(canvas: C): void;
	close(): void;
}

/** What reading a scan takes of where it runs. `C` is a canvas there. */
export interface ScanPlatform<C> {
	/** pdf.js on a PDF, with the decoders of what scanners write (JBIG2, JPEG 2000). */
	openPdf(bytes: Uint8Array<ArrayBuffer>): PDFDocumentLoadingTask | Promise<PDFDocumentLoadingTask>;
	openImage(scan: ScanContent): Promise<OpenedImage<C>>;
	createCanvas(size: { width: number; height: number }): C;
	/** Frees a canvas's pixels: 35 MB for a page, which wait for no garbage collection. */
	releaseCanvas(canvas: C): void;
	/** The canvas as pdf.js renders on it. */
	forPdf(canvas: C): HTMLCanvasElement;
	pictureOf(canvas: C): Picture;
	readCodes: CodeReader;
}

/** A page to read, as a file of its own. */
export interface ScanContent {
	bytes: Uint8Array<ArrayBuffer>;
	type: ScanFileType;
}

/**
 * A page as it was read: its codes, unchecked, with the fields each says its page has (`null`: not
 * readable in the picture), and whether it is an empty back; `error` for one that could not be read,
 * which says why.
 */
export interface ReadPage {
	page: number;
	blank: boolean;
	codes: { text: string; readings: FieldReading[] | null }[];
	error?: string;
}

/** A page is read at 300 dpi, which scanners scan at and shows a pen stroke several pixels wide. */
const SCALE = 300 / 72;
/** More pixels than this on the longer side cost time and tell no more. */
const MAX_SIDE = 3600;

/** Renders the page of an opened PDF. */
async function renderPage<C>({
	pdf,
	platform
}: {
	pdf: PDFDocumentProxy;
	platform: ScanPlatform<C>;
}) {
	const page = await pdf.getPage(1);
	const points = page.getViewport({ scale: 1 });
	const scale = Math.min(SCALE, MAX_SIDE / Math.max(points.width, points.height));
	const viewport = page.getViewport({ scale });
	const canvas = platform.createCanvas({
		width: Math.round(viewport.width),
		height: Math.round(viewport.height)
	});
	try {
		await page.render({ canvas: platform.forPdf(canvas), viewport }).promise;
		return platform.pictureOf(canvas);
	} finally {
		platform.releaseCanvas(canvas);
		page.cleanup();
	}
}

async function pdfPicture<C>({
	bytes,
	platform
}: {
	bytes: Uint8Array<ArrayBuffer>;
	platform: ScanPlatform<C>;
}) {
	// pdf.js takes over what it is given
	const task = await platform.openPdf(bytes.slice());
	try {
		return await ofPage(async () => renderPage({ pdf: await task.promise, platform }));
	} finally {
		await task.destroy();
	}
}

async function imagePicture<C>({
	scan,
	platform
}: {
	scan: ScanContent;
	platform: ScanPlatform<C>;
}) {
	const image = await ofPage(() => platform.openImage(scan));
	try {
		const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
		const canvas = platform.createCanvas({
			width: Math.round(image.width * scale),
			height: Math.round(image.height * scale)
		});
		try {
			image.drawOn(canvas);
			return platform.pictureOf(canvas);
		} finally {
			platform.releaseCanvas(canvas);
		}
	} finally {
		image.close();
	}
}

/** What one page's picture shows: its codes and their fields. */
async function readPicture({
	picture,
	readCodes
}: {
	picture: Picture;
	readCodes: CodeReader;
}): Promise<ReadPage> {
	const codes = await findCodes({ picture, read: readCodes });
	return {
		page: 1,
		blank: codes.length === 0 && isBlank(picture),
		codes: codes.map(({ rawValue }) => ({
			text: rawValue,
			readings: readPageOfCode({ picture, code: rawValue })
		}))
	};
}

/** Tells what is wrong with a page from a failure to load what reads it. */
async function ofPage<T>(work: () => Promise<T>) {
	try {
		return await work();
	} catch (error) {
		throw new PageError(messageOf(error));
	}
}

/**
 * Reads a page, which is a file of its own (`scanPages`). One that cannot be read says so (`error`). Throws
 * where what reads it could not be loaded.
 */
export async function readScanPage<C>({
	scan,
	platform
}: {
	scan: ScanContent;
	platform: ScanPlatform<C>;
}): Promise<ReadPage> {
	try {
		const picture =
			scan.type === 'application/pdf'
				? await pdfPicture({ bytes: scan.bytes, platform })
				: await imagePicture({ scan, platform });
		return await ofPage(() => readPicture({ picture, readCodes: platform.readCodes }));
	} catch (error) {
		if (!(error instanceof PageError)) throw error;
		return { page: 1, blank: false, codes: [], error: error.message };
	}
}
