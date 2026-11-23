/** A picture as the browser hands it out (`ImageData`): RGBA, row by row. */
export type Picture = { width: number; height: number; data: ArrayLike<number> };

/**
 * Pictures made easier to read before the markers and codes are looked for: a phone's photo has a
 * shadow across it, a cheap scan is noisy, a large one is slow. Grey all of them, since nothing read
 * here needs colour.
 */

const greyPicture = ({ width, height }: { width: number; height: number }) => ({
	width,
	height,
	data: new Uint8ClampedArray(width * height * 4).fill(255)
});

/**
 * How bright a pixel is as paper and ink tell apart (0 to 255): the darker of its red and its green.
 * Any pen is dark in one of them (blue in red, red in green), and the yellow highlight DMUN's
 * templates lay under the boxes is as bright in both as the paper.
 */
export const brightnessAt = ({ picture: { data }, at }: { picture: Picture; at: number }) =>
	Math.min(data[at], data[at + 1]);

/** `picture` in grey, its longer side at most `maxSide`, each pixel the mean of those it covers. */
export function shrink({ picture, maxSide }: { picture: Picture; maxSide: number }): Picture {
	const { data } = picture;
	const scale = Math.min(1, maxSide / Math.max(picture.width, picture.height));
	const width = Math.max(1, Math.round(picture.width * scale));
	const height = Math.max(1, Math.round(picture.height * scale));
	const out = greyPicture({ width, height });
	for (let y = 0; y < height; y++) {
		const top = Math.floor((y * picture.height) / height);
		const bottom = Math.max(top + 1, Math.floor(((y + 1) * picture.height) / height));
		for (let x = 0; x < width; x++) {
			const left = Math.floor((x * picture.width) / width);
			const right = Math.max(left + 1, Math.floor(((x + 1) * picture.width) / width));
			let sum = 0;
			for (let py = top; py < bottom; py++) {
				const row = py * picture.width;
				for (let px = left; px < right; px++) {
					// `brightnessAt`, written out: this runs for every pixel of the picture
					const from = (row + px) * 4;
					const red = data[from];
					const green = data[from + 1];
					sum += green < red ? green : red;
				}
			}
			const at = (y * width + x) * 4;
			out.data[at] = out.data[at + 1] = out.data[at + 2] = sum / ((bottom - top) * (right - left));
		}
	}
	return out;
}

/** How many blocks the shorter side is cut into to tell how the light falls (`flatten`). */
const BLOCKS = 32;
/** Darker than this nothing is paper, whatever lies around it: the desk stays dark. */
const DARKEST_PAPER = 24;

/** How bright the paper is in each block: a high percentile of it, as most of a block is paper. */
function paperBlocks({ picture, size }: { picture: Picture; size: number }) {
	const columns = Math.ceil(picture.width / size);
	const rows = Math.ceil(picture.height / size);
	const values = new Float32Array(columns * rows);
	const step = Math.max(1, Math.floor(size / 12));
	for (let row = 0; row < rows; row++) {
		for (let column = 0; column < columns; column++) {
			const seen: number[] = [];
			const bottom = Math.min(picture.height, (row + 1) * size);
			const right = Math.min(picture.width, (column + 1) * size);
			for (let y = row * size; y < bottom; y += step) {
				for (let x = column * size; x < right; x += step) {
					seen.push(picture.data[(y * picture.width + x) * 4]);
				}
			}
			seen.sort((a, b) => a - b);
			values[row * columns + column] = seen[Math.floor(seen.length * 0.9)];
		}
	}
	return { columns, rows, values };
}

type Blocks = ReturnType<typeof paperBlocks>;

/** Each block as bright as its brightest neighbour: one wholly under print takes their paper. */
function spreadPaper({ columns, rows, values }: Blocks): Blocks {
	const spread = values.map((_, index) => {
		const row = Math.floor(index / columns);
		const column = index % columns;
		let brightest = DARKEST_PAPER;
		for (let r = Math.max(0, row - 1); r <= Math.min(rows - 1, row + 1); r++) {
			for (let c = Math.max(0, column - 1); c <= Math.min(columns - 1, column + 1); c++) {
				brightest = Math.max(brightest, values[r * columns + c]);
			}
		}
		return brightest;
	});
	return { columns, rows, values: spread };
}

/** The block before a position, the one after, and how far between their centres it lies. */
function between({ position, size, count }: { position: number; size: number; count: number }) {
	const at = Math.min(count - 1, Math.max(0, position / size - 0.5));
	const first = Math.floor(at);
	return { first, second: Math.min(count - 1, first + 1), share: at - first };
}

/**
 * A grey `picture` with the light evened out: every pixel against how bright the paper is around
 * it, so a shadow across the page goes and the paper is white everywhere.
 */
export function flatten(picture: Picture): Picture {
	const { width, height } = picture;
	const size = Math.max(8, Math.round(Math.min(width, height) / BLOCKS));
	const { columns, rows, values } = spreadPaper(paperBlocks({ picture, size }));
	const acrosses = Array.from({ length: width }, (_, x) =>
		between({ position: x, size, count: columns })
	);
	const out = greyPicture({ width, height });
	for (let y = 0; y < height; y++) {
		const down = between({ position: y, size, count: rows });
		const above = down.first * columns;
		const below = down.second * columns;
		for (let x = 0; x < width; x++) {
			const { first, second, share } = acrosses[x];
			const upper = values[above + first] * (1 - share) + values[above + second] * share;
			const lower = values[below + first] * (1 - share) + values[below + second] * share;
			const paper = upper * (1 - down.share) + lower * down.share;
			const at = (y * width + x) * 4;
			out.data[at] = out.data[at + 1] = out.data[at + 2] = (picture.data[at] / paper) * 250;
		}
	}
	return out;
}

/** A grey `picture`, each pixel the mean of the nine around it: less noise, a little less sharp. */
export function soften(picture: Picture): Picture {
	const { width, height, data } = picture;
	const out = greyPicture({ width, height });
	for (let y = 0; y < height; y++) {
		const rows = [Math.max(0, y - 1), y, Math.min(height - 1, y + 1)];
		for (let x = 0; x < width; x++) {
			const left = Math.max(0, x - 1);
			const right = Math.min(width - 1, x + 1);
			let sum = 0;
			for (const row of rows) {
				const start = row * width;
				sum += data[(start + left) * 4] + data[(start + x) * 4] + data[(start + right) * 4];
			}
			const at = (y * width + x) * 4;
			out.data[at] = out.data[at + 1] = out.data[at + 2] = sum / 9;
		}
	}
	return out;
}

/** A grey `picture` with its edges raised again: out of focus, or softened by resampling. */
export function sharpen(picture: Picture): Picture {
	const blurred = soften(soften(picture));
	const { width, height, data } = picture;
	const out = greyPicture({ width, height });
	for (let at = 0; at < data.length; at += 4) {
		const value = data[at] + 1.8 * (data[at] - blurred.data[at]);
		out.data[at] = out.data[at + 1] = out.data[at + 2] = value;
	}
	return out;
}

/** A picture to try, and how many pixels of the original one of its pixels stands for. */
export type ReadingVariant = { picture: Picture; scale: number };

/**
 * The pictures tried in turn until one of them reads, the quick and likely ones first: at a moderate
 * size, the light evened out, less noise, sharper, small, and at last at its full size.
 */
export function* readingVariants(picture: Picture): Generator<ReadingVariant> {
	const variant = (tried: Picture) => ({ picture: tried, scale: picture.width / tried.width });
	const moderate = shrink({ picture, maxSide: 1800 });
	yield variant(moderate);
	const flat = flatten(moderate);
	yield variant(flat);
	yield variant(soften(flat));
	yield variant(sharpen(flat));
	yield variant(shrink({ picture: flat, maxSide: 1000 }));
	if (Math.max(picture.width, picture.height) > 2000) {
		yield variant(flatten(shrink({ picture, maxSide: 3600 })));
	}
}
