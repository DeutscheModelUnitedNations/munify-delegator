import aruco from 'js-aruco2';
import type { Point } from './markerGeometry';

/**
 * The alignment marks printed near the four corners of every application document page when
 * the conference reads its paper (`conference.paperScanning`): ArUco markers, made to be found in a
 * crooked, blurry picture, and each with an id, so which corner is which (and so how the page lies)
 * comes with them. Their centres are what a scan is aligned on (`./readPaper`).
 */

/** The ids printed at the top left, top right, bottom right and bottom left corner. */
const MARKER_IDS = [0, 1, 2, 3] as const;
const DICTIONARY = 'ARUCO_MIP_36h12';
/** A marker is its bits in a black border one cell wide. */
const BITS = 6;
export const MARKER_CELLS = BITS + 2;

let dictionary: ReturnType<typeof createDictionary> | undefined;
const createDictionary = () => new aruco.AR.Dictionary(DICTIONARY);

/**
 * The cells of the marker of `corner` (0 top left, clockwise), row by row, `true` where it is
 * black: its border and its dark bits.
 */
export function markerCells(corner: number): boolean[][] {
	dictionary ??= createDictionary();
	const bits = dictionary.codeList[MARKER_IDS[corner]];
	return Array.from({ length: MARKER_CELLS }, (_, row) =>
		Array.from({ length: MARKER_CELLS }, (_, column) => {
			const inBorder =
				row === 0 || column === 0 || row === MARKER_CELLS - 1 || column === MARKER_CELLS - 1;
			return inBorder || bits[(row - 1) * BITS + (column - 1)] === '0';
		})
	);
}

/** A picture as the browser hands it out (`ImageData`): RGBA, row by row. */
export type Picture = { width: number; height: number; data: ArrayLike<number> };

let detector: ReturnType<typeof createDetector> | undefined;
const createDetector = () => new aruco.AR.Detector({ dictionaryName: DICTIONARY });

/** The centres of the four markers in `picture`, corner by corner; `null` unless all four are there. */
export function findMarkers(picture: Picture): Point[] | null {
	detector ??= createDetector();
	const found = detector.detect(picture);
	const centers = MARKER_IDS.map((id) => {
		const marker = found.find((candidate) => candidate.id === id);
		if (!marker || marker.corners.length !== 4) return null;
		return {
			x: marker.corners.reduce((sum, corner) => sum + corner.x, 0) / 4,
			y: marker.corners.reduce((sum, corner) => sum + corner.y, 0) / 4
		};
	});
	return centers.every((center): center is Point => center !== null) ? centers : null;
}
