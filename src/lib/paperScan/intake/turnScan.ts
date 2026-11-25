import { degrees, PDFDocument } from 'pdf-lib';
import { MAX_POSTAL_SCAN_SIZE } from '../limits';
import type { ScanContent } from './pages';
import { turnJpeg, turnPng } from './turnPicture';

/** A page's file, a PDF of one page, shown `turn` quarter turns (clockwise) further. */
async function turnPdf({ bytes, turn }: { bytes: Uint8Array; turn: number }) {
	const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
	const page = pdf.getPage(0);
	page.setRotation(degrees((((page.getRotation().angle + turn * 90) % 360) + 360) % 360));
	return new Uint8Array(await pdf.save({ addDefaultPage: false, updateFieldAppearances: false }));
}

/** WebP stays as it comes: no scanner writes it. */
async function turned({ scan: { bytes, type }, turn }: { scan: ScanContent; turn: number }) {
	if (type === 'application/pdf') return turnPdf({ bytes, turn });
	if (type === 'image/jpeg') return turnJpeg({ bytes, turn });
	return type === 'image/png' ? turnPng({ bytes, turn }) : undefined;
}

/**
 * A page's file shown `turn` quarter turns (clockwise) further, by what it says of how it lies: what was
 * scanned stays as it is. `undefined` where that cannot be, and the file is kept as it came.
 */
export async function turnScan(args: {
	scan: ScanContent;
	turn: number;
}): Promise<Uint8Array<ArrayBuffer> | undefined> {
	try {
		const bytes = await turned(args);
		return bytes && bytes.length <= MAX_POSTAL_SCAN_SIZE ? bytes : undefined;
	} catch {
		return undefined;
	}
}
