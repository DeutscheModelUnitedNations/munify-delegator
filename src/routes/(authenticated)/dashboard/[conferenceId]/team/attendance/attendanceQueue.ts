import { CombinedError } from '@urql/core';

export interface QueueEntry {
	localId: string;
	userId: string;
	timestamp: string;
	status: 'pending' | 'processing' | 'success' | 'error';
	errorKind?: 'network' | 'user_not_found' | 'duplicate' | 'unknown';
	errorMessage?: string;
	retryCount: number;
	/** The result of the check at the time of the scan; `null` when the scan was not checked. */
	checkPassed: boolean | null;
	/** Who was scanned, once it is known, for the log. */
	label?: string;
}

/** Whether a failed sync is worth retrying: the request never reached the server. */
export function isNetworkError(err: unknown) {
	// urql wraps a failed fetch; the answer of a server that was reached has no `networkError`.
	if (err instanceof CombinedError) return err.networkError !== undefined;
	return err instanceof TypeError || (err instanceof Error && err.name === 'AbortError');
}

/** Exponential backoff for the n-th retry of a scan, capped at 30 seconds. */
export function retryDelay(retryCount: number) {
	return Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
}

/**
 * Puts the scans that failed for good (neither the network nor a duplicate) back to pending, for a
 * session that can take them now. Says whether there were any.
 */
export function requeueFailed(queue: QueueEntry[]) {
	const failed = queue.filter((entry) => entry.status === 'error' && entry.errorKind === 'unknown');
	for (const entry of failed) entry.status = 'pending';
	return failed.length > 0;
}
