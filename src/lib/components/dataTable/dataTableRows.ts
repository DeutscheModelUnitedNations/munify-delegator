type ExpandKey = string | number;

/** The key a row is expanded by: its own `rowKey` field, falling back to its `id`. */
export function expandKeyOf(row: object): ExpandKey | undefined {
	const ownKey = 'rowKey' in row ? row.rowKey : undefined;
	const key = ownKey ?? ('id' in row ? row.id : undefined);
	return typeof key === 'string' || typeof key === 'number' ? key : undefined;
}

/**
 * The expanded keys after a click on `key`: an open row closes, a closed one opens, alone when only
 * one row may be open at a time.
 */
export function toggleExpandedKey(
	expanded: readonly ExpandKey[],
	key: ExpandKey,
	expandSingle: boolean
): ExpandKey[] {
	if (expanded.includes(key)) return expanded.filter((k) => k !== key);
	return expandSingle ? [key] : [...expanded, key];
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
