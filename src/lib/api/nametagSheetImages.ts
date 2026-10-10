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

function roundedCanvas(width = WIDTH, height = HEIGHT, radius = RADIUS) {
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
 * The icon font the sign draws with. The app shows Sharp Duotone, which paints its second tone
 * through a font feature canvas text cannot use, so only half of each icon would appear. The solid
 * Sharp font of the same release holds the whole shape; it sits beside the duotone one on the CDN
 * the app already loads its icons from. `null` when the app's icon stylesheet is not on the page.
 */
let solidIconFont: Promise<string | null> | undefined;
function loadSolidIconFont(): Promise<string | null> {
	solidIconFont ??= (async () => {
		const stylesheet = document.querySelector<HTMLLinkElement>('link[href*="sharp-duotone"]');
		if (!stylesheet) return null;
		const url = stylesheet.href.replace(/css\/[^/]*$/, 'webfonts/fa-sharp-solid-900.woff2');
		const family = 'NametagSheetIcons';
		try {
			const face = new FontFace(family, `url(${url})`, { weight: '900' });
			document.fonts.add(await face.load());
			return family;
		} catch {
			return null;
		}
	})();
	return solidIconFont;
}

/** A Font Awesome icon (as `fa-name` or `name`) on a grey tile, the way the app shows non-state actors. */
export async function iconPng(icon: string | null): Promise<Uint8Array> {
	const name = (icon ?? 'hand-point-up').replace('fa-', '');

	// the icon's character is what the app's stylesheet puts into the icon element
	const probe = document.createElement('i');
	probe.className = `fa-sharp-duotone fa-solid fa-${name}`;
	probe.style.cssText = 'position:absolute;visibility:hidden';
	document.body.appendChild(probe);
	const glyph = decodeCssString(getComputedStyle(probe, '::before').content);
	document.body.removeChild(probe);

	const { canvas, context } = roundedCanvas();
	context.fillStyle = '#E5E7EB';
	context.fillRect(0, 0, WIDTH, HEIGHT);

	const family = await loadSolidIconFont();
	if (family && glyph) {
		const size = HEIGHT * 0.6;
		context.font = `900 ${size}px ${family}`;
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
export async function urlToPng(url: string): Promise<Uint8Array | null> {
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
