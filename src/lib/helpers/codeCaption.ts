import type { PdfSquare } from './qrSize';
import { PAGE_NUMBER_TOP } from './documentLayout';

/**
 * The lines under a document's signed code (the person's id, below it their name): centred below
 * the code, and above it where that would run into the page number (a code placed right over it
 * before the caption went below). The PDF generator, the layout editor and its check share this.
 */

/**
 * Font size, the smallest it shrinks to, the first baseline below the code, the line step, and the
 * gap when above the code, in points. Small enough that the caption fits under the code in the one
 * place free on DMUN's media consent, and a 24 character id under a code.
 */
export const CODE_CAPTION = { size: 7, smallest: 5, first: 6, step: 8, gap: 4 };

/** Whether `lines` lines fit below a code whose lower edge is `bottom` points above the page's. */
export const fitsBelowCode = ({ bottom, lines }: { bottom: number; lines: number }) =>
	// a point may be lost to a placement's rounding
	bottom - lines * CODE_CAPTION.step >= PAGE_NUMBER_TOP - 1;

/** The baselines of a caption's lines, first line first, in points from the page's lower edge. */
export function codeCaptionBaselines({
	square: { bottom, side },
	lines
}: {
	square: PdfSquare;
	lines: number;
}) {
	const { first, step, gap } = CODE_CAPTION;
	const start = fitsBelowCode({ bottom, lines })
		? bottom - first
		: bottom + side + gap + (lines - 1) * step;
	return Array.from({ length: lines }, (_, index) => start - index * step);
}

/** The font size of a line `width` points wide at the usual size: smaller so it stays under the code. */
export const codeCaptionSize = ({ width, side }: { width: number; side: number }) =>
	Math.max(
		CODE_CAPTION.smallest,
		CODE_CAPTION.size * Math.min(1, side / Math.max(width, Number.EPSILON))
	);
