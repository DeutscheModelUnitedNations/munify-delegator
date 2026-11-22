import { elementsByShape, elementsOf, POINTS_PER_MM, type LayoutDocument } from './documentLayout';

/**
 * Where each generated part of a document lands on the page, to tell parts that would print over
 * each other (`layoutOverlaps`) or over the template's own print (the layout editor's check). A
 * text's extent follows from its lines: the generator writes them in Space Mono, a monospaced
 * font, so a line is as wide as its characters; a code's caption counts with the code.
 */

/** A rectangle on the page, as fractions of its width and height. */
export type PageRect = { x: number; y: number; width: number; height: number };

export type Extent = {
	id: string;
	/** Where it prints: one area, or a code and its caption beside it. */
	rects: PageRect[];
	/** The page it prints on, from 0; `every` for the code, the page number and the marks. */
	page: number | 'every';
	/** The page number and the marks, which never move. */
	fixed: boolean;
	shape: 'text' | 'box' | 'square' | 'field';
};

/**
 * Whether an overlap of `a` and `b` makes the paper unreadable to a machine: a code, an alignment
 * mark (fixed) or a field is in it. Texts and the check-in list over each other only look bad.
 */
export const breaksReading = ({ a, b }: { a: Extent; b: Extent }) =>
	[a, b].some(({ shape, fixed }) => fixed || shape === 'square' || shape === 'field');

/** Space Mono's advance, in ems: every character is this wide. */
const MONO_ADVANCE = 0.6;
/** Helvetica's average advance for names and ids, in ems (the code's caption beside it). */
const SANS_ADVANCE = 0.56;
/** How far a line reaches above its baseline and below it, in ems. */
const ASCENT = 0.8;
const DESCENT = 0.25;
/** The generator's line height, in ems. */
const LINE_HEIGHT = 1.36;
/** The code's caption: its size, its gap to the code and its line step, in points. */
const CAPTION = { size: 8, gap: 5, step: 10 };
/** The quiet zone a code needs around it to be found, in millimetres. */
const QUIET_ZONE_MM = 1;

type Page = { width: number; height: number };

/** A rectangle in points (from the top left) as fractions of the page. */
const ofPage = ({ x, y, width, height }: PageRect, page: Page): PageRect => ({
	x: x / page.width,
	y: y / page.height,
	width: width / page.width,
	height: height / page.height
});

const longest = (lines: readonly string[]) => Math.max(0, ...lines.map((line) => line.length));

/** Lines of text whose first baseline starts (or, centred, is centred) at `x`/`baseline`. */
function textRect({
	x,
	baseline,
	size,
	lines,
	advance,
	align
}: {
	x: number;
	baseline: number;
	size: number;
	lines: readonly string[];
	advance: number;
	align: 'left' | 'center';
}): PageRect {
	const width = longest(lines) * advance * size;
	const top = baseline - ASCENT * size;
	return {
		x: align === 'center' ? x - width / 2 : x,
		y: top,
		width,
		height: (Math.max(1, lines.length) - 1) * LINE_HEIGHT * size + (ASCENT + DESCENT) * size
	};
}

/**
 * A code's caption, as the generator draws it: beside the code at its bottom (the name above the
 * id), left of it unless the page leaves no room there; or centred above it.
 */
function captionRect({
	square,
	caption,
	lines
}: {
	square: { left: number; top: number; side: number };
	caption: 'above' | 'beside';
	lines: readonly string[];
}): PageRect | null {
	if (lines.length === 0) return null;
	const { size, gap, step } = CAPTION;
	if (caption === 'above') {
		return textRect({
			x: square.left + square.side / 2,
			baseline: square.top - 4,
			size,
			lines: lines.slice(0, 1),
			advance: MONO_ADVANCE,
			align: 'center'
		});
	}
	const width = longest(lines) * SANS_ADVANCE * size;
	const onLeft = square.left - gap - width >= 0;
	const bottom = square.top + square.side;
	const top = bottom - (lines.length - 1) * step - ASCENT * size;
	return {
		x: onLeft ? square.left - gap - width : square.left + square.side + gap,
		y: top,
		width,
		height: bottom + DESCENT * size - top
	};
}

/**
 * The extent of every part of `document` placed as `layout` on a page of `page` (points), with the
 * lines `lines(id)` gives for a text (a sample) and a code's caption.
 */
export function layoutExtents({
	document,
	layout,
	page,
	lines
}: {
	document: LayoutDocument;
	layout: Parameters<typeof elementsByShape>[0]['layout'];
	page: Page;
	lines: (id: string) => readonly string[];
}): Extent[] {
	const { texts, boxes, squares, fields } = elementsByShape({
		elements: elementsOf(document),
		layout
	});
	const extents: Extent[] = [];
	for (const { id, align, placement } of texts) {
		const rect = textRect({
			x: placement.x * page.width,
			baseline: placement.y * page.height,
			size: placement.size,
			lines: lines(id),
			advance: MONO_ADVANCE,
			align
		});
		extents.push({ id, rects: [ofPage(rect, page)], page: 0, fixed: false, shape: 'text' });
	}
	for (const { id, placement, fixed } of boxes) {
		// the page number and the marks print on every page, the check-in list on the first
		extents.push({ id, rects: [placement], page: fixed ? 'every' : 0, fixed, shape: 'box' });
	}
	for (const { id, placement, caption } of squares) {
		const square = {
			left: placement.x * page.width,
			top: placement.y * page.height,
			side: placement.size * page.width
		};
		const quiet = QUIET_ZONE_MM * POINTS_PER_MM;
		const code = {
			x: square.left - quiet,
			y: square.top - quiet,
			width: square.side + 2 * quiet,
			height: square.side + 2 * quiet
		};
		const text = captionRect({ square, caption, lines: lines(id) });
		const rects = [code, ...(text ? [text] : [])].map((rect) => ofPage(rect, page));
		extents.push({ id, rects, page: 'every', fixed: false, shape: 'square' });
	}
	for (const { id, placement } of fields) {
		extents.push({
			id,
			rects: [placement],
			page: placement.page,
			fixed: false,
			shape: 'field'
		});
	}
	return extents;
}

const samePage = (a: Extent, b: Extent) =>
	a.page === 'every' || b.page === 'every' || a.page === b.page;

const intersect = (a: PageRect, b: PageRect) =>
	a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * The pairs of parts that would print over each other on some page, each pair once. The fixed
 * parts among themselves are left out: they are where they always are.
 */
export function layoutOverlaps(extents: readonly Extent[]) {
	const pairs: { a: Extent; b: Extent }[] = [];
	extents.forEach((a, index) => {
		for (const b of extents.slice(index + 1)) {
			if (a.fixed && b.fixed) continue;
			const meet = a.rects.some((one) => b.rects.some((other) => intersect(one, other)));
			if (samePage(a, b) && meet) pairs.push({ a, b });
		}
	});
	return pairs;
}
