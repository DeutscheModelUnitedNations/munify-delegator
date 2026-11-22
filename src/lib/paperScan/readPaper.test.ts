import { describe, expect, it } from 'vitest';
import { decodeAreas, encodeAreas, type PageAreas } from './areas';
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
