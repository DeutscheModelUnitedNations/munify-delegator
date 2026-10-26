import { describe, expect, test } from 'vitest';
import {
	DOCUMENT_ELEMENTS,
	LAYOUT_DOCUMENTS,
	boxInPoints,
	dragPlacement,
	defaultLayout,
	documentLayoutSchema,
	movePlacement,
	resizePlacement,
	resizeText,
	resolveDocumentLayout,
	squareInPoints,
	textInPoints
} from './documentLayout';

const LANDSCAPE = 842 / 595;

describe('the document layouts', () => {
	test('every document is listed, and its defaults pass its own schema', () => {
		expect([...LAYOUT_DOCUMENTS].sort()).toEqual(Object.keys(DOCUMENT_ELEMENTS).sort());
		for (const document of LAYOUT_DOCUMENTS) {
			expect(documentLayoutSchema(document).safeParse(defaultLayout(document)).success).toBe(true);
		}
	});

	test('the defaults put things where the generator always did', () => {
		const certificate = defaultLayout('certificate');
		expect(textInPoints(certificate.name, 842, 595)).toMatchObject({
			baseline: 595 - 215,
			size: 18
		});
		const qr = squareInPoints(certificate.qr, 842, 595);
		expect(qr.side).toBeCloseTo(84);
		expect(qr.left + qr.side).toBeCloseTo(842 - 48);
		expect(qr.bottom).toBeCloseTo(48);
		const contract = defaultLayout('contract');
		expect(textInPoints(contract.name, 595, 842).baseline).toBeCloseTo(842 - 320);
		expect(textInPoints(contract.birthday, 595, 842).baseline).toBeCloseTo(842 - 380);
		expect(textInPoints(defaultLayout('mediaConsent').address, 595, 842).size).toBe(10);
	});

	test('resolving takes what was placed, element by element, and defaults the rest', () => {
		const placed = { x: 0.1, y: 0.2, size: 20 };
		const layout = resolveDocumentLayout('contract', {
			contract: { name: placed, birthday: { x: 5 } },
			certificate: 'nonsense'
		});
		expect(layout.name).toEqual(placed);
		expect(layout.birthday).toEqual(defaultLayout('contract').birthday);
		expect(resolveDocumentLayout('certificate', null)).toEqual(defaultLayout('certificate'));
	});

	test('moving keeps elements on the page, by their shape', () => {
		const { qr, sessions, name } = defaultLayout('certificate');
		const moved = movePlacement('square', qr, 1, 1, LANDSCAPE);
		expect(moved.x + moved.size).toBeCloseTo(1);
		expect(moved.y + moved.size * LANDSCAPE).toBeCloseTo(1);
		expect(movePlacement('box', sessions, -1, -1, LANDSCAPE)).toMatchObject({ x: 0, y: 0 });
		expect(movePlacement('text', name, 0.1, 0, LANDSCAPE).x).toBeCloseTo(0.6);
	});

	test('resizing keeps a minimum, the page edge and a square code; texts change font size', () => {
		const { qr, sessions, name } = defaultLayout('certificate');
		expect(resizePlacement('box', sessions, -1, -1, LANDSCAPE).width).toBeCloseTo(0.04);
		const huge = resizePlacement('square', qr, 1, 1, LANDSCAPE);
		expect(huge.x + huge.size).toBeLessThanOrEqual(1 + 1e-9);
		expect(huge.y + huge.size * LANDSCAPE).toBeLessThanOrEqual(1 + 1e-9);
		expect(resizePlacement('text', name, 1, 1, LANDSCAPE)).toEqual(name);
		expect(dragPlacement('box', sessions, true, 0.1, 0, LANDSCAPE).width).toBeCloseTo(0.6);
		expect(dragPlacement('box', sessions, false, 0.1, 0, LANDSCAPE).x).toBeCloseTo(0.35);
		expect(resizeText(name, 100).size).toBe(72);
		expect(boxInPoints(sessions, 842, 595).top).toBeGreaterThan(
			boxInPoints(sessions, 842, 595).bottom
		);
	});
});
