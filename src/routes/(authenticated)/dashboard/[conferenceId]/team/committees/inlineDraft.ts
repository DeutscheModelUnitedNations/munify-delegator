/**
 * The bookkeeping of a form edited in place on the committees page: `draft` is what the fields
 * hold, `base` the stored values they started from. Values saved elsewhere replace both while the
 * fields hold no edit; an edit in progress is kept. Around the form's own save:
 *
 * - while the save runs, nothing is taken over: a live update may arrive before the save's answer,
 *   and an edit made meanwhile that happens to equal the old values must stay;
 * - after it, `base` is what was sent, and the stored values seen before the save (`stale`) are
 *   ignored until newer ones arrive: the save's answer may come before the live update.
 */

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** What to replace `base` and `draft` with when new stored values arrive, or nothing. */
export function takeOverStored<D>({
	draft,
	base,
	next,
	stale,
	saving
}: {
	draft: D;
	base: D;
	/** The stored values as they are now. */
	next: D;
	/** The stored values from before the form's last save, ignored until others arrive. */
	stale: D | undefined;
	saving: boolean;
}): D | undefined {
	if (saving) return undefined;
	if (stale !== undefined && same(next, stale)) return undefined;
	if (!same(draft, base) || same(next, base)) return undefined;
	return next;
}
