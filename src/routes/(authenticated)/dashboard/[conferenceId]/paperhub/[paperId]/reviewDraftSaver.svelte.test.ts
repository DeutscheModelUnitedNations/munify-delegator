import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDraftSaver } from './reviewDraftSaver.svelte.js';

const doc = (text: string) => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});
const editor = (text: string) => ({ comments: doc(text), status: 'ACCEPTED' });

/** A save the test answers by hand, to put edits between a save and its answer. */
function controlledSave() {
	const calls: { text: string; answer: () => void; fail: () => void }[] = [];
	const save = vi.fn(
		({ comments }: { comments: { content?: { content?: { text?: string }[] }[] } }) =>
			new Promise<{ updatedAt: string; version: number }>((resolve, reject) => {
				calls.push({
					text: comments.content?.[0]?.content?.[0]?.text ?? '',
					answer: () => resolve({ updatedAt: new Date().toISOString(), version: 1 }),
					fail: () => reject(new Error('refused'))
				});
			})
	);
	return { save, calls };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('createDraftSaver', () => {
	it('saves a moment after the last change, once', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.edited(editor('A'));
		saver.edited(editor('AB'));
		await vi.advanceTimersByTimeAsync(1500);
		expect(calls.map((call) => call.text)).toEqual(['AB']);
		calls[0]?.answer();
		await vi.advanceTimersByTimeAsync(0);
		expect(saver.state).toBe('saved');
		expect(saver.dirty).toBe(false);
	});

	it('saves the latest state after a save that was overtaken, an undo included', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.loaded({ editor: editor('A'), updatedAt: new Date().toISOString() });
		saver.edited(editor('B'));
		await vi.advanceTimersByTimeAsync(1500);
		saver.edited(editor('A'));
		await vi.advanceTimersByTimeAsync(1500);
		expect(calls.map((call) => call.text)).toEqual(['B']);
		calls[0]?.answer();
		await vi.advanceTimersByTimeAsync(0);
		expect(calls.map((call) => call.text)).toEqual(['B', 'A']);
		calls[1]?.answer();
		await vi.advanceTimersByTimeAsync(0);
		expect(saver.dirty).toBe(false);
	});

	it('stops showing "saved" once the editor changes again', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.edited(editor('A'));
		await vi.advanceTimersByTimeAsync(1500);
		calls[0]?.answer();
		await vi.advanceTimersByTimeAsync(0);
		expect(saver.state).toBe('saved');
		saver.edited(editor('AB'));
		expect(saver.state).toBe('idle');
	});

	it('saves what is pending at once on flush', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.edited(editor('A'));
		void saver.flush();
		expect(calls.map((call) => call.text)).toEqual(['A']);
	});

	it('waits for a running save on settle and saves nothing until resume', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.edited(editor('A'));
		await vi.advanceTimersByTimeAsync(1500);
		const settled = saver.settle();
		let done = false;
		void settled.then(() => (done = true));
		await vi.advanceTimersByTimeAsync(0);
		expect(done).toBe(false);
		calls[0]?.answer();
		await vi.advanceTimersByTimeAsync(0);
		expect(done).toBe(true);
		saver.edited(editor('B'));
		await vi.advanceTimersByTimeAsync(5000);
		expect(calls).toHaveLength(1);
		saver.resume();
		await vi.advanceTimersByTimeAsync(1500);
		expect(calls.map((call) => call.text)).toEqual(['A', 'B']);
	});

	it('keeps an edit dirty when its save fails, and saves nothing after reset', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.edited(editor('A'));
		await vi.advanceTimersByTimeAsync(1500);
		calls[0]?.fail();
		await vi.advanceTimersByTimeAsync(0);
		expect(saver.state).toBe('failed');
		expect(saver.dirty).toBe(true);
		saver.reset();
		expect(saver.dirty).toBe(false);
		saver.resume();
		await vi.advanceTimersByTimeAsync(5000);
		expect(calls).toHaveLength(1);
	});

	it('does not save what it loaded, nor an empty editor', async () => {
		const { save } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.loaded({ editor: editor('A'), updatedAt: new Date().toISOString() });
		saver.edited(editor('A'));
		saver.edited({
			comments: { type: 'doc', content: [{ type: 'paragraph' }] },
			status: 'ACCEPTED'
		});
		await vi.advanceTimersByTimeAsync(5000);
		expect(save).not.toHaveBeenCalled();
	});
});
