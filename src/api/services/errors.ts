import { GraphQLError } from 'graphql';
import type { ErrorCode } from '#lib/api/errorCodes';
import { m } from '#lib/paraglide/messages';

/**
 * An error the client recognises by `code` (see `#lib/api/errorCodes`) and shows `message` for.
 * `message` is an `m.…()` message; `extensions` carries whatever else the client needs.
 */
export function apiError({
	code,
	message,
	extensions = {}
}: {
	code: ErrorCode;
	message: string;
	extensions?: Record<string, unknown>;
}) {
	return new GraphQLError(message, { extensions: { ...extensions, code } });
}

/**
 * What a lookup by entry or connection code throws when the code names nothing. `NOT_FOUND` is
 * what `codeGuessLimiter` counts as a guess, so a lookup by code throws it for a wrong code only.
 */
export function codeNotFound() {
	return apiError({ code: 'NOT_FOUND', message: m.codeNotFound() });
}

/**
 * Postgres reports a serializable transaction that lost against a concurrent one as 40001.
 * Drizzle wraps the driver's error, so the code is looked for on the error and on its `cause`.
 */
export function isSerializationFailure(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const candidate: { code?: unknown; cause?: unknown } = error;
	return candidate.code === '40001' || isSerializationFailure(candidate.cause);
}

/**
 * Postgres reports a unique violation as 23505; the column shows up in the constraint name. Drizzle
 * wraps the driver's error, so the violation is looked for on the error and on its `cause`.
 */
export function isUniqueViolationOn({
	error,
	column
}: {
	error: unknown;
	column: string;
}): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const candidate: { code?: unknown; constraint?: unknown; detail?: unknown; cause?: unknown } =
		error;
	if (candidate.code !== '23505')
		return isUniqueViolationOnCause({ cause: candidate.cause, column });
	return (
		String(candidate.constraint ?? '').includes(column) ||
		String(candidate.detail ?? '').includes(column)
	);
}

function isUniqueViolationOnCause({ cause, column }: { cause: unknown; column: string }) {
	return cause !== undefined && isUniqueViolationOn({ error: cause, column });
}

/**
 * Postgres reports a row that other rows still reference (a `restrict` foreign key) as 23503.
 * Drizzle wraps the driver's error, so the code is looked for on the error and on its `cause`.
 */
export function isForeignKeyViolation(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	const candidate: { code?: unknown; cause?: unknown } = error;
	return candidate.code === '23503' || isForeignKeyViolation(candidate.cause);
}

type ApiErrorArgs = Parameters<typeof apiError>[0];

/**
 * The rules the database's triggers keep (see the `conference_anchor`, `conference_reach_unchanged`,
 * `one_part_per_conference`, `conference_calendar_tracks` and `conference_role_kind` migrations),
 * by the constraint name they raise with. They are the only check of these rules: resolvers do not
 * look the rows up first.
 */
const DATABASE_RULES: { matches: (constraint: string) => boolean; error: () => ApiErrorArgs }[] = [
	{
		matches: (constraint) => constraint.endsWith('_same_conference'),
		error: () => ({ code: 'INVALID_INPUT', message: m.referencesOtherConference() })
	},
	{
		matches: (constraint) => /_conference(_id)?_immutable$/.test(constraint),
		error: () => ({ code: 'INVALID_INPUT', message: m.conferenceCannotChange() })
	},
	{
		matches: (constraint) => constraint.endsWith('_role_kind'),
		error: () => ({ code: 'INVALID_INPUT', message: m.roleNotOnOffer() })
	},
	{
		matches: (constraint) => constraint === 'calendar_entry_track_runs_on_day',
		error: () => ({ code: 'INVALID_INPUT', message: m.calendarEntryTrackNotOnDay() })
	},
	{
		matches: (constraint) => constraint === 'one_part_per_conference',
		error: () => ({ code: 'CONFLICT', message: m.alreadyTakesPartInConference() })
	}
];

/** The constraint a check violation (23514) names, looked for on the error and its causes. */
function violatedCheck(error: unknown): string | undefined {
	if (typeof error !== 'object' || error === null) return undefined;
	const candidate: {
		code?: unknown;
		constraint?: unknown;
		originalError?: unknown;
		cause?: unknown;
	} = error;
	if (candidate.code === '23514' && typeof candidate.constraint === 'string') {
		return candidate.constraint;
	}
	return violatedCheck(candidate.originalError) ?? violatedCheck(candidate.cause);
}

/**
 * The error a GraphQL error caused by one of the database's rules (`DATABASE_RULES`) is answered
 * with, at the same place in the result; undefined for any other error.
 */
export function databaseRuleError(error: GraphQLError): GraphQLError | undefined {
	const constraint = violatedCheck(error.originalError);
	const rule = constraint ? DATABASE_RULES.find((r) => r.matches(constraint)) : undefined;
	if (!rule) return undefined;
	const { code, message } = rule.error();
	return new GraphQLError(message, {
		nodes: error.nodes,
		source: error.source,
		positions: error.positions,
		path: error.path,
		extensions: { code }
	});
}
