import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CombinedError } from '@urql/core';
import { GraphQLError } from 'graphql';
import type { Outline } from '#lib/guide/outline';

const save = vi.fn();
const read = vi.fn();
const toastError = vi.fn();
vi.mock('#lib/api/rumbleClient/client', () => ({
	client: {
		mutate: { updateGuideOutlineDraft: (args: unknown) => save(args) },
		query: { guideOutlineOf: (args: unknown) => read(args) }
	}
}));
vi.mock('svelte-sonner', () => ({
	toast: { error: (text: string, options: unknown) => toastError(text, options) }
}));

const { createOutlineDraft } = await import('./outlineDraft.svelte');

const empty: Outline = { sections: [] };
const one: Outline = {
	sections: [{ id: 's', title: 'S', audience: { type: 'everyone' }, entries: [] }]
};

const conflict = () =>
	new CombinedError({
		graphQLErrors: [new GraphQLError('Changed elsewhere', { extensions: { code: 'CONFLICT' } })]
	});

function sentStamp(call: number) {
	const sent: { __args: { expectedDraftUpdatedAt?: Date } } = save.mock.calls[call][0];
	return sent.__args.expectedDraftUpdatedAt;
}

beforeEach(() => {
	vi.useFakeTimers();
	save.mockReset();
	read.mockReset();
	toastError.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('createOutlineDraft', () => {
	test('saves the whole outline shortly after the last change', async () => {
		save.mockResolvedValue({ draftUpdatedAt: new Date('2026-01-01T00:00:01.000Z') });
		const draft = createOutlineDraft({ conferenceId: 'c', initial: empty });
		draft.change(one);
		draft.change({ ...one, sections: [] });
		expect(draft.busy).toBe(true);
		await vi.runAllTimersAsync();
		expect(save).toHaveBeenCalledOnce();
		expect(save).toHaveBeenCalledWith({
			__args: { conferenceId: 'c', outline: { sections: [] }, expectedDraftUpdatedAt: undefined },
			draftUpdatedAt: true
		});
		expect(draft.busy).toBe(false);
	});

	test('each save names the stored draft it started from', async () => {
		save
			.mockResolvedValueOnce({ draftUpdatedAt: new Date('2026-01-01T00:00:01.000Z') })
			.mockResolvedValue({ draftUpdatedAt: new Date('2026-01-01T00:00:02.000Z') });
		const draft = createOutlineDraft({
			conferenceId: 'c',
			initial: empty,
			stamp: new Date('2026-01-01T00:00:00.000Z')
		});
		draft.change(one);
		await draft.flush();
		draft.change(empty);
		await draft.flush();
		expect([sentStamp(0), sentStamp(1)]).toEqual([
			new Date('2026-01-01T00:00:00.000Z'),
			new Date('2026-01-01T00:00:01.000Z')
		]);
	});

	test('flush saves at once and only when something changed', async () => {
		save.mockResolvedValue({ draftUpdatedAt: new Date('2026-01-01T00:00:01.000Z') });
		const draft = createOutlineDraft({ conferenceId: 'c', initial: empty });
		expect(await draft.flush()).toBe(true);
		expect(save).not.toHaveBeenCalled();
		draft.change(one);
		await draft.flush();
		expect(save).toHaveBeenCalledOnce();
		expect(draft.outline).toEqual(one);
	});

	test('keeps a failed change to save again, and says so', async () => {
		save
			.mockRejectedValueOnce(new Error('offline'))
			.mockResolvedValue({ draftUpdatedAt: new Date('2026-01-01T00:00:01.000Z') });
		const draft = createOutlineDraft({ conferenceId: 'c', initial: empty });
		draft.change(one);
		expect(await draft.flush()).toBe(false);
		expect(toastError).toHaveBeenCalledOnce();
		expect(draft.busy).toBe(true);
		expect(await draft.flush()).toBe(true);
		expect(save).toHaveBeenCalledTimes(2);
		expect(draft.busy).toBe(false);
	});

	test('a draft changed elsewhere stops saving until the person loads it or keeps theirs', async () => {
		save
			.mockRejectedValueOnce(conflict())
			.mockResolvedValue({ draftUpdatedAt: new Date('2026-01-01T00:00:02.000Z') });
		const draft = createOutlineDraft({
			conferenceId: 'c',
			initial: empty,
			stamp: new Date('2026-01-01T00:00:00.000Z')
		});
		draft.change(one);
		expect(await draft.flush()).toBe(false);
		expect(draft.conflicted).toBe(true);
		expect(toastError).toHaveBeenCalledWith('Changed elsewhere', expect.any(Object));

		// more changes wait
		draft.change({ ...one });
		await vi.runAllTimersAsync();
		expect(await draft.flush()).toBe(false);
		expect(save).toHaveBeenCalledOnce();

		// keep mine: saved over whatever is stored
		draft.keepMine();
		await vi.runAllTimersAsync();
		expect(save).toHaveBeenCalledTimes(2);
		expect(sentStamp(1)).toBeUndefined();
		expect(draft.conflicted).toBe(false);
		expect(draft.busy).toBe(false);
	});

	test('loading the stored draft takes it and its stamp over', async () => {
		save
			.mockRejectedValueOnce(conflict())
			.mockResolvedValue({ draftUpdatedAt: new Date('2026-01-01T00:00:04.000Z') });
		read.mockResolvedValue({ draft: empty, draftUpdatedAt: new Date('2026-01-01T00:00:03.000Z') });
		const draft = createOutlineDraft({
			conferenceId: 'c',
			initial: empty,
			stamp: new Date('2026-01-01T00:00:00.000Z')
		});
		draft.change(one);
		await draft.flush();
		await draft.loadStored();
		expect(draft.outline).toEqual(empty);
		expect(draft.conflicted).toBe(false);
		draft.change(one);
		await draft.flush();
		expect(sentStamp(1)).toEqual(new Date('2026-01-01T00:00:03.000Z'));
	});

	test('replace takes over an outline saved elsewhere without saving it', async () => {
		const draft = createOutlineDraft({ conferenceId: 'c', initial: empty });
		draft.change(one);
		draft.replace(empty, new Date('2026-01-01T00:00:09.000Z'));
		await vi.runAllTimersAsync();
		expect(save).not.toHaveBeenCalled();
		expect(draft.outline).toEqual(empty);
		expect(draft.busy).toBe(false);
	});
});
