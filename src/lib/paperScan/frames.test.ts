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
	test('takes one picture that leaves nothing unclear', () => {
		expect(framesSettled([])).toBe(false);
		expect(framesSettled([frame('yes', 'yes')])).toBe(true);
		expect(framesSettled([frame('yes', 'unclear')])).toBe(false);
		expect(framesSettled([frame('yes', 'unclear'), frame('yes', 'yes')])).toBe(true);
	});

	test('leaves a field two pictures disagree on unclear', () => {
		expect(framesSettled([frame('yes', 'no'), frame('yes', 'yes')])).toBe(false);
	});

	test('takes a page without fields at once', () => {
		expect(framesSettled([[]])).toBe(true);
	});
});

describe('addPicture', () => {
	test('is done with the first picture that settles the page', () => {
		const blurred = addPicture({ taken: undefined, read: null });
		expect(blurred).toMatchObject({ pictures: 1, done: false });
		expect(addPicture({ taken: blurred, read: frame('yes', 'yes') }).done).toBe(true);
	});

	test('gives up after three pictures, with what was read', () => {
		let taken = addPicture({ taken: undefined, read: frame('yes', 'unclear') });
		taken = addPicture({ taken, read: null });
		expect(taken.done).toBe(false);
		taken = addPicture({ taken, read: null });
		expect(taken).toMatchObject({ done: true, frames: [frame('yes', 'unclear')] });
	});
});
