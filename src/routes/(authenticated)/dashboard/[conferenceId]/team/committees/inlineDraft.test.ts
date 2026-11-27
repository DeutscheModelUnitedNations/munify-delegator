import { describe, expect, test } from 'vitest';
import { takeOverStored } from './inlineDraft';

const A = { title: 'A' };
const B = { title: 'B' };
const C = { title: 'C' };

describe('takeOverStored', () => {
	test('takes over values saved elsewhere while the fields hold no edit', () => {
		expect(takeOverStored({ draft: A, base: A, next: B, stale: undefined, saving: false })).toBe(B);
	});

	test('keeps an edit in progress', () => {
		expect(
			takeOverStored({ draft: C, base: A, next: B, stale: undefined, saving: false })
		).toBeUndefined();
	});

	test('nothing to do when the stored values did not change', () => {
		expect(
			takeOverStored({ draft: A, base: A, next: A, stale: undefined, saving: false })
		).toBeUndefined();
	});

	describe('around the form’s own save of B over A', () => {
		test('live update first, then the answer: an edit back to A made meanwhile stays', () => {
			// while saving, the live update B arrives and the field already reads A again
			expect(takeOverStored({ draft: A, base: A, next: B, stale: undefined, saving: true })).toBe(
				undefined
			);
			// the answer: base is what was sent (B), A from before the save is stale
			expect(takeOverStored({ draft: A, base: B, next: B, stale: A, saving: false })).toBe(
				undefined
			);
		});

		test('answer first, then the live update: the saved value does not flip back', () => {
			// the answer: base and draft are B, the stored value is still A
			expect(
				takeOverStored({ draft: B, base: B, next: A, stale: A, saving: false })
			).toBeUndefined();
			// the live update B arrives
			expect(
				takeOverStored({ draft: B, base: B, next: B, stale: A, saving: false })
			).toBeUndefined();
		});

		test('someone else saves C afterwards: taken over as usual', () => {
			expect(takeOverStored({ draft: B, base: B, next: C, stale: A, saving: false })).toBe(C);
		});
	});
});
