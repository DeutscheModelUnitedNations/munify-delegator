import type { ColumnFiltersState } from '$lib/components/tanStackTable';

/** Conference states in which the table opens filtered to accepted participants. */
const statesWithDefaultAcceptedFilter = ['PREPARATION', 'ACTIVE', 'POST'];

/** The filters the table opens with: "accepted" in later conference states, none otherwise. */
export function defaultColumnFilters(
	conferenceState: string | null | undefined
): ColumnFiltersState {
	if (!conferenceState || !statesWithDefaultAcceptedFilter.includes(conferenceState)) return [];
	return [{ id: 'accepted', value: true }];
}
