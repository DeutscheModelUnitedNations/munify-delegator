import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDraftSaver } from './reviewDraftSaver.svelte.js';

const doc = (text: string) => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});
const editor = (text: string) => ({ comments: doc(text), status: 'ACCEPTED' });

/** A save the test answers by hand, to put edits between a save and its answer. */
function controlledSave() {
	const calls: {
		text: string;
		expected: number | undefined;
		answer: (updatedAt?: string) => void;
		fail: () => void;
		conflict: () => void;
	}[] = [];
	const save = vi.fn(
		({
			comments,
			expectedUpdatedAt
		}: {
			comments: { content?: { content?: { text?: string }[] }[] };
			expectedUpdatedAt: number | undefined;
		}) =>
			new Promise<{ updatedAt: string; version: number }>((resolve, reject) => {
				calls.push({
					text: comments.content?.[0]?.content?.[0]?.text ?? '',
					expected: expectedUpdatedAt,
					answer: (updatedAt = new Date().toISOString()) => resolve({ updatedAt, version: 1 }),
					fail: () => reject(new Error('refused')),
					conflict: () => reject(CONFLICT)
				});
			})
	);
	return { save, calls };
}

const CONFLICT = new Error('changed elsewhere');
const isConflict = (error: unknown) => error === CONFLICT;

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

	it('tells onSaved only about saves the server confirmed', async () => {
		const { save, calls } = controlledSave();
		const onSaved = vi.fn();
		const saver = createDraftSaver({ save, onSaved });
		saver.edited(editor('A'));
		await vi.advanceTimersByTimeAsync(1500);
		calls[0]?.fail();
		await vi.advanceTimersByTimeAsync(0);
		expect(onSaved).not.toHaveBeenCalled();
		saver.edited(editor('AB'));
		await vi.advanceTimersByTimeAsync(1500);
		calls[1]?.answer();
		await vi.advanceTimersByTimeAsync(0);
		expect(onSaved).toHaveBeenCalledTimes(1);
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

	it('waits while a rewrite elsewhere is undecided, and replaces it once acknowledged', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.loaded({ editor: editor('A'), updatedAt: '2026-11-18T10:00:00.000Z' });
		await saver.settle();
		saver.edited(editor('AB'));
		await vi.advanceTimersByTimeAsync(5000);
		expect(calls).toHaveLength(0);
		saver.acknowledge('2026-11-18T11:00:00.000Z');
		expect(saver.knownUpdatedAt).toBe(Date.parse('2026-11-18T11:00:00.000Z'));
		saver.resume();
		await vi.advanceTimersByTimeAsync(1500);
		expect(calls.map((call) => call.text)).toEqual(['AB']);
	});

	it('writes the unchanged editor once a rewrite elsewhere is acknowledged', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.loaded({ editor: editor('A'), updatedAt: '2026-11-18T10:00:00.000Z' });
		await saver.settle();
		saver.acknowledge('2026-11-18T11:00:00.000Z');
		saver.resume();
		await vi.advanceTimersByTimeAsync(1500);
		expect(calls.map((call) => call.text)).toEqual(['A']);
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

	it('names the draft it last saw with every save', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save });
		saver.edited(editor('A'));
		await vi.advanceTimersByTimeAsync(1500);
		expect(calls[0]?.expected).toBeUndefined();
		calls[0]?.answer('2026-11-19T10:00:00.000Z');
		await vi.advanceTimersByTimeAsync(0);
		saver.edited(editor('AB'));
		await vi.advanceTimersByTimeAsync(1500);
		expect(calls[1]?.expected).toBe(Date.parse('2026-11-19T10:00:00.000Z'));
	});

	it('stops saving after a conflict until the reviewer chose', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save, isConflict });
		saver.loaded({ editor: editor('A'), updatedAt: '2026-11-19T10:00:00.000Z' });
		saver.edited(editor('AB'));
		await vi.advanceTimersByTimeAsync(1500);
		calls[0]?.conflict();
		await vi.advanceTimersByTimeAsync(0);
		expect(saver.state).toBe('conflict');

		// further edits and a resume (a submission refused) save nothing
		saver.edited(editor('ABC'));
		expect(saver.state).toBe('conflict');
		saver.resume();
		await vi.advanceTimersByTimeAsync(5000);
		expect(calls).toHaveLength(1);

		// keeping the editor's version replaces the draft stored now
		saver.acknowledge('2026-11-19T11:00:00.000Z');
		saver.resume();
		await vi.advanceTimersByTimeAsync(1500);
		expect(calls[1]).toMatchObject({
			text: 'ABC',
			expected: Date.parse('2026-11-19T11:00:00.000Z')
		});
	});

	it('expects no draft once the one it knew is gone', async () => {
		const { save, calls } = controlledSave();
		const saver = createDraftSaver({ save, isConflict });
		saver.loaded({ editor: editor('A'), updatedAt: '2026-11-19T10:00:00.000Z' });
		saver.edited(editor('AB'));
		await vi.advanceTimersByTimeAsync(1500);
		calls[0]?.conflict();
		await vi.advanceTimersByTimeAsync(0);
		saver.acknowledge(null);
		saver.resume();
		await vi.advanceTimersByTimeAsync(1500);
		expect(calls[1]?.expected).toBeUndefined();
	});
});
