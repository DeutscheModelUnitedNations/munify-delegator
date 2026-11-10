import type { CallerFacts } from './callerFacts';

/**
 * Where a request keeps what its rules know about the caller (`callerFacts`). The request context
 * carries one (`#api/context`), and rumble hands its rules a copy of that context, so both share
 * this object. Kept apart from `callerFacts.ts`, which queries the database, so the context does
 * not import the database.
 */
export function createCallerFactsCache() {
	return {
		/** The facts the last finished load found; what the rules read while building a query. */
		current: undefined as CallerFacts | undefined,
		/** The load in flight or done, for whoever awaits the facts. */
		loading: undefined as Promise<CallerFacts> | undefined,
		/** Counts the loads, so a slower earlier one never overwrites a later one. */
		loads: 0
	};
}
