/** The zoom levels of the layout editor's page, the page fitted to the view at 1. */
export const LAYOUT_ZOOMS = [1, 1.5, 2, 3, 4] as const;

/** The zoom one step in (`step` 1) or out (-1) from `zoom`, staying within the levels. */
export function zoomStep({ zoom, step }: { zoom: number; step: 1 | -1 }) {
	if (step > 0) return LAYOUT_ZOOMS.find((level) => level > zoom) ?? zoom;
	return LAYOUT_ZOOMS.findLast((level) => level < zoom) ?? zoom;
}

/**
 * Where to scroll along one axis after zooming by `factor`, so the point `anchor` pixels into
 * the view (its middle for the buttons, the pointer for the wheel) stays where it was.
 */
export function scrollKeeping({
	scroll,
	anchor,
	factor
}: {
	scroll: number;
	anchor: number;
	factor: number;
}) {
	return Math.max(0, (scroll + anchor) * factor - anchor);
}
