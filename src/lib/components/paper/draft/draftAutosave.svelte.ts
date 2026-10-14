import { browser } from '$app/environment';
import { createPersistedState } from '$lib/state/persistedState.svelte';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface DraftAutosaveOptions<D extends { savedAt: number }, C> {
	/** The editor's current content, or `undefined` when there is nothing worth saving. */
	readContent: () => C | undefined;
	/** The draft to persist for a plain JSON copy of that content, with the current form fields. */
	toDraft: (content: C, savedAt: number) => D;
	/** Puts a recovered draft back into the editor and the form. */
	applyDraft: (draft: D) => void;
	/**
	 * Empties the editor. Called before it mounts when there is no draft to offer, and when the
	 * person chooses to start fresh. Editors that start empty anyway leave it out.
	 */
	resetEditor?: () => void;
}

export type DraftAutosave<D extends { savedAt: number }, C> = ReturnType<
	typeof createDraftAutosave<D, C>
>;

/** A plain JSON snapshot of the editor's content, or nothing when there is none or it cannot be serialised. */
function snapshot(rawContent: unknown): string | undefined {
	if (rawContent === undefined) return undefined;
	try {
		return JSON.stringify(rawContent);
	} catch {
		return undefined;
	}
}

/**
 * A paper or review being written, mirrored to localStorage every second so a closed tab does not
 * lose it. On creation it looks for a draft younger than seven days and, if there is one, opens the
 * recovery modal (`DraftRecoveryModal`) before the editor mounts. Must be called during component
 * initialisation: it registers the autosave effect.
 */
export function createDraftAutosave<D extends { savedAt: number }, C>(
	storageKey: string,
	options: DraftAutosaveOptions<D, C>
) {
	let showRecoveryModal = $state(false);
	let savedDraft: D | null = $state(null);
	/** Bumped to remount the editor (`{#key}`) when its content is replaced from outside. */
	let editorKey = $state(0);

	const store = browser ? createPersistedState<D | null>(storageKey, null) : null;
	let lastSavedContent: string | null = null;

	/** Forgets the stored draft, e.g. once the paper or review it held has been saved for real. */
	function clear() {
		if (store) store.current = null;
	}

	function save() {
		if (!store || showRecoveryModal) return;

		const contentString = snapshot(options.readContent());
		if (contentString === undefined) return;

		// Skip if content hasn't changed
		if (contentString === lastSavedContent) return;
		lastSavedContent = contentString;

		const content: C = JSON.parse(contentString);
		store.current = options.toDraft(content, Date.now());
	}

	function loadStoredDraft() {
		const storedDraft = store?.current ?? null;
		if (!storedDraft) {
			options.resetEditor?.();
			return;
		}
		if (Date.now() - storedDraft.savedAt > SEVEN_DAYS_MS) {
			clear();
			options.resetEditor?.();
			return;
		}
		savedDraft = storedDraft;
		showRecoveryModal = true;
	}

	// Synchronously, so the editor mounts with the right content
	loadStoredDraft();

	$effect(() => {
		if (!store) return;
		const interval = setInterval(() => save(), 1000);
		// Safety net: save on page unload
		const handleBeforeUnload = () => save();
		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => {
			clearInterval(interval);
			window.removeEventListener('beforeunload', handleBeforeUnload);
		};
	});

	return {
		get showRecoveryModal() {
			return showRecoveryModal;
		},
		set showRecoveryModal(value: boolean) {
			showRecoveryModal = value;
		},
		get savedDraft() {
			return savedDraft;
		},
		set savedDraft(value: D | null) {
			savedDraft = value;
		},
		get editorKey() {
			return editorKey;
		},
		set editorKey(value: number) {
			editorKey = value;
		},

		restore() {
			if (savedDraft) {
				options.applyDraft(savedDraft);
				editorKey++;
			}
			showRecoveryModal = false;
		},

		startFresh() {
			clear();
			if (options.resetEditor) {
				options.resetEditor();
				editorKey++;
			}
			showRecoveryModal = false;
		},

		clear,
		save
	};
}
