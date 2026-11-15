/**
 * What browsers throw at a fetch that was cancelled or never reached the server. Safari says
 * "Load failed" / "Fetch is aborted", Chrome "Failed to fetch", Firefox "NetworkError when
 * attempting to fetch resource.".
 */
const FAILED_FETCH =
	/^(Load failed|Failed to fetch|NetworkError when attempting to fetch resource\.?)$/;

/**
 * Whether an error is a fetch the browser cancelled or could not send. Not a fault of the app: urql
 * aborts a live query's request when the page that held it goes away (`makeFetchSource`), and its
 * stream's pending read rejects inside urql, where nothing catches it - hundreds of unhandled
 * rejections from Safari. A failed request the app asked for still reaches Bugsink, as the
 * `CombinedError` urql answers with.
 */
export function isFailedFetch(error: unknown) {
	// a `DOMException`, which is not an `Error` everywhere, nor always from this realm
	if (
		typeof error === 'object' &&
		error !== null &&
		(error as { name?: unknown }).name === 'AbortError'
	)
		return true;
	return error instanceof TypeError && FAILED_FETCH.test(error.message);
}

/** Sentry's `beforeSend`: drops cancelled and failed fetches (`isFailedFetch`). */
export function dropFailedFetches<Event>(event: Event, hint: { originalException?: unknown }) {
	return isFailedFetch(hint.originalException) ? null : event;
}
