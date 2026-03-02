import type { FilterFn } from '$lib/components/TanStackTable';
import type { ParticipantRow, TextFilterMode } from './types';

export const textFilterFn: FilterFn<ParticipantRow> = (row, columnId, filterValue) => {
	if (!filterValue) return true;
	const { mode, value } = filterValue as { mode: TextFilterMode; value: string };
	const rawValue = row.getValue(columnId);
	const cellValue = String(rawValue ?? '').toLowerCase();

	switch (mode) {
		case 'isEmpty':
			return rawValue == null || rawValue === '';
		case 'isNotEmpty':
			return rawValue != null && rawValue !== '';
		case 'containsNot':
			return !value || !cellValue.includes(value.toLowerCase());
		case 'equalsNot':
			return !value || cellValue !== value.toLowerCase();
		case 'startsWithNot':
			return !value || !cellValue.startsWith(value.toLowerCase());
		case 'equals':
			return !value || cellValue === value.toLowerCase();
		case 'startsWith':
			return !value || cellValue.startsWith(value.toLowerCase());
		case 'contains':
		default:
			return !value || cellValue.includes(value.toLowerCase());
	}
};

export const enumFilterFn: FilterFn<ParticipantRow> = (row, columnId, filterValue: string[]) => {
	if (!filterValue || filterValue.length === 0) return true;
	const rawValue = row.getValue(columnId);
	const value = rawValue == null || rawValue === '' ? '—' : String(rawValue);
	return filterValue.includes(value);
};

export const booleanFilterFn: FilterFn<ParticipantRow> = (
	row,
	columnId,
	filterValue: boolean | null
) => {
	if (filterValue === null || filterValue === undefined) return true;
	const value = row.getValue(columnId);
	if (value == null) return false;
	return Boolean(value) === filterValue;
};

export const rangeFilterFn: FilterFn<ParticipantRow> = (
	row,
	columnId,
	filterValue: [number | null, number | null]
) => {
	if (!filterValue) return true;
	const [min, max] = filterValue;
	const value = row.getValue<number>(columnId);
	if (value == null) return false;
	if (min != null && value < min) return false;
	if (max != null && value > max) return false;
	return true;
};
