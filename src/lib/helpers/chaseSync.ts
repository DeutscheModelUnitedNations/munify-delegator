import { conflictMessageOf } from '#lib/api/errorCodes';
import { m } from '#lib/paraglide/messages';

/**
 * What "sync now" on the CHASE link tells the person (`ChaseSyncButton`), from the two requests it
 * makes: this instance's `requestLinkSync` and CHASE's, asked through `requestRemoteLinkSync`. The
 * sync here is what counts; CHASE failing to answer only makes it a sync here alone, with the
 * reason the server gave.
 */
export function chaseSyncNotice({
	here,
	remote
}: {
	here: PromiseSettledResult<boolean>;
	remote: PromiseSettledResult<boolean>;
}): { level: 'success' | 'warning' | 'error'; message: string } {
	if (here.status === 'rejected') return { level: 'error', message: m.genericToastError() };
	if (!here.value) return { level: 'error', message: m.chaseLinkSyncNoLink() };
	if (remote.status === 'fulfilled' && remote.value) {
		return { level: 'success', message: m.chaseLinkSyncRequested() };
	}
	const reason =
		(remote.status === 'rejected' && conflictMessageOf(remote.reason)) ||
		m.chaseLinkSyncRemoteFailed();
	return { level: 'warning', message: m.chaseLinkSyncRequestedHereOnly({ reason }) };
}
