import { beforeEach, describe, expect, it, vi } from 'vitest';

const setAssignmentReview = vi.fn();
vi.mock('#lib/api/rumbleClient/client', () => ({
	client: {
		mutate: {
			setAssignmentReview: (input: unknown) => setAssignmentReview(input)
		}
	}
}));
const toastError = vi.fn();
vi.mock('../toastError', () => ({ toastError: (error: unknown) => toastError(error) }));

const { saveReview, savedReview } = await import('./savedReviews.svelte');

const stored = (review: object) => ({
	evaluation: null,
	flagged: false,
	disqualified: false,
	note: null,
	...review
});

beforeEach(() => {
	setAssignmentReview.mockReset();
	toastError.mockReset();
});

describe('saveReview', () => {
	it('shows the review before the backend has answered, then what it stored', async () => {
		let answer!: (value: object) => void;
		setAssignmentReview.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
		const saving = saveReview({
			kind: 'delegation',
			id: 'a',
			review: undefined,
			change: { evaluation: 4 }
		});
		expect(savedReview('a')).toMatchObject({ evaluation: 4, flagged: false });
		answer(stored({ evaluation: 4, note: 'kept' }));
		expect(await saving).toMatchObject({ evaluation: 4, note: 'kept' });
		expect(savedReview('a')?.note).toBe('kept');
	});

	it('sends the whole review, built on the one shown', async () => {
		setAssignmentReview.mockResolvedValueOnce(stored({ evaluation: 2, flagged: true }));
		await saveReview({
			kind: 'single',
			id: 'b',
			review: { evaluation: 2, flagged: false, disqualified: false },
			change: { flagged: true }
		});
		expect(setAssignmentReview).toHaveBeenCalledWith(
			expect.objectContaining({
				__args: expect.objectContaining({ singleParticipantId: 'b', evaluation: 2, flagged: true })
			})
		);
	});

	it('does not let an earlier answer undo a later save', async () => {
		let first!: (value: object) => void;
		setAssignmentReview.mockReturnValueOnce(new Promise((resolve) => (first = resolve)));
		setAssignmentReview.mockResolvedValueOnce(stored({ evaluation: 3, flagged: true }));
		const earlier = saveReview({
			kind: 'delegation',
			id: 'c',
			review: undefined,
			change: { evaluation: 3 }
		});
		await saveReview({
			kind: 'delegation',
			id: 'c',
			review: savedReview('c'),
			change: { flagged: true }
		});
		first(stored({ evaluation: 3 }));
		expect(await earlier).toBeUndefined();
		expect(savedReview('c')).toMatchObject({ evaluation: 3, flagged: true });
	});

	it('takes a refused review back and says why', async () => {
		setAssignmentReview.mockResolvedValueOnce(stored({ evaluation: 1 }));
		await saveReview({ kind: 'delegation', id: 'd', review: undefined, change: { evaluation: 1 } });
		setAssignmentReview.mockRejectedValueOnce(new Error('nope'));
		expect(
			await saveReview({
				kind: 'delegation',
				id: 'd',
				review: savedReview('d'),
				change: { evaluation: 5 }
			})
		).toBeUndefined();
		expect(savedReview('d')?.evaluation).toBe(1);
		expect(toastError).toHaveBeenCalledOnce();

		setAssignmentReview.mockRejectedValueOnce(new Error('nope'));
		await saveReview({ kind: 'delegation', id: 'e', review: undefined, change: { flagged: true } });
		expect(savedReview('e')).toBeUndefined();
	});
});
