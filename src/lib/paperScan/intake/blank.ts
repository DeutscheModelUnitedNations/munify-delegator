import { flatten, shrink, type Picture } from '../picture';

/** A margin of a scan, as a share of it, that shows punch holes, staples and the scanner's edge. */
const MARGIN = 0.06;
/** Darker than this (of 250, the paper) something is on the page. */
const PRINTED = 170;
/** A page showing on less than this share of it is empty: a speck, the print of the other side. */
const EMPTY = 0.0015;

/** Whether a page is empty, as the back of a sheet scanned on both sides. */
export function isBlank(picture: Picture) {
	const page = flatten(shrink({ picture, maxSide: 700 }));
	const left = Math.round(page.width * MARGIN);
	const top = Math.round(page.height * MARGIN);
	let printed = 0;
	let seen = 0;
	for (let y = top; y < page.height - top; y++) {
		for (let x = left; x < page.width - left; x++) {
			seen += 1;
			if (page.data[(y * page.width + x) * 4] < PRINTED) printed += 1;
		}
	}
	return printed < seen * EMPTY;
}
