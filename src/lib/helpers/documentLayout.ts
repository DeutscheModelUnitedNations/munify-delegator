import { z } from 'zod';
import { PAPER_FIELDS, type PaperField, type PaperMark } from '#lib/paperScan/fields';
import { MARKER } from '#lib/paperScan/markerGeometry';

/**
 * Where the generated parts of a document go on the conference's own template: a certificate's
 * name, sessions and QR code; the contract's recipient, name and birthday; the consents' fields;
 * and on every page of the application documents their signed code (with the person's name and
 * id below it) and the page number. The team places them in the layout editor
 * (`DocumentLayoutEditor.svelte`); the PDF generator and the editor read the same values, stored
 * per document in `conference.documentLayouts`. The page number is fixed in the bottom right
 * corner (`fixed`), the terms and conditions' pages too. The application documents also carry four
 * alignment marks (fixed, clear of DMUN's banner and footer) and the fields a scan is read for,
 * each named as its `#lib/paperScan/fields` field (what is ticked, written and signed), each on a
 * page of its template (`#lib/paperScan`).
 *
 * Everything is a fraction of the page, measured from the top-left corner, so a layout survives a
 * template uploaded again at another size: `x`/`y` 0 is the left/top edge, 1 the right/bottom.
 * Four shapes of element exist:
 * - `text`: a line (or lines) of text; `x`/`y` is where its baseline starts (left aligned) or its
 *   centre (centred), `size` the font size in points;
 * - `box`: an area something is laid out in, its top-left corner, width and height;
 * - `square`: a code, its top-left corner and its side as a fraction of the page's width;
 * - `field`: a box to tick or a line to sign on, drawn by us and read off a scan, on the page of
 *   its template `page` says (counted from 0).
 *
 * What is inserted for a person to read (a text, the certificate's sessions) can be switched off
 * (`hidden`) where a template has no use for it; its placement is kept for switching it on again.
 */

const fraction = z.number().min(0).max(1);

const hidden = z.boolean().optional();
const area = { x: fraction, y: fraction, width: fraction, height: fraction };

const textPlacement = z.object({
	x: fraction,
	y: fraction,
	size: z.number().min(5).max(72),
	hidden
});
const boxPlacement = z.object({ ...area, hidden });
const squarePlacement = z.object({ x: fraction, y: fraction, size: fraction });
const fieldPlacement = z.object({ ...area, page: z.number().int().min(0).max(99) });

export type TextPlacement = z.infer<typeof textPlacement>;
export type BoxPlacement = z.infer<typeof boxPlacement>;
export type SquarePlacement = z.infer<typeof squarePlacement>;
export type FieldPlacement = z.infer<typeof fieldPlacement>;

/**
 * A code is never printed smaller than its `minSide` (millimetres), so a phone still reads it off
 * paper; the PDF generator grows it further when its content needs more (`#lib/helpers/qrSize`).
 * Its caption (`caption`) goes above it or below it. A `fixed` box (the page number) always stays
 * at its default: the editor shows it, nothing may be placed over it, and it is never stored.
 */
type ElementSpec =
	| { shape: 'text'; align: 'left' | 'center'; lines?: number; default: TextPlacement }
	| {
			shape: 'box';
			list?: boolean;
			fixed?: boolean;
			default: BoxPlacement;
	  }
	| { shape: 'field'; field: PaperField; default: FieldPlacement }
	| {
			shape: 'square';
			caption: 'above' | 'below';
			minSide: number;
			default: SquarePlacement;
	  };

/** A4 in points, which the defaults were measured on. */
const A4 = { long: 842, short: 595 };
const mm = (millimetres: number) => (millimetres * A4.long) / 297;

/** Portrait A4: a fraction of the width or height from points. */
const portrait = { x: (pt: number) => pt / A4.short, y: (pt: number) => pt / A4.long };

/**
 * The side of the footer code by default, in points: larger than its minimum, so the densest
 * pages' codes (six to eight fields: 34.7 mm) print at the size the editor shows.
 */
const FOOTER_CODE = mm(35);
/**
 * Where the footer sits by default: the right margin and the bottom one, in points. The right one
 * keeps the page number and the code clear of the bottom right alignment mark.
 */
const FOOTER = { right: 54, bottom: 20 };
/** The page number: a fixed area in the bottom right corner, the code by default just above. */
const PAGE_NUMBER = { width: 80, height: 14, gap: 6 };
/** The page number's upper edge, in points from the page's lower one. */
export const PAGE_NUMBER_TOP = FOOTER.bottom + PAGE_NUMBER.height;
/** The room the code's caption takes below it, in points (`#lib/helpers/codeCaption`). */
const CAPTION_HEIGHT = 16;

/**
 * What every page of an application document carries: the page number, fixed in the bottom right
 * corner, and the signed code with the person's id and name below it, by default above it.
 */
const footer = {
	code: {
		shape: 'square',
		caption: 'below',
		minSide: 28,
		default: {
			x: portrait.x(A4.short - FOOTER.right - FOOTER_CODE),
			y: portrait.y(A4.long - PAGE_NUMBER_TOP - PAGE_NUMBER.gap - CAPTION_HEIGHT - FOOTER_CODE),
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

/**
 * The footer with the code higher up, `top` millimetres into the page, for DMUN's forms whose
 * signatures reach down to where the footer's code is.
 */
const withCodeAt = (top: number) =>
	({
		...footer,
		code: { ...footer.code, default: { ...footer.code.default, y: portrait.y(mm(top)) } }
	}) as const satisfies Record<string, ElementSpec>;

/**
 * An alignment mark (`#lib/paperScan/markers`) centred `x`/`y` millimetres into the page, fixed
 * like the page number: nothing is placed over it, and it is never moved, so a mark dragged into
 * the text cannot make pages hard to read. Each page's code still says where its marks are, so
 * moving these defaults never breaks a page printed before.
 */
const markerBox = ({ x, y }: { x: number; y: number }) =>
	({
		shape: 'box',
		fixed: true,
		default: {
			x: portrait.x(mm(x - MARKER.side / 2)),
			y: portrait.y(mm(y - MARKER.side / 2)),
			width: portrait.x(mm(MARKER.side)),
			height: portrait.y(mm(MARKER.side))
		}
	}) as const satisfies ElementSpec;
/** The marks by default: near the corners, below DMUN's banner and above its footer. */
const markers = {
	markerTopLeft: markerBox({ x: 13, y: 31 }),
	markerTopRight: markerBox({ x: 197, y: 31 }),
	markerBottomRight: markerBox({ x: 197, y: 266 }),
	markerBottomLeft: markerBox({ x: 13, y: 266 })
} as const satisfies Record<string, ElementSpec>;

/** A field to read off a scan, by default where DMUN's forms have it (millimetres, `page` from 0). */
const paperField = ({
	field,
	left,
	top,
	width,
	height,
	page = 0
}: {
	field: PaperField;
	left: number;
	top: number;
	width: number;
	height: number;
	page?: number;
}) =>
	({
		shape: 'field',
		field,
		default: {
			x: portrait.x(mm(left)),
			y: portrait.y(mm(top)),
			width: portrait.x(mm(width)),
			height: portrait.y(mm(height)),
			page
		}
	}) as const satisfies ElementSpec;

/**
 * A box to tick at `left`/`top` (millimetres), by default exactly over the forms' ☐ (2.6 mm), so
 * the frame we print lies on the form's own and reading skips both.
 */
const checkbox = ({
	field,
	top,
	left = 20.45,
	size = 2.6,
	page = 0
}: {
	field: PaperField;
	top: number;
	left?: number;
	size?: number;
	page?: number;
}) => paperField({ field, left, top, width: size, height: size, page });

/** A line to write on from `left` to `right`, `line` millimetres down, with `height` room above it. */
const writingLine = ({
	field,
	left,
	right,
	line,
	height,
	page = 0
}: {
	field: PaperField;
	left: number;
	right: number;
	line: number;
	height: number;
	page?: number;
}) => paperField({ field, left, top: line - height, width: right - left, height, page });

/** The smallest a field may be drawn, in millimetres: a box still to tick, a line to write on. */
const MIN_FIELD_MM: Record<PaperMark, { width: number; height: number }> = {
	checkbox: { width: 2.5, height: 2.5 },
	line: { width: 25, height: 4 }
};

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
	// portrait like DMUN's certificates: the name below the title and the line introducing it, the
	// sessions below the text about the conference
	certificate: {
		name: {
			shape: 'text',
			align: 'center',
			default: { x: 0.5, y: portrait.y(215), size: 18 }
		},
		sessions: {
			shape: 'box',
			list: true,
			default: { x: 0.2, y: 0.62, width: 0.5, height: 0.25 }
		},
		qr: {
			shape: 'square',
			caption: 'above',
			minSide: 35,
			default: {
				x: portrait.x(A4.short - 48 - CERTIFICATE_CODE),
				y: portrait.y(A4.long - 48 - CERTIFICATE_CODE),
				size: portrait.x(CERTIFICATE_CODE)
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
		// right of the recipient, clear of where a letter is folded
		...withCodeAt(56),
		...markers,
		// the form's ◯, which reading inside its square leaves out
		termsAccepted: checkbox({ field: 'termsAccepted', left: 20.07, top: 231.1, size: 3.7 }),
		termsPlaceDate: writingLine({
			field: 'termsPlaceDate',
			left: 20,
			right: 70.4,
			line: 251.9,
			height: 8
		}),
		termsSignature: writingLine({
			field: 'termsSignature',
			left: 75.8,
			right: 184.4,
			line: 251.9,
			height: 8
		})
	},
	guardianConsent: {
		...nameAndBirthday({ top: 184, gap: 60 }),
		...footer,
		...markers,
		guardianPlaceDate: writingLine({
			field: 'guardianPlaceDate',
			left: 20,
			right: 74.3,
			line: 164.1,
			height: 8
		}),
		guardian1Name: writingLine({
			field: 'guardian1Name',
			left: 20,
			right: 95.6,
			line: 182.3,
			height: 10
		}),
		guardian2Name: writingLine({
			field: 'guardian2Name',
			left: 104.2,
			right: 179.8,
			line: 182.3,
			height: 10
		}),
		guardian1Signature: writingLine({
			field: 'guardian1Signature',
			left: 20,
			right: 95.6,
			line: 204,
			height: 12
		}),
		guardian2Signature: writingLine({
			field: 'guardian2Signature',
			left: 104.2,
			right: 179.8,
			line: 204,
			height: 12
		})
	},
	mediaConsent: {
		...nameAndBirthday({ top: 225, gap: 42 }),
		// the one place free on all three pages
		...withCodeAt(84),
		address: {
			shape: 'text',
			align: 'left',
			default: { x: portrait.x(70), y: portrait.y(225 + 84), size: 10 }
		},
		...markers,
		// the first page: how the person may be shown
		mediaPhoto: checkbox({ field: 'mediaPhoto', top: 138.6 }),
		mediaVideo: checkbox({ field: 'mediaVideo', top: 146.56 }),
		mediaByDmun: checkbox({ field: 'mediaByDmun', top: 154.52 }),
		mediaByOthers: checkbox({ field: 'mediaByOthers', top: 162.52 }),
		// the second: what for
		mediaInternal: checkbox({ field: 'mediaInternal', top: 59.44, page: 1 }),
		mediaDocumentation: checkbox({ field: 'mediaDocumentation', top: 76.28, page: 1 }),
		mediaPapers: checkbox({ field: 'mediaPapers', top: 88.69, page: 1 }),
		mediaPress: checkbox({ field: 'mediaPress', top: 101.13, page: 1 }),
		mediaWebsite: checkbox({ field: 'mediaWebsite', top: 109.09, page: 1 }),
		mediaSocial: checkbox({ field: 'mediaSocial', top: 125.98, page: 1 }),
		mediaSearch: checkbox({ field: 'mediaSearch', top: 138.39, page: 1 }),
		mediaAdvertising: checkbox({ field: 'mediaAdvertising', top: 146.35, page: 1 }),
		// the third: signed by the person, and for a minor by the guardians
		mediaPlaceDate: writingLine({
			field: 'mediaPlaceDate',
			left: 20,
			right: 93.2,
			line: 103.5,
			height: 8,
			page: 2
		}),
		mediaSignature: writingLine({
			field: 'mediaSignature',
			left: 20,
			right: 138.1,
			line: 127.8,
			height: 8,
			page: 2
		}),
		mediaGuardian1Name: writingLine({
			field: 'mediaGuardian1Name',
			left: 26.6,
			right: 88.6,
			line: 166.5,
			height: 4.5,
			page: 2
		}),
		mediaGuardian2Name: writingLine({
			field: 'mediaGuardian2Name',
			left: 85.2,
			// the form's "[Vor- und Nachname" follows the line at once
			right: 148.3,
			line: 177.8,
			height: 4.5,
			page: 2
		}),
		mediaGuardianPlaceDate: writingLine({
			field: 'mediaGuardianPlaceDate',
			left: 20,
			right: 97.5,
			line: 228.4,
			height: 8,
			page: 2
		}),
		mediaGuardian1Signature: writingLine({
			field: 'mediaGuardian1Signature',
			left: 20,
			right: 95.6,
			line: 252.8,
			height: 10,
			page: 2
		}),
		mediaGuardian2Signature: writingLine({
			field: 'mediaGuardian2Signature',
			left: 104.2,
			right: 180.9,
			line: 252.8,
			height: 10,
			page: 2
		})
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
		: S extends { shape: 'field' }
			? FieldPlacement
			: SquarePlacement;
export type DocumentLayout<D extends LayoutDocument> = {
	[E in keyof (typeof DOCUMENT_ELEMENTS)[D]]: (typeof DOCUMENT_ELEMENTS)[D][E] extends ElementSpec
		? Placement<(typeof DOCUMENT_ELEMENTS)[D][E]>
		: never;
};
export type ElementOf<D extends LayoutDocument> = keyof DocumentLayout<D> & string;

const placementSchema = {
	text: textPlacement,
	box: boxPlacement,
	square: squarePlacement,
	field: fieldPlacement
};

/**
 * Whether an element is put in for a person to read and can be switched off: a text, or a box that
 * is not fixed. Codes, marks, the page number and the fields read off a scan always stay.
 */
const isInsertion = (spec: ElementSpec) =>
	spec.shape === 'text' || (spec.shape === 'box' && !isFixed(spec));

/** The insertions of a document, in the order they are declared, and whether `layout` shows each. */
export function insertionsOf({
	elements,
	layout
}: {
	elements: readonly { id: string; spec: ElementSpec }[];
	layout: Readonly<Record<string, AnyPlacement>>;
}) {
	return elements
		.filter(({ spec }) => isInsertion(spec))
		.map(({ id }) => ({ id, shown: !isHidden(layout[id]) }));
}

/** Whether an element is switched off. */
export const isHidden = (placement: AnyPlacement | undefined) =>
	placement !== undefined && 'hidden' in placement && placement.hidden === true;

/** An insertion's placement, switched on or off; anything else stays as it is. */
export function withHidden<P extends AnyPlacement>({
	placement,
	hidden
}: {
	placement: P;
	hidden: boolean;
}): P {
	if ('page' in placement) return placement;
	return { ...placement, hidden: hidden || undefined };
}

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

/** A box as the editor lists it: what it holds, and whether it may be moved. */
const boxEntry = ({
	id,
	placement,
	spec
}: {
	id: string;
	placement: BoxPlacement;
	spec: Extract<ElementSpec, { shape: 'box' }>;
}) => ({
	id,
	placement,
	list: spec.list ?? false,
	fixed: spec.fixed ?? false
});

/** A field as the editor and the generator list it: with what is drawn for it. */
const fieldEntry = ({
	id,
	placement,
	field
}: {
	id: string;
	placement: FieldPlacement;
	field: PaperField;
}) => ({ id, placement, field, mark: PAPER_FIELDS[field].mark });

/**
 * The elements of a document by shape, each with its placement in `layout` (the layout editor draws
 * each shape its own way). An element that is switched off, or whose placement does not fit its shape,
 * is left out.
 */
export function elementsByShape({
	elements,
	layout
}: {
	elements: readonly { id: string; spec: ElementSpec }[];
	layout: Readonly<Record<string, AnyPlacement>>;
}) {
	const texts: { id: string; align: 'left' | 'center'; placement: TextPlacement }[] = [];
	const boxes: ReturnType<typeof boxEntry>[] = [];
	const squares: { id: string; placement: SquarePlacement; caption: 'above' | 'below' }[] = [];
	for (const { id, spec } of elements) {
		const placement = layout[id];
		if (!placement || 'page' in placement || isHidden(placement)) continue;
		if ('width' in placement) {
			if (spec.shape === 'box') boxes.push(boxEntry({ id, placement, spec }));
		} else if (spec.shape === 'text') texts.push({ id, align: spec.align, placement });
		else if (spec.shape === 'square') squares.push({ id, placement, caption: spec.caption });
	}
	const fields = elements.flatMap(({ id, spec }) => {
		const placement = layout[id];
		return spec.shape === 'field' && placement && 'page' in placement
			? [fieldEntry({ id, placement, field: spec.field })]
			: [];
	});
	return { texts, boxes, squares, fields };
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
	const layout: Record<string, AnyPlacement> = {};
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
/**
 * Keeps a box of `size` inside the page, `margin` off its edges, when it is moved to `position`.
 */
const clampToPage = ({
	position,
	size,
	margin
}: {
	position: number;
	size: number;
	margin: number;
}) => clamp({ value: position, min: margin, max: Math.max(margin, 1 - margin - size) });

/**
 * How far every placed element stays off the page's edges, in millimetres: printers leave a few
 * millimetres along the edges blank, and a scanner's crop can lose a little more.
 */
const PAGE_MARGIN_MM = 10;

/** The room kept along the edges, as fractions of the page's width (`x`) and height (`y`). */
export type PageMargin = { x: number; y: number };

const NO_MARGIN: PageMargin = { x: 0, y: 0 };

/** `PAGE_MARGIN_MM` on a page of `page` (points), as fractions of it. */
export function pageMargin(page: { width: number; height: number }): PageMargin {
	return {
		x: (PAGE_MARGIN_MM * POINTS_PER_MM) / page.width,
		y: (PAGE_MARGIN_MM * POINTS_PER_MM) / page.height
	};
}

type AnyPlacement = TextPlacement | BoxPlacement | SquarePlacement | FieldPlacement;

/** A drag of `start` by `dx`/`dy`; `aspect` is the page's width over its height. */
type PlacementDrag<P extends AnyPlacement> = {
	shape: ElementSpec['shape'];
	start: P;
	dx: number;
	dy: number;
	aspect: number;
	/** The room to keep along the page's edges (`pageMargin`); none if left out. */
	margin?: PageMargin;
};

/**
 * Moves one placement by `dx`/`dy` (fractions of the page), kept on the page and `margin` off its
 * edges (a text by where it is anchored). `aspect` is the
 * page's width over its height, which a square's height depends on.
 */
export function movePlacement<P extends AnyPlacement>({
	shape,
	start,
	dx,
	dy,
	aspect,
	margin = NO_MARGIN
}: PlacementDrag<P>): P {
	if ((shape === 'box' || shape === 'field') && 'width' in start) {
		return {
			...start,
			x: clampToPage({ position: start.x + dx, size: start.width, margin: margin.x }),
			y: clampToPage({ position: start.y + dy, size: start.height, margin: margin.y })
		};
	}
	if (shape === 'square' && 'size' in start) {
		return {
			...start,
			x: clampToPage({ position: start.x + dx, size: start.size, margin: margin.x }),
			y: clampToPage({ position: start.y + dy, size: start.size * aspect, margin: margin.y })
		};
	}
	return {
		...start,
		x: clamp({ value: start.x + dx, min: margin.x, max: 1 - margin.x }),
		y: clamp({ value: start.y + dy, min: margin.y, max: 1 - margin.y })
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
 * An element's area as the editor lines it up (`#lib/helpers/layoutSnap`): a text is the point its
 * baseline starts at, since its extent depends on the text.
 */
export function placementRect({
	shape,
	placement,
	aspect
}: {
	shape: ElementSpec['shape'];
	placement: AnyPlacement;
	aspect: number;
}) {
	if (shape === 'text') return { x: placement.x, y: placement.y, width: 0, height: 0 };
	const { x, y, width, height } = areaOf({ placement, aspect });
	return { x, y, width, height };
}

/**
 * Whether `placement` of the element `id` would cover one of the document's fixed areas (the page
 * number, the alignment marks); the editor refuses such a move. Texts are left out: their extent
 * depends on the text.
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
	return elementsOf(document).some(({ id: other, spec }) => {
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

/** The smallest a box may be resized to, as fractions of the page's width and height. */
type MinBox = { width: number; height: number };

/**
 * Resizes a box or field (or a square, which stays square, following the larger of the two) from
 * its bottom right corner by `dx`/`dy`, never past `margin` off the page's edge nor below `minSize` (a square's,
 * as a fraction of the page's width) or `minBox` (a field's, `fieldMinimum`). A text keeps its
 * placement: its size is its font's (`resizeText`).
 */
export function resizePlacement<P extends AnyPlacement>({
	shape,
	start,
	dx,
	dy,
	aspect,
	minSize = MIN_BOX,
	minBox = { width: MIN_BOX, height: MIN_BOX },
	margin = NO_MARGIN
}: PlacementDrag<P> & { minSize?: number; minBox?: MinBox }): P {
	const right = 1 - margin.x;
	const bottom = 1 - margin.y;
	if ((shape === 'box' || shape === 'field') && 'width' in start) {
		return {
			...start,
			width: clamp({ value: start.width + dx, min: minBox.width, max: right - start.x }),
			height: clamp({ value: start.height + dy, min: minBox.height, max: bottom - start.y })
		};
	}
	if (shape === 'square' && 'size' in start) {
		const grow = Math.max(dx, dy / aspect);
		const fits = Math.min(right - start.x, (bottom - start.y) / aspect);
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
export function dragPlacement<P extends AnyPlacement>({
	shape,
	start,
	resize,
	dx,
	dy,
	aspect,
	minSize,
	minBox,
	margin
}: {
	shape: ElementSpec['shape'];
	start: P;
	resize: boolean;
	dx: number;
	dy: number;
	aspect: number;
	/** The room to keep along the page's edges (`pageMargin`). */
	margin?: PageMargin;
	/** A square's smallest size (`minSquareSize`). */
	minSize?: number;
	/** A field's smallest size (`fieldMinimum`). */
	minBox?: MinBox;
}): P {
	return resize
		? resizePlacement({ shape, start, dx, dy, aspect, minSize, minBox, margin })
		: movePlacement({ shape, start, dx, dy, aspect, margin });
}

/** The smallest a field of `mark` may be on a page of `page` (points), as fractions of it. */
export function fieldMinimum({
	mark,
	page
}: {
	mark: PaperMark;
	page: { width: number; height: number };
}): MinBox {
	const min = MIN_FIELD_MM[mark];
	return {
		width: Math.min(1, (min.width * POINTS_PER_MM) / page.width),
		height: Math.min(1, (min.height * POINTS_PER_MM) / page.height)
	};
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
