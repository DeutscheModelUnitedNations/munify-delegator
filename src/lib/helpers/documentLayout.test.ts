import { describe, expect, test } from 'vitest';
import { pageAreas } from '#lib/paperScan/pageAreas';
import {
	DOCUMENT_ELEMENTS,
	LAYOUT_DOCUMENTS,
	boxInPoints,
	coversFixedArea,
	dragPlacement,
	defaultLayout,
	documentLayoutSchema,
	elementsByShape,
	elementsOf,
	fieldMinimum,
	insertionsOf,
	isHidden,
	minSquareSize,
	movePlacement,
	pageMargin,
	placementRect,
	POINTS_PER_MM,
	resizePlacement,
	resizeText,
	resolveDocumentLayout,
	squareInPoints,
	textInPoints,
	withHidden,
	withMinimumSizes
} from './documentLayout';

const LANDSCAPE = 842 / 595;

describe('the page margin', () => {
	const portrait = pageMargin({ width: 595, height: 842 });

	test('keeps a moved box, code or text 10 mm off every edge', () => {
		const box = { x: 0.5, y: 0.5, width: 0.2, height: 0.1 };
		expect(
			movePlacement({ shape: 'box', start: box, dx: -1, dy: -1, aspect: 1, margin: portrait })
		).toMatchObject({ x: portrait.x, y: portrait.y });
		const far = movePlacement({
			shape: 'box',
			start: box,
			dx: 1,
			dy: 1,
			aspect: 1,
			margin: portrait
		});
		expect(far.x + far.width).toBeCloseTo(1 - portrait.x);
		expect(far.y + far.height).toBeCloseTo(1 - portrait.y);
		const text = { x: 0.5, y: 0.5, size: 12 };
		expect(
			movePlacement({ shape: 'text', start: text, dx: 1, dy: -1, aspect: 1, margin: portrait })
		).toMatchObject({ x: 1 - portrait.x, y: portrait.y });
		expect(portrait.x * 595).toBeCloseTo(10 * POINTS_PER_MM);
	});

	test('stops a resize at the margin', () => {
		const field = { x: 0.5, y: 0.5, width: 0.1, height: 0.05, page: 0 };
		const grown = resizePlacement({
			shape: 'field',
			start: field,
			dx: 1,
			dy: 1,
			aspect: 595 / 842,
			margin: portrait
		});
		expect(grown.x + grown.width).toBeCloseTo(1 - portrait.x);
		expect(grown.y + grown.height).toBeCloseTo(1 - portrait.y);
	});

	test('every placeable default already keeps it (the page number and the marks stay put)', () => {
		for (const document of LAYOUT_DOCUMENTS) {
			const aspect = document === 'certificate' ? LANDSCAPE : 595 / 842;
			const margin = pageMargin(
				document === 'certificate' ? { width: 842, height: 595 } : { width: 595, height: 842 }
			);
			const layout = defaultLayout(document);
			for (const { id, spec } of elementsOf(document)) {
				if ('fixed' in spec && spec.fixed) continue;
				const rect = placementRect({ shape: spec.shape, placement: layout[id], aspect });
				const where = `${document}.${id}`;
				expect(rect.x, where).toBeGreaterThanOrEqual(margin.x - 1e-9);
				expect(rect.y, where).toBeGreaterThanOrEqual(margin.y - 1e-9);
				expect(rect.x + rect.width, where).toBeLessThanOrEqual(1 - margin.x + 1e-9);
				expect(rect.y + rect.height, where).toBeLessThanOrEqual(1 - margin.y + 1e-9);
			}
		}
	});
});

describe('the document layouts', () => {
	test('every document is listed, and its defaults pass its own schema', () => {
		expect([...LAYOUT_DOCUMENTS].sort()).toEqual(Object.keys(DOCUMENT_ELEMENTS).sort());
		for (const document of LAYOUT_DOCUMENTS) {
			expect(documentLayoutSchema(document).safeParse(defaultLayout(document)).success).toBe(true);
		}
	});

	test('the defaults put things where the generator always did', () => {
		const certificate = defaultLayout('certificate');
		expect(textInPoints({ placement: certificate.name, width: 842, height: 595 })).toMatchObject({
			baseline: 595 - 215,
			size: 18
		});
		const qr = squareInPoints({ placement: certificate.qr, width: 842, height: 595 });
		expect(qr.side / POINTS_PER_MM).toBeCloseTo(36);
		expect(qr.left + qr.side).toBeCloseTo(842 - 48);
		expect(qr.bottom).toBeCloseTo(48);
		const contract = defaultLayout('contract');
		expect(
			textInPoints({ placement: contract.name, width: 595, height: 842 }).baseline
		).toBeCloseTo(842 - 320);
		expect(
			textInPoints({ placement: contract.birthday, width: 595, height: 842 }).baseline
		).toBeCloseTo(842 - 380);
		expect(
			textInPoints({ placement: defaultLayout('mediaConsent').address, width: 595, height: 842 })
				.size
		).toBe(10);
	});

	test('resolving takes what was placed, element by element, and defaults the rest', () => {
		const placed = { x: 0.1, y: 0.2, size: 20 };
		const layout = resolveDocumentLayout({
			document: 'contract',
			stored: {
				contract: { name: placed, birthday: { x: 5 } },
				certificate: 'nonsense'
			}
		});
		expect(layout.name).toEqual(placed);
		expect(layout.birthday).toEqual(defaultLayout('contract').birthday);
		expect(resolveDocumentLayout({ document: 'certificate', stored: null })).toEqual(
			defaultLayout('certificate')
		);
	});

	test('moving keeps elements on the page, by their shape', () => {
		const { qr, sessions, name } = defaultLayout('certificate');
		const moved = movePlacement({ shape: 'square', start: qr, dx: 1, dy: 1, aspect: LANDSCAPE });
		expect(moved.x + moved.size).toBeCloseTo(1);
		expect(moved.y + moved.size * LANDSCAPE).toBeCloseTo(1);
		expect(
			movePlacement({ shape: 'box', start: sessions, dx: -1, dy: -1, aspect: LANDSCAPE })
		).toMatchObject({ x: 0, y: 0 });
		expect(
			movePlacement({ shape: 'text', start: name, dx: 0.1, dy: 0, aspect: LANDSCAPE }).x
		).toBeCloseTo(0.6);
	});

	test('resizing keeps a minimum, the page edge and a square code; texts change font size', () => {
		const { qr, sessions, name } = defaultLayout('certificate');
		expect(
			resizePlacement({ shape: 'box', start: sessions, dx: -1, dy: -1, aspect: LANDSCAPE }).width
		).toBeCloseTo(0.04);
		const huge = resizePlacement({ shape: 'square', start: qr, dx: 1, dy: 1, aspect: LANDSCAPE });
		expect(huge.x + huge.size).toBeLessThanOrEqual(1 + 1e-9);
		expect(huge.y + huge.size * LANDSCAPE).toBeLessThanOrEqual(1 + 1e-9);
		expect(
			resizePlacement({ shape: 'text', start: name, dx: 1, dy: 1, aspect: LANDSCAPE })
		).toEqual(name);
		expect(
			dragPlacement({
				shape: 'box',
				start: sessions,
				resize: true,
				dx: 0.1,
				dy: 0,
				aspect: LANDSCAPE
			}).width
		).toBeCloseTo(0.6);
		expect(
			dragPlacement({
				shape: 'box',
				start: sessions,
				resize: false,
				dx: 0.1,
				dy: 0,
				aspect: LANDSCAPE
			}).x
		).toBeCloseTo(0.35);
		expect(resizeText({ start: name, step: 100 }).size).toBe(72);
		expect(boxInPoints({ placement: sessions, width: 842, height: 595 }).top).toBeGreaterThan(
			boxInPoints({ placement: sessions, width: 842, height: 595 }).bottom
		);
	});

	test('every application document has the footer: the page number fixed bottom right, the code above, both clear of the alignment mark', () => {
		for (const document of ['contract', 'guardianConsent', 'mediaConsent'] as const) {
			const { code, pageNumber } = defaultLayout(document);
			const area = boxInPoints({ placement: pageNumber, width: 595, height: 842 });
			expect(area.left + area.width).toBeCloseTo(595 - 54);
			expect(area.bottom).toBeCloseTo(20);
			const square = squareInPoints({ placement: code, width: 595, height: 842 });
			expect(square.left + square.side).toBeCloseTo(595 - 54);
			expect(square.bottom).toBeGreaterThan(area.top);
			expect(square.side / POINTS_PER_MM).toBeGreaterThanOrEqual(
				DOCUMENT_ELEMENTS[document].code.minSide
			);
		}
	});

	test('the page number stays where it is, whatever was stored, and is not part of what is saved', () => {
		const moved = { x: 0.1, y: 0.1, width: 0.2, height: 0.05 };
		const layout = resolveDocumentLayout({
			document: 'contract',
			stored: { contract: { pageNumber: moved } }
		});
		expect(layout.pageNumber).toEqual(defaultLayout('contract').pageNumber);
		const parsed = documentLayoutSchema('contract').safeParse(defaultLayout('contract'));
		expect(parsed.success && 'pageNumber' in parsed.data).toBe(false);
	});

	test('nothing but a text may cover the page number', () => {
		const aspect = 595 / 842;
		const { pageNumber, code, name } = defaultLayout('contract');
		const onIt = { ...code, y: pageNumber.y };
		expect(
			coversFixedArea({
				document: 'contract',
				id: 'code',
				shape: 'square',
				placement: onIt,
				aspect
			})
		).toBe(true);
		expect(
			coversFixedArea({
				document: 'contract',
				id: 'code',
				shape: 'square',
				placement: code,
				aspect
			})
		).toBe(false);
		expect(
			coversFixedArea({
				document: 'contract',
				id: 'name',
				shape: 'text',
				placement: { ...name, x: pageNumber.x, y: pageNumber.y },
				aspect
			})
		).toBe(false);
		// the certificate has no fixed area
		const { qr } = defaultLayout('certificate');
		expect(
			coversFixedArea({ document: 'certificate', id: 'qr', shape: 'square', placement: qr, aspect })
		).toBe(false);
	});

	test('every code is at least its minimum by default', () => {
		for (const document of LAYOUT_DOCUMENTS) {
			const layout: Record<string, { size: number }> = defaultLayout(document);
			for (const [id, spec] of Object.entries(DOCUMENT_ELEMENTS[document])) {
				if (spec.shape !== 'square') continue;
				const pageWidth = document === 'certificate' ? 842 : 595;
				expect(layout[id].size).toBeGreaterThanOrEqual(
					minSquareSize({ minSide: spec.minSide, pageWidth }) - 1e-9
				);
			}
		}
	});

	test('a code is never resized below its minimum, nor shown or saved smaller', () => {
		const { code } = defaultLayout('contract');
		const minSize = minSquareSize({
			minSide: DOCUMENT_ELEMENTS.contract.code.minSide,
			pageWidth: 595
		});
		const shrunk = resizePlacement({
			shape: 'square',
			start: code,
			dx: -1,
			dy: -1,
			aspect: 595 / 842,
			minSize
		});
		expect(shrunk.size).toBeCloseTo(minSize);

		const layout = { ...defaultLayout('contract'), code: { ...code, size: 0.01 } };
		const grown = withMinimumSizes({ document: 'contract', layout, pageWidth: 595 });
		expect(grown.code).toEqual({ ...code, size: minSize });
		expect(grown.name).toBe(layout.name);
		const fine = defaultLayout('contract');
		expect(withMinimumSizes({ document: 'contract', layout: fine, pageWidth: 595 })).toBe(fine);
	});

	test('a code on a page too small for its minimum takes the whole width', () => {
		expect(minSquareSize({ minSide: 25, pageWidth: 50 })).toBe(1);
	});
});

describe('elementsByShape', () => {
	test('splits a certificate into its name, its list of sessions and its code', () => {
		const { texts, boxes, squares } = elementsByShape({
			elements: elementsOf('certificate'),
			layout: defaultLayout('certificate')
		});
		expect(texts.map(({ id, align }) => [id, align])).toEqual([['name', 'center']]);
		expect(boxes.map(({ id, list, fixed }) => [id, list, fixed])).toEqual([
			['sessions', true, false]
		]);
		expect(squares.map(({ id }) => id)).toEqual(['qr']);
	});

	test('marks the page number fixed and captions the code beside it', () => {
		const { boxes, squares } = elementsByShape({
			elements: elementsOf('contract'),
			layout: defaultLayout('contract')
		});
		expect(boxes).toContainEqual(
			expect.objectContaining({ id: 'pageNumber', fixed: true, list: false })
		);
		expect(squares).toContainEqual(expect.objectContaining({ id: 'code', caption: 'beside' }));
	});

	test('leaves out an element without a placement, or with one of another shape', () => {
		const layout = defaultLayout('certificate');
		const { texts, boxes, squares } = elementsByShape({
			elements: elementsOf('certificate'),
			layout: { name: layout.sessions, qr: layout.qr }
		});
		expect(texts).toEqual([]);
		expect(boxes).toEqual([]);
		expect(squares.map(({ id }) => id)).toEqual(['qr']);
	});
});

describe('the fields read off a scan', () => {
	const aspect = 595 / 842;

	test('are on every application document, with the alignment marks, each named as its field', () => {
		expect(elementsOf('mediaConsent').map(({ id }) => id)).toEqual(
			expect.arrayContaining(['markerTopLeft', 'mediaPhoto', 'mediaAdvertising', 'mediaSignature'])
		);
		expect(elementsOf('certificate').map(({ id }) => id)).not.toContain('markerTopLeft');
		const { fields } = elementsByShape({
			elements: elementsOf('contract'),
			layout: defaultLayout('contract')
		});
		expect(fields.map(({ id, field, mark }) => [id, field, mark])).toEqual([
			['termsAccepted', 'termsAccepted', 'checkbox'],
			['termsPlaceDate', 'termsPlaceDate', 'line'],
			['termsSignature', 'termsSignature', 'line']
		]);
	});

	test('the alignment marks are fixed: never moved, never stored, and nothing goes over them', () => {
		const { boxes } = elementsByShape({
			elements: elementsOf('contract'),
			layout: defaultLayout('contract')
		});
		expect(boxes.filter(({ id }) => id.startsWith('marker')).every(({ fixed }) => fixed)).toBe(
			true
		);
		const moved = { x: 0.5, y: 0.5, width: 0.04, height: 0.03 };
		const layout = resolveDocumentLayout({
			document: 'contract',
			stored: { contract: { markerTopRight: moved } }
		});
		expect(layout.markerTopRight).toEqual(defaultLayout('contract').markerTopRight);
		const parsed = documentLayoutSchema('contract').safeParse(defaultLayout('contract'));
		expect(parsed.success && 'markerTopLeft' in parsed.data).toBe(false);
		const { termsSignature, markerBottomLeft } = defaultLayout('contract');
		const onMark = { ...termsSignature, x: markerBottomLeft.x, y: markerBottomLeft.y };
		expect(
			coversFixedArea({
				document: 'contract',
				id: 'termsSignature',
				shape: 'field',
				placement: onMark,
				aspect
			})
		).toBe(true);
	});

	test('the footer stays clear of the page number and the marks by default', () => {
		const layout = defaultLayout('contract');
		for (const id of ['code', 'pageNumber'] as const) {
			expect(
				coversFixedArea({
					document: 'contract',
					id,
					shape: id === 'code' ? 'square' : 'box',
					placement: layout[id],
					aspect
				})
			).toBe(false);
		}
	});

	test('are stored with their page and never resized below what can be ticked or signed', () => {
		const layout = {
			...defaultLayout('mediaConsent'),
			mediaPhoto: { x: 0.1, y: 0.1, width: 0.02, height: 0.02, page: 2 }
		};
		const parsed = documentLayoutSchema('mediaConsent').safeParse(layout);
		expect(parsed.success && parsed.data.mediaPhoto).toEqual(layout.mediaPhoto);
		const minBox = fieldMinimum({ mark: 'checkbox', page: { width: 595, height: 842 } });
		const shrunk = resizePlacement({
			shape: 'field',
			start: layout.mediaPhoto,
			dx: -1,
			dy: -1,
			aspect,
			minBox
		});
		expect(shrunk).toEqual({ ...layout.mediaPhoto, width: minBox.width, height: minBox.height });
		expect(minBox.width * 595).toBeCloseTo(2.5 * POINTS_PER_MM);
	});

	test("by default, the media consent's three pages carry its uses, its purposes and its signatures", () => {
		const fieldsOn = (page: number) =>
			pageAreas({
				document: 'mediaConsent',
				layout: defaultLayout('mediaConsent'),
				page,
				size: { width: 595, height: 842 }
			}).areas.map(({ field }) => field);
		expect(fieldsOn(0)).toEqual(['mediaPhoto', 'mediaVideo', 'mediaByDmun', 'mediaByOthers']);
		expect(fieldsOn(1)).toHaveLength(8);
		expect(fieldsOn(2)).toEqual([
			'mediaPlaceDate',
			'mediaSignature',
			'mediaGuardian1Name',
			'mediaGuardian2Name',
			'mediaGuardianPlaceDate',
			'mediaGuardian1Signature',
			'mediaGuardian2Signature'
		]);
	});

	test('a page carries its marks and its fields, in millimetres of that page', () => {
		const base = defaultLayout('contract');
		const layout = { ...base, termsSignature: { ...base.termsSignature, page: 1 } };
		const first = pageAreas({
			document: 'contract',
			layout,
			page: 0,
			size: { width: 595, height: 842 }
		});
		expect(first.page.width).toBeCloseTo(210, 0);
		expect(first.markers[0].x).toBeCloseTo(13, 0);
		expect(first.markers[0].y).toBeCloseTo(31, 0);
		expect(first.markers[2].x).toBeCloseTo(197, 0);
		expect(first.areas.map(({ field }) => field)).toEqual(['termsAccepted', 'termsPlaceDate']);
		expect(first.areas[0].width).toBeCloseTo(3.7);
		const second = pageAreas({
			document: 'contract',
			layout,
			page: 1,
			size: { width: 595, height: 842 }
		});
		expect(second.areas.map(({ field }) => field)).toEqual(['termsSignature']);
	});
});

describe('placementRect', () => {
	test("is a text's baseline start, a code's square and a box or field as placed", () => {
		const aspect = 595 / 842;
		const { name, code, pageNumber, termsSignature: signature } = defaultLayout('contract');
		expect(placementRect({ shape: 'text', placement: name, aspect })).toEqual({
			x: name.x,
			y: name.y,
			width: 0,
			height: 0
		});
		expect(placementRect({ shape: 'square', placement: code, aspect }).height).toBeCloseTo(
			code.size * aspect
		);
		expect(placementRect({ shape: 'box', placement: pageNumber, aspect })).toEqual(pageNumber);
		const { page, ...area } = signature;
		expect(page).toBe(0);
		expect(placementRect({ shape: 'field', placement: signature, aspect })).toEqual(area);
	});
});

describe('switching insertions off', () => {
	const layout = defaultLayout('mediaConsent');
	const elements = elementsOf('mediaConsent');
	const off = { ...layout, birthday: withHidden({ placement: layout.birthday, hidden: true }) };

	test('offers what is put in to be read, no code, mark, page number or field', () => {
		expect(insertionsOf({ elements, layout })).toEqual([
			{ id: 'name', shown: true },
			{ id: 'birthday', shown: true },
			{ id: 'address', shown: true }
		]);
		const certificate = insertionsOf({
			elements: elementsOf('certificate'),
			layout: defaultLayout('certificate')
		});
		expect(certificate.map(({ id }) => id)).toEqual(['name', 'sessions']);
	});

	test('leaves the element out, keeping its place', () => {
		expect(elementsByShape({ elements, layout: off }).texts.map(({ id }) => id)).toEqual([
			'name',
			'address'
		]);
		expect(off.birthday).toMatchObject({ x: layout.birthday.x, y: layout.birthday.y });
		expect(withHidden({ placement: off.birthday, hidden: false })).toEqual(layout.birthday);
	});

	test('is stored and read again, also after a move', () => {
		const moved = movePlacement({
			shape: 'text',
			start: off.birthday,
			dx: 0.1,
			dy: 0,
			aspect: 0.7
		});
		const stored = documentLayoutSchema('mediaConsent').parse({ ...off, birthday: moved });
		const read = resolveDocumentLayout({
			document: 'mediaConsent',
			stored: { mediaConsent: JSON.parse(JSON.stringify(stored)) }
		});
		expect(isHidden(read.birthday)).toBe(true);
		expect(isHidden(read.name)).toBe(false);
	});

	test('never reaches a field read off a scan', () => {
		expect(withHidden({ placement: layout.mediaPhoto, hidden: true })).toBe(layout.mediaPhoto);
		const stored = { mediaConsent: { mediaPhoto: { ...layout.mediaPhoto, hidden: true } } };
		const { mediaPhoto } = resolveDocumentLayout({ document: 'mediaConsent', stored });
		expect(isHidden(mediaPhoto)).toBe(false);
	});
});
