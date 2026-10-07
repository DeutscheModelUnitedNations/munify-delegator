import { browser } from '$app/environment';
import { PersistedState } from '$lib/state/persistedState.svelte';

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

/**
 * A paper or review being written, mirrored to localStorage every second so a closed tab does not
 * lose it. On creation it looks for a draft younger than seven days and, if there is one, opens the
 * recovery modal (`DraftRecoveryModal`) before the editor mounts. Must be created during component
 * initialisation: it registers the autosave effect.
 */
export class DraftAutosave<D extends { savedAt: number }, C> {
	showRecoveryModal = $state(false);
	savedDraft: D | null = $state(null);
	/** Bumped to remount the editor (`{#key}`) when its content is replaced from outside. */
	editorKey = $state(0);

	#store: PersistedState<D | null> | null;
	#options: DraftAutosaveOptions<D, C>;
	#lastSavedContent: string | null = null;

	constructor(storageKey: string, options: DraftAutosaveOptions<D, C>) {
		this.#options = options;
		this.#store = browser ? new PersistedState<D | null>(storageKey, null) : null;
		// Synchronously, so the editor mounts with the right content
		this.#loadStoredDraft();

		$effect(() => {
			if (!this.#store) return;
			const interval = setInterval(() => this.save(), 1000);
			// Safety net: save on page unload
			const handleBeforeUnload = () => this.save();
			window.addEventListener('beforeunload', handleBeforeUnload);
			return () => {
				clearInterval(interval);
				window.removeEventListener('beforeunload', handleBeforeUnload);
			};
		});
	}

	#loadStoredDraft() {
		const storedDraft = this.#store?.current ?? null;
		if (!storedDraft) {
			this.#options.resetEditor?.();
			return;
		}
		if (Date.now() - storedDraft.savedAt > SEVEN_DAYS_MS) {
			this.clear();
			this.#options.resetEditor?.();
			return;
		}
		this.savedDraft = storedDraft;
		this.showRecoveryModal = true;
	}

	restore() {
		if (this.savedDraft) {
			this.#options.applyDraft(this.savedDraft);
			this.editorKey++;
		}
		this.showRecoveryModal = false;
	}

	startFresh() {
		this.clear();
		if (this.#options.resetEditor) {
			this.#options.resetEditor();
			this.editorKey++;
		}
		this.showRecoveryModal = false;
	}

	/** Forgets the stored draft, e.g. once the paper or review it held has been saved for real. */
	clear() {
		if (this.#store) this.#store.current = null;
	}

	save() {
		if (!this.#store || this.showRecoveryModal) return;

		const rawContent = this.#options.readContent();
		if (rawContent === undefined) return;

		// Stringify to create a plain JSON snapshot
		let contentString: string;
		try {
			contentString = JSON.stringify(rawContent);
		} catch {
			return;
		}

		// Skip if content hasn't changed
		if (contentString === this.#lastSavedContent) return;
		this.#lastSavedContent = contentString;

		const content: C = JSON.parse(contentString);
		this.#store.current = this.#options.toDraft(content, Date.now());
	}
}
