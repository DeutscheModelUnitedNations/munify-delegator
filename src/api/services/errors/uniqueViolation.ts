/**
 * Postgres reports a unique violation as 23505; the column shows up in the constraint name. Drizzle
 * wraps the driver's error, so the violation is looked for on the error and on its `cause`.
 */
export function isUniqueViolationOn(error: unknown, column: string): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const candidate: { code?: unknown; constraint?: unknown; detail?: unknown; cause?: unknown } =
		error;
	if (candidate.code !== '23505') return isUniqueViolationOnCause(candidate.cause, column);
	return (
		String(candidate.constraint ?? '').includes(column) ||
		String(candidate.detail ?? '').includes(column)
	);
}

function isUniqueViolationOnCause(cause: unknown, column: string) {
	return cause !== undefined && isUniqueViolationOn(cause, column);
}
