import type { ParticipantFilterInput } from '#lib/api/rumbleClient/client';
import type { ColumnFiltersState } from '#lib/components/tanStackTable/index';
import {
	enumFilterInput,
	rangeFilterInput,
	textFilterInput
} from '#lib/components/tanStackTable/filters';
import { z } from 'zod';
import { nationCodesMatching } from '#lib/utils/nationTranslationHelper.svelte.js';

/** The kind of filter a column has, which decides how its value is read. */
export type FilterKind = 'text' | 'enum' | 'boolean' | 'range';

type ToInputs = (column: string, value: unknown) => ParticipantFilterInput[];

const textInputs: ToInputs = (column, value) => {
	const parsed = textFilterInput.safeParse(value);
	if (!parsed.success) return [];
	const { mode, value: text } = parsed.data;
	return [
		{
			column,
			mode,
			text,
			// nation names are only translated here, so the backend gets the codes that matched
			...(column === 'nation' && text ? { values: nationCodesMatching(text) } : {})
		}
	];
};

const enumInputs: ToInputs = (column, value) => {
	const parsed = enumFilterInput.safeParse(value);
	return parsed.success ? [{ column, values: parsed.data }] : [];
};

const booleanInputs: ToInputs = (column, value) => {
	const parsed = z.boolean().safeParse(value);
	return parsed.success ? [{ column, bool: parsed.data }] : [];
};

const rangeInputs: ToInputs = (column, value) => {
	const parsed = rangeFilterInput.safeParse(value);
	if (!parsed.success) return [];
	const { min, max } = parsed.data;
	return [
		{
			column,
			...(min !== undefined ? { min } : {}),
			...(max !== undefined ? { max } : {})
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
export function toFilterInputs({
	filters,
	kinds
}: {
	filters: ColumnFiltersState;
	kinds: ReadonlyMap<string, FilterKind>;
}): ParticipantFilterInput[] {
	return filters.flatMap(({ id, value }) => {
		const kind = kinds.get(id);
		return kind ? inputsByKind[kind](id, value) : [];
	});
}
