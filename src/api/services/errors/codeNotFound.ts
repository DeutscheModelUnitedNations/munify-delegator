import { m } from '#lib/paraglide/messages.js';
import { apiError } from './apiError';

/**
 * What a lookup by entry or connection code throws when the code names nothing. `NOT_FOUND` is
 * what `codeGuessLimiter` counts as a guess, so a lookup by code throws it for a wrong code only.
 */
export function codeNotFound() {
	return apiError('NOT_FOUND', m.codeNotFound());
}
