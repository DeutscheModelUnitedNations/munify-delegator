import { PersistedState } from '$lib/state/persistedState.svelte';
import type { StatsFilter as GraphQLStatsFilter } from '$lib/api/rumbleClient/client';
import {
	filteredStatValue,
	type EntityType,
	type FilterableCount,
	type RoleCounts,
	type StatsFilterOption
} from './statsFilterValue';

// History snapshot types
//
// What the history comparison stores in localStorage, and what the widgets compare against. Older
// entries hold the complete statistics object of their day, which is a superset of this.

export interface HistoryStats {
	registered: FilterableCount & {
		supervisors: number;
		singleParticipants: { byRole: FilterableCount[] };
	};
	// Optional for backward compatibility with older history entries
	roleBased?: RoleCounts;
	paperStats?: {
		total: number;
		withReviews: number;
		withoutReviews: number;
		byStatus: { accepted: number };
	};
}

export interface StatsTypeHistoryEntry {
	stats: HistoryStats;
	timestamp: string;
	conferenceId: string;
}

// Unified Filter System
// Combines registration status and role filters into a single dropdown

export type { StatsFilterOption };

// Default filter value (used on server and as initial client value)
const DEFAULT_FILTER: StatsFilterOption = 'all';

// Persisted on the client; the server and a first visit start at the default
const statsFilter = new PersistedState<StatsFilterOption>('statsFilter', DEFAULT_FILTER);

export function unifiedFilter() {
	const setFilter = (newFilter: StatsFilterOption) => {
		statsFilter.current = newFilter;
	};

	const getFilter = () => {
		return statsFilter.current;
	};

	// Get filtered value for objects with total/applied/notApplied
	const getFilteredValue = (
		object: FilterableCount | undefined,
		roleBasedData?: RoleCounts,
		entityType?: EntityType
	): number | undefined =>
		filteredStatValue(statsFilter.current, object, roleBasedData, entityType);

	// Check if current filter is role-based
	const isRoleBasedFilter = () => {
		return (
			statsFilter.current === 'appliedWithRole' || statsFilter.current === 'appliedWithoutRole'
		);
	};

	// Check if current filter shows applied data
	const isAppliedFilter = () => {
		return (
			statsFilter.current === 'applied' ||
			statsFilter.current === 'appliedWithRole' ||
			statsFilter.current === 'appliedWithoutRole'
		);
	};

	return {
		setFilter,
		getFilter,
		getFilteredValue,
		isRoleBasedFilter,
		isAppliedFilter
	};
}

// Map frontend filter values to GraphQL enum values
function mapFilterToGraphQL(filter: StatsFilterOption): GraphQLStatsFilter {
	const mapping: Record<StatsFilterOption, GraphQLStatsFilter> = {
		all: 'ALL',
		applied: 'APPLIED',
		notApplied: 'NOT_APPLIED',
		appliedWithRole: 'APPLIED_WITH_ROLE',
		appliedWithoutRole: 'APPLIED_WITHOUT_ROLE'
	};
	return mapping[filter];
}

/** The filter argument every statistics widget passes to its query. Reactive. */
export function statsQueryFilter(): GraphQLStatsFilter {
	return mapFilterToGraphQL(statsFilter.current);
}

// Local Store History

let history = $state<StatsTypeHistoryEntry[] | undefined>(undefined);
let selectedHistory = $state<string | undefined>(undefined);

export function getHistory() {
	return history;
}

export function setHistory(newHistory: StatsTypeHistoryEntry[]) {
	history = newHistory;
}

export function getSelectedHistory() {
	return selectedHistory;
}

export function setSelectedHistory(newSelectedHistory: string | undefined) {
	selectedHistory = newSelectedHistory;
}

/** The history entry picked for comparison, if any. Reactive. */
export function getSelectedHistoryEntry() {
	return history?.find((x) => x.timestamp === selectedHistory);
}
