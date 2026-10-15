/**
 * An optional GraphQL argument as a value for a drizzle `set`: an omitted argument and an explicit
 * `null` both become `undefined`, which leaves the column alone. For non-nullable columns, where a
 * `null` cannot be written anyway.
 */
export function nullToUndefined<T>(value: T | null | undefined): T | undefined {
	return value ?? undefined;
}
