import { describe, expect, test } from 'vitest';
import { onStored, type InlineDraftState } from './inlineDraft';

const A = { title: 'A' };
const B = { title: 'B' };
const C = { title: 'C' };

const fresh = (value: typeof A): InlineDraftState<typeof A> => ({
	draft: value,
	base: value,
	stale: undefined
});

describe('onStored', () => {
	test('takes over values saved elsewhere while the fields hold no edit', () => {
		expect(onStored({ state: fresh(A), next: B, saving: false })).toEqual(fresh(B));
	});

	test('keeps an edit in progress', () => {
		const state = { draft: C, base: A, stale: undefined };
		expect(onStored({ state, next: B, saving: false })).toBe(state);
	});

	test('nothing changes when the stored values did not', () => {
		const state = fresh(A);
		expect(onStored({ state, next: A, saving: false })).toBe(state);
	});

	describe('around the form’s own save of B over A', () => {
		/** Right after the save's answer: base is what was sent, A from before is stale. */
		const answered = (draft: typeof A): InlineDraftState<typeof A> => ({
			draft,
			base: B,
			stale: A
		});

		test('live update first: an edit back to A made while saving stays', () => {
			// the field already reads A again when the live update B arrives
			const during = { draft: A, base: A, stale: undefined };
			expect(onStored({ state: during, next: B, saving: true })).toBe(during);
			// then the answer comes; B is stored, A stays an edit
			const after = onStored({ state: answered(A), next: B, saving: false });
			expect(after.draft).toEqual(A);
			expect(after.base).toEqual(B);
		});

		test('answer first, then the live update: the saved value does not flip back', () => {
			const state = answered(B);
			expect(onStored({ state, next: A, saving: false })).toBe(state);
			expect(onStored({ state, next: B, saving: false }).draft).toEqual(B);
		});

		test('a later change back to A by someone else is taken over', () => {
			const live = onStored({ state: answered(B), next: B, saving: false });
			expect(live.stale).toBeUndefined();
			expect(onStored({ state: live, next: A, saving: false })).toEqual(fresh(A));
		});

		test('someone else saves C afterwards: taken over as usual', () => {
			expect(onStored({ state: answered(B), next: C, saving: false })).toEqual(fresh(C));
		});
	});
});
