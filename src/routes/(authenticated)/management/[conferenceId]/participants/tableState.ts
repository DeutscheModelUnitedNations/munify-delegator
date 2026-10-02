import type { ColumnFiltersState, ColumnVisibilityState } from '$lib/components/tanStackTable';

/** Conference states in which the table opens filtered to accepted participants. */
const statesWithDefaultAcceptedFilter = ['PREPARATION', 'ACTIVE', 'POST'];

/** Column filters from the URL; `undefined` when they cannot be read. */
export function parseColumnFilters(filtersParam: string): ColumnFiltersState | undefined {
	try {
		const parsed: unknown = JSON.parse(filtersParam);
		return Array.isArray(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/**
 * The filter a table without URL filters starts with: "accepted" in later conference states,
 * applied once until `defaultFilterApplied` is reset. `undefined` leaves the filters alone.
 */
export function defaultColumnFilters(
	defaultFilterApplied: boolean,
	conferenceState: string | null | undefined
): ColumnFiltersState | undefined {
	if (defaultFilterApplied || !conferenceState) return undefined;
	if (!statesWithDefaultAcceptedFilter.includes(conferenceState)) return undefined;
	return [{ id: 'accepted', value: true }];
}

interface VisibilityColumn {
	accessorKey?: unknown;
	id?: string;
	meta?: { defaultVisible: boolean };
}

/** Which columns show before anyone has configured them, from each column's meta. */
export function defaultColumnVisibility(
	columns: readonly VisibilityColumn[]
): ColumnVisibilityState {
	const defaults: ColumnVisibilityState = {};
	for (const col of columns) {
		const id = col.accessorKey ?? col.id;
		if (id && col.meta) defaults[String(id)] = col.meta.defaultVisible;
	}
	return defaults;
}

/**
 * The column visibility to start with: what was stored, else the defaults. A stored value that
 * cannot be read yields `undefined`, which leaves the current visibility alone.
 */
export function initialColumnVisibility(
	stored: string | null,
	columns: readonly VisibilityColumn[]
): ColumnVisibilityState | undefined {
	if (!stored) return defaultColumnVisibility(columns);
	try {
		return JSON.parse(stored);
	} catch {
		return undefined;
	}
}
