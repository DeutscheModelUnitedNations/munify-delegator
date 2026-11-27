/**
 * The bookkeeping of a form edited in place on the committees page: `draft` is what the fields
 * hold, `base` the stored values they started from. Values saved elsewhere replace both while the
 * fields hold no edit; an edit in progress is kept. Around the form's own save:
 *
 * - while the save runs, nothing is taken over: a live update may arrive before the save's answer,
 *   and an edit made meanwhile that happens to equal the old values must stay;
 * - after it, `base` is what was sent, and the stored values seen before the save (`stale`) are
 *   ignored until newer ones arrive (the save's answer may come before the live update). The first
 *   newer value ends that, so a later change back to the old values is taken over again.
 */

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export type InlineDraftState<D> = {
	draft: D;
	base: D;
	/** The stored values from before the form's last save, ignored until others arrive. */
	stale: D | undefined;
};

/**
 * The form's state once the stored values are `next`: the same object when nothing changes,
 * else a new one (with `next` itself as base and draft when it is taken over).
 */
export function onStored<D>({
	state,
	next,
	saving
}: {
	state: InlineDraftState<D>;
	next: D;
	saving: boolean;
}): InlineDraftState<D> {
	if (saving) return state;
	if (state.stale !== undefined && same(next, state.stale)) return state;
	const stale = undefined;
	if (same(state.draft, state.base) && !same(next, state.base)) {
		return { draft: next, base: next, stale };
	}
	return state.stale === undefined ? state : { ...state, stale };
}
