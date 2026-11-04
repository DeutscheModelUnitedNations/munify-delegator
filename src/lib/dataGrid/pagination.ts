/**
 * The buttons of a pager: the first and last page and two neighbours of the current one either
 * side. `null` stands for a gap ("…"). Pages count from one.
 */
export function pageWindow({
	current,
	pages
}: {
	current: number;
	pages: number;
}): (number | null)[] {
	const wanted = new Set([1, pages, current - 2, current - 1, current, current + 1, current + 2]);
	const numbers = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
	return numbers.flatMap((n, i) => {
		const gap = n - (numbers[i - 1] ?? n);
		if (gap === 2) return [n - 1, n];
		return gap > 2 ? [null, n] : [n];
	});
}

/** How many pages `total` rows fill, at least one. */
export function pageCount({ total, pageSize }: { total: number; pageSize: number }) {
	return Math.max(1, Math.ceil(total / pageSize));
}

/** The first and last row of a page (1-based), for "21–40 / 135". */
export function pageRange({
	pageIndex,
	pageSize,
	shown
}: {
	pageIndex: number;
	pageSize: number;
	shown: number;
}) {
	const first = pageIndex * pageSize;
	return { from: shown === 0 ? 0 : first + 1, to: first + shown };
}
