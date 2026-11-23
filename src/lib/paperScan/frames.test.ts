import { describe, expect, test } from 'vitest';
import { addPicture, framesSettled, mergeFrames } from './frames';
import type { FieldReading, FieldState } from './readPaper';

const frame = (terms: FieldState, signature: FieldState): FieldReading[] => [
	{ field: 'termsAccepted', state: terms },
	{ field: 'termsSignature', state: signature }
];

describe('mergeFrames', () => {
	test('lets a clear reading stand where another picture was unclear', () => {
		expect(mergeFrames([frame('unclear', 'yes'), frame('no', 'unclear')])).toEqual(
			frame('no', 'yes')
		);
	});

	test('is unclear where two pictures disagree', () => {
		expect(mergeFrames([frame('yes', 'yes'), frame('no', 'yes')])).toEqual(frame('unclear', 'yes'));
	});
});

describe('framesSettled', () => {
	test('wants two pictures that leave nothing unclear', () => {
		expect(framesSettled([])).toBe(false);
		expect(framesSettled([frame('yes', 'yes')])).toBe(false);
		expect(framesSettled([frame('yes', 'yes'), frame('yes', 'yes')])).toBe(true);
		expect(framesSettled([frame('yes', 'unclear'), frame('yes', 'yes')])).toBe(true);
		expect(framesSettled([frame('yes', 'no'), frame('yes', 'yes')])).toBe(false);
	});

	test('takes a page without fields at once', () => {
		expect(framesSettled([[]])).toBe(true);
	});
});

describe('addPicture', () => {
	test('is done once the pictures settle the page', () => {
		const first = addPicture({ taken: undefined, read: frame('yes', 'yes') });
		expect(first).toMatchObject({ pictures: 1, done: false });
		const blurred = addPicture({ taken: first, read: null });
		expect(blurred).toMatchObject({ pictures: 2, done: false });
		expect(addPicture({ taken: blurred, read: frame('yes', 'yes') }).done).toBe(true);
	});

	test('gives up after a few seconds, with what was read', () => {
		let taken = addPicture({ taken: undefined, read: frame('yes', 'unclear') });
		for (let picture = 2; picture < 10; picture++) taken = addPicture({ taken, read: null });
		expect(taken.done).toBe(false);
		taken = addPicture({ taken, read: null });
		expect(taken).toMatchObject({ done: true, frames: [frame('yes', 'unclear')] });
	});
});
