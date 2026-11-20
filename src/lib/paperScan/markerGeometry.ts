/**
 * Where the alignment marks sit on a page (`./markers` finds and draws them). Apart from them, so
 * the document layouts know the marks' place without loading the marker library.
 */

/** A point in millimetres (on the page) or pixels (in a picture), from the top left. */
export type Point = { x: number; y: number };

/** A marker's black square (millimetres) and its distance from the page's edges. */
export const MARKER = { side: 8, inset: 9 };

/** Where the markers' centres are on a page of `page` (millimetres), corner by corner clockwise. */
export function markerCenters(page: { width: number; height: number }): Point[] {
	const near = MARKER.inset + MARKER.side / 2;
	return [
		{ x: near, y: near },
		{ x: page.width - near, y: near },
		{ x: page.width - near, y: page.height - near },
		{ x: near, y: page.height - near }
	];
}
