import { toast } from 'svelte-sonner';
import { m } from '$lib/paraglide/messages';

/**
 * Runs an invitation mutation: `onSuccess` once it reports success, otherwise the error it
 * reports (or a generic one) as a toast. A thrown error is toasted generically and logged.
 */
export async function runInvitationAction<R extends { success: boolean; message?: string | null }>(
	mutation: () => PromiseLike<R>,
	onSuccess: (result: R) => void | Promise<void>,
	failureLog: string
) {
	try {
		const result = await mutation();
		if (result.success) await onSuccess(result);
		else toast.error(result.message ?? m.httpGenericError());
	} catch (error) {
		toast.error(m.httpGenericError());
		console.error(failureLog, error);
	}
}
