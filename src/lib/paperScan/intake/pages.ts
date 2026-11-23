import type { PDFDocumentLoadingTask } from 'pdfjs-dist';
import type { Picture } from '../picture';
import type { FieldReading } from '../readPaper';
import { readPageOfCode } from '../readScan';
import { isBlank } from './blank';
import { findCodes, type CodeReader } from './findCodes';
import type { ScanFileType } from './scanFile';

/**
 * Reading a scanned file page by page, the same in the browser and on the server, which each bring
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
	/** The canvas as pdf.js renders on it. */
	forPdf(canvas: C): HTMLCanvasElement;
	pictureOf(canvas: C): Picture;
	readCodes: CodeReader;
}

/** A file to read. */
export interface ScanContent {
	bytes: Uint8Array<ArrayBuffer>;
	type: ScanFileType;
}

/**
 * A page as it was read: its codes, unchecked, with the fields each says its page has (`null`: not
 * readable in the picture), and whether it is an empty back.
 */
export interface ReadPage {
	page: number;
	blank: boolean;
	codes: { text: string; readings: FieldReading[] | null }[];
}

/** A page is read at 300 dpi, which scanners scan at and shows a pen stroke several pixels wide. */
const SCALE = 300 / 72;
/** More pixels than this on the longer side cost time and tell no more. */
const MAX_SIDE = 3600;

async function* pdfPictures<C>({
	bytes,
	platform,
	maxPages
}: {
	bytes: Uint8Array<ArrayBuffer>;
	platform: ScanPlatform<C>;
	maxPages: number;
}) {
	// pdf.js takes over what it is given
	const task = await platform.openPdf(bytes.slice());
	try {
		const pdf = await task.promise;
		if (pdf.numPages > maxPages) throw new Error(`${pdf.numPages} pages are too many`);
		for (let number = 1; number <= pdf.numPages; number++) {
			const page = await pdf.getPage(number);
			const points = page.getViewport({ scale: 1 });
			const scale = Math.min(SCALE, MAX_SIDE / Math.max(points.width, points.height));
			const viewport = page.getViewport({ scale });
			const canvas = platform.createCanvas({
				width: Math.round(viewport.width),
				height: Math.round(viewport.height)
			});
			await page.render({ canvas: platform.forPdf(canvas), viewport }).promise;
			yield { page: number, picture: platform.pictureOf(canvas) };
			page.cleanup();
		}
	} finally {
		await task.destroy();
	}
}

async function* imagePicture<C>({
	scan,
	platform
}: {
	scan: ScanContent;
	platform: ScanPlatform<C>;
}) {
	const image = await platform.openImage(scan);
	try {
		const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
		const canvas = platform.createCanvas({
			width: Math.round(image.width * scale),
			height: Math.round(image.height * scale)
		});
		image.drawOn(canvas);
		yield { page: 1, picture: platform.pictureOf(canvas) };
	} finally {
		image.close();
	}
}

/** What one page's picture shows: its codes and their fields. */
async function readPage({
	page,
	picture,
	readCodes
}: {
	page: number;
	picture: Picture;
	readCodes: CodeReader;
}): Promise<ReadPage> {
	const codes = await findCodes({ picture, read: readCodes });
	return {
		page,
		blank: codes.length === 0 && isBlank(picture),
		codes: codes.map(({ rawValue }) => ({
			text: rawValue,
			readings: readPageOfCode({ picture, code: rawValue })
		}))
	};
}

/**
 * Every page of a file, read, numbered from 1 (a picture is one page). Throws for one that cannot be
 * opened, or of more than `maxPages`.
 */
export async function readPages<C>({
	scan,
	platform,
	maxPages = Infinity,
	onPage
}: {
	scan: ScanContent;
	platform: ScanPlatform<C>;
	maxPages?: number;
	onPage?: () => void;
}): Promise<ReadPage[]> {
	const pictures =
		scan.type === 'application/pdf'
			? pdfPictures({ bytes: scan.bytes, platform, maxPages })
			: imagePicture({ scan, platform });
	const pages: ReadPage[] = [];
	for await (const { page, picture } of pictures) {
		pages.push(await readPage({ page, picture, readCodes: platform.readCodes }));
		onPage?.();
	}
	return pages;
}
