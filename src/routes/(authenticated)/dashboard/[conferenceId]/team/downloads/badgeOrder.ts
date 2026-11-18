import type { Badge } from '#lib/helpers/badgeCsv';

/** A nametag with what the files sort it by. */
export interface SortableBadge {
	badge: Badge;
	/** The seat it is sorted under: a nation, role or group. */
	label: string;
	familyName: string | null;
}

/** By the seat's label, then the family name. */
function compareBadges(a: SortableBadge, b: SortableBadge) {
	return a.label.localeCompare(b.label) || (a.familyName ?? '').localeCompare(b.familyName ?? '');
}

export function sortedBadges(rows: readonly SortableBadge[]): Badge[] {
	return [...rows].sort(compareBadges).map((row) => row.badge);
}

/**
 * The nametags one check-in table hands out, in the order of its sign: the nations it serves, by
 * the name its letter was cut by (the conference's language, not the reader's), then everyone
 * without a nation.
 */
export function tableBadges({
	nations,
	nationNames,
	others
}: {
	nations: readonly (SortableBadge & { alpha3Code: string })[];
	/** The table's nations: alpha-3 code to the name they are filed under. */
	nationNames: ReadonlyMap<string, string>;
	/** Everyone without a nation, when the table serves them. */
	others: readonly SortableBadge[];
}): Badge[] {
	const served = nations.flatMap((row) => {
		const name = nationNames.get(row.alpha3Code.toUpperCase());
		return name === undefined ? [] : [{ ...row, label: name }];
	});
	return [...sortedBadges(served), ...sortedBadges(others)];
}
