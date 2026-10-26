import { CombinedError } from '@urql/core';

/**
 * The failures a client acts on instead of just showing their message.
 *
 * The message of an error is text for a person and is translated into their language, so code
 * must never branch on it. An error the client has to recognise carries one of these in
 * `extensions.code` (the server side is `apiError` in `#api/services/errors/apiError.js`). Add a code here
 * first; both sides then fail to compile until they agree.
 */
const ERROR_CODES = [
	/** There is no signed-in user. */
	'UNAUTHENTICATED',
	/** The caller is signed in but may not do this. */
	'FORBIDDEN',
	/** The row does not exist, or the caller's abilities do not let them see it. */
	'NOT_FOUND',
	/** An argument is missing, malformed, or names something that does not belong where it is used. */
	'INVALID_INPUT',
	/** The request is fine but the current state refuses it: already done, taken, closed, blocked. */
	'CONFLICT',
	/** The person was already scanned in this attendance session. */
	'ALREADY_SCANNED',
	/** The identity provider's email belongs to another account. */
	'EMAIL_CONFLICT'
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

function isErrorCode(value: unknown): value is ErrorCode {
	return ERROR_CODES.some((code) => code === value);
}

/** The code a failed operation carries, if the API gave it one. */
export function errorCodeOf(err: unknown): ErrorCode | undefined {
	if (!(err instanceof CombinedError)) return undefined;
	for (const graphQLError of err.graphQLErrors) {
		const code: unknown = graphQLError.extensions?.code;
		if (isErrorCode(code)) return code;
	}
	return undefined;
}

export function hasErrorCode(err: unknown, code: ErrorCode) {
	return errorCodeOf(err) === code;
}
