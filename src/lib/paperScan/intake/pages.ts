import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { looksLikeSignedCode } from '#lib/signedCode/signedCode';
import { locateMarkers, uprightTurn } from '../markers';
import type { Picture } from '../picture';
import type { FieldReading, FieldZone } from '../readPaper';
import { readPageOfCode, zonesOfCode } from '../readScan';
import { isBlank } from './blank';
import { messageOf, PageError } from './errors';
import { findCodes, type CodeReader } from './findCodes';
import type { ScanFileType } from './scanFile';
import { turnScan } from './turnScan';

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
 * which says why. `upright` is its file turned the right way up, where it lies otherwise.
 */
export interface ReadPage {
	page: number;
	blank: boolean;
	codes: { text: string; readings: FieldReading[] | null }[];
	error?: string;
	upright?: Uint8Array<ArrayBuffer>;
}

/** A page is read at 300 dpi, which scanners scan at and shows a pen stroke several pixels wide. */
const SCALE = 300 / 72;
/** More pixels than this on the longer side cost time and tell no more. */
const MAX_SIDE = 3600;

/** Renders the page of an opened PDF. */
async function renderPage<C>({
	pdf,
	platform,
	maxSide
}: {
	pdf: PDFDocumentProxy;
	platform: ScanPlatform<C>;
	maxSide: number;
}) {
	const page = await pdf.getPage(1);
	const points = page.getViewport({ scale: 1 });
	const scale = Math.min(SCALE, maxSide / Math.max(points.width, points.height));
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
	platform,
	maxSide
}: {
	bytes: Uint8Array<ArrayBuffer>;
	platform: ScanPlatform<C>;
	maxSide: number;
}) {
	// pdf.js takes over what it is given
	const task = await platform.openPdf(bytes.slice());
	try {
		return await ofPage(async () => renderPage({ pdf: await task.promise, platform, maxSide }));
	} finally {
		await task.destroy();
	}
}

async function imagePicture<C>({
	scan,
	platform,
	maxSide
}: {
	scan: ScanContent;
	platform: ScanPlatform<C>;
	maxSide: number;
}) {
	const image = await ofPage(() => platform.openImage(scan));
	try {
		const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
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

/**
 * What one page's picture shows: its codes and their fields, and how many quarter turns it is off standing
 * upright.
 */
async function readPicture({
	picture,
	readCodes
}: {
	picture: Picture;
	readCodes: CodeReader;
}): Promise<{ read: ReadPage; turn: number }> {
	// an empty back, half of a stack scanned on both sides, is told at a glance: no code is printed on so
	// little ink, and looking for one in every variant of the picture takes many times as long
	if (isBlank(picture)) return { read: { page: 1, blank: true, codes: [] }, turn: 0 };
	const codes = await findCodes({ picture, read: readCodes });
	const ours = codes.some(({ rawValue }) => looksLikeSignedCode(rawValue));
	const located = ours ? locateMarkers(picture) : [];
	const read = {
		page: 1,
		blank: false,
		codes: codes.map(({ rawValue }) => ({
			text: rawValue,
			readings: readPageOfCode({ picture, code: rawValue, located })
		}))
	};
	return { read, turn: uprightTurn(located) };
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
 * The picture a page is read off: a PDF rendered, a picture file drawn, its longer side at most `maxSide`
 * pixels (smaller for a preview). Throws a `PageError` where it cannot be.
 */
export function scanPicture<C>({
	scan,
	platform,
	maxSide = MAX_SIDE
}: {
	scan: ScanContent;
	platform: ScanPlatform<C>;
	maxSide?: number;
}): Promise<Picture> {
	return scan.type === 'application/pdf'
		? pdfPicture({ bytes: scan.bytes, platform, maxSide })
		: imagePicture({ scan, platform, maxSide });
}

/**
 * Where the fields of the page in `picture` are read, in its pixels: those of the first of its codes that
 * prints any; `null` for a page without, or one whose markers do not tell how it lies.
 */
export async function scanZones({
	picture,
	readCodes
}: {
	picture: Picture;
	readCodes: CodeReader;
}): Promise<FieldZone[] | null> {
	if (isBlank(picture)) return null;
	const codes = (await findCodes({ picture, read: readCodes })).filter(({ rawValue }) =>
		looksLikeSignedCode(rawValue)
	);
	if (codes.length === 0) return null;
	const located = locateMarkers(picture);
	for (const { rawValue } of codes) {
		const zones = zonesOfCode({ code: rawValue, located });
		if (zones) return zones;
	}
	return null;
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
		const picture = await scanPicture({ scan, platform });
		const { read, turn } = await ofPage(() =>
			readPicture({ picture, readCodes: platform.readCodes })
		);
		const upright = turn === 0 ? undefined : await turnScan({ scan, turn });
		return upright ? { ...read, upright } : read;
	} catch (error) {
		if (!(error instanceof PageError)) throw error;
		return { page: 1, blank: false, codes: [], error: error.message };
	}
}
