import { z } from 'zod';

/**
 * The state of a data grid as a saved view and the URL hold it, checked by the same schema in the
 * browser (reading the URL or a view) and in the API (storing a view, running a query). Whatever
 * does not fit is dropped for the table's base view: a broken link shows a table, not an error.
 *
 * The search and the current page are not part of it: they are moments, not a view.
 *
 * `v` is the format's version. When it changes, `parseTableState` learns to lift the old one, so
 * saved views keep loading.
 */

/** The longest a stored state may be as JSON: a view is configuration, not data. */
export const MAX_TABLE_STATE_LENGTH = 20_000;

/** The most conditions and groups a filter holds, counted together. */
export const MAX_FILTER_ITEMS = 50;

/** The most levels rows can be grouped by. */
export const MAX_GROUP_LEVELS = 3;

/** The most columns a table sorts by at once. */
const MAX_SORT_COLUMNS = 5;

/** The page sizes on offer; a state may name any size within the bounds of the schema. */
export const PAGE_SIZES = [20, 50, 100, 250] as const;

const columnId = z.string().min(1).max(80);
const scalar = z.union([z.string().max(500), z.number(), z.boolean(), z.null()]);

/**
 * A condition's value. Which shape applies follows from the operator (`operators.ts`): a text, a
 * number, a list of options, or a record (a range `{ from, to }`, a relative span
 * `{ amount, unit }`).
 */
const filterValue = z.union([
	scalar,
	z.array(z.union([z.string().max(200), z.number()])).max(200),
	z.record(z.string().max(40), scalar)
]);

const filterConditionSchema = z.object({
	type: z.literal('condition'),
	column: columnId,
	operator: z.string().min(1).max(40),
	value: filterValue.optional()
});

const connectiveSchema = z.enum(['and', 'or']);

/** A group holds conditions only: filters nest exactly one level. */
const filterGroupSchema = z.object({
	type: z.literal('group'),
	op: connectiveSchema,
	items: z.array(filterConditionSchema).max(MAX_FILTER_ITEMS)
});

/** The top level: conditions and groups, joined by AND or OR. */
const filterRootSchema = z.object({
	type: z.literal('group'),
	op: connectiveSchema,
	items: z.array(z.union([filterConditionSchema, filterGroupSchema])).max(MAX_FILTER_ITEMS)
});

const sortingSchema = z.array(z.object({ id: columnId, desc: z.boolean() })).max(MAX_SORT_COLUMNS);

export const DATE_BUCKETS = ['day', 'month', 'year'] as const;

/**
 * One level of grouping. A date column groups by `bucket` (the month where left out), a number
 * column by its value, or in ranges `step` wide.
 */
const groupBySchema = z.object({
	column: columnId,
	bucket: z.enum(DATE_BUCKETS).optional(),
	step: z.number().int().min(1).max(1_000_000).optional()
});

const groupingSchema = z.array(groupBySchema).max(MAX_GROUP_LEVELS);

/**
 * Which groups show their rows: all but the `toggled` ones when `collapsed` is false, only the
 * `toggled` ones when it is true. "Expand all" and "collapse all" set `collapsed` and clear the
 * exceptions. Groups are named by `groupKey`.
 */
const groupDisplaySchema = z.object({
	collapsed: z.boolean(),
	toggled: z.array(z.string().max(1000)).max(500)
});

export const tableStateSchema = z.object({
	v: z.literal(1),
	/** Only departures from each column's default, so a new column shows with its default */
	visibility: z.record(columnId, z.boolean()),
	order: z.array(columnId).max(200),
	sizes: z.record(columnId, z.number().int().min(40).max(1200)),
	sorting: sortingSchema,
	filter: filterRootSchema,
	grouping: groupingSchema,
	groups: groupDisplaySchema,
	pageSize: z.number().int().min(10).max(500)
});

/** What a backend needs to answer for a table: which rows, in which order, in which group. */
export const dataQuerySchema = z.object({
	filter: filterRootSchema,
	sorting: sortingSchema,
	grouping: groupingSchema,
	/** The group the rows (or subgroups) are asked for: one value per level above, `null` for none */
	path: z.array(z.string().max(500).nullable()).max(MAX_GROUP_LEVELS)
});

export type FilterCondition = z.infer<typeof filterConditionSchema>;
export type FilterGroup = z.infer<typeof filterGroupSchema>;
export type FilterRoot = z.infer<typeof filterRootSchema>;
export type FilterItem = FilterRoot['items'][number];
export type Connective = z.infer<typeof connectiveSchema>;
export type Sorting = z.infer<typeof sortingSchema>;
export type GroupBy = z.infer<typeof groupBySchema>;
export type DateBucket = (typeof DATE_BUCKETS)[number];
export type TableState = z.infer<typeof tableStateSchema>;
export type DataQuery = z.infer<typeof dataQuerySchema>;
/** One value per grouping level, outermost first; `null` is the group of rows without one. */
export type GroupPath = DataQuery['path'];

/** Conditions and groups, counted together, so a filter cannot grow without bounds. */
export function countFilterItems(filter: FilterRoot) {
	return filter.items.reduce(
		(sum, item) => sum + 1 + (item.type === 'group' ? item.items.length : 0),
		0
	);
}

/** A filter that matches every row. */
export function emptyFilter(): FilterRoot {
	return { type: 'group', op: 'and', items: [] };
}

/** Checks a parsed state beyond its shape; `undefined` when it does not fit. */
function checked(value: unknown): TableState | undefined {
	const parsed = tableStateSchema.safeParse(value);
	if (!parsed.success) return undefined;
	if (countFilterItems(parsed.data.filter) > MAX_FILTER_ITEMS) return undefined;
	return parsed.data;
}

/** Reads a state given as an object (a stored view); `undefined` when it does not fit. */
export function parseTableStateValue(value: unknown): TableState | undefined {
	if (JSON.stringify(value ?? null).length > MAX_TABLE_STATE_LENGTH) return undefined;
	return checked(value);
}

/** Reads a state given as JSON; `undefined` when it is broken, too large or does not fit. */
export function parseTableState(json: string): TableState | undefined {
	if (json.length > MAX_TABLE_STATE_LENGTH) return undefined;
	try {
		return checked(JSON.parse(json));
	} catch {
		return undefined;
	}
}

/** The table state as a backend query for the rows of one group (the top level by default). */
export function dataQueryOf({
	state,
	path = []
}: {
	state: Pick<TableState, 'filter' | 'sorting' | 'grouping'>;
	path?: GroupPath;
}): DataQuery {
	return { filter: state.filter, sorting: state.sorting, grouping: state.grouping, path };
}
