import { createContext } from 'svelte';
import { toast } from 'svelte-sonner';
import { client } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import { conflictMessageOf } from '#lib/api/errorCodes';
import type { Outline } from '#lib/guide/outline';

/** How long the draft waits after the last change before it is saved. */
const SAVE_DELAY_MS = 700;

/**
 * The sidebar draft the workspace edits (`team/guide`): every tab changes it, and it saves itself
 * shortly after the last change. Saving writes the whole outline, like the MCP tool.
 */
export function createOutlineDraft({
	conferenceId,
	initial
}: {
	conferenceId: string;
	initial: Outline;
}) {
	let outline = $state<Outline>(initial);
	let unsaved = $state(false);
	let saving = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function flush() {
		clearTimeout(timer);
		// a change made while a save runs is saved by the loop once that save is back
		while (unsaved && !saving) {
			unsaved = false;
			saving = true;
			try {
				await client.mutate.updateGuideOutlineDraft({
					__args: { conferenceId, outline: $state.snapshot(outline) }
				});
			} catch (error) {
				unsaved = true;
				toast.error(conflictMessageOf(error) ?? m.guideSidebarSaveFailed());
				return;
			} finally {
				saving = false;
			}
		}
	}

	return {
		get outline() {
			return outline;
		},
		/** Changed here and not saved yet (or saving). */
		get busy() {
			return unsaved || saving;
		},
		change(next: Outline) {
			outline = next;
			unsaved = true;
			clearTimeout(timer);
			timer = setTimeout(() => void flush(), SAVE_DELAY_MS);
		},
		/** Saves what is pending now, e.g. before publishing. */
		flush,
		/** Takes over an outline saved elsewhere (a restored version). */
		replace(next: Outline) {
			clearTimeout(timer);
			outline = next;
			unsaved = false;
		}
	};
}

export type OutlineDraft = ReturnType<typeof createOutlineDraft>;

export const [getOutlineDraft, setOutlineDraft] = createContext<OutlineDraft>();
