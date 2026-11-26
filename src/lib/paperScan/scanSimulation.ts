import { createCanvas } from '@napi-rs/canvas';
import { rgb, type PDFPage } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { POINTS_PER_MM } from '#lib/helpers/documentLayout';
import type { Point } from './markerGeometry';
import type { Picture } from './picture';
import { perspective } from './readPaper';

/**
 * For the tests of paper scanning (Node only): a PDF page as a scanner would see it, the text on it
 * where it stands, a print-and-scan's distortions, and a pen to fill a page in with.
 */

/** A picture with its pixels writable, as the browser's `ImageData`. */
export type Pixels = Picture & { data: Uint8ClampedArray };

/** Page `page` (from 0) of a PDF rendered at `dpi`, as the browser would hand it to the reader. */
export async function renderPdfPage({
	bytes,
	page = 0,
	dpi = 150
}: {
	bytes: Uint8Array;
	page?: number;
	dpi?: number;
}): Promise<Pixels> {
	const task = pdfjs.getDocument({ data: bytes.slice() });
	try {
		const rendered = await (await task.promise).getPage(page + 1);
		const viewport = rendered.getViewport({ scale: dpi / 72 });
		const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
		// TYPE-SAFETY-EXCEPTION: pdf.js renders into any canvas with a 2D context; it is typed for the
		// browser's, and Node's (@napi-rs/canvas) is the one it uses there.
		await rendered.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
		const { width, height, data } = canvas
			.getContext('2d')
			.getImageData(0, 0, canvas.width, canvas.height);
		return { width, height, data: new Uint8ClampedArray(data) };
	} finally {
		await task.destroy();
	}
}

/** A run of text on a page: where its baseline starts and how far it runs, in millimetres. */
type PageText = { text: string; x: number; baseline: number; width: number; size: number };

/** The text on page `page` (from 0) of a PDF, where it stands, and the page's size in points. */
export async function pdfText({ bytes, page = 0 }: { bytes: Uint8Array; page?: number }) {
	const task = pdfjs.getDocument({ data: bytes.slice() });
	try {
		const read = await (await task.promise).getPage(page + 1);
		const { width, height } = read.getViewport({ scale: 1 });
		const content = await read.getTextContent();
		const texts = content.items.flatMap((item): PageText[] => {
			if (!('str' in item) || !item.str.trim()) return [];
			const [size, , , , x, y] = item.transform;
			return [
				{
					text: item.str,
					x: x / POINTS_PER_MM,
					baseline: (height - y) / POINTS_PER_MM,
					width: item.width / POINTS_PER_MM,
					size: size / POINTS_PER_MM
				}
			];
		});
		return { texts, size: { width, height } };
	} finally {
		await task.destroy();
	}
}

/** A pseudo-random sequence, the same every run. */
function noiseOf(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1103515245 + 12345) % 2147483648;
		return state / 2147483648;
	};
}

/** The value of `channel` at a point between pixels, blended from the four around it; paper outside. */
function sample({
	picture,
	x,
	y,
	channel
}: {
	picture: Pixels;
	x: number;
	y: number;
	channel: number;
}) {
	const x0 = Math.floor(x);
	const y0 = Math.floor(y);
	const at = (px: number, py: number) =>
		px < 0 || py < 0 || px >= picture.width || py >= picture.height
			? 255
			: picture.data[(py * picture.width + px) * 4 + channel];
	const fx = x - x0;
	const fy = y - y0;
	const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
	const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
	return top * (1 - fy) + bottom * fy;
}

/**
 * `picture` as it comes back from a home printer and a scanner: scaled (a print fit to the page),
 * turned by `angle` degrees about its centre and laid in by `quarters` quarter turns (clockwise),
 * resampled smoothly as a scanner does, on grey paper with noise. The picture keeps its size (a quarter
 * turn swaps its sides); what falls outside is paper.
 */
export function simulateScan({
	picture,
	angle = 0,
	scale = 1,
	quarters = 0,
	noise = 0
}: {
	picture: Pixels;
	angle?: number;
	scale?: number;
	quarters?: number;
	noise?: number;
}): Pixels {
	const lying = quarters % 2 === 1;
	const width = lying ? picture.height : picture.width;
	const height = lying ? picture.width : picture.height;
	const out = new Uint8ClampedArray(picture.data.length);
	const turn = ((angle + quarters * 90) * Math.PI) / 180;
	const [cos, sin] = [Math.cos(turn), Math.sin(turn)];
	const [cx, cy] = [width / 2, height / 2];
	const [pageX, pageY] = [picture.width / 2, picture.height / 2];
	const random = noiseOf(42);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			// where this pixel of the scan was on the page
			const dx = (x - cx) / scale;
			const dy = (y - cy) / scale;
			const sx = pageX + dx * cos + dy * sin;
			const sy = pageY - dx * sin + dy * cos;
			const grain = (random() - 0.5) * noise;
			const at = (y * width + x) * 4;
			for (let channel = 0; channel < 3; channel++) {
				// grey paper: white comes back at 92 %
				out[at + channel] = sample({ picture, x: sx, y: sy, channel }) * 0.92 + grain;
			}
			out[at + 3] = 255;
		}
	}
	return { width, height, data: out };
}

/**
 * `picture` as a phone photographs it: the page seen at an angle (`tilt`, how far the top edge
 * draws in, as a share of the width), in a frame `margin` larger on a dark desk, a shadow falling
 * across it (`shadow`, how dark it gets at the bottom right), out of focus by `blur` pixels, noisy.
 * `covered` names corners (0 top left, clockwise) a thumb or a clip lies on.
 */
export function simulatePhoto({
	picture,
	tilt = 0,
	shadow = 0,
	blur = 0,
	noise = 0,
	margin = 0.06,
	covered = []
}: {
	picture: Pixels;
	tilt?: number;
	shadow?: number;
	blur?: number;
	noise?: number;
	margin?: number;
	covered?: readonly number[];
}): Pixels {
	const { width, height } = picture;
	const [ox, oy] = [Math.round(width * margin), Math.round(height * margin)];
	const [outWidth, outHeight] = [width + 2 * ox, height + 2 * oy];
	const out = new Uint8ClampedArray(outWidth * outHeight * 4);
	const random = noiseOf(7);
	const inset = width * tilt;
	// the four corners of the page in the photo, and from the photo back to the page
	const toPage = perspective({
		from: [
			{ x: ox + inset, y: oy },
			{ x: ox + width - inset, y: oy },
			{ x: ox + width, y: oy + height },
			{ x: ox, y: oy + height }
		],
		to: [
			{ x: 0, y: 0 },
			{ x: width, y: 0 },
			{ x: width, y: height },
			{ x: 0, y: height }
		]
	});
	const thumbs = covered.map((corner) => ({
		x: corner === 1 || corner === 2 ? width * 0.94 : width * 0.06,
		y: corner < 2 ? height * 0.1 : height * 0.9,
		radius: width * 0.05
	}));
	const DESK = 50;
	const THUMB = 170;
	/** What lies on the page there instead of it, if anything does. */
	const covering = ({ x, y }: Point) => {
		if (x < 0 || y < 0 || x > width - 1 || y > height - 1) return DESK;
		const under = thumbs.some((t) => Math.hypot(x - t.x, y - t.y) < t.radius);
		return under ? THUMB : undefined;
	};
	for (let y = 0; y < outHeight; y++) {
		for (let x = 0; x < outWidth; x++) {
			const page = toPage({ x, y });
			const covered = covering(page);
			const light = 1 - shadow * Math.max(0, (x / outWidth + y / outHeight) / 2);
			const grain = (random() - 0.5) * noise;
			const at = (y * outWidth + x) * 4;
			for (let channel = 0; channel < 3; channel++) {
				const value = covered ?? sample({ picture, x: page.x, y: page.y, channel });
				out[at + channel] = value * 0.95 * light + grain;
			}
			out[at + 3] = 255;
		}
	}
	const photo = { width: outWidth, height: outHeight, data: out };
	return blur > 0 ? boxBlur({ picture: photo, radius: blur }) : photo;
}

/** `picture` averaged over `radius` pixels each way, twice, which is close to a lens out of focus. */
function boxBlur({ picture, radius }: { picture: Pixels; radius: number }): Pixels {
	const { width, height } = picture;
	let source = picture.data;
	for (const [stepX, stepY] of [
		[1, 0],
		[0, 1],
		[1, 0],
		[0, 1]
	]) {
		const target = new Uint8ClampedArray(source.length);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				for (let channel = 0; channel < 4; channel++) {
					let sum = 0;
					for (let offset = -radius; offset <= radius; offset++) {
						const px = Math.min(width - 1, Math.max(0, x + offset * stepX));
						const py = Math.min(height - 1, Math.max(0, y + offset * stepY));
						sum += source[(py * width + px) * 4 + channel];
					}
					target[(y * width + x) * 4 + channel] = sum / (2 * radius + 1);
				}
			}
		}
		source = target;
	}
	return { width, height, data: source };
}

/** A pen on a PDF page, in millimetres from the top left: light blue ballpoint ink. */
export function penOn(page: PDFPage) {
	const { height } = page.getSize();
	const ink = rgb(0.25, 0.35, 0.85);
	const line = (from: Point, to: Point) =>
		page.drawLine({
			start: { x: from.x * POINTS_PER_MM, y: height - from.y * POINTS_PER_MM },
			end: { x: to.x * POINTS_PER_MM, y: height - to.y * POINTS_PER_MM },
			thickness: 0.9,
			color: ink
		});
	return {
		/** A cross in a box. */
		cross({
			x,
			y,
			width,
			height: boxHeight
		}: {
			x: number;
			y: number;
			width: number;
			height: number;
		}) {
			line({ x: x + 0.6, y: y + 0.6 }, { x: x + width - 0.6, y: y + boxHeight - 0.6 });
			line({ x: x + width - 0.6, y: y + 0.6 }, { x: x + 0.6, y: y + boxHeight - 0.6 });
		},
		/** Handwriting `length` millimetres long, a little above `line`, from `x` on. */
		write({ x, line: baseline, length }: { x: number; line: number; length: number }) {
			let last = { x, y: baseline - 1.5 };
			for (let step = 1; step * 0.8 <= length; step++) {
				const next = { x: x + step * 0.8, y: baseline - 2 - Math.sin(step * 0.9) * 1.5 };
				line(last, next);
				last = next;
			}
		}
	};
}
