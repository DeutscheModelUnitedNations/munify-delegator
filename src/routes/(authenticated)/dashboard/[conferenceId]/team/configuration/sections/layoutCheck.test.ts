import { describe, expect, test } from 'vitest';
import { defaultLayout } from '#lib/helpers/documentLayout';
import { pageAreas } from '#lib/paperScan/pageAreas';
import { checkFields } from './layoutCheck';

const PER_MM = 4;
const A4 = { width: 595.28, height: 841.89 };

/** A blank template page `PER_MM` pixels to the millimetre, and a pen drawing boxes on it. */
function blankPage() {
	const width = Math.round(210 * PER_MM);
	const height = Math.round(297 * PER_MM);
	const data = new Uint8ClampedArray(width * height * 4).fill(255);
	const ink = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => {
		for (let py = Math.round(y * PER_MM); py < Math.round((y + h) * PER_MM); py++)
			for (let px = Math.round(x * PER_MM); px < Math.round((x + w) * PER_MM); px++)
				data.fill(0, (py * width + px) * 4, (py * width + px) * 4 + 3);
	};
	return { page: { ...A4, perMm: PER_MM, picture: { width, height, data } }, ink };
}

const contract = defaultLayout('contract');
const area = (field: 'termsAccepted' | 'termsPlaceDate' | 'termsSignature') => {
	const found = pageAreas({ document: 'contract', layout: contract, page: 0, size: A4 }).areas.find(
		(candidate) => candidate.field === field
	);
	if (!found) throw new Error(`no ${field}`);
	return found;
};

describe('checkFields', () => {
	test('a field over blank paper, or over the line it is written on, reads empty', () => {
		const { page, ink } = blankPage();
		const signature = area('termsSignature');
		ink({ x: signature.x, y: signature.y + signature.height - 0.3, w: signature.width, h: 0.3 });
		expect(checkFields({ document: 'contract', layout: contract, pictures: [page] })).toEqual({
			termsAccepted: 'free',
			termsPlaceDate: 'free',
			termsSignature: 'free'
		});
	});

	test("a field over the template's text reads as filled in", () => {
		const { page, ink } = blankPage();
		const placeDate = area('termsPlaceDate');
		ink({ x: placeDate.x + 3, y: placeDate.y + 2, w: placeDate.width - 10, h: 3 });
		expect(
			checkFields({ document: 'contract', layout: contract, pictures: [page] }).termsPlaceDate
		).toBe('filled');
	});

	test('a box whose template ☐ lies inside it, not on its edge, does not read empty', () => {
		const { page, ink } = blankPage();
		const box = area('termsAccepted');
		const inset = 0.8;
		const side = box.width - 2 * inset;
		ink({ x: box.x + inset, y: box.y + inset, w: side, h: 0.2 });
		ink({ x: box.x + inset, y: box.y + inset + side - 0.2, w: side, h: 0.2 });
		ink({ x: box.x + inset, y: box.y + inset, w: 0.2, h: side });
		ink({ x: box.x + inset + side - 0.2, y: box.y + inset, w: 0.2, h: side });
		expect(
			checkFields({ document: 'contract', layout: contract, pictures: [page] }).termsAccepted
		).not.toBe('free');
	});

	test('a field on a page the template does not have is unknown; a certificate has no fields', () => {
		const layout = { ...contract, termsSignature: { ...contract.termsSignature, page: 1 } };
		const checks = checkFields({ document: 'contract', layout, pictures: [blankPage().page] });
		expect(checks.termsSignature).toBe('unknown');
		expect(checks.termsAccepted).toBe('free');
		expect(
			checkFields({
				document: 'certificate',
				layout: defaultLayout('certificate'),
				pictures: [blankPage().page]
			})
		).toEqual({});
	});
});
