import { flatten, sharpen, shrink, soften, type Picture } from '../picture';

/** A code read in a picture: its text and what it is (`qr_code`, …). */
export type FoundCode = { rawValue: string; format: string };
/** Reads the codes in a picture as it is. */
export type CodeReader = (picture: Picture) => Promise<FoundCode[]>;

/** The part of `picture` from `left`/`top` on, `width` by `height` pixels. */
function cut({
	picture,
	left,
	top,
	width,
	height
}: {
	picture: Picture;
	left: number;
	top: number;
	width: number;
	height: number;
}): Picture {
	const data = new Uint8ClampedArray(width * height * 4);
	for (let y = 0; y < height; y++) {
		const start = ((top + y) * picture.width + left) * 4;
		for (let x = 0; x < width * 4; x++) data[y * width * 4 + x] = picture.data[start + x];
	}
	return { width, height, data };
}

/** `picture` twice as large, so a code of few pixels gets enough of them to be told apart. */
function enlarge(picture: Picture): Picture {
	const width = picture.width * 2;
	const height = picture.height * 2;
	const data = new Uint8ClampedArray(width * height * 4).fill(255);
	for (let y = 0; y < height; y++) {
		const down = Math.min(picture.height - 1, Math.max(0, (y - 0.5) / 2));
		const y0 = Math.floor(down);
		const y1 = Math.min(picture.height - 1, y0 + 1);
		for (let x = 0; x < width; x++) {
			const across = Math.min(picture.width - 1, Math.max(0, (x - 0.5) / 2));
			const x0 = Math.floor(across);
			const x1 = Math.min(picture.width - 1, x0 + 1);
			const value = (px: number, py: number) => picture.data[(py * picture.width + px) * 4];
			const above = value(x0, y0) * (1 - across + x0) + value(x1, y0) * (across - x0);
			const below = value(x0, y1) * (1 - across + x0) + value(x1, y1) * (across - x0);
			const at = (y * width + x) * 4;
			data[at] = data[at + 1] = data[at + 2] = above * (1 - down + y0) + below * (down - y0);
		}
	}
	return { width, height, data };
}

/** A picture larger than this shows a code's modules wide enough as it is. */
const LARGE = 2200;

/**
 * The pictures a code is looked for in, one after the other: as it is, then easier to read, then,
 * of a small one, its corners enlarged, for a code of few pixels.
 */
function* codeVariants(picture: Picture): Generator<Picture> {
	yield picture;
	const moderate = shrink({ picture, maxSide: 1800 });
	yield moderate;
	const flat = flatten(moderate);
	yield flat;
	yield soften(flat);
	yield sharpen(flat);
	if (Math.max(picture.width, picture.height) > LARGE) return;
	const grey = shrink({ picture, maxSide: LARGE });
	const width = Math.floor(grey.width * 0.6);
	const height = Math.floor(grey.height * 0.6);
	for (const top of [grey.height - height, 0]) {
		for (const left of [grey.width - width, 0]) {
			yield enlarge(cut({ picture: grey, left, top, width, height }));
		}
	}
}

/** The codes in `picture`, read by `read` in one variant after the other until one shows any. */
export async function findCodes({
	picture,
	read
}: {
	picture: Picture;
	read: CodeReader;
}): Promise<FoundCode[]> {
	for (const variant of codeVariants(picture)) {
		const codes = (await read(variant)).filter((code) => !!code.rawValue);
		if (codes.length > 0) return codes;
	}
	return [];
}
