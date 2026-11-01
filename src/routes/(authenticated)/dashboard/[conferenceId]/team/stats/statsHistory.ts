import type { StatsTypeHistoryEntry } from './stats.svelte';

const STORAGE_KEY = 'statsHistory';

/**
 * The snapshots kept in this browser. Storage that is blocked or holds something unreadable reads
 * as an empty history, so the comparison starts over instead of taking the page down.
 */
export function loadStatsHistory(): StatsTypeHistoryEntry[] {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

/** Stores the snapshots; when storage is full or blocked, they just stay in memory. */
export function saveStatsHistory(history: StatsTypeHistoryEntry[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
	} catch {
		// Storage full or blocked: this visit still compares against what was read
	}
}
