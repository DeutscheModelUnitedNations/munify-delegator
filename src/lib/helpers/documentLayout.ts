import { z } from 'zod';

/**
 * Where the generated parts of a document go on the conference's own template: a certificate's
 * name, sessions and QR code; the contract's recipient, name and birthday; the consents' fields;
 * and on every page of the application documents their signed code (with the person's name and
 * id beside it) and the page number. The team places them in the layout editor
 * (`DocumentLayoutEditor.svelte`); the PDF generator and the editor read the same values, stored
 * per document in `conference.documentLayouts`. The page number is fixed in the bottom right
 * corner (`fixed`), the terms and conditions' pages too.
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

/**
 * A code is never printed smaller than its `minSide` (millimetres), so a phone still reads it off
 * paper; the PDF generator grows it further when its content needs more (`#lib/helpers/qrSize`).
 * Its caption (`caption`) goes above it or beside it. A `fixed` box (the page number) always stays
 * at its default: the editor shows it, nothing may be placed over it, and it is never stored.
 */
type ElementSpec =
	| { shape: 'text'; align: 'left' | 'center'; lines?: number; default: TextPlacement }
	| { shape: 'box'; list?: boolean; fixed?: boolean; default: BoxPlacement }
	| {
			shape: 'square';
			caption: 'above' | 'beside';
			minSide: number;
			default: SquarePlacement;
	  };

/** A4 in points, which the defaults were measured on. */
const A4 = { long: 842, short: 595 };
const mm = (millimetres: number) => (millimetres * A4.long) / 297;

/** Portrait A4: a fraction of the width or height from points. */
const portrait = { x: (pt: number) => pt / A4.short, y: (pt: number) => pt / A4.long };
/** Landscape A4. */
const landscape = { x: (pt: number) => pt / A4.long, y: (pt: number) => pt / A4.short };

/** The side of the footer code by default, in points: larger than its minimum, for good measure. */
const FOOTER_CODE = mm(30);
/** Where the footer sits by default: the right margin and the bottom one, in points. */
const FOOTER = { right: 40, bottom: 20 };
/** The page number: a fixed area in the bottom right corner, the code by default just above. */
const PAGE_NUMBER = { width: 80, height: 14, gap: 6 };

/**
 * What every page of an application document carries: the page number, fixed in the bottom right
 * corner, and the signed code with the person's name and id beside it, by default above it.
 */
const footer = {
	code: {
		shape: 'square',
		caption: 'beside',
		minSide: 28,
		default: {
			x: portrait.x(A4.short - FOOTER.right - FOOTER_CODE),
			y: portrait.y(A4.long - FOOTER.bottom - PAGE_NUMBER.height - PAGE_NUMBER.gap - FOOTER_CODE),
			size: portrait.x(FOOTER_CODE)
		}
	},
	pageNumber: {
		shape: 'box',
		fixed: true,
		default: {
			x: portrait.x(A4.short - FOOTER.right - PAGE_NUMBER.width),
			y: portrait.y(A4.long - FOOTER.bottom - PAGE_NUMBER.height),
			width: portrait.x(PAGE_NUMBER.width),
			height: portrait.y(PAGE_NUMBER.height)
		}
	}
} as const satisfies Record<string, ElementSpec>;

/** The certificate's code by default, in points. */
const CERTIFICATE_CODE = mm(36);

/** A participant's name and birthday, the birthday `gap` points below, in the custom font. */
const nameAndBirthday = ({ top, gap }: { top: number; gap: number }) =>
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
			list: true,
			default: { x: 0.25, y: landscape.y(255), width: 0.5, height: 0.3 }
		},
		qr: {
			shape: 'square',
			caption: 'above',
			minSide: 35,
			default: {
				x: landscape.x(A4.long - 48 - CERTIFICATE_CODE),
				y: landscape.y(A4.short - 48 - CERTIFICATE_CODE),
				size: landscape.x(CERTIFICATE_CODE)
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
		...nameAndBirthday({ top: 320, gap: 60 }),
		...footer
	},
	guardianConsent: { ...nameAndBirthday({ top: 180, gap: 60 }), ...footer },
	mediaConsent: {
		...nameAndBirthday({ top: 225, gap: 42 }),
		...footer,
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

/** Whether an element stays at its default, whatever was stored. */
const isFixed = (spec: ElementSpec) => spec.shape === 'box' && spec.fixed === true;

function specsOf(document: LayoutDocument): [string, ElementSpec][] {
	return Object.entries(DOCUMENT_ELEMENTS[document]);
}

/** What `setDocumentLayout` accepts for a document: every element, placed. */
export function documentLayoutSchema(document: LayoutDocument) {
	return z.object(
		Object.fromEntries(
			specsOf(document)
				.filter(([, spec]) => !isFixed(spec))
				.map(([id, spec]) => [id, placementSchema[spec.shape]])
		)
	);
}

/** The elements of a document in the order they are declared. */
export const elementsOf = <D extends LayoutDocument>(document: D) =>
	specsOf(document).map(([id, spec]) => ({ id, spec }));

/**
 * The elements of a document by shape, each with its placement in `layout` (the layout editor draws
 * each shape its own way). An element whose placement does not fit its shape is left out.
 */
export function elementsByShape({
	elements,
	layout
}: {
	elements: readonly { id: string; spec: ElementSpec }[];
	layout: Readonly<Record<string, AnyPlacement>>;
}) {
	const texts: { id: string; align: 'left' | 'center'; placement: TextPlacement }[] = [];
	const boxes: { id: string; placement: BoxPlacement; list: boolean; fixed: boolean }[] = [];
	const squares: { id: string; placement: SquarePlacement; caption: 'above' | 'beside' }[] = [];
	for (const { id, spec } of elements) {
		const placement = layout[id];
		if (!placement) continue;
		if ('width' in placement) {
			if (spec.shape === 'box')
				boxes.push({ id, placement, list: spec.list ?? false, fixed: spec.fixed ?? false });
		} else if (spec.shape === 'text') texts.push({ id, align: spec.align, placement });
		else if (spec.shape === 'square') squares.push({ id, placement, caption: spec.caption });
	}
	return { texts, boxes, squares };
}

/** The default layout of a document. */
export function defaultLayout<D extends LayoutDocument>(document: D): DocumentLayout<D> {
	return resolveDocumentLayout({ document, stored: undefined });
}

/**
 * A document's layout from what `conference.documentLayouts` holds: each element where the team
 * placed it, or its default when it was never placed or does not parse.
 */
export function resolveDocumentLayout<D extends LayoutDocument>({
	document,
	stored
}: {
	document: D;
	stored: unknown;
}): DocumentLayout<D> {
	const ofDocument = z.record(z.string(), z.unknown()).safeParse(stored);
	const placed = ofDocument.success
		? z.record(z.string(), z.unknown()).safeParse(ofDocument.data[document])
		: undefined;
	const layout: Record<string, TextPlacement | BoxPlacement | SquarePlacement> = {};
	for (const [id, spec] of specsOf(document)) {
		const parsed = placementSchema[spec.shape].safeParse(placed?.success ? placed.data[id] : null);
		layout[id] = parsed.success && !isFixed(spec) ? parsed.data : spec.default;
	}
	return toLayout({ document, layout });
}

/**
 * The resolved record as the document's layout type: built from the document's own specs above, so
 * it holds every element in the right shape.
 */
function toLayout<D extends LayoutDocument>({
	layout
}: {
	/** Only fixes `D`. */
	document: D;
	layout: object;
}): DocumentLayout<D> {
	// TYPE-SAFETY-EXCEPTION: TypeScript cannot follow a record built by iterating a document's specs
	// back to the mapped type; resolveDocumentLayout fills every element from its own spec's schema.
	return layout as DocumentLayout<D>;
}

const clamp = ({ value, min, max }: { value: number; min: number; max: number }) =>
	Math.min(Math.max(value, min), max);
/** Keeps a box of `size` inside the page when it is moved to `position`. */
const clampToPage = ({ position, size }: { position: number; size: number }) =>
	clamp({ value: position, min: 0, max: Math.max(0, 1 - size) });

type AnyPlacement = TextPlacement | BoxPlacement | SquarePlacement;

/** A drag of `start` by `dx`/`dy`; `aspect` is the page's width over its height. */
type PlacementDrag<P extends AnyPlacement> = {
	shape: ElementSpec['shape'];
	start: P;
	dx: number;
	dy: number;
	aspect: number;
};

/**
 * Moves one placement by `dx`/`dy` (fractions of the page), kept on the page. `aspect` is the
 * page's width over its height, which a square's height depends on.
 */
export function movePlacement<P extends AnyPlacement>({
	shape,
	start,
	dx,
	dy,
	aspect
}: PlacementDrag<P>): P {
	if (shape === 'box' && 'width' in start) {
		return {
			...start,
			x: clampToPage({ position: start.x + dx, size: start.width }),
			y: clampToPage({ position: start.y + dy, size: start.height })
		};
	}
	if (shape === 'square' && 'size' in start) {
		return {
			...start,
			x: clampToPage({ position: start.x + dx, size: start.size }),
			y: clampToPage({ position: start.y + dy, size: start.size * aspect })
		};
	}
	return {
		...start,
		x: clamp({ value: start.x + dx, min: 0, max: 1 }),
		y: clamp({ value: start.y + dy, min: 0, max: 1 })
	};
}

/** Smallest box and square the editor lets an element shrink to. */
const MIN_BOX = 0.04;

/** Points in a millimetre. */
export const POINTS_PER_MM = A4.long / 297;

/**
 * The smallest a code may be on a page `pageWidth` points wide, as the fraction of the width its
 * placement counts in: its `minSide`, and never more than the page.
 */
export function minSquareSize({ minSide, pageWidth }: { minSide: number; pageWidth: number }) {
	return Math.min(1, (minSide * POINTS_PER_MM) / pageWidth);
}

/** A placement's area as fractions of the page; `aspect` (width over height) gives a square's height. */
function areaOf({ placement, aspect }: { placement: AnyPlacement; aspect: number }) {
	if ('width' in placement) return placement;
	return { x: placement.x, y: placement.y, width: placement.size, height: placement.size * aspect };
}

/**
 * Whether `placement` of the element `id` would cover one of the document's fixed areas (the page
 * number); the editor refuses such a move. Texts are left out: their extent depends on the text.
 */
export function coversFixedArea({
	document,
	id,
	shape,
	placement,
	aspect
}: {
	document: LayoutDocument;
	id: string;
	shape: ElementSpec['shape'];
	placement: AnyPlacement;
	aspect: number;
}) {
	if (shape === 'text') return false;
	const area = areaOf({ placement, aspect });
	return specsOf(document).some(([other, spec]) => {
		if (other === id || !isFixed(spec)) return false;
		const fixed = areaOf({ placement: spec.default, aspect });
		return (
			area.x < fixed.x + fixed.width &&
			fixed.x < area.x + area.width &&
			area.y < fixed.y + fixed.height &&
			fixed.y < area.y + area.height
		);
	});
}

/**
 * The layout with every code at least its `minSide` on a page `pageWidth` points wide (grown from
 * its top-left corner), so the editor shows and saves what will print. A layout whose codes are
 * all large enough is the same object.
 */
export function withMinimumSizes<L extends Record<string, AnyPlacement>>({
	document,
	layout,
	pageWidth
}: {
	document: LayoutDocument;
	layout: L;
	pageWidth: number;
}): L {
	let grown = layout;
	for (const [id, spec] of specsOf(document)) {
		const placement = layout[id];
		if (spec.shape !== 'square' || !placement || 'width' in placement) continue;
		const min = minSquareSize({ minSide: spec.minSide, pageWidth });
		if (placement.size < min) grown = { ...grown, [id]: { ...placement, size: min } };
	}
	return grown;
}

/**
 * Resizes a box (or a square, which stays square, following the larger of the two) from its
 * bottom right corner by `dx`/`dy`, never past the page's edge nor below `minSize` (a square's,
 * as a fraction of the page's width). A text keeps its placement: its size is its font's
 * (`resizeText`).
 */
export function resizePlacement<P extends AnyPlacement>({
	shape,
	start,
	dx,
	dy,
	aspect,
	minSize = MIN_BOX
}: PlacementDrag<P> & { minSize?: number }): P {
	if (shape === 'box' && 'width' in start) {
		return {
			...start,
			width: clamp({ value: start.width + dx, min: MIN_BOX, max: 1 - start.x }),
			height: clamp({ value: start.height + dy, min: MIN_BOX, max: 1 - start.y })
		};
	}
	if (shape === 'square' && 'size' in start) {
		const grow = Math.max(dx, dy / aspect);
		const fits = Math.min(1 - start.x, (1 - start.y) / aspect);
		// at its minimum where the page leaves no room for it: the move keeps it on the page
		const min = Math.max(MIN_BOX, minSize);
		return {
			...start,
			size: clamp({ value: start.size + grow, min, max: Math.max(min, fits) })
		};
	}
	return start;
}

/** Where an element is while it is dragged (or resized from its corner) by `dx`/`dy`. */
export function dragPlacement<P extends TextPlacement | BoxPlacement | SquarePlacement>({
	shape,
	start,
	resize,
	dx,
	dy,
	aspect,
	minSize
}: {
	shape: ElementSpec['shape'];
	start: P;
	resize: boolean;
	dx: number;
	dy: number;
	aspect: number;
	/** A square's smallest size (`minSquareSize`). */
	minSize?: number;
}): P {
	return resize
		? resizePlacement({ shape, start, dx, dy, aspect, minSize })
		: movePlacement({ shape, start, dx, dy, aspect });
}

/** A text's font size, a step at a time, within what a layout allows. */
export const resizeText = ({
	start,
	step
}: {
	start: TextPlacement;
	step: number;
}): TextPlacement => ({
	...start,
	size: clamp({ value: start.size + step, min: 5, max: 72 })
});

/** In a page's points, with `y` measured from the bottom as PDFs count. */
export const textInPoints = ({
	placement,
	width,
	height
}: {
	placement: TextPlacement;
	width: number;
	height: number;
}) => ({
	x: placement.x * width,
	baseline: height - placement.y * height,
	size: placement.size
});

export const boxInPoints = ({
	placement,
	width,
	height
}: {
	placement: BoxPlacement;
	width: number;
	height: number;
}) => ({
	left: placement.x * width,
	width: placement.width * width,
	top: height - placement.y * height,
	bottom: height - (placement.y + placement.height) * height
});

export function squareInPoints({
	placement,
	width,
	height
}: {
	placement: SquarePlacement;
	width: number;
	height: number;
}) {
	const side = placement.size * width;
	return { left: placement.x * width, bottom: height - placement.y * height - side, side };
}
