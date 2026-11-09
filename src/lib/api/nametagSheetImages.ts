import { client } from '#lib/api/rumbleClient/client';
import outfitRegularUrl from '@fontsource/outfit/files/outfit-latin-400-normal.woff?url';
import outfitBoldUrl from '@fontsource/outfit/files/outfit-latin-700-normal.woff?url';

/**
 * Pictures for the nametag table signs. A PDF takes PNG or JPEG, while the app shows flags as SVG
 * and non-state actor icons as icon-font glyphs, so both are drawn onto a canvas here.
 */

const flagFiles = import.meta.glob('/node_modules/flag-icons/flags/4x3/*.svg', {
	query: '?url',
	import: 'default'
});

/** Everything is drawn at 4:3, like the flags in the rest of the app. */
const WIDTH = 192;
const HEIGHT = 144;
const RADIUS = 14;

function roundedCanvas({
	width = WIDTH,
	height = HEIGHT,
	radius = RADIUS
}: { width?: number; height?: number; radius?: number } = {}) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) throw new Error('No canvas available');
	context.beginPath();
	context.roundRect(0, 0, width, height, radius);
	context.clip();
	return { canvas, context };
}

async function pngOf(canvas: HTMLCanvasElement): Promise<Uint8Array> {
	const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
	if (!blob) throw new Error('Could not encode the image');
	return new Uint8Array(await blob.arrayBuffer());
}

function loadImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image();
		// Stored files come from the bucket, another origin: without CORS the image would taint
		// the canvas, and encoding it would fail.
		image.crossOrigin = 'anonymous';
		image.onload = () => resolve(image);
		image.onerror = () => reject(new Error(`Could not load ${url}`));
		image.src = url;
	});
}

/**
 * The text of a computed `content` value. It is a quoted string, possibly followed by alt text
 * (`"<glyph>" / ""`), and icon fonts' private-use characters may come back as escapes
 * (`"\\f0c0"`); both are handled here.
 */
function decodeCssString(content: string): string {
	const quoted = /^"((?:[^"\\]|\\.)*)"|^'((?:[^'\\]|\\.)*)'/.exec(content);
	const text = quoted?.slice(1).find(Boolean) ?? '';
	return text.replace(/\\([0-9a-f]{1,6})\s?/gi, (_match, hex: string) =>
		String.fromCodePoint(Number.parseInt(hex, 16))
	);
}

/** The flag of a nation (lower case alpha-2 code), or `null` when there is none. */
export async function flagPng(alpha2Code: string): Promise<Uint8Array | null> {
	const load = flagFiles[`/node_modules/flag-icons/flags/4x3/${alpha2Code.toLowerCase()}.svg`];
	if (!load) return null;
	const url = await load();
	if (typeof url !== 'string') return null;
	const image = await loadImage(url);
	const { canvas, context } = roundedCanvas();
	context.drawImage(image, 0, 0, WIDTH, HEIGHT);
	return pngOf(canvas);
}

/**
 * The icon font the sign draws with: Phosphor's fill weight, whose glyphs are whole shapes (the
 * duotone weight paints its second tone as a separate layer canvas text cannot reproduce). The
 * app's stylesheet declares it; `null` when it cannot be loaded.
 */
const ICON_FONT = 'Phosphor-Fill';
let iconFont: Promise<string | null> | undefined;
function loadIconFont(): Promise<string | null> {
	iconFont ??= document.fonts
		.load(`1em "${ICON_FONT}"`)
		.then((faces) => (faces.length > 0 ? ICON_FONT : null))
		.catch(() => null);
	return iconFont;
}

/** A Phosphor icon (by name, without `ph-`) on a grey tile, the way the app shows non-state actors. */
export async function iconPng(icon: string | null): Promise<Uint8Array> {
	const name = icon || 'hand-pointing';

	// the icon's character is what the app's stylesheet puts into the icon element
	const probe = document.createElement('i');
	probe.className = `ph-fill ph-${name}`;
	probe.style.cssText = 'position:absolute;visibility:hidden';
	document.body.appendChild(probe);
	const glyph = decodeCssString(getComputedStyle(probe, '::before').content);
	document.body.removeChild(probe);

	const { canvas, context } = roundedCanvas();
	context.fillStyle = '#E5E7EB';
	context.fillRect(0, 0, WIDTH, HEIGHT);

	const family = await loadIconFont();
	if (family && glyph) {
		const size = HEIGHT * 0.6;
		context.font = `${size}px "${family}"`;
		context.fillStyle = '#1B1837';
		context.textAlign = 'center';
		context.textBaseline = 'alphabetic';
		// centred on what is drawn, since icons differ in how far they sit from the baseline
		const box = context.measureText(glyph);
		context.fillText(
			glyph,
			WIDTH / 2,
			HEIGHT / 2 + (box.actualBoundingBoxAscent - box.actualBoundingBoxDescent) / 2
		);
	}
	return pngOf(canvas);
}

/** Any image the browser can show (the conference logo), as PNG. `null` if it cannot be read. */
async function urlToPng(url: string): Promise<Uint8Array | null> {
	try {
		const image = await loadImage(url);
		const canvas = document.createElement('canvas');
		canvas.width = Math.max(image.naturalWidth, 1);
		canvas.height = Math.max(image.naturalHeight, 1);
		const context = canvas.getContext('2d');
		if (!context) return null;
		context.drawImage(image, 0, 0);
		return await pngOf(canvas);
	} catch {
		return null;
	}
}

/** The conference's name, logo and emblem and the fonts every sheet is set in. */
export async function loadSheetAssets(conferenceId: string) {
	const [conference, regular, bold] = await Promise.all([
		client.query.conference({
			__args: { id: conferenceId },
			title: true,
			logoFile: { url: true },
			emblemFile: { url: true }
		}),
		fetch(outfitRegularUrl).then((response) => response.arrayBuffer()),
		fetch(outfitBoldUrl).then((response) => response.arrayBuffer())
	]);
	const [logo, emblem] = await Promise.all([
		fileToPng(conference.logoFile ?? conference.emblemFile),
		fileToPng(conference.emblemFile)
	]);
	return { conferenceTitle: conference.title, logo, emblem, fonts: { regular, bold } };
}

/** A stored image as PNG; `null` when there is none or it cannot be read. */
async function fileToPng(file: { url: string } | null) {
	return file ? urlToPng(file.url) : null;
}
