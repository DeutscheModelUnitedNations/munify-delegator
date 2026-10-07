import { SvelteMap } from 'svelte/reactivity';
import type { PaperstatusEnum, PapertypeEnum } from '$lib/api/rumbleClient/client';

export type PaperSortKey =
	'country' | 'type' | 'status' | 'createdAt' | 'updatedAt' | 'firstSubmittedAt';

export interface SortConfig {
	key: PaperSortKey;
	direction: 'asc' | 'desc';
}

/** The fields of a paper row that the paper tables sort by. */
export interface SortablePaper {
	type: PapertypeEnum;
	status: PaperstatusEnum;
	createdAt: Date | null;
	updatedAt: Date | null;
	firstSubmittedAt: Date | null;
	delegation: {
		assignedNation: { alpha3Code: string } | null;
		assignedNonStateActor: { name: string } | null;
	};
}

/** A date as a sortable number, with missing dates first. */
const timeOf = (date: Date | null) => (date ? new Date(date).getTime() : 0);

/** The value each column sorts by: the nation's code, else the non-state actor's name. */
const SORT_VALUES: Record<PaperSortKey, (paper: SortablePaper) => string | number> = {
	country: ({ delegation }) =>
		delegation.assignedNation?.alpha3Code || delegation.assignedNonStateActor?.name || '',
	type: (paper) => paper.type,
	status: (paper) => paper.status,
	createdAt: (paper) => timeOf(paper.createdAt),
	updatedAt: (paper) => timeOf(paper.updatedAt),
	firstSubmittedAt: (paper) => timeOf(paper.firstSubmittedAt)
};

const compareValues = (a: string | number, b: string | number) => (a < b ? -1 : a > b ? 1 : 0);

/** A sorted copy of `papers`; without a config the original order is kept. */
export function sortPapers<P extends SortablePaper>(papers: P[], config: SortConfig | null): P[] {
	const result = [...papers];
	if (!config) return result;
	const sortValue = SORT_VALUES[config.key];
	const sign = config.direction === 'asc' ? 1 : -1;
	return result.sort((a, b) => sign * compareValues(sortValue(a), sortValue(b)));
}

/** Whether any version of the paper has been reviewed. */
export const paperHasReviews = (paper: { versions: { reviews: { id: string }[] }[] }) =>
	paper.versions.some((version) => version.reviews.length > 0);

/**
 * The sort column of each paper table, keyed by the group (agenda item) it belongs to. Clicking a
 * column sorts ascending, clicking it again flips the direction.
 */
export class PaperSortState {
	#configs = new SvelteMap<string, SortConfig>();

	get(groupId: string) {
		return this.#configs.get(groupId) ?? null;
	}

	toggle(groupId: string, key: PaperSortKey) {
		const current = this.#configs.get(groupId);
		this.#configs.set(groupId, {
			key,
			direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
		});
	}
}
