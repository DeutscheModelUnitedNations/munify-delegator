import type { ParticipantFilterInput } from '$lib/api/rumbleClient/client';
import type { ColumnFiltersState } from '$lib/components/tanStackTable';
import { nationCodesMatching } from '$lib/utils/nationTranslationHelper.svelte';

/** The kind of filter a column has, which decides how its value is read. */
export type FilterKind = 'text' | 'enum' | 'boolean' | 'range';

function isTextValue(value: unknown): value is { mode: string; value: string } {
	return (
		typeof value === 'object' &&
		value !== null &&
		'mode' in value &&
		typeof value.mode === 'string' &&
		'value' in value &&
		typeof value.value === 'string'
	);
}

type ToInputs = (column: string, value: unknown) => ParticipantFilterInput[];

const textInputs: ToInputs = (column, value) => {
	if (!isTextValue(value)) return [];
	return [
		{
			column,
			mode: value.mode,
			text: value.value,
			// nation names are only translated here, so the backend gets the codes that matched
			...(column === 'nation' && value.value ? { values: nationCodesMatching(value.value) } : {})
		}
	];
};

const enumInputs: ToInputs = (column, value) =>
	Array.isArray(value)
		? [{ column, values: value.filter((entry): entry is string => typeof entry === 'string') }]
		: [];

const booleanInputs: ToInputs = (column, value) =>
	typeof value === 'boolean' ? [{ column, bool: value }] : [];

const rangeInputs: ToInputs = (column, value) => {
	if (!Array.isArray(value)) return [];
	const [min, max] = value;
	return [
		{
			column,
			...(typeof min === 'number' ? { min } : {}),
			...(typeof max === 'number' ? { max } : {})
		}
	];
};

const inputsByKind: Record<FilterKind, ToInputs> = {
	text: textInputs,
	enum: enumInputs,
	boolean: booleanInputs,
	range: rangeInputs
};

/** The table's filters in the shape of the backend's `participantsPage` query. */
export function toFilterInputs(
	filters: ColumnFiltersState,
	kinds: ReadonlyMap<string, FilterKind>
): ParticipantFilterInput[] {
	return filters.flatMap(({ id, value }) => {
		const kind = kinds.get(id);
		return kind ? inputsByKind[kind](id, value) : [];
	});
}
