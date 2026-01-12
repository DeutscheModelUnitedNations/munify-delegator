import { persisted } from 'svelte-persisted-store';
import { browser } from '$app/environment';

// API Return Types

export interface WaitingListStats {
	total: number;
	visible: number;
	hidden: number;
	assigned: number;
	unassigned: number;
}

export interface SupervisorStats {
	total: number;
	accepted: number;
	rejected: number;
	plansAttendance: number;
	doesNotPlanAttendance: number;
	acceptedAndPresent: number;
	acceptedAndNotPresent: number;
	rejectedAndPresent: number;
	rejectedAndNotPresent: number;
}

export interface PostalPaymentProgress {
	maxParticipants: number;
	postalDone: number;
	postalPending: number;
	postalProblem: number;
	postalPercentage: number;
	paymentDone: number;
	paymentPending: number;
	paymentProblem: number;
	paymentPercentage: number;
	// Completion matrix
	bothComplete: number;
	postalOnlyComplete: number;
	paymentOnlyComplete: number;
	neitherComplete: number;
}

export interface StatsType {
	countdowns: Countdowns;
	registered: Registered;
	age: Age;
	status?: Status;
	// New fields (optional for backward compatibility with history)
	roleBased?: RoleBased;
	committeeFillRates?: CommitteeFillRate[];
	registrationTimeline?: RegistrationTimelineEntry[];
	nationalityDistribution?: NationalityStats[];
	schoolStats?: SchoolStats[];
	waitingList?: WaitingListStats;
	supervisorStats?: SupervisorStats;
	postalPaymentProgress?: PostalPaymentProgress;
	paperStats?: PaperStats;
}

// New types for extended statistics
export interface RoleBased {
	delegationMembersWithRole: number;
	delegationMembersWithoutRole: number;
	delegationMembersWithCommittee: number;
	delegationMembersWithoutCommittee: number;
	singleParticipantsWithRole: number;
	singleParticipantsWithoutRole: number;
	delegationsWithAssignment: number;
	delegationsWithoutAssignment: number;
}

export interface CommitteeFillRate {
	committeeId: string;
	name: string;
	abbreviation: string;
	totalSeats: number;
	assignedSeats: number;
	fillPercentage: number;
}

export interface RegistrationTimelineEntry {
	date: string;
	cumulativeDelegations: number;
	cumulativeDelegationMembers: number;
	cumulativeSingleParticipants: number;
	cumulativeSupervisors: number;
}

export interface NationalityStats {
	country: string;
	countryCode: string;
	count: number;
}

export interface SchoolStats {
	school: string;
	delegationCount: number;
	memberCount: number;
}

// Paper statistics types
export interface PapersByType {
	positionPaper: number;
	workingPaper: number;
	introductionPaper: number;
}

export interface PapersByStatus {
	draft: number;
	submitted: number;
	changesRequested: number;
	accepted: number;
}

export interface PapersByCommittee {
	committeeId: string;
	name: string;
	abbreviation: string;
	count: number;
}

export interface PaperStats {
	total: number;
	byType: PapersByType;
	byStatus: PapersByStatus;
	withReviews: number;
	withoutReviews: number;
	byCommittee: PapersByCommittee[];
}

export interface Countdowns {
	daysUntilConference?: number | undefined;
	daysUntilEndRegistration?: number | undefined;
}

export interface Registered {
	total: number;
	notApplied: number;
	applied: number;
	delegations: delegations;
	delegationMembers: DelegationMembers;
	singleParticipants: SingleParticipants;
	supervisors: number;
}

export interface delegations {
	total: number;
	notApplied: number;
	applied: number;
	withSupervisor: number;
}

export interface DelegationMembers {
	total: number;
	notApplied: number;
	applied: number;
}

export interface SingleParticipants {
	total: number;
	notApplied: number;
	applied: number;
	byRole: ByRole[];
}

export interface ByRole {
	role: string;
	fontAwesomeIcon?: string | undefined | null;
	total: number;
	applied: number;
	notApplied: number;
}

// New clean age statistics types
export interface AgeCategoryBreakdown {
	categoryId: string;
	count: number;
}

export interface AgeDistributionEntry {
	age: number;
	count: number;
	byCategory: AgeCategoryBreakdown[];
}

export interface AgeCategoryStats {
	categoryId: string;
	categoryName: string;
	categoryType: 'delegationMember' | 'singleParticipant';
	count: number;
	average: number | null;
}

export interface AgeCommitteeStats {
	committeeId: string;
	committeeName: string;
	abbreviation: string;
	count: number;
	average: number | null;
}

export interface AgeOverall {
	average: number | null;
	total: number;
	missingBirthdays: number;
}

export interface Age {
	overall: AgeOverall;
	distribution: AgeDistributionEntry[];
	byCategory: AgeCategoryStats[];
	byCommittee: AgeCommitteeStats[];
}

export interface StatsTypeHistoryEntry {
	stats: StatsType;
	timestamp: string;
	conferenceId: string;
}

export interface Status {
	postalStatus: StatusObject;
	paymentStatus: StatusObject;
	didAttend: number;
}

export interface StatusObject {
	problem: number;
	done: number;
}

// Unified Filter System
// Combines registration status and role filters into a single dropdown

export type StatsFilter =
	| 'all'
	| 'applied'
	| 'notApplied'
	| 'appliedWithRole'
	| 'appliedWithoutRole';

// Default filter value (used on server and as initial client value)
const DEFAULT_FILTER: StatsFilter = 'all';

// Persisted store for filter - only accesses localStorage in browser
const statsFilterStore = persisted<StatsFilter>('statsFilter', DEFAULT_FILTER);

// Server-safe state that syncs with persisted store on client
let statsFilter = $state<StatsFilter>(DEFAULT_FILTER);

// Sync persisted store to local state on client
if (browser) {
	statsFilterStore.subscribe((value) => {
		statsFilter = value;
	});
}

export function unifiedFilter() {
	const setFilter = (newFilter: StatsFilter) => {
		statsFilter = newFilter;
		// Only persist to localStorage in browser
		if (browser) {
			statsFilterStore.set(newFilter);
		}
	};

	const getFilter = () => {
		// Return the current state (hydrated from localStorage on client)
		return statsFilter;
	};

	// Entity types for role-based filtering
	type EntityType = 'delegationMembers' | 'singleParticipants' | 'total';

	// Get filtered value for objects with total/applied/notApplied
	const getFilteredValue = (
		object:
			| {
					total: number;
					applied: number;
					notApplied: number;
					[key: string]: any;
			  }
			| undefined,
		roleBasedData?: RoleBased,
		entityType?: EntityType
	): number | undefined => {
		if (!object) return undefined;

		switch (statsFilter) {
			case 'all':
				return object.total;
			case 'applied':
				return object.applied;
			case 'notApplied':
				return object.notApplied;
			case 'appliedWithRole':
				// For role-based filters, return specific entity type value
				if (!roleBasedData) return undefined;
				if (entityType === 'delegationMembers') {
					return roleBasedData.delegationMembersWithRole;
				} else if (entityType === 'singleParticipants') {
					return roleBasedData.singleParticipantsWithRole;
				}
				// Default: return combined total
				return roleBasedData.delegationMembersWithRole + roleBasedData.singleParticipantsWithRole;
			case 'appliedWithoutRole':
				// For role-based filters, return specific entity type value
				if (!roleBasedData) return undefined;
				if (entityType === 'delegationMembers') {
					return roleBasedData.delegationMembersWithoutRole;
				} else if (entityType === 'singleParticipants') {
					return roleBasedData.singleParticipantsWithoutRole;
				}
				// Default: return combined total
				return (
					roleBasedData.delegationMembersWithoutRole + roleBasedData.singleParticipantsWithoutRole
				);
		}
	};

	// Check if current filter is role-based
	const isRoleBasedFilter = () => {
		return statsFilter === 'appliedWithRole' || statsFilter === 'appliedWithoutRole';
	};

	// Check if current filter shows applied data
	const isAppliedFilter = () => {
		return (
			statsFilter === 'applied' ||
			statsFilter === 'appliedWithRole' ||
			statsFilter === 'appliedWithoutRole'
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

// GraphQL enum type for StatsFilter
export type GraphQLStatsFilter =
	| 'ALL'
	| 'APPLIED'
	| 'NOT_APPLIED'
	| 'APPLIED_WITH_ROLE'
	| 'APPLIED_WITHOUT_ROLE';

// Map frontend filter values to GraphQL enum values
export function mapFilterToGraphQL(filter: StatsFilter): GraphQLStatsFilter {
	const mapping: Record<StatsFilter, GraphQLStatsFilter> = {
		all: 'ALL',
		applied: 'APPLIED',
		notApplied: 'NOT_APPLIED',
		appliedWithRole: 'APPLIED_WITH_ROLE',
		appliedWithoutRole: 'APPLIED_WITHOUT_ROLE'
	};
	return mapping[filter];
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

// Legacy exports for backward compatibility (can be removed after migration)
export function registrationFilter() {
	return unifiedFilter();
}

export type RoleFilter = 'all' | 'withRole' | 'withoutRole';

export function roleBasedFilter() {
	const unified = unifiedFilter();
	return {
		setRoleFilter: (newFilter: RoleFilter) => {
			// Map old role filter to new unified filter
			if (newFilter === 'withRole') {
				unified.setFilter('appliedWithRole');
			} else if (newFilter === 'withoutRole') {
				unified.setFilter('appliedWithoutRole');
			} else {
				unified.setFilter('all');
			}
		},
		getRoleFilter: (): RoleFilter => {
			const filter = unified.getFilter();
			if (filter === 'appliedWithRole') return 'withRole';
			if (filter === 'appliedWithoutRole') return 'withoutRole';
			return 'all';
		}
	};
}
