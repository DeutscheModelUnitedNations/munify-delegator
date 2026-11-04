import type { FilterCondition, FilterRoot } from '#lib/dataGrid/stateSchema';
import type { BaseView } from '#lib/dataGrid/tableState';

/**
 * The participants' quick filters in the toolbar ("waiting list", "open issues"): each is a few
 * conditions at the top of the filter, joined by AND with whatever else the filter says.
 */
export interface QuickFilter {
	/** The conditions it sets */
	conditions: readonly FilterCondition[];
	/** The columns whose top-level conditions it replaces (its own and the ones it contradicts) */
	replaces: readonly string[];
}

const isTrue = (column: string): FilterCondition => ({
	type: 'condition',
	column,
	operator: 'isTrue'
});

/** Accepted participants with an open issue. */
export const OPEN_ISSUES: QuickFilter = {
	conditions: [isTrue('accepted'), isTrue('hasOpenIssue')],
	replaces: ['accepted', 'hasOpenIssue', 'onWaitingList']
};

/** Everyone still waiting for a seat; "accepted" would hide them. */
export const WAITING_LIST: QuickFilter = {
	conditions: [isTrue('onWaitingList')],
	replaces: ['accepted', 'hasOpenIssue', 'onWaitingList']
};

/** Whether the quick filter is on: each of its conditions is at the top of the filter. */
export function isQuickFilterOn({ filter, quick }: { filter: FilterRoot; quick: QuickFilter }) {
	return (
		filter.op === 'and' &&
		quick.conditions.every((wanted) =>
			filter.items.some(
				(item) =>
					item.type === 'condition' &&
					item.column === wanted.column &&
					item.operator === wanted.operator
			)
		)
	);
}

/**
 * The filter with the quick filter switched on or off. On, the top level becomes AND (what an OR
 * held moves into a group of its own) and the quick filter's conditions replace the ones on its
 * columns; off, they go.
 */
export function toggleQuickFilter({
	filter,
	quick,
	on
}: {
	filter: FilterRoot;
	quick: QuickFilter;
	on: boolean;
}): FilterRoot {
	const kept = filter.items.filter(
		(item) => item.type !== 'condition' || !quick.replaces.includes(item.column)
	);
	if (!on) return { ...filter, items: kept };
	const conditions = kept.filter((item) => item.type === 'condition');
	const groups = kept.filter((item) => item.type === 'group');
	const rest =
		filter.op === 'or' && conditions.length > 1
			? [{ type: 'group' as const, op: 'or' as const, items: conditions }, ...groups]
			: kept;
	return { type: 'group', op: 'and', items: [...rest, ...quick.conditions] };
}

/** Conference states in which the table opens on accepted participants. */
const STATES_SHOWING_ACCEPTED = ['PREPARATION', 'ACTIVE', 'POST'];

/** The table's base view: by family name, and only the accepted once the conference is underway. */
export function participantsBase(conferenceState: string | null | undefined): BaseView {
	const accepted =
		conferenceState !== null &&
		conferenceState !== undefined &&
		STATES_SHOWING_ACCEPTED.includes(conferenceState);
	return {
		sorting: [{ id: 'family_name', desc: false }],
		filter: { type: 'group', op: 'and', items: accepted ? [isTrue('accepted')] : [] },
		pageSize: 20
	};
}
