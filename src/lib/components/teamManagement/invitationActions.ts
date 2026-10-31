import { toast } from 'svelte-sonner';
import { CombinedError } from '@urql/core';
import { m } from '#lib/paraglide/messages';
import { logger } from '#lib/logger';
import { hasErrorCode } from '#lib/api/errorCodes';

/**
 * The message of a refusal of the invitation's state (CONFLICT: already used, already revoked,
 * invited again), which the person can act on; undefined for any other failure.
 */
function conflictMessage(error: unknown) {
	if (!(error instanceof CombinedError) || !hasErrorCode({ err: error, code: 'CONFLICT' })) {
		return undefined;
	}
	return error.graphQLErrors[0]?.message;
}

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
		const conflict = conflictMessage(error);
		if (conflict) {
			toast.error(conflict);
			return;
		}
		toast.error(m.httpGenericError());
		logger.error(failureLog, error);
	}
}
