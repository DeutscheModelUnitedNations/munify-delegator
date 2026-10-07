import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

const { DraftAutosave } = await import('./draftAutosave.svelte');

interface Draft {
	savedAt: number;
	text: string;
}

// A key of its own per test keeps drafts from leaking between them
let testIndex = 0;
let KEY = 'draft-test-0';
const DAY = 24 * 60 * 60 * 1000;

function setup(content: { value: string | undefined }, withReset = true) {
	const applied: Draft[] = [];
	const resetEditor = vi.fn();
	let draft!: InstanceType<typeof DraftAutosave<Draft, string>>;
	const cleanup = $effect.root(() => {
		draft = new DraftAutosave<Draft, string>(KEY, {
			readContent: () => content.value,
			toDraft: (text, savedAt) => ({ text, savedAt }),
			applyDraft: (d) => applied.push(d),
			resetEditor: withReset ? resetEditor : undefined
		});
	});
	return { draft, applied, resetEditor, cleanup };
}

function stored(): Draft | null {
	return JSON.parse(localStorage.getItem(KEY) ?? 'null');
}

beforeEach(() => {
	localStorage.clear();
	KEY = `draft-test-${++testIndex}`;
});
afterEach(() => vi.useRealTimers());

describe('DraftAutosave', () => {
	test('without a stored draft it resets the editor and offers nothing', () => {
		const { draft, resetEditor, cleanup } = setup({ value: undefined });
		expect(resetEditor).toHaveBeenCalledOnce();
		expect(draft.showRecoveryModal).toBe(false);
		cleanup();
	});

	test('a stale draft is dropped', () => {
		localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now() - 8 * DAY, text: 'old' }));
		const { draft, resetEditor, cleanup } = setup({ value: undefined });
		expect(resetEditor).toHaveBeenCalledOnce();
		expect(draft.showRecoveryModal).toBe(false);
		expect(stored()).toBeNull();
		cleanup();
	});

	test('a recent draft is offered, and restoring applies it and remounts', () => {
		const saved = { savedAt: Date.now() - DAY, text: 'mine' };
		localStorage.setItem(KEY, JSON.stringify(saved));
		const { draft, applied, resetEditor, cleanup } = setup({ value: 'x' });
		expect(resetEditor).not.toHaveBeenCalled();
		expect(draft.showRecoveryModal).toBe(true);
		expect(draft.savedDraft).toEqual(saved);

		// Nothing is saved while the modal is open
		draft.save();
		expect(stored()).toEqual(saved);

		draft.restore();
		expect(applied).toEqual([saved]);
		expect(draft.editorKey).toBe(1);
		expect(draft.showRecoveryModal).toBe(false);
		cleanup();
	});

	test('restore without a draft only closes the modal', () => {
		const { draft, applied, cleanup } = setup({ value: undefined });
		draft.showRecoveryModal = true;
		draft.restore();
		expect(applied).toEqual([]);
		expect(draft.editorKey).toBe(0);
		expect(draft.showRecoveryModal).toBe(false);
		cleanup();
	});

	test('starting fresh clears the draft and remounts an editor that can reset', () => {
		localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), text: 'mine' }));
		const { draft, resetEditor, cleanup } = setup({ value: undefined });
		draft.startFresh();
		expect(stored()).toBeNull();
		expect(resetEditor).toHaveBeenCalledOnce();
		expect(draft.editorKey).toBe(1);
		expect(draft.showRecoveryModal).toBe(false);
		cleanup();
	});

	test('starting fresh without a reset leaves the editor mounted', () => {
		localStorage.setItem(KEY, JSON.stringify({ savedAt: Date.now(), text: 'mine' }));
		const { draft, cleanup } = setup({ value: undefined }, false);
		draft.startFresh();
		expect(draft.editorKey).toBe(0);
		cleanup();
	});

	test('save stores changed content only', () => {
		vi.useFakeTimers({ now: 1000 });
		const content: { value: string | undefined } = { value: undefined };
		const { draft, cleanup } = setup(content);

		draft.save();
		expect(stored()).toBeNull();

		content.value = 'hello';
		draft.save();
		expect(stored()).toEqual({ text: 'hello', savedAt: 1000 });

		vi.setSystemTime(2000);
		draft.save();
		expect(stored()).toEqual({ text: 'hello', savedAt: 1000 });

		content.value = 'hello again';
		draft.save();
		expect(stored()).toEqual({ text: 'hello again', savedAt: 2000 });
		cleanup();
	});

	test('content that cannot be serialized is skipped', () => {
		const cyclic: Record<string, unknown> = {};
		cyclic.self = cyclic;
		let draft!: InstanceType<typeof DraftAutosave<{ savedAt: number }, unknown>>;
		const cleanup = $effect.root(() => {
			draft = new DraftAutosave<{ savedAt: number }, unknown>(KEY, {
				readContent: () => cyclic,
				toDraft: (_content, savedAt) => ({ savedAt }),
				applyDraft: () => {}
			});
		});
		draft.save();
		expect(stored()).toBeNull();
		cleanup();
	});
});
