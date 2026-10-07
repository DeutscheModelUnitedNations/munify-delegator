/**
 * Counts the reviews saved in this browser. The backend's deck is not live, so the page asks for
 * it again whenever this changes; a live query over the reviews would do the same, but its updates
 * feeding an awaited derived trip Svelte's batching.
 */
export const reviewSaves = $state({ count: 0 });

export function reviewSaved() {
	reviewSaves.count += 1;
}
