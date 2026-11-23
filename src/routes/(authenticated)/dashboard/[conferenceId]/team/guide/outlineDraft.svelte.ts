import { createContext } from 'svelte';
import { toast } from 'svelte-sonner';
import { client } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import { conflictMessageOf } from '#lib/api/errorCodes';
import { EMPTY_OUTLINE, parseOutline, type Outline } from '#lib/guide/outline';

/** How long the draft waits after the last change before it is saved. */
const SAVE_DELAY_MS = 700;

/** When the stored draft last changed (`draftUpdatedAt`), null before there is one. */
type Stamp = Date | string | null;

/**
 * The sidebar draft the workspace edits (`team/guide`): every tab changes it, and it saves itself
 * shortly after the last change. Saving writes the whole outline, like the MCP tool, naming the
 * stored draft it started from: when that changed elsewhere meanwhile (another tab, someone else,
 * an assistant), the save is refused and nothing is saved until the person loads the stored
 * draft or keeps theirs.
 */
export function createOutlineDraft({
	conferenceId,
	initial,
	stamp = null
}: {
	conferenceId: string;
	initial: Outline;
	stamp?: Stamp;
}) {
	let outline = $state<Outline>(initial);
	let unsaved = $state(false);
	let saving = $state(false);
	let conflicted = $state(false);
	let seen: Stamp = stamp;
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function loadStored() {
		const stored = await client.query.guideOutlineOf({
			__args: { conferenceId },
			draft: true,
			draftUpdatedAt: true
		});
		replace(
			stored ? parseOutline(stored.draft) : EMPTY_OUTLINE,
			stored ? stored.draftUpdatedAt : null
		);
	}

	function keepMine() {
		conflicted = false;
		seen = null;
		void flush();
	}

	function refused(message: string) {
		conflicted = true;
		toast.error(message, {
			duration: Number.POSITIVE_INFINITY,
			action: { label: m.guideOutlineLoadStored(), onClick: () => void loadStored() },
			cancel: { label: m.guideOutlineKeepMine(), onClick: keepMine }
		});
	}

	async function save() {
		unsaved = false;
		saving = true;
		try {
			const saved = await client.mutate.updateGuideOutlineDraft({
				__args: {
					conferenceId,
					outline: $state.snapshot(outline),
					// null: whatever is stored (the first save, or after "keep mine")
					expectedDraftUpdatedAt: seen === null ? undefined : new Date(seen)
				},
				draftUpdatedAt: true
			});
			seen = saved.draftUpdatedAt;
			return true;
		} catch (error) {
			unsaved = true;
			const conflict = conflictMessageOf(error);
			if (conflict) refused(conflict);
			else toast.error(m.guideSidebarSaveFailed());
			return false;
		} finally {
			saving = false;
		}
	}

	/** Saves what is pending now (e.g. before publishing); false when it could not. */
	async function flush() {
		clearTimeout(timer);
		// a change made while a save runs is saved by the loop once that save is back
		while (unsaved && !saving && !conflicted) {
			if (!(await save())) return false;
		}
		return !unsaved;
	}

	/** Takes over an outline saved elsewhere (a restored version, the stored draft). */
	function replace(next: Outline, stamp: Stamp) {
		clearTimeout(timer);
		outline = next;
		unsaved = false;
		conflicted = false;
		seen = stamp;
	}

	return {
		get outline() {
			return outline;
		},
		/** Changed here and not saved yet (or saving). */
		get busy() {
			return unsaved || saving;
		},
		/** The stored draft changed elsewhere; nothing is saved until the person chooses. */
		get conflicted() {
			return conflicted;
		},
		change(next: Outline) {
			outline = next;
			unsaved = true;
			clearTimeout(timer);
			if (!conflicted) timer = setTimeout(() => void flush(), SAVE_DELAY_MS);
		},
		flush,
		replace,
		loadStored,
		keepMine
	};
}

export type OutlineDraft = ReturnType<typeof createOutlineDraft>;

export const [getOutlineDraft, setOutlineDraft] = createContext<OutlineDraft>();
