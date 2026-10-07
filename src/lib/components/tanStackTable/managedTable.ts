import {
	autoFilterFns,
	autoSortFns,
	columnFilteringFeature,
	columnFacetingFeature,
	columnVisibilityFeature,
	createFacetedMinMaxValues,
	createFacetedRowModel,
	createFacetedUniqueValues,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	globalFilteringFeature,
	rowPaginationFeature,
	rowSortingFeature,
	tableFeatures,
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnVisibilityState,
	type SortingState
} from '$lib/components/tanStackTable';
import type { FilterType } from './filters';

/** Everything `ManagedTable` uses, and the row models that implement it. */
export const managedTableFeatures = tableFeatures({
	rowSortingFeature,
	columnFilteringFeature,
	globalFilteringFeature,
	rowPaginationFeature,
	columnVisibilityFeature,
	columnFacetingFeature,
	sortedRowModel: createSortedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	facetedRowModel: createFacetedRowModel(),
	facetedUniqueValues: createFacetedUniqueValues(),
	facetedMinMaxValues: createFacetedMinMaxValues(),
	filterFns: autoFilterFns,
	sortFns: autoSortFns
});

export type ManagedTableFeatures = typeof managedTableFeatures;

/**
 * How a column can be filtered, from the filter drawer. Which control the drawer shows follows
 * `type`, and so does the filter function, so a column only says what kind of values it holds.
 */
export type ColumnFilter = {
	/** Explains the filter, under the column's name in the drawer */
	hint?: string;
	/** Offered in the drawer while the column itself is hidden */
	alwaysAvailable?: boolean;
} & (
	| { type: Extract<FilterType, 'text' | 'boolean' | 'range'> }
	| {
			type: Extract<FilterType, 'enum'>;
			/** The text of one of the column's values; the value itself where left out */
			label?: (value: string) => string;
	  }
);

/**
 * A column of a `ManagedTable`. Its accessor is what gets sorted and searched. A column that
 * renders something other than its accessor's value (a component, a translated enum) can say what
 * the export should contain with `exportValue`; a column with neither is left out of the export.
 */
export type ManagedColumn<TData extends object> = ColumnDef<ManagedTableFeatures, TData> & {
	exportValue?: (row: TData) => string;
	/** Makes the column filterable, and picks how */
	filter?: ColumnFilter;
	/** Heading the column is listed under in the filter and column drawers */
	group?: string;
	/** Explains the column in the column drawer, where its header does not say enough */
	description?: string;
	/** Whether the column shows until someone configures the columns; shown where left out */
	defaultVisible?: boolean;
};

/** The text a column is headed with; empty for a column without one, such as an actions column. */
export function columnHeaderOf<TData extends object>(column: ManagedColumn<TData>): string {
	return typeof column.header === 'string' ? column.header : '';
}

/** The id a column is known by in the table's state: its own, or else its accessor key. */
export function columnIdOf<TData extends object>(column: ManagedColumn<TData>): string | undefined {
	if (column.id) return column.id;
	return 'accessorKey' in column && typeof column.accessorKey === 'string'
		? column.accessorKey
		: undefined;
}

/** What a table export contains: one heading per column, one text cell per column and row. */
export interface TableExport {
	header: string[];
	data: string[][];
}

const exportDateFormat = new Intl.DateTimeFormat(undefined, {
	dateStyle: 'medium',
	timeStyle: 'short'
});

function exportText(value: unknown, yes: string, no: string): string {
	if (value === null || value === undefined) return '';
	if (typeof value === 'boolean') return value ? yes : no;
	if (value instanceof Date) return exportDateFormat.format(value);
	return String(value);
}

/**
 * The plain text of a table's columns for the rows given, in column order. The same text the
 * table shows where it can be told, so an export reads like the screen rather than like the
 * row objects behind it.
 */
export function tableExport<TData extends object>(
	columns: readonly ManagedColumn<TData>[],
	rows: readonly TData[],
	labels: { yes: string; no: string }
): TableExport {
	const exported = columns.flatMap((column) => {
		const header = typeof column.header === 'string' ? column.header : (column.id ?? '');
		let value: ((row: TData, index: number) => string) | undefined;
		if (column.exportValue) {
			const exportValue = column.exportValue;
			value = (row) => exportValue(row);
		} else if ('accessorFn' in column && column.accessorFn) {
			const accessorFn = column.accessorFn;
			value = (row, index) => exportText(accessorFn(row, index), labels.yes, labels.no);
		} else if ('accessorKey' in column && typeof column.accessorKey === 'string') {
			const key = column.accessorKey;
			value = (row) => exportText(Reflect.get(row, key), labels.yes, labels.no);
		}
		return value ? [{ header, value }] : [];
	});
	return {
		header: exported.map((column) => column.header),
		data: rows.map((row, index) => exported.map((column) => column.value(row, index)))
	};
}

/**
 * The one row a filter from the URL narrowed the table down to, which the table then selects on
 * its own; `undefined` unless the filter is set and matched exactly one row.
 */
export function soleFilteredRow<R>(
	rows: readonly R[],
	queryParamKey: string | undefined,
	searchParams: URLSearchParams
): R | undefined {
	if (rows.length !== 1 || !queryParamKey) return undefined;
	return searchParams.get(queryParamKey) ? rows[0] : undefined;
}

/** Column filters from the URL; `undefined` when they cannot be read. */
export function parseColumnFilters(filtersParam: string): ColumnFiltersState | undefined {
	try {
		const parsed: unknown = JSON.parse(filtersParam);
		return Array.isArray(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/** Which columns show before anyone has configured them, from each column's `defaultVisible`. */
export function defaultColumnVisibility<TData extends object>(
	columns: readonly ManagedColumn<TData>[]
): ColumnVisibilityState {
	const defaults: ColumnVisibilityState = {};
	for (const column of columns) {
		const id = columnIdOf(column);
		if (id && column.defaultVisible !== undefined) defaults[id] = column.defaultVisible;
	}
	return defaults;
}

/**
 * The column visibility to start with: what was stored, else the defaults. A stored value that
 * cannot be read yields `undefined`, which leaves the current visibility alone.
 */
export function initialColumnVisibility<TData extends object>(
	stored: string | null,
	columns: readonly ManagedColumn<TData>[]
): ColumnVisibilityState | undefined {
	if (!stored) return defaultColumnVisibility(columns);
	try {
		return JSON.parse(stored);
	} catch {
		return undefined;
	}
}

/** What `queryParameters` of sveltekit-search-params asks of a codec (its own type is not exported). */
interface UrlCodec<T> {
	encode: (value: T) => string | undefined;
	decode: (value: string | null) => T | null;
}

/**
 * How the table's state is written into the URL, so a copied link shows what the sender saw. The
 * codecs are for `queryParameters`: a value that cannot be read decodes to `null`, which is the
 * same as the parameter missing.
 */

/** `?filters=` holds the column filters as JSON; an empty list is `[]`, which is not "no filters". */
export const filtersParam: UrlCodec<ColumnFiltersState> = {
	encode: (filters) => JSON.stringify(filters),
	decode: (value) => (value ? (parseColumnFilters(value) ?? null) : null)
};

/** `?sort=family_name,-email`: the sorted columns in order, a leading `-` for descending. */
export const sortingParam: UrlCodec<SortingState> = {
	encode: (sorting) =>
		sorting.length === 0 ? 'none' : sorting.map(({ id, desc }) => (desc ? `-${id}` : id)).join(','),
	decode: (value) => {
		if (!value) return null;
		if (value === 'none') return [];
		return value
			.split(',')
			.filter(Boolean)
			.map((entry) =>
				entry.startsWith('-') ? { id: entry.slice(1), desc: true } : { id: entry, desc: false }
			);
	}
};

/** `?columns=a,b,c`: the ids of the columns that are shown. */
export const shownColumnsParam: UrlCodec<string[]> = {
	encode: (ids) => ids.join(','),
	decode: (value) => (value === null ? null : value.split(',').filter(Boolean))
};

/** The visibility a list of shown columns means: those listed show, every other column hides. */
export function visibilityFromShown<TData extends object>(
	columns: readonly ManagedColumn<TData>[],
	shown: readonly string[]
): ColumnVisibilityState {
	const visibility: ColumnVisibilityState = {};
	for (const column of columns) {
		const id = columnIdOf(column);
		if (id !== undefined) visibility[id] = shown.includes(id);
	}
	return visibility;
}

/** The ids of the shown columns, in column order; columns not mentioned in the state show. */
export function shownFromVisibility<TData extends object>(
	columns: readonly ManagedColumn<TData>[],
	visibility: ColumnVisibilityState
): string[] {
	return columns.flatMap((column) => {
		const id = columnIdOf(column);
		return id !== undefined && visibility[id] !== false ? [id] : [];
	});
}

/** Whether two sortings are the same, column by column. */
export function sameSorting(a: SortingState, b: SortingState): boolean {
	return (
		a.length === b.length && a.every((entry, i) => entry.id === b[i].id && entry.desc === b[i].desc)
	);
}
