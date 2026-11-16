import type { ApiContext } from '#api/rumble';
import { callerUserId } from '#api/services/authHelper/utils';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';

/**
 * Who may do what with the message service's terms. Everybody reads them, signed in or not: they
 * are the app's, not anybody's data. Only a person agrees to them, for themselves; an AI assistant
 * has nobody to agree for (`callerUserId`). The acceptances have no abilities: nothing reads them
 * through the API.
 */

/** The signed-in person agreeing to the terms; FORBIDDEN for an assistant. */
export function assertCanAcceptTerms(ctx: ApiContext) {
	ctx.mustBeLoggedIn();
	const userId = callerUserId(ctx);
	if (!userId) throw apiError({ code: 'FORBIDDEN', message: m.chatTermsOnlyOwn() });
	return userId;
}
