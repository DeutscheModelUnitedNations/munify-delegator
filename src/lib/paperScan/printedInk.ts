import { areasAsPrinted, type ClearSpan, type PaperArea, type PrintedInk } from './areas';
import { PAPER_FIELDS } from './fields';
import type { Point } from './markerGeometry';
import { fieldInk, inkIn, INK_OF } from './readPaper';
import type { Picture } from './picture';

/**
 * The print of the template in its fields, measured on the page as it is printed, before anybody
 * writes on it. A scan is never compared with it pixel by pixel: print comes out of a printer and a
 * scanner thicker, thinner and a little off, by more than a signature adds. So it is kept out instead:
 * a line's field is read between the template's lines (`clear`), a box by its middle where its frame
 * is in it, and what print is left makes the reading more careful (`judgeMark`).
 */

type Page = { picture: Picture; toPicture: (point: Point) => Point };

/** How far off (millimetres) a scan may be aligned: print that close to a field may end up in it. */
const OFF = 0.3;
const SHIFTS: Point[] = [
	{ x: 0, y: 0 },
	{ x: OFF, y: 0 },
	{ x: -OFF, y: 0 },
	{ x: 0, y: OFF },
	{ x: 0, y: -OFF }
];

/** How high (millimetres) the rows are in which a template's line is looked for. */
const ROW = 0.1;
/** A row with more than this share of its width in ink is a line, drawn through or dotted. */
const LINE_SHARE = 0.4;
/** A field's edges as far as this (millimetres) are not read anyway, a line there does not matter. */
const UNREAD = { top: 0.2, bottom: 1.5 };
/** Below this height (millimetres) there is no room to write between two lines. */
const LEAST_ROOM = 5;

/** Where the template's lines run across `area`: from and to, in millimetres from its top. */
function linesAcross({ picture, toPicture, area }: Page & { area: PaperArea }) {
	const lines: { top: number; bottom: number }[] = [];
	for (let row = 0; row < Math.floor(area.height / ROW); row++) {
		const top = row * ROW;
		const box = { x: area.x + 1, y: area.y + top, width: area.width - 2, height: ROW };
		const { ink } = inkIn({ picture, toPicture, box, around: area });
		if (ink < LINE_SHARE) continue;
		const last = lines.at(-1);
		if (last && top - last.bottom < ROW * 1.5) last.bottom = top + ROW;
		else lines.push({ top, bottom: top + ROW });
	}
	return lines.filter(
		({ top, bottom }) => bottom > UNREAD.top && top < area.height - UNREAD.bottom
	);
}

/** The highest span of a line's field without a line of the template; `undefined` when all of it is. */
function clearSpanOf({ picture, toPicture, area }: Page & { area: PaperArea }) {
	const lines = linesAcross({ picture, toPicture, area });
	if (lines.length === 0) return undefined;
	const tops = [0, ...lines.map(({ bottom }) => bottom + OFF)];
	const bottoms = [...lines.map(({ top }) => top), area.height];
	const [highest] = tops
		.map((top, index): ClearSpan => ({ top, bottom: bottoms[index] }))
		.sort((a, b) => b.bottom - b.top - (a.bottom - a.top));
	return highest.bottom - highest.top >= LEAST_ROOM ? highest : undefined;
}

/** The print in the fields of `areas` that have any, `picture` being the page, not filled in. */
export function printedInkOf({
	picture,
	toPicture,
	areas
}: Page & { areas: readonly PaperArea[] }): PrintedInk[] {
	return areas.flatMap((placed) => {
		const { field } = placed;
		const { mark } = PAPER_FIELDS[field];
		const clear = mark === 'line' ? clearSpanOf({ picture, toPicture, area: placed }) : undefined;
		const [area] = areasAsPrinted({
			areas: [placed],
			printedInk: [{ field, ink: 0, core: 0, clear }]
		});
		const inkAt = ({ x, y }: Point) =>
			fieldInk({ picture, toPicture, area: { ...area, x: area.x + x, y: area.y + y } });
		const shifted = SHIFTS.map(inkAt);
		// a frame a shift brings into a box is told by its middle
		const ink =
			mark === 'checkbox'
				? inkAt({ x: 0, y: 0 }).ink
				: Math.max(...shifted.map((each) => each.ink));
		const core = Math.max(...shifted.map((each) => each.core ?? 0));
		// half of what still counts as empty changes no reading, and needs no room in the code
		const least = INK_OF[mark].no / 2;
		return clear || ink >= least || core >= least ? [{ field, ink, core, clear }] : [];
	});
}
