import { isGroupable, type ColumnMeta } from './columnTypes';
import { dayOf } from './dateConditions';
import type { DateBucket, GroupBy, GroupPath } from './stateSchema';

/**
 * How rows fall into groups. A group is named by a string, the same in the browser and in SQL
 * (`groupSql.ts` builds the identical text), so a group the backend listed can be asked for its
 * rows by that name:
 *
 *   text, enum   the value
 *   boolean      `true` / `false`
 *   number       the value, or with `step` the lower end of its range (`step` 10: 17 → `10`)
 *   date         `YYYY-MM-DD`, `YYYY-MM` or `YYYY`, as `bucket` says (the month where left out)
 *
 * Rows without a value form the group `null`.
 */

/**
 * The grouping levels that apply: those on columns the table has and can group by. A saved view
 * or a URL may still name a column that is no longer groupable; the API drops such a level too
 * (`usableGrouping`), so both sides count the same levels.
 */
export function applicableGrouping({
	grouping,
	columnOf
}: {
	grouping: readonly GroupBy[];
	columnOf: (id: string) => ColumnMeta | undefined;
}): GroupBy[] {
	return grouping.filter((groupBy) => {
		const column = columnOf(groupBy.column);
		return column !== undefined && isGroupable(column);
	});
}

/** The bucket a date grouping uses. */
export function dateBucketOf(groupBy: GroupBy): DateBucket {
	return groupBy.bucket ?? 'month';
}

const DATE_LENGTH: Record<DateBucket, number> = { day: 10, month: 7, year: 4 };

/** The group a value falls into for a column grouped by `groupBy`. */
export function groupValueOf({
	column,
	groupBy,
	value
}: {
	column: ColumnMeta;
	groupBy: GroupBy;
	value: unknown;
}): string | null {
	if (value === null || value === undefined || value === '') return null;
	switch (column.type) {
		case 'boolean':
			return value ? 'true' : 'false';
		case 'number': {
			if (typeof value !== 'number' || !Number.isFinite(value)) return null;
			const step = groupBy.step;
			return String(step ? Math.floor(value / step) * step : value);
		}
		case 'date': {
			const day = dayOf(value);
			return day ? day.slice(0, DATE_LENGTH[dateBucketOf(groupBy)]) : null;
		}
		case 'multiEnum':
			return null;
		default:
			return String(value);
	}
}

/** A group's name among its siblings and cousins: its whole path, for the collapse state. */
function groupKey(path: GroupPath) {
	return JSON.stringify(path);
}

/** Whether a group shows its rows, given the grid's collapse state. */
export function isGroupOpen({
	path,
	display
}: {
	path: GroupPath;
	display: { collapsed: boolean; toggled: readonly string[] };
}) {
	return display.toggled.includes(groupKey(path)) === display.collapsed;
}

/** The collapse state after opening or closing one group. */
export function toggleGroup({
	path,
	display
}: {
	path: GroupPath;
	display: { collapsed: boolean; toggled: readonly string[] };
}) {
	const key = groupKey(path);
	const toggled = display.toggled.includes(key)
		? display.toggled.filter((entry) => entry !== key)
		: [...display.toggled, key].slice(-500);
	return { collapsed: display.collapsed, toggled };
}

/** One group of a level: its name and how many rows it holds. */
export interface GroupCount {
	value: string | null;
	count: number;
}

/**
 * Orders the groups of a level: enums by their options' order, everything else by value (numbers
 * as numbers), descending when the grouping column is sorted descending; the group without a
 * value comes last either way.
 */
export function orderGroups({
	groups,
	column,
	desc
}: {
	groups: readonly GroupCount[];
	column: ColumnMeta;
	desc: boolean;
}): GroupCount[] {
	const options = column.options ?? [];
	const rank = (value: string) => {
		if (column.type === 'enum') {
			const index = options.indexOf(value);
			return index === -1 ? options.length : index;
		}
		return column.type === 'number' ? Number(value) : 0;
	};
	const compare = (a: string, b: string) => {
		const byRank = rank(a) - rank(b);
		return byRank !== 0 ? byRank : a.localeCompare(b, undefined, { numeric: true });
	};
	return [...groups].sort((a, b) => {
		if (a.value === null || b.value === null) return a.value === null ? 1 : -1;
		const result = compare(a.value, b.value);
		return desc ? -result : result;
	});
}
