/**
 * The checklist a participant goes through before agreeing to the message service's terms: every
 * section is opened and confirmed on its own, then the statements can be ticked. The terms
 * themselves are the API's (`messagingTerms`); this is only the walk through them.
 */

interface Checklist {
	/** The sections' keys, in order. */
	keys: readonly string[];
	/** The keys confirmed so far. */
	done: readonly string[];
}

/** The first section not confirmed yet, which the checklist opens next; null once all are. */
export function nextOpenSection({ keys, done }: Checklist) {
	return keys.find((key) => !done.includes(key)) ?? null;
}

/** Confirms `key`: what is done afterwards, and which section opens next. */
export function confirmSection({ keys, done, key }: Checklist & { key: string }) {
	const nowDone = done.includes(key) ? [...done] : [...done, key];
	return { done: nowDone, open: nextOpenSection({ keys, done: nowDone }) };
}

/** Whether every section is confirmed, so the statements can be ticked. */
export function allSectionsConfirmed({ keys, done }: Checklist) {
	return keys.every((key) => done.includes(key));
}
