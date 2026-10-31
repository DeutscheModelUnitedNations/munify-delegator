import { m } from '#lib/paraglide/messages';
import { conflictMessageOf } from '#lib/api/errorCodes';

export const genericPromiseToastMessages = {
	loading: m.genericToastLoading(),
	success: m.genericToastSuccess(),
	error: m.genericToastError()
};

/**
 * `genericPromiseToastMessages`, but a refusal of the current state (CONFLICT) shows the server's
 * message, which says what to do instead.
 */
export const conflictAwareToastMessages = {
	...genericPromiseToastMessages,
	error: (error: unknown) => conflictMessageOf(error) ?? m.genericToastError()
};
