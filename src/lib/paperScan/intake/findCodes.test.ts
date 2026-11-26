import { describe, expect, test, vi } from 'vitest';
import { findCodes } from './findCodes';
import type { Picture } from '../picture';

const picture: Picture = {
	width: 200,
	height: 100,
	data: new Uint8ClampedArray(200 * 100 * 4).fill(255)
};
const code = { rawValue: 'https://example.org/ID/X', format: 'qr_code' };

describe('findCodes', () => {
	test('reads the picture as it is first, and stops there once it shows a code', async () => {
		const read = vi.fn(async () => [code]);
		expect(await findCodes({ picture, read })).toEqual([code]);
		expect(read).toHaveBeenCalledExactlyOnceWith(picture);
	});

	test('tries the picture made easier to read, and its parts enlarged', async () => {
		const sizes: number[] = [];
		const read = async ({ width }: Picture) => {
			sizes.push(width);
			// only the enlarged corner shows it
			return width > 200 ? [code] : [{ rawValue: '', format: 'qr_code' }];
		};
		expect(await findCodes({ picture, read })).toEqual([code]);
		expect(sizes.at(-1)).toBe(240);
	});

	test('answers nothing for a page without a code', async () => {
		expect(await findCodes({ picture, read: async () => [] })).toEqual([]);
	});
});
