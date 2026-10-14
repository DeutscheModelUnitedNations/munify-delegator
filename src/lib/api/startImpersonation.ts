import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import { client } from '$lib/api/rumbleClient/client';
import { m } from '$lib/paraglide/messages';
import { genericPromiseToastMessages } from '$lib/utils/toast';
import { toast } from 'svelte-sonner';

/**
 * Starts impersonating `targetUserId` and reloads into their dashboard. Failures are reported
 * through a toast rather than thrown, so callers only need to track their own loading state.
 */
export async function startImpersonation(targetUserId: string) {
	try {
		const promise = Promise.resolve(client.mutate.startImpersonation({ __args: { targetUserId } }));
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		await goto(resolve('/dashboard'));
		window.location.reload();
	} catch (error) {
		console.error('Failed to start impersonation:', error);
		toast.error(m.impersonationFailed());
	}
}
