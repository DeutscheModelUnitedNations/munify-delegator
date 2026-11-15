/**
 * A table row's `onclick` that opens what the row stands for (CLAUDE-UI.md, "Clickable rows").
 * It is for the mouse only: the row keeps its table semantics, and a real button or link in one of
 * its cells is the way in for everyone else. Clicks on the row's own controls do their own thing,
 * and a click that ends a text selection (copying a connection code) opens nothing.
 */
export function rowClick(open: () => void) {
	return (event: MouseEvent) => {
		if (
			event.target instanceof Element &&
			event.target.closest('a, button, input, select, textarea, label')
		)
			return;
		if (window.getSelection()?.isCollapsed === false) return;
		open();
	};
}

/** The look of a row `rowClick` opens. */
export const CLICKABLE_ROW = 'hover:bg-base-200 cursor-pointer';
