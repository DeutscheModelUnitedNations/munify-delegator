import type { Attachment } from 'svelte/attachments';
import { masonryPlacement } from '#lib/helpers/masonryPlacement';

/** About a line of text: items of nearly the same height keep their reading order */
const TOLERANCE = 24;

/** The elements the grid lays out, reaching through wrappers that are `display: contents` */
function gridItems(parent: Element): HTMLElement[] {
	return [...parent.children].flatMap((child) => {
		if (!(child instanceof HTMLElement)) return [];
		return getComputedStyle(child).display === 'contents' ? gridItems(child) : [child];
	});
}

function release(item: HTMLElement) {
	item.style.gridColumn = '';
	item.style.gridRow = '';
}

/**
 * Moves the items of a CSS grid up into the space left by shorter ones above them. The grid keeps
 * its own columns and breakpoints and needs `items-start`, so that items have their own height;
 * without JavaScript it stays an ordinary grid. Its items may come and go and change their size.
 */
export const masonry: Attachment<HTMLElement> = (grid) => {
	let items: HTMLElement[] = [];

	function layOut() {
		// Placed items would hold on to columns the grid no longer has
		items.forEach(release);
		grid.style.gridAutoRows = '';
		grid.style.rowGap = '';

		const style = getComputedStyle(grid);
		const columns = style.gridTemplateColumns.split(' ').length;
		if (columns < 2) return;

		const measured = items.map((item) => {
			const { gridColumnStart, gridColumnEnd } = getComputedStyle(item);
			return {
				height: Math.ceil(item.getBoundingClientRect().height),
				fullWidth: gridColumnStart === '1' && gridColumnEnd === '-1'
			};
		});
		const places = masonryPlacement({
			items: measured,
			columns,
			gap: parseFloat(style.columnGap) || 0,
			tolerance: TOLERANCE
		});

		// Rows of one pixel let every item start and end anywhere
		grid.style.gridAutoRows = '1px';
		grid.style.rowGap = '0';
		places.forEach(({ column, top }, index) => {
			const { height, fullWidth } = measured[index];
			if (!fullWidth) items[index].style.gridColumn = `${column + 1}`;
			items[index].style.gridRow = `${top + 1} / span ${Math.max(height, 1)}`;
		});
	}

	// Measuring happens in the next frame, once the DOM settled: a mutation is seen in a microtask
	// while Svelte is still updating, when an item can measure 0 for a moment. Placed with that
	// height, the next item covered it, and as the item's size had not changed between two frames
	// the ResizeObserver never told.
	let frame: number | undefined;
	let resized = false;
	function schedule() {
		frame ??= requestAnimationFrame(() => {
			frame = undefined;
			const changed = collect();
			if (changed || resized) layOut();
			resized = false;
		});
	}

	// Watching the items is enough: they change their width with the grid
	const sizes = new ResizeObserver(() => {
		resized = true;
		schedule();
	});

	/** Follows the items that came and went; whether there were any */
	function collect() {
		const current = gridItems(grid);
		if (current.length === items.length && current.every((item, i) => item === items[i]))
			return false;
		for (const item of items) {
			if (current.includes(item)) continue;
			sizes.unobserve(item);
			release(item);
		}
		for (const item of current) {
			if (!items.includes(item)) sizes.observe(item);
		}
		items = current;
		return true;
	}

	const changes = new MutationObserver(schedule);
	changes.observe(grid, { childList: true, subtree: true });
	collect();
	layOut();

	return () => {
		if (frame !== undefined) cancelAnimationFrame(frame);
		changes.disconnect();
		sizes.disconnect();
	};
};
