import type { GuideScopeKind } from './scope';

/**
 * The team's list of guide pages (`team/guide`): what state a page is in, and how the list is
 * filtered and sorted.
 */

export type GuidePageState = 'DRAFT' | 'PUBLISHED' | 'CHANGED';

/** Never published, published as it stands, or published with later changes to the draft. */
export function guidePageState({
	publishedAt,
	draftUpdatedAt
}: {
	publishedAt: Date | string | null | undefined;
	draftUpdatedAt: Date | string;
}): GuidePageState {
	if (!publishedAt) return 'DRAFT';
	return new Date(draftUpdatedAt).getTime() > new Date(publishedAt).getTime()
		? 'CHANGED'
		: 'PUBLISHED';
}

export type LibraryRow = {
	id: string;
	title: string;
	kind: 'GENERAL' | 'COMMITTEE' | 'AGENDA_ITEM';
	scope: GuideScopeKind;
	state: GuidePageState;
};

export type LibraryFilter = { scope: GuideScopeKind | null; state: GuidePageState | null };

/** The rows matching the filter, general pages first, then by title. */
export function filterLibrary<R extends LibraryRow>({
	rows,
	filter,
	locale
}: {
	rows: readonly R[];
	filter: LibraryFilter;
	locale: string;
}) {
	return rows
		.filter((row) => !filter.scope || row.scope === filter.scope)
		.filter((row) => !filter.state || row.state === filter.state)
		.toSorted(
			(a, b) =>
				Number(a.kind !== 'GENERAL') - Number(b.kind !== 'GENERAL') ||
				a.title.localeCompare(b.title, locale)
		);
}

/** How many rows are in each state, for the filter chips. */
export function stateCounts(rows: readonly LibraryRow[]) {
	const counts: Record<GuidePageState, number> = { DRAFT: 0, PUBLISHED: 0, CHANGED: 0 };
	for (const row of rows) counts[row.state] += 1;
	return counts;
}
