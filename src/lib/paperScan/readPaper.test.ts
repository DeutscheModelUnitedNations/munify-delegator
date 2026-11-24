import { describe, expect, it } from 'vitest';
import {
	areasAsPrinted,
	decodeAreas,
	encodeAreas,
	UNKNOWN_PRINT,
	type PageAreas,
	type PrintedInk
} from './areas';
import { fieldOfCode } from './fields';
import { MARKER_CELLS, markerCells } from './markers';
import { MARKER, type Point } from './markerGeometry';
import { judgeMark, perspective, readPaper } from './readPaper';

const A4 = { width: 210, height: 297 };

/** A page with its marks moved off the corners, as below a template's banner, and four fields. */
const areas: PageAreas = {
	page: A4,
	markers: [
		{ x: 13, y: 31 },
		{ x: 197, y: 31 },
		{ x: 197, y: 266 },
		{ x: 13, y: 266 }
	],
	areas: [
		{ field: 'mediaPhoto', x: 30, y: 100, width: 5, height: 5 },
		{ field: 'mediaVideo', x: 30, y: 110, width: 5, height: 5 },
		{ field: 'mediaByDmun', x: 30, y: 120, width: 5, height: 5 },
		{ field: 'mediaSignature', x: 30, y: 150, width: 70, height: 18 }
	]
};

/**
 * A scanned page drawn from scratch: white paper, the markers, the fields' frames and line, and
 * what was filled in, at `scale` pixels per millimetre and turned upside down if `flipped`.
 */
function scan({
	scale,
	flipped = false,
	ink
}: {
	scale: number;
	flipped?: boolean;
	ink: (pen: (from: Point, to: Point) => void) => void;
}) {
	const width = Math.round(A4.width * scale);
	const height = Math.round(A4.height * scale);
	const data = new Uint8ClampedArray(width * height * 4).fill(255);
	const dot = ({ x, y }: Point, value: number) => {
		const px = Math.round(flipped ? width - 1 - x * scale : x * scale);
		const py = Math.round(flipped ? height - 1 - y * scale : y * scale);
		if (px < 0 || py < 0 || px >= width || py >= height) return;
		const at = (py * width + px) * 4;
		data[at] = data[at + 1] = data[at + 2] = value;
	};
	const fill = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }, value = 0) => {
		for (let my = y; my < y + h; my += 1 / scale / 2)
			for (let mx = x; mx < x + w; mx += 1 / scale / 2) dot({ x: mx, y: my }, value);
	};
	const pen = (from: Point, to: Point) => {
		const steps = Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) * scale * 2);
		for (let step = 0; step <= steps; step++) {
			const t = step / steps;
			const at = { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
			fill({ x: at.x - 0.2, y: at.y - 0.2, w: 0.4, h: 0.4 }, 70);
		}
	};
	const cell = MARKER.side / MARKER_CELLS;
	for (const [corner, center] of areas.markers.entries()) {
		const cells = markerCells(corner);
		cells.forEach((row, r) =>
			row.forEach((black, c) => {
				if (black)
					fill({
						x: center.x - MARKER.side / 2 + c * cell,
						y: center.y - MARKER.side / 2 + r * cell,
						w: cell,
						h: cell
					});
			})
		);
	}
	for (const { x, y, width: w, height: h, field } of areas.areas) {
		if (field === 'mediaSignature') fill({ x, y: y + h, w, h: 0.25 });
		else {
			fill({ x, y, w, h: 0.25 });
			fill({ x, y: y + h - 0.25, w, h: 0.25 });
			fill({ x, y, w: 0.25, h });
			fill({ x: x + w - 0.25, y, w: 0.25, h });
		}
	}
	ink(pen);
	return { width, height, data };
}

/** A cross in the box at `top` (millimetres) of the media choices. */
const cross = (pen: (from: Point, to: Point) => void, top: number) => {
	pen({ x: 30.8, y: top + 0.8 }, { x: 34.2, y: top + 4.2 });
	pen({ x: 34.2, y: top + 0.8 }, { x: 30.8, y: top + 4.2 });
};
const signature = (pen: (from: Point, to: Point) => void) => {
	let last = { x: 35, y: 162 };
	for (let t = 0; t < 60; t++) {
		const next = { x: 35 + t * 0.8, y: 160 + Math.sin(t * 0.7) * 4 };
		pen(last, next);
		last = next;
	}
};

describe('encodeAreas', () => {
	it('round-trips the page, its marks and its fields to a tenth of a millimetre', () => {
		const odd = { ...areas, areas: [{ ...areas.areas[0], x: 30.04, width: -1 }] };
		expect(decodeAreas(encodeAreas(areas))).toEqual(areas);
		// rounded, and never below nothing
		expect(decodeAreas(encodeAreas(odd))?.areas[0]).toMatchObject({ x: 30, width: 0 });
	});

	it('takes ten numbers for the page and its marks, five a field, and refuses other shapes', () => {
		const values = encodeAreas(areas);
		expect(values).toHaveLength(10 + 4 * 5);
		expect(values.slice(0, 4)).toEqual([2100, 2970, 130, 310]);
		expect(decodeAreas(values.slice(0, 9))).toBeNull();
		expect(decodeAreas(values.slice(0, 12))).toBeNull();
		expect(decodeAreas([0, 0, ...values.slice(2)])).toBeNull();
	});

	it('carries the print in a field, which a version that knows none leaves out', () => {
		const [first, ...rest] = areas.areas;
		const printed = { ...first, printed: { ink: 0.0304, core: 1.2 } };
		const values = encodeAreas({ ...areas, areas: [printed, ...rest] });
		expect(values).toHaveLength(10 + 5 * 5);
		expect(decodeAreas(values)?.areas[0].printed).toEqual({ ink: 0.03, core: 1 });
		expect(
			decodeAreas(values)
				?.areas.slice(1)
				.some((area) => area.printed)
		).toBe(false);
		// the record is one of a field of no known code
		expect(fieldOfCode(values[10 + 4 * 5])).toBeUndefined();
	});

	it('leaves out a field it does not know', () => {
		const values = encodeAreas(areas);
		// the first field's code, the eleventh number
		values[10] = 99;
		expect(decodeAreas(values)?.areas.map((area) => area.field)).toEqual([
			'mediaVideo',
			'mediaByDmun',
			'mediaSignature'
		]);
	});
});

describe('perspective', () => {
	it('maps the corners it was given and what lies between them', () => {
		const from = [
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 },
			{ x: 0, y: 10 }
		];
		const to = [
			{ x: 100, y: 100 },
			{ x: 0, y: 100 },
			{ x: 0, y: 0 },
			{ x: 100, y: 0 }
		];
		const map = perspective({ from, to });
		expect(map({ x: 10, y: 0 }).x).toBeCloseTo(0);
		expect(map({ x: 5, y: 5 })).toEqual({ x: expect.closeTo(50), y: expect.closeTo(50) });
	});
});

describe('judgeMark', () => {
	it('tells a cross from a dot, and a signature from a speck', () => {
		expect(judgeMark({ mark: 'checkbox', ink: 0.2, span: 1 })).toBe('yes');
		expect(judgeMark({ mark: 'checkbox', ink: 0.005, span: 0.1 })).toBe('no');
		expect(judgeMark({ mark: 'checkbox', ink: 0.04, span: 0.5 })).toBe('unclear');
		// ink, but none of it in the middle: the frame of a page aligned a little off
		expect(judgeMark({ mark: 'checkbox', ink: 0.2, span: 0.3, core: 0 })).toBe('unclear');
		expect(judgeMark({ mark: 'line', ink: 0.02, span: 0.7 })).toBe('yes');
		expect(judgeMark({ mark: 'line', ink: 0.02, span: 0.1 })).toBe('unclear');
		expect(judgeMark({ mark: 'line', ink: 0, span: 0 })).toBe('no');
	});
});

describe('readPaper', () => {
	it('reads a cross and a signature, and leaves the frames and a dot out', () => {
		const picture = scan({
			scale: 6,
			ink: (pen) => {
				cross(pen, 100);
				pen({ x: 32.5, y: 112.5 }, { x: 32.5, y: 112.5 });
				signature(pen);
			}
		});
		expect(readPaper({ picture, areas })).toEqual([
			{ field: 'mediaPhoto', state: 'yes' },
			{ field: 'mediaVideo', state: 'no' },
			{ field: 'mediaByDmun', state: 'no' },
			{ field: 'mediaSignature', state: 'yes' }
		]);
	});

	it('reads a page scanned upside down', () => {
		const picture = scan({ scale: 5, flipped: true, ink: (pen) => cross(pen, 120) });
		expect(readPaper({ picture, areas })?.map((reading) => reading.state)).toEqual([
			'no',
			'no',
			'yes',
			'no'
		]);
	});

	it('reads nothing without all four markers', () => {
		const picture = scan({ scale: 4, ink: () => undefined });
		// paper over the bottom marks
		const cut = Math.round(255 * 4);
		picture.data.fill(255, cut * picture.width * 4);
		expect(readPaper({ picture, areas })).toBeNull();
	});
});

describe('judgeMark against the print in a field', () => {
	const box = (ink: number, printed?: { ink: number; core: number }) =>
		judgeMark({ mark: 'checkbox', ink, span: 1, core: ink, printed });
	const line = (ink: number, printed?: { ink: number; core: number }) =>
		judgeMark({ mark: 'line', ink, span: 1, printed });

	it('takes only clearly more than the print for a mark', () => {
		expect(box(0.2)).toBe('yes');
		expect(box(0.2, { ink: 0.15, core: 0.15 })).toBe('unclear');
		// unmeasured: a person, whatever is there
		expect(box(0.9, UNKNOWN_PRINT)).toBe('unclear');
		expect(line(0.5, UNKNOWN_PRINT)).toBe('unclear');
		expect(box(0.4, { ink: 0.15, core: 0.15 })).toBe('yes');
		expect(line(0.02)).toBe('yes');
		expect(line(0.02, { ink: 0.02, core: 0 })).toBe('unclear');
		expect(line(0.06, { ink: 0.02, core: 0 })).toBe('yes');
	});

	it('looks at the middle of a box on its own', () => {
		const printed = { ink: 0, core: 0.2 };
		expect(judgeMark({ mark: 'checkbox', ink: 0.3, core: 0.3, span: 1, printed })).toBe('unclear');
	});

	it('tells a box with its frame at its edge by its middle', () => {
		const framed = (ink: number, core: number) =>
			judgeMark({ mark: 'checkbox', ink, core, span: 1, printed: { ink: 0.3, core: 0 } });
		expect(framed(0.3, 0)).toBe('no');
		expect(framed(0.42, 0)).toBe('no');
		expect(framed(0.6, 0)).toBe('unclear');
		expect(framed(0.35, 0.05)).toBe('unclear');
		expect(framed(0.35, 0.2)).toBe('yes');
		// print in the middle itself is no frame
		const covered = { ink: 0.3, core: 0.3 };
		expect(judgeMark({ mark: 'checkbox', ink: 0.3, core: 0, span: 1, printed: covered })).toBe(
			'unclear'
		);
	});

	it('never makes a mark of what is none without it', () => {
		for (const printed of [
			{ ink: 0.5, core: 0.5 },
			{ ink: 0.5, core: 0 },
			{ ink: 0, core: 0.5 }
		]) {
			expect(box(0.01, printed)).toBe('no');
			expect(box(0.05, printed)).not.toBe('yes');
			expect(line(0.001, printed)).toBe('no');
			expect(line(0.004, printed)).toBe('unclear');
		}
	});
});

describe('areasAsPrinted', () => {
	const [, , , signature] = areas.areas;
	const printed = (print: Omit<PrintedInk, 'field'>) =>
		areasAsPrinted({
			areas: [signature],
			printedInk: [{ field: signature.field, ...print }]
		})[0];

	it("cuts a line's field to where it is clear, and carries its print", () => {
		expect(printed({ ink: 0, core: 0, clear: { top: 1, bottom: 6 } })).toEqual({
			...signature,
			y: signature.y + 1,
			height: 5
		});
		expect(printed({ ink: 0.2, core: 0 }).printed).toEqual({ ink: 0.2, core: 0 });
	});

	it('leaves a line said to be clear where it cannot be to a person', () => {
		for (const clear of [
			{ top: 0, bottom: signature.height + 1 },
			{ top: -1, bottom: 6 },
			{ top: 6, bottom: 1 },
			// no room to write: what would be read lies outside of it
			{ top: 0, bottom: 0.1 },
			{ top: 1, bottom: 5.9 }
		]) {
			expect(printed({ ink: 0, core: 0, clear })).toEqual({ ...signature, printed: UNKNOWN_PRINT });
		}
	});

	it('takes no span for a box', () => {
		const [box] = areas.areas;
		const print = { field: box.field, ink: 0, core: 0, clear: { top: 1, bottom: 2 } };
		expect(areasAsPrinted({ areas: [box], printedInk: [print] })).toEqual([box]);
	});

	it('leaves a page nobody measured to a person', () => {
		expect(areasAsPrinted({ areas: [signature], printedInk: undefined })[0].printed).toEqual(
			UNKNOWN_PRINT
		);
	});
});
