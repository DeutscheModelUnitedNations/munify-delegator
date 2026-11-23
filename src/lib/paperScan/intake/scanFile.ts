import { PDFDocument } from 'pdf-lib';

/**
 * Scans as files: what kind one is, its pages cut out of it, and how a page is named.
 */

export type ScanFileType = 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';

const startsWith = ({
	bytes,
	signature,
	at = 0
}: {
	bytes: Uint8Array;
	signature: readonly number[];
	at?: number;
}) => signature.every((byte, index) => bytes[at + index] === byte);

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));
/** How far into a file scanners put the `%PDF`: some write a line or two before it. */
const PDF_WITHIN = 1024;

/**
 * What a file is, by its first bytes: scanners send anything as `application/octet-stream`.
 * `undefined` for what is not read (TIFF, HEIC, anything else).
 */
export function scanFileType(bytes: Uint8Array): ScanFileType | undefined {
	if (startsWith({ bytes, signature: [0xff, 0xd8, 0xff] })) return 'image/jpeg';
	if (startsWith({ bytes, signature: [0x89, ...ascii('PNG')] })) return 'image/png';
	if (
		startsWith({ bytes, signature: ascii('RIFF') }) &&
		startsWith({ bytes, signature: ascii('WEBP'), at: 8 })
	) {
		return 'image/webp';
	}
	const signature = ascii('%PDF');
	for (let at = 0; at < Math.min(PDF_WITHIN, bytes.length); at++) {
		if (startsWith({ bytes, signature, at })) return 'application/pdf';
	}
	return undefined;
}

/** The SHA-256 of a file, in hexadecimal. */
export async function hashOf(bytes: Uint8Array<ArrayBuffer>) {
	const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
	return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Names a page of the file of this hash, whatever is on it. */
export const contentKeyOf = ({ hash, page }: { hash: string; page: number }) => `${hash}:${page}`;

/**
 * Names a page (`postalScan.pageKey`): by the code printed on it, which no other page has, so it is
 * the same page in whatever file it comes. A page without a code, or without fields, whose code the
 * other such pages of its print share, goes by the file it is in (`contentKey`).
 */
export async function pageKeyOf({
	code,
	fields,
	contentKey
}: {
	code: string | null;
	fields: readonly unknown[];
	contentKey: string;
}) {
	if (code === null || fields.length === 0) return `file:${contentKey}`;
	return `code:${await hashOf(new TextEncoder().encode(code))}`;
}

/** Page `page` (from 1) of a file that is `type`, as a file of its own; the file itself when it is all. */
export async function cutPage({
	bytes,
	type,
	page,
	pageCount
}: {
	bytes: Uint8Array<ArrayBuffer>;
	type: ScanFileType;
	page: number;
	pageCount: number;
}): Promise<Uint8Array<ArrayBuffer>> {
	if (type !== 'application/pdf' || pageCount === 1) return bytes;
	const source = await PDFDocument.load(bytes, { ignoreEncryption: true });
	const cut = await PDFDocument.create();
	const [copy] = await cut.copyPages(source, [page - 1]);
	cut.addPage(copy);
	return new Uint8Array(await cut.save());
}

const EXTENSION: Record<ScanFileType, string> = {
	'application/pdf': '.pdf',
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/webp': '.webp'
};

/** What page `page` cut out of the file `name` is called. */
export function cutName({
	name,
	type,
	page,
	pageCount
}: {
	name: string;
	type: ScanFileType;
	page: number;
	pageCount: number;
}) {
	const base = name.replace(/\.[^.]*$/, '').trim() || 'scan';
	return `${base}${pageCount === 1 ? '' : `_${page}`}${EXTENSION[type]}`;
}
