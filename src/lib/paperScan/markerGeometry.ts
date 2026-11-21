/**
 * The alignment marks' size, and the points a page is aligned on (`./markers` finds and draws the
 * marks; where they go is the layout's, `#lib/helpers/documentLayout`). Apart from the marker
 * library, so the document layouts know the size without loading it.
 */

/** A point in millimetres (on the page) or pixels (in a picture), from the top left. */
export type Point = { x: number; y: number };

/** A mark's black square, in millimetres. */
export const MARKER = { side: 8 };
