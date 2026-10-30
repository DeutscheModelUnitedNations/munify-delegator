import { GraphQLError } from 'graphql';
import { Redis } from 'ioredis';
import { REDIS_URL } from '$app/env/private';
import { m } from '#lib/paraglide/messages';
import { apiError } from '#api/services/errors/apiError';
import {
	createFailureLimiter,
	createMemoryFailureStore,
	createRedisFailureStore
} from './failureLimit';

/**
 * How many codes one account may get wrong before it has to wait. A delegation's entry code and a
 * supervisor's connection code are the only thing standing between a signed-in account and a
 * delegation's or supervisor's details, so every lookup by code that misses is a guess. Ten misses
 * in ten minutes leaves room for typos and stops guessing: with up to 15 aliased lookups per
 * request, a request-based limit would not.
 */
const LIMIT = 10;
const WINDOW_MS = 10 * 60_000;

function isNotFound(error: unknown) {
	return error instanceof GraphQLError && error.extensions.code === 'NOT_FOUND';
}

/**
 * The limiter for every lookup by code (`previewDelegation`, `createDelegationMember`,
 * `previewConferenceSupervisor`, `connectToConferenceSupervisor`), keyed by the caller's user id.
 * The lookup it wraps throws `NOT_FOUND` for a code that names nothing, and nothing else does.
 * Shared across instances through Redis when there is one.
 */
export const codeGuessLimiter = createFailureLimiter({
	store: REDIS_URL
		? createRedisFailureStore(new Redis(REDIS_URL, { lazyConnect: true }), 'code-guess:')
		: createMemoryFailureStore(),
	limit: LIMIT,
	windowMs: WINDOW_MS,
	isFailure: isNotFound,
	refused: () => apiError('TOO_MANY_ATTEMPTS', m.tooManyCodeAttempts())
});
