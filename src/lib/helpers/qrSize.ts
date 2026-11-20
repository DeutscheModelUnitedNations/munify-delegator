import bwipjs from '@bwip-js/browser';
import { POINTS_PER_MM } from './documentLayout';

/**
 * How large a printed QR code has to be so a phone reads it off paper. A code is a grid of
 * modules; the more it holds, the more modules, and each must stay large enough for a printer to
 * draw it crisply and a camera to resolve it from a comfortable distance. Print guides recommend
 * 0.4 mm for phones; we keep a margin above it, since templates go through cheap printers and
 * copiers. A signed document code (about 250 characters, 53 modules) then needs about 28 mm.
 */
export const MIN_MODULE_MM = 0.45;
/** The white margin a plain code keeps around it, in modules, as the QR standard asks. */
export const QUIET_ZONE_MODULES = 4;
/** The share of a corporate code's side its card leaves free on each side. */
export const BRANDED_PADDING = 0.06;

/** The modules of a QR code: its side in modules and which are dark. */
export type QrMatrix = { size: number; has: (x: number, y: number) => boolean };

/**
 * The modules of a QR code of `text`: at the highest error correction when an emblem covers its
 * middle, at a medium one otherwise, which keeps a long code's modules larger.
 */
export function qrMatrix({ text, withEmblem }: { text: string; withEmblem: boolean }): QrMatrix {
	const [symbol] = bwipjs.raw('qrcode', text, withEmblem ? 'eclevel=H' : 'eclevel=M');
	if (!symbol || !('pixs' in symbol)) throw new Error('Could not encode the QR code');
	return {
		size: symbol.pixx,
		has: (x: number, y: number) => symbol.pixs[y * symbol.pixx + x] === 1
	};
}

/**
 * The side, in points, below which a code of `modules` modules would have modules smaller than
 * `MIN_MODULE_MM`: a plain code with its quiet zone, a corporate one with its card's padding.
 */
export function minQrSide({ modules, corporate }: { modules: number; corporate: boolean }) {
	const module = MIN_MODULE_MM * POINTS_PER_MM;
	return corporate
		? (modules * module) / (1 - 2 * BRANDED_PADDING)
		: (modules + 2 * QUIET_ZONE_MODULES) * module;
}

/** A square on a PDF page, in points from the bottom left. */
export type PdfSquare = { left: number; bottom: number; side: number };

/**
 * Where a code placed at `square` is drawn so it is at least `minSide`: grown around its centre,
 * then moved back onto the page if growing pushed it over an edge. Never larger than the page.
 */
export function fitQrSquare({
	square,
	minSide,
	page
}: {
	square: PdfSquare;
	minSide: number;
	page: { width: number; height: number };
}): PdfSquare {
	const side = Math.min(Math.max(square.side, minSide), page.width, page.height);
	const grow = (side - square.side) / 2;
	const within = (value: number, max: number) => Math.min(Math.max(value, 0), Math.max(0, max));
	return {
		left: within(square.left - grow, page.width - side),
		bottom: within(square.bottom - grow, page.height - side),
		side
	};
}
