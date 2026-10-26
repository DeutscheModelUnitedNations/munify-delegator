import { z } from 'zod';

/**
 * Where the generated parts of a document go on the conference's own template: a certificate's
 * name, sessions and QR code; the contract's recipient, name, birthday and code; the consents'
 * fields. The team places them in the layout editor (`DocumentLayoutEditor.svelte`); the PDF
 * generator and the editor read the same values, stored per document in
 * `conference.documentLayouts`.
 *
 * Everything is a fraction of the page, measured from the top-left corner, so a layout survives a
 * template uploaded again at another size: `x`/`y` 0 is the left/top edge, 1 the right/bottom.
 * Three shapes of element exist:
 * - `text`: a line (or lines) of text; `x`/`y` is where its baseline starts (left aligned) or its
 *   centre (centred), `size` the font size in points;
 * - `box`: an area something is laid out in, its top-left corner, width and height;
 * - `square`: a code, its top-left corner and its side as a fraction of the page's width.
 */

const fraction = z.number().min(0).max(1);

const textPlacement = z.object({ x: fraction, y: fraction, size: z.number().min(5).max(72) });
const boxPlacement = z.object({ x: fraction, y: fraction, width: fraction, height: fraction });
const squarePlacement = z.object({ x: fraction, y: fraction, size: fraction });

export type TextPlacement = z.infer<typeof textPlacement>;
export type BoxPlacement = z.infer<typeof boxPlacement>;
export type SquarePlacement = z.infer<typeof squarePlacement>;

type ElementSpec =
	| { shape: 'text'; align: 'left' | 'center'; lines?: number; default: TextPlacement }
	| { shape: 'box'; default: BoxPlacement }
	| { shape: 'square'; default: SquarePlacement };

/** A4 in points, which the defaults were measured on. */
const A4 = { long: 842, short: 595 };
const mm = (millimetres: number) => (millimetres * A4.long) / 297;

/** Portrait A4: a fraction of the width or height from points. */
const portrait = { x: (pt: number) => pt / A4.short, y: (pt: number) => pt / A4.long };
/** Landscape A4. */
const landscape = { x: (pt: number) => pt / A4.long, y: (pt: number) => pt / A4.short };

/** A participant's name and birthday, the birthday `gap` points below, in the custom font. */
const nameAndBirthday = (top: number, gap: number) =>
	({
		name: {
			shape: 'text',
			align: 'left',
			default: { x: portrait.x(70), y: portrait.y(top), size: 14 }
		},
		birthday: {
			shape: 'text',
			align: 'left',
			default: { x: portrait.x(70), y: portrait.y(top + gap), size: 14 }
		}
	}) as const satisfies Record<string, ElementSpec>;

/**
 * Every document whose template the team can lay out, and its elements, with the positions the
 * generator used before anything could be placed.
 */
export const DOCUMENT_ELEMENTS = {
	certificate: {
		name: {
			shape: 'text',
			align: 'center',
			default: { x: 0.5, y: landscape.y(215), size: 18 }
		},
		sessions: {
			shape: 'box',
			default: { x: 0.25, y: landscape.y(255), width: 0.5, height: 0.3 }
		},
		qr: {
			shape: 'square',
			default: {
				x: landscape.x(A4.long - 48 - 84),
				y: landscape.y(A4.short - 48 - 84),
				size: landscape.x(84)
			}
		}
	},
	contract: {
		recipient: {
			shape: 'text',
			align: 'left',
			lines: 4,
			default: { x: portrait.x(mm(25)), y: portrait.y(mm(60) + 15), size: 11 }
		},
		code: {
			shape: 'square',
			default: { x: portrait.x(A4.short - 40 - 44), y: portrait.y(100), size: portrait.x(44) }
		},
		...nameAndBirthday(320, 60)
	},
	guardianConsent: nameAndBirthday(180, 60),
	mediaConsent: {
		...nameAndBirthday(225, 42),
		address: {
			shape: 'text',
			align: 'left',
			default: { x: portrait.x(70), y: portrait.y(225 + 84), size: 10 }
		}
	}
} as const satisfies Record<string, Record<string, ElementSpec>>;

export type LayoutDocument = keyof typeof DOCUMENT_ELEMENTS;

/** The documents, as a list (the GraphQL enum of `setDocumentLayout`). */
export const LAYOUT_DOCUMENTS = [
	'certificate',
	'contract',
	'guardianConsent',
	'mediaConsent'
] as const satisfies readonly LayoutDocument[];
// A document added above and left out here fails to compile.
type Missing = Exclude<LayoutDocument, (typeof LAYOUT_DOCUMENTS)[number]>;
const everyDocumentListed: Missing extends never ? true : Missing = true;
void everyDocumentListed;

/** The placement an element of a shape takes, whatever its default's values. */
type Placement<S extends ElementSpec> = S extends { shape: 'text' }
	? TextPlacement
	: S extends { shape: 'box' }
		? BoxPlacement
		: SquarePlacement;
export type DocumentLayout<D extends LayoutDocument> = {
	[E in keyof (typeof DOCUMENT_ELEMENTS)[D]]: (typeof DOCUMENT_ELEMENTS)[D][E] extends ElementSpec
		? Placement<(typeof DOCUMENT_ELEMENTS)[D][E]>
		: never;
};
export type ElementOf<D extends LayoutDocument> = keyof DocumentLayout<D> & string;

const placementSchema = { text: textPlacement, box: boxPlacement, square: squarePlacement };

function specsOf(document: LayoutDocument): [string, ElementSpec][] {
	return Object.entries(DOCUMENT_ELEMENTS[document]);
}

/** What `setDocumentLayout` accepts for a document: every element, placed. */
export function documentLayoutSchema(document: LayoutDocument) {
	return z.object(
		Object.fromEntries(specsOf(document).map(([id, spec]) => [id, placementSchema[spec.shape]]))
	);
}

/** The elements of a document in the order they are declared. */
export const elementsOf = <D extends LayoutDocument>(document: D) =>
	specsOf(document).map(([id, spec]) => ({ id, spec }));

/** The default layout of a document. */
export function defaultLayout<D extends LayoutDocument>(document: D): DocumentLayout<D> {
	return resolveDocumentLayout(document, undefined);
}

/**
 * A document's layout from what `conference.documentLayouts` holds: each element where the team
 * placed it, or its default when it was never placed or does not parse.
 */
export function resolveDocumentLayout<D extends LayoutDocument>(
	document: D,
	stored: unknown
): DocumentLayout<D> {
	const ofDocument = z.record(z.string(), z.unknown()).safeParse(stored);
	const placed = ofDocument.success
		? z.record(z.string(), z.unknown()).safeParse(ofDocument.data[document])
		: undefined;
	const layout: Record<string, TextPlacement | BoxPlacement | SquarePlacement> = {};
	for (const [id, spec] of specsOf(document)) {
		const parsed = placementSchema[spec.shape].safeParse(placed?.success ? placed.data[id] : null);
		layout[id] = parsed.success ? parsed.data : spec.default;
	}
	return toLayout(document, layout);
}

/**
 * The resolved record as the document's layout type: built from the document's own specs above, so
 * it holds every element in the right shape.
 */
function toLayout<D extends LayoutDocument>(_document: D, layout: object): DocumentLayout<D> {
	// TYPE-SAFETY-EXCEPTION: TypeScript cannot follow a record built by iterating a document's specs
	// back to the mapped type; resolveDocumentLayout fills every element from its own spec's schema.
	return layout as DocumentLayout<D>;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
/** Keeps a box of `size` inside the page when it is moved to `position`. */
const clampToPage = (position: number, size: number) => clamp(position, 0, Math.max(0, 1 - size));

/**
 * Moves one placement by `dx`/`dy` (fractions of the page), kept on the page. `aspect` is the
 * page's width over its height, which a square's height depends on.
 */
export function movePlacement<P extends TextPlacement | BoxPlacement | SquarePlacement>(
	shape: ElementSpec['shape'],
	start: P,
	dx: number,
	dy: number,
	aspect: number
): P {
	if (shape === 'box' && 'width' in start) {
		return {
			...start,
			x: clampToPage(start.x + dx, start.width),
			y: clampToPage(start.y + dy, start.height)
		};
	}
	if (shape === 'square' && 'size' in start) {
		return {
			...start,
			x: clampToPage(start.x + dx, start.size),
			y: clampToPage(start.y + dy, start.size * aspect)
		};
	}
	return { ...start, x: clamp(start.x + dx, 0, 1), y: clamp(start.y + dy, 0, 1) };
}

/** Smallest box and square the editor lets an element shrink to. */
const MIN_BOX = 0.04;

/**
 * Resizes a box (or a square, which stays square, following the larger of the two) from its
 * bottom right corner by `dx`/`dy`, never past the page's edge. A text keeps its placement: its
 * size is its font's (`resizeText`).
 */
export function resizePlacement<P extends TextPlacement | BoxPlacement | SquarePlacement>(
	shape: ElementSpec['shape'],
	start: P,
	dx: number,
	dy: number,
	aspect: number
): P {
	if (shape === 'box' && 'width' in start) {
		return {
			...start,
			width: clamp(start.width + dx, MIN_BOX, 1 - start.x),
			height: clamp(start.height + dy, MIN_BOX, 1 - start.y)
		};
	}
	if (shape === 'square' && 'size' in start) {
		const grow = Math.max(dx, dy / aspect);
		const fits = Math.min(1 - start.x, (1 - start.y) / aspect);
		return { ...start, size: clamp(start.size + grow, MIN_BOX, fits) };
	}
	return start;
}

/** Where an element is while it is dragged (or resized from its corner) by `dx`/`dy`. */
export function dragPlacement<P extends TextPlacement | BoxPlacement | SquarePlacement>(
	shape: ElementSpec['shape'],
	start: P,
	resize: boolean,
	dx: number,
	dy: number,
	aspect: number
): P {
	return resize
		? resizePlacement(shape, start, dx, dy, aspect)
		: movePlacement(shape, start, dx, dy, aspect);
}

/** A text's font size, a step at a time, within what a layout allows. */
export const resizeText = (start: TextPlacement, step: number): TextPlacement => ({
	...start,
	size: clamp(start.size + step, 5, 72)
});

/** In a page's points, with `y` measured from the bottom as PDFs count. */
export const textInPoints = (placement: TextPlacement, width: number, height: number) => ({
	x: placement.x * width,
	baseline: height - placement.y * height,
	size: placement.size
});

export const boxInPoints = (placement: BoxPlacement, width: number, height: number) => ({
	left: placement.x * width,
	width: placement.width * width,
	top: height - placement.y * height,
	bottom: height - (placement.y + placement.height) * height
});

export function squareInPoints(placement: SquarePlacement, width: number, height: number) {
	const side = placement.size * width;
	return { left: placement.x * width, bottom: height - placement.y * height - side, side };
}
