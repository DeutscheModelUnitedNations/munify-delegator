import type { JSONContent } from '@tiptap/core';
import { draftSnapshotToSave, type DraftSaveState } from './reviewDraft';

/** What the review editor holds: its document and the verdict picked. */
export interface EditorState {
	comments: JSONContent;
	status: string;
}

/** A timestamp as the API answers it, in milliseconds. */
const timeOf = (value: Date | string) =>
	typeof value === 'string' ? Date.parse(value) : value.getTime();

type Verdict = NonNullable<ReturnType<typeof draftSnapshotToSave>>['status'];

/** What the server answered for a saved draft. */
export interface SavedDraft {
	updatedAt: Date | string;
	version: number;
}

/**
 * Saves the review editor's content as the reviewer's draft (`savePaperReviewDraft`) a moment
 * after the last change. One save runs at a time: a change made while one runs is saved right
 * after it, so the stored draft always ends up as the editor's latest state, an undo back to an
 * earlier text included. `flush` saves what is pending at once (leaving the paper), `settle`
 * waits for a running save and pauses (before discarding or submitting), `resume` picks up again.
 */
export function createDraftSaver({
	save,
	onSaved,
	delayMs = 1500
}: {
	save: (draft: { comments: JSONContent; status: Verdict }) => Promise<SavedDraft>;
	onSaved?: (saved: SavedDraft) => void;
	delayMs?: number;
}) {
	let state = $state<DraftSaveState>('idle');
	let knownUpdatedAt = $state<number | undefined>(undefined);
	let savedSnapshot: string | undefined;
	let latest: EditorState | undefined;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let running: Promise<void> | undefined;
	let paused = false;

	/** The latest state, when it differs from what is stored and is worth storing. */
	function pending() {
		if (!latest) return undefined;
		const toSave = draftSnapshotToSave({ ...latest, savedSnapshot });
		return toSave && { comments: latest.comments, ...toSave };
	}

	async function saveUntilCurrent() {
		for (let next = pending(); next && !paused; next = pending()) {
			state = 'saving';
			try {
				const saved = await save({ comments: next.comments, status: next.status });
				savedSnapshot = next.snapshot;
				knownUpdatedAt = timeOf(saved.updatedAt);
				state = 'saved';
				onSaved?.(saved);
			} catch {
				state = 'failed';
				return;
			}
		}
	}

	function run() {
		running ??= saveUntilCurrent().finally(() => (running = undefined));
		return running;
	}

	function schedule() {
		clearTimeout(timer);
		timer = setTimeout(run, delayMs);
	}

	return {
		get state() {
			return state;
		},
		/** When the stored draft was last written by this editor (or loaded into it). */
		get knownUpdatedAt() {
			return knownUpdatedAt;
		},
		/** Whether the editor holds something that is not stored yet. */
		get dirty() {
			return pending() !== undefined;
		},
		/** The editor changed: save it after a moment. */
		edited(editor: EditorState) {
			latest = editor;
			if (!paused) schedule();
		},
		/** Saves what is pending now, without waiting for the moment to pass. */
		flush() {
			clearTimeout(timer);
			return run();
		},
		/** Waits for a running save and starts no other until `resume`. */
		async settle() {
			clearTimeout(timer);
			paused = true;
			await running;
		},
		/** Saves again after `settle`, anything still pending first. */
		resume() {
			paused = false;
			if (pending()) schedule();
		},
		/** The editor now holds this stored draft: nothing to save for it. */
		loaded({ editor, updatedAt }: { editor: EditorState; updatedAt: Date | string }) {
			clearTimeout(timer);
			latest = editor;
			savedSnapshot = JSON.stringify(editor);
			knownUpdatedAt = timeOf(updatedAt);
		},
		/** The draft is gone (discarded or sent): forget it. */
		reset() {
			clearTimeout(timer);
			latest = undefined;
			savedSnapshot = undefined;
			knownUpdatedAt = undefined;
			state = 'idle';
		}
	};
}
