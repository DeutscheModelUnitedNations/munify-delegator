import { resolve } from '$app/paths';
import { client } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import { genericPromiseToastMessages } from '#lib/utils/toast';
import { toast } from 'svelte-sonner';
import { logger } from '#lib/logger';

/**
 * Loads the dashboard as a new page, after the session switched to or from an impersonated user.
 * Not a client-side navigation: the page still open would query again as the new user, who may not
 * read what it shows (a conference only the impersonator's team sees answered NOT_FOUND).
 */
export function loadDashboardAfresh(location: Pick<Location, 'assign'> = window.location) {
	location.assign(resolve('dashboard'));
}

/**
 * Starts impersonating `targetUserId` and loads their dashboard. Failures are reported through a
 * toast rather than thrown, so callers only need to track their own loading state.
 */
export async function startImpersonation(targetUserId: string) {
	try {
		const promise = Promise.resolve(client.mutate.startImpersonation({ __args: { targetUserId } }));
		toast.promise(promise, genericPromiseToastMessages);
		await promise;
		loadDashboardAfresh();
	} catch (error) {
		logger.error('Failed to start impersonation', error);
		toast.error(m.impersonationFailed());
	}
}
