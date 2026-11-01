import { toast } from 'svelte-sonner';
import { m } from '#lib/paraglide/messages';
import { logger } from '#lib/logger';
import { conflictMessageOf } from '#lib/api/errorCodes';

/**
 * Runs an invitation mutation, then `onSuccess` with its result. A CONFLICT is toasted with its
 * message; any other failure, also one of `onSuccess`, is toasted generically and logged.
 */
export async function runInvitationAction<R>({
	mutation,
	onSuccess,
	failureLog
}: {
	mutation: () => PromiseLike<R>;
	onSuccess: (result: R) => void | Promise<void>;
	failureLog: string;
}) {
	try {
		await onSuccess(await mutation());
	} catch (error) {
		// Refused by the invitation's state: already used, already revoked, invited again.
		const conflict = conflictMessageOf(error);
		if (conflict) {
			toast.error(conflict);
			return;
		}
		toast.error(m.httpGenericError());
		logger.error(failureLog, error);
	}
}
