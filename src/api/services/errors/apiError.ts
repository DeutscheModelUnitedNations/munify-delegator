import { GraphQLError } from 'graphql';
import type { ErrorCode } from '#lib/api/errorCodes.js';

/**
 * An error the client recognises by `code` (see `#lib/api/errorCodes`) and shows `message` for.
 * `message` is an `m.…()` message; `extensions` carries whatever else the client needs.
 */
export function apiError(
	code: ErrorCode,
	message: string,
	extensions: Record<string, unknown> = {}
) {
	return new GraphQLError(message, { extensions: { ...extensions, code } });
}
