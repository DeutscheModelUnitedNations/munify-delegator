import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Outline } from '#lib/guide/outline';

const save = vi.fn();
const toastError = vi.fn();
vi.mock('#lib/api/rumbleClient/client', () => ({
	client: { mutate: { updateGuideOutlineDraft: (args: unknown) => save(args) } }
}));
vi.mock('svelte-sonner', () => ({ toast: { error: (text: string) => toastError(text) } }));

const { createOutlineDraft } = await import('./outlineDraft.svelte');

const empty: Outline = { sections: [] };
const one: Outline = {
	sections: [{ id: 's', title: 'S', audience: { type: 'everyone' }, entries: [] }]
};

beforeEach(() => {
	vi.useFakeTimers();
	save.mockReset();
	toastError.mockReset();
});
afterEach(() => vi.useRealTimers());

describe('createOutlineDraft', () => {
	test('saves the whole outline shortly after the last change', async () => {
		save.mockResolvedValue(true);
		const draft = createOutlineDraft({ conferenceId: 'c', initial: empty });
		draft.change(one);
		draft.change({ ...one, sections: [] });
		expect(draft.busy).toBe(true);
		await vi.runAllTimersAsync();
		expect(save).toHaveBeenCalledOnce();
		expect(save).toHaveBeenCalledWith({ __args: { conferenceId: 'c', outline: { sections: [] } } });
		expect(draft.busy).toBe(false);
	});

	test('flush saves at once and only when something changed', async () => {
		save.mockResolvedValue(true);
		const draft = createOutlineDraft({ conferenceId: 'c', initial: empty });
		await draft.flush();
		expect(save).not.toHaveBeenCalled();
		draft.change(one);
		await draft.flush();
		expect(save).toHaveBeenCalledOnce();
		expect(draft.outline).toEqual(one);
	});

	test('keeps a failed change to save again, and says so', async () => {
		save.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(true);
		const draft = createOutlineDraft({ conferenceId: 'c', initial: empty });
		draft.change(one);
		await draft.flush();
		expect(toastError).toHaveBeenCalledOnce();
		expect(draft.busy).toBe(true);
		await draft.flush();
		expect(save).toHaveBeenCalledTimes(2);
		expect(draft.busy).toBe(false);
	});

	test('replace takes over an outline saved elsewhere without saving it', async () => {
		const draft = createOutlineDraft({ conferenceId: 'c', initial: empty });
		draft.change(one);
		draft.replace(empty);
		await vi.runAllTimersAsync();
		expect(save).not.toHaveBeenCalled();
		expect(draft.outline).toEqual(empty);
		expect(draft.busy).toBe(false);
	});
});
