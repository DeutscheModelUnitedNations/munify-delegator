import { describe, expect, test } from 'vitest';
import { brightnessAt, flatten, readingVariants, sharpen, shrink, soften } from './picture';

/** A picture of `width` by `height`, each pixel's grey from `value`. */
function grey({
	width,
	height,
	value
}: {
	width: number;
	height: number;
	value: (x: number, y: number) => number;
}) {
	const data = new Uint8ClampedArray(width * height * 4).fill(255);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++)
			data.fill(value(x, y), (y * width + x) * 4, (y * width + x) * 4 + 3);
	}
	return { width, height, data };
}
const at = (picture: { width: number; data: ArrayLike<number> }, x: number, y: number) =>
	picture.data[(y * picture.width + x) * 4];

describe('brightnessAt', () => {
	const of = (r: number, g: number, b: number) =>
		brightnessAt({ picture: { width: 1, height: 1, data: [r, g, b, 255] }, at: 0 });

	test('sees a pen of any colour, and a yellow highlight as paper', () => {
		expect(of(60, 90, 220)).toBe(60);
		expect(of(220, 40, 50)).toBe(40);
		expect(of(20, 20, 20)).toBe(20);
		expect(of(255, 255, 0)).toBe(255);
	});
});

describe('shrink', () => {
	test('averages pixels, and never enlarges', () => {
		const picture = grey({ width: 8, height: 4, value: (x) => (x % 2 === 0 ? 0 : 200) });
		const small = shrink({ picture, maxSide: 4 });
		expect([small.width, small.height]).toEqual([4, 2]);
		expect(at(small, 1, 1)).toBe(100);
		expect(shrink({ picture, maxSide: 100 }).width).toBe(8);
	});
});

describe('flatten', () => {
	test('takes a shadow off the paper and keeps the ink apart from it', () => {
		const light = (x: number) => 240 - x * 0.5;
		const picture = grey({
			width: 400,
			height: 400,
			value: (x, y) => (y % 40 === 20 ? light(x) * 0.4 : light(x))
		});
		const flat = flatten(picture);
		for (const x of [20, 200, 380]) {
			expect(at(flat, x, 10)).toBeGreaterThan(200);
			expect(at(flat, x, 20)).toBeLessThan(125);
		}
	});
});

describe('soften and sharpen', () => {
	const edge = grey({ width: 20, height: 5, value: (x) => (x < 10 ? 60 : 180) });

	test('spread an edge, or raise it', () => {
		expect(at(soften(edge), 9, 2)).toBeGreaterThan(60);
		expect(at(sharpen(edge), 9, 2)).toBeLessThan(60);
		expect(at(sharpen(edge), 10, 2)).toBeGreaterThan(180);
	});
});

describe('readingVariants', () => {
	test('say how much smaller than the picture they are', () => {
		const picture = grey({ width: 3600, height: 40, value: () => 200 });
		const [first] = readingVariants(picture);
		expect(first.picture.width).toBe(1800);
		expect(first.scale).toBe(2);
	});
});
