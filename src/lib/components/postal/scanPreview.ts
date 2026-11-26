import { z } from 'zod';
import type { FieldState, FieldZone } from '#lib/paperScan/readPaper';
import { scanPicture } from '#lib/paperScan/intake/pages';
import { scanFileType } from '#lib/paperScan/intake/scanFile';
import { m } from '#lib/paraglide/messages';
import { browserPlatform } from './browserScan';

/** How large (longer side, pixels) a scan is drawn as a thumbnail. */
export const THUMBNAIL_SIDE = 480;

/**
 * A kept scan's file drawn as it is read, its longer side at most `maxSide` pixels (full size where
 * not given): its pixels, so the fields' zones can be laid over them.
 */
export async function loadScanPicture({ url, maxSide }: { url: string; maxSide?: number }) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(m.postalScanLoadFailed());
	const bytes = new Uint8Array(await response.arrayBuffer());
	const type = scanFileType(bytes);
	if (!type) throw new Error(m.postalScanLoadFailed());
	const picture = await scanPicture({ scan: { bytes, type }, platform: browserPlatform, maxSide });
	return picture instanceof ImageData
		? picture
		: new ImageData(new Uint8ClampedArray(picture.data), picture.width, picture.height);
}

/** Draws `picture` on the canvas it is attached to, at its own size. */
export const drawPicture = (picture: ImageData) => (canvas: HTMLCanvasElement) => {
	canvas.width = picture.width;
	canvas.height = picture.height;
	canvas.getContext('2d')?.putImageData(picture, 0, 0);
};

const storedReadings = z.array(
	z.object({ field: z.string(), state: z.enum(['yes', 'no', 'unclear']) })
);

/** What a scan's `readings` (JSON) say of each field; none where they are not readings. */
export function readingsByField(readings: unknown): Map<string, FieldState> {
	const parsed = storedReadings.safeParse(readings);
	return new Map(parsed.success ? parsed.data.map(({ field, state }) => [field, state]) : []);
}

/** Whether a field counts as detected: ticked or written in. Empty, unclear or not read is not. */
export const isDetected = (state: FieldState | undefined) => state === 'yes';

/** A zone's corners as SVG polygon points. */
export const pointsOf = ({ corners }: FieldZone) =>
	corners.map(({ x, y }) => `${x},${y}`).join(' ');
