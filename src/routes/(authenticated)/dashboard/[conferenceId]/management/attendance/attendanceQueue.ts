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
	return (
		err instanceof TypeError ||
		(err instanceof Error &&
			(err.message.includes('fetch') ||
				err.message.includes('network') ||
				err.name === 'AbortError'))
	);
}

/** Exponential backoff for the n-th retry of a scan, capped at 30 seconds. */
export function retryDelay(retryCount: number) {
	return Math.min(1000 * Math.pow(2, retryCount - 1), 30000);
}
