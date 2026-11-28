import { writeFileSync } from 'node:fs';
import type { Pixels } from '../../src/lib/paperScan/scanSimulation';

/**
 * A camera for the browser to film: Chromium plays a Y4M file as its camera
 * (`--use-file-for-fake-video-capture`), looping its frames.
 */

/** How dark the desk a page lies on is, 0 to 255. */
const DESK = 60;

/** `page` lying in the middle of a dark desk filmed at `width` × `height`. */
export function pageOnDesk({
	page,
	width,
	height
}: {
	page: Pixels;
	width: number;
	height: number;
}): Pixels {
	const data = new Uint8ClampedArray(width * height * 4).fill(DESK);
	const [left, top] = [
		Math.round((width - page.width) / 2),
		Math.round((height - page.height) / 2)
	];
	for (let y = 0; y < page.height; y++) {
		const row = (top + y) * width;
		if (row < 0 || top + y >= height) continue;
		for (let x = 0; x < page.width; x++) {
			if (left + x < 0 || left + x >= width) continue;
			const [from, to] = [(y * page.width + x) * 4, (row + left + x) * 4];
			data.set(page.data.subarray(from, from + 4), to);
		}
	}
	for (let at = 3; at < data.length; at += 4) data[at] = 255;
	return { width, height, data };
}

const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));

/** `frames` as one Y4M video (4:2:0, full range), written to `path`; sides must be even. */
export function writeY4m({ frames, path }: { frames: Pixels[]; path: string }) {
	const { width, height } = frames[0];
	const header = Buffer.from(`YUV4MPEG2 W${width} H${height} F10:1 Ip A1:1 C420jpeg\n`);
	const parts = [header];
	for (const { data } of frames) {
		const luma = Buffer.alloc(width * height);
		const [blue, red] = [Buffer.alloc((width * height) / 4), Buffer.alloc((width * height) / 4)];
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const at = (y * width + x) * 4;
				const [r, g, b] = [data[at], data[at + 1], data[at + 2]];
				luma[y * width + x] = clamp(0.299 * r + 0.587 * g + 0.114 * b);
				if (x % 2 === 0 && y % 2 === 0) {
					const half = (y / 2) * (width / 2) + x / 2;
					blue[half] = clamp(128 - 0.168736 * r - 0.331264 * g + 0.5 * b);
					red[half] = clamp(128 + 0.5 * r - 0.418688 * g - 0.081312 * b);
				}
			}
		}
		parts.push(Buffer.from('FRAME\n'), luma, blue, red);
	}
	writeFileSync(path, Buffer.concat(parts));
}
