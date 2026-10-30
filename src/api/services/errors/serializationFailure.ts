/**
 * Postgres reports a serializable transaction that lost against a concurrent one as 40001.
 * Drizzle wraps the driver's error, so the code is looked for on the error and on its `cause`.
 */
export function isSerializationFailure(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const candidate: { code?: unknown; cause?: unknown } = error;
	return candidate.code === '40001' || isSerializationFailure(candidate.cause);
}
