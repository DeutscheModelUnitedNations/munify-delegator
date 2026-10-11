/** A comparator sorting by a text key; a missing key sorts like an empty string. */
export function compareByText<T>(key: (item: T) => string | null | undefined) {
	return (a: T, b: T) => (key(a) ?? '').localeCompare(key(b) ?? '');
}
