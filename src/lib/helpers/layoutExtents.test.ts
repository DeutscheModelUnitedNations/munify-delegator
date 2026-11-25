import { describe, expect, test } from 'vitest';
import { defaultLayout, LAYOUT_DOCUMENTS } from './documentLayout';
import { breaksReading, layoutExtents, layoutOverlaps } from './layoutExtents';

const A4 = { width: 595.28, height: 841.89 };
const LANDSCAPE = { width: 841.89, height: 595.28 };
/** Sample lines, as the editor shows them. */
const SAMPLES: Record<string, string[]> = {
	name: ['Antonio Guterres'],
	birthday: ['30.04.1949'],
	address: ['405 E 45th St, New York, NY 10017, USA'],
	recipient: ['DMUN e.V.', 'Musterstraße 1', '12345 Musterstadt', 'Deutschland'],
	code: ['x7k2m9p4q1w8', 'Antonio Guterres'],
	qr: ['Echtheit prüfen']
};
const lines = (id: string) => SAMPLES[id] ?? [];

describe('layoutExtents', () => {
	test("measures a text by its characters, Space Mono's", () => {
		const layout = { ...defaultLayout('contract'), recipient: { x: 0.1, y: 0.5, size: 10 } };
		const recipient = layoutExtents({ document: 'contract', layout, page: A4, lines }).find(
			({ id }) => id === 'recipient'
		);
		const [rect] = recipient?.rects ?? [];
		// the longest line, 17 characters, 0.6 em each; four lines tall
		expect(rect.width).toBeCloseTo((17 * 6) / A4.width);
		expect(rect.x).toBeCloseTo(0.1);
		expect(rect.y).toBeLessThan(0.5);
		expect(rect.height * A4.height).toBeGreaterThan(3 * 13.6);
		expect(recipient?.page).toBe(0);
	});

	test("counts the code's caption, below it, with the code", () => {
		const extents = layoutExtents({
			document: 'contract',
			layout: defaultLayout('contract'),
			page: A4,
			lines
		});
		const code = extents.find(({ shape }) => shape === 'square');
		const placed = defaultLayout('contract').code;
		expect(code?.page).toBe('every');
		const [square, caption] = code?.rects ?? [];
		expect(square.x).toBeLessThan(placed.x);
		const bottom = placed.y + (placed.size * A4.width) / A4.height;
		expect(caption.y).toBeGreaterThan(bottom);
		expect(caption.height * A4.height).toBeLessThan(20);
		expect(caption.x + caption.width / 2).toBeCloseTo(placed.x + placed.size / 2);
	});
});

describe('layoutOverlaps', () => {
	test.each(LAYOUT_DOCUMENTS)('finds nothing in the defaults of %s', (document) => {
		const page = document === 'certificate' ? LANDSCAPE : A4;
		const extents = layoutExtents({ document, layout: defaultLayout(document), page, lines });
		expect(layoutOverlaps(extents).map(({ a, b }) => `${a.id} × ${b.id}`)).toEqual([]);
	});

	test('finds a code over a text, which breaks reading', () => {
		const layout = defaultLayout('contract');
		const moved = {
			...layout,
			code: { ...layout.code, x: layout.name.x, y: layout.name.y - 0.02 }
		};
		const overlaps = layoutOverlaps(
			layoutExtents({ document: 'contract', layout: moved, page: A4, lines })
		);
		const pair = overlaps.find(({ a, b }) => [a.id, b.id].includes('name'));
		expect(pair).toBeDefined();
		expect(pair && breaksReading(pair)).toBe(true);
	});

	test('finds a field only on its own page, and texts over each other only look bad', () => {
		const layout = defaultLayout('mediaConsent');
		const field = Object.entries(layout).find(([, placement]) => 'page' in placement);
		if (!field) throw new Error('no field');
		const [id, placement] = field;
		const onText = { ...placement, x: layout.name.x, y: layout.name.y - 0.005 };
		const extents = (page: number) =>
			layoutExtents({
				document: 'mediaConsent',
				layout: { ...layout, [id]: { ...onText, page } },
				page: A4,
				lines
			});
		expect(layoutOverlaps(extents(0)).some(({ a, b }) => [a.id, b.id].includes(id))).toBe(true);
		expect(layoutOverlaps(extents(1)).some(({ a, b }) => [a.id, b.id].includes(id))).toBe(false);

		const texts = layoutOverlaps(
			layoutExtents({
				document: 'mediaConsent',
				layout: { ...layout, birthday: { ...layout.name } },
				page: A4,
				lines
			})
		).find(({ a, b }) => a.shape === 'text' && b.shape === 'text');
		expect(texts && breaksReading(texts)).toBe(false);
	});
});
