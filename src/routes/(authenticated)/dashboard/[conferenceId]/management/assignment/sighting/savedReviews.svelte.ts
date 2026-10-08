import { SvelteMap } from 'svelte/reactivity';
import { client } from '$lib/api/rumbleClient/client';
import { reviewArgs, type SightingReview } from '$lib/assignment/sighting';
import { toastError } from '../toastError';

/**
 * The reviews this browser saved, by application id, laid over what the page read from the
 * backend. A review shows the moment it is given, not once the backend has answered; the reviews
 * read before stay valid, so the cards warmed in advance stay warm after every rating.
 *
 * Only ever written by somebody clicking in the browser, so the server's copy of this module, which
 * every request shares, stays empty.
 */
const saved = new SvelteMap<string, SightingReview>();
/** The latest save per application: an answer to an earlier one must not undo a later one. */
const latest = new SvelteMap<string, number>();
let saves = 0;

/** What this browser last saved for an application, if anything. */
export function savedReview(id: string) {
	return saved.get(id);
}

/**
 * Saves a change to an application's review: shown at once, and taken back with a toast if the
 * backend refuses it. `review` is the one shown, so quick changes build on each other. Resolves
 * with the review the backend stored, or `undefined` when it failed or a later save took over.
 */
export async function saveReview(
	kind: 'delegation' | 'single',
	id: string,
	review: SightingReview | undefined,
	change: Partial<SightingReview>
): Promise<SightingReview | undefined> {
	const save = ++saves;
	latest.set(id, save);
	const before = saved.get(id);
	saved.set(id, { flagged: false, disqualified: false, ...review, ...change });
	try {
		const stored = await client.mutate.setAssignmentReview({
			__args: reviewArgs(kind, id, review, change),
			evaluation: true,
			flagged: true,
			disqualified: true,
			note: true
		});
		if (latest.get(id) !== save) return undefined;
		const result = {
			evaluation: stored.evaluation,
			flagged: stored.flagged,
			disqualified: stored.disqualified,
			note: stored.note
		};
		saved.set(id, result);
		return result;
	} catch (error) {
		if (latest.get(id) === save) {
			if (before) saved.set(id, before);
			else saved.delete(id);
		}
		toastError(error);
		return undefined;
	}
}
