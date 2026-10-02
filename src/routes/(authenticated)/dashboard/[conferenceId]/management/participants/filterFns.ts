import type { FilterFn } from '$lib/components/tanStackTable';
import type { ParticipantTableFeatures } from './tableFeatures';
import type { ParticipantRow, TextFilterMode } from './types';

type ParticipantFilterFn = FilterFn<ParticipantTableFeatures, ParticipantRow>;

export type TextFilterValue = { mode: TextFilterMode; value: string };

/** Compares a lower-cased cell value against a lower-cased, non-empty search value. */
type TextComparison = (cellValue: string, search: string) => boolean;

const textComparisons: Partial<Record<TextFilterMode, TextComparison>> = {
	containsNot: (cell, search) => !cell.includes(search),
	equalsNot: (cell, search) => cell !== search,
	startsWithNot: (cell, search) => !cell.startsWith(search),
	equals: (cell, search) => cell === search,
	startsWith: (cell, search) => cell.startsWith(search)
};

const containsComparison: TextComparison = (cell, search) => cell.includes(search);

function isEmptyValue(rawValue: unknown) {
	return rawValue == null || rawValue === '';
}

/** Whether a cell value passes a text filter. Unknown modes behave like `contains`. */
export function matchesTextFilter(rawValue: unknown, filterValue: TextFilterValue | undefined) {
	if (!filterValue) return true;
	const { mode, value } = filterValue;
	if (mode === 'isEmpty') return isEmptyValue(rawValue);
	if (mode === 'isNotEmpty') return !isEmptyValue(rawValue);
	if (!value) return true;
	const compare = textComparisons[mode] ?? containsComparison;
	return compare(String(rawValue ?? '').toLowerCase(), value.toLowerCase());
}

/** Whether a cell value is one of the selected enum values; empty cells match `—`. */
export function matchesEnumFilter(rawValue: unknown, filterValue: string[] | undefined) {
	if (!filterValue || filterValue.length === 0) return true;
	const value = isEmptyValue(rawValue) ? '—' : String(rawValue);
	return filterValue.includes(value);
}

/** Whether a numeric cell value lies within an inclusive range with optional bounds. */
export function matchesRangeFilter(
	value: number | null | undefined,
	filterValue: [number | null, number | null] | undefined
) {
	if (!filterValue) return true;
	if (value == null) return false;
	const [min, max] = filterValue;
	return (min == null || value >= min) && (max == null || value <= max);
}

export const textFilterFn: ParticipantFilterFn = (
	row,
	columnId,
	filterValue: TextFilterValue | undefined
) => matchesTextFilter(row.getValue(columnId), filterValue);

export const enumFilterFn: ParticipantFilterFn = (row, columnId, filterValue: string[]) =>
	matchesEnumFilter(row.getValue(columnId), filterValue);

export const booleanFilterFn: ParticipantFilterFn = (
	row,
	columnId,
	filterValue: boolean | null
) => {
	if (filterValue === null || filterValue === undefined) return true;
	const value = row.getValue(columnId);
	if (value == null) return false;
	return Boolean(value) === filterValue;
};

export const rangeFilterFn: ParticipantFilterFn = (
	row,
	columnId,
	filterValue: [number | null, number | null]
) => matchesRangeFilter(row.getValue<number>(columnId), filterValue);

type RangeFilterValue = [number | null, number | null];

/** The enum filter after clicking `value`: added if missing, removed if present; empty clears it. */
export function toggledEnumFilter(
	current: string[] | undefined,
	value: string
): string[] | undefined {
	const selected = current ?? [];
	if (!selected.includes(value)) return [...selected, value];
	const next = selected.filter((v) => v !== value);
	return next.length > 0 ? next : undefined;
}

/** The range filter after editing one bound; an empty input clears it, no bounds clear the filter. */
export function updatedRangeFilter(
	current: RangeFilterValue | undefined,
	index: 0 | 1,
	value: string
): RangeFilterValue | undefined {
	const next: RangeFilterValue = current ? [...current] : [null, null];
	next[index] = value === '' ? null : Number(value);
	return next[0] === null && next[1] === null ? undefined : next;
}
