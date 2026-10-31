/** Where a day goes among the conference's days, decided by the server from the dates alone. */

interface OrderedDay {
	date: Date;
	sortOrder: number;
}

/**
 * The sort order for a day on `date`, so that days stay in date order without anyone typing a
 * number. It goes right after the last earlier day, or before the first later one; days are
 * unique by sort order, so when that place is taken it goes last.
 */
export function daySortOrder({ date, others }: { date: Date; others: readonly OrderedDay[] }) {
	const time = date.getTime();
	const taken = new Set(others.map((d) => d.sortOrder));
	const byDate = [...others].sort(
		(a, b) => a.date.getTime() - b.date.getTime() || a.sortOrder - b.sortOrder
	);
	const previous = byDate.filter((d) => d.date.getTime() <= time).at(-1);
	const next = byDate.find((d) => d.date.getTime() > time);
	const candidate = previous ? previous.sortOrder + 1 : next ? next.sortOrder - 1 : 0;
	const fits = !taken.has(candidate) && (!next || candidate < next.sortOrder);
	return fits ? candidate : Math.max(-1, ...taken) + 1;
}
