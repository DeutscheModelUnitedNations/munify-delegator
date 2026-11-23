import { expect, test } from 'vitest';
import { isBlank } from './blank';

const WIDTH = 600;
const HEIGHT = 800;

/** A grey page with black where `black` says. */
function page(black: (x: number, y: number) => boolean) {
	const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4).fill(255);
	for (let y = 0; y < HEIGHT; y++) {
		for (let x = 0; x < WIDTH; x++) {
			data.fill(black(x, y) ? 30 : 225, (y * WIDTH + x) * 4, (y * WIDTH + x) * 4 + 3);
		}
	}
	return { width: WIDTH, height: HEIGHT, data };
}

test('an empty back is blank, also with a speck, punch holes and a dark edge', () => {
	expect(isBlank(page(() => false))).toBe(true);
	expect(isBlank(page((x, y) => x < 8 || (Math.abs(x - 300) < 4 && Math.abs(y - 300) < 4)))).toBe(
		true
	);
});

test('a page with a few lines of text is not', () => {
	expect(isBlank(page((x, y) => y > 200 && y < 260 && y % 20 < 6 && x > 80 && x % 8 < 4))).toBe(
		false
	);
});
