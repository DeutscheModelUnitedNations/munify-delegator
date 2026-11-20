// @vitest-environment node
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it, vi } from 'vitest';
import { qrMatrix, QUIET_ZONE_MODULES } from '#lib/helpers/qrSize';
import { drawQr } from './pdfQr';

const text = `HTTPS://DELEGATOR.EXAMPLE/ID/${'A1B2C3D4E5'.repeat(20)}`;

describe('drawQr', () => {
	it('draws a plain code module for module, inside its quiet zone', async () => {
		const pdf = await PDFDocument.create();
		const page = pdf.addPage([595, 842]);
		const rectangles = vi.spyOn(page, 'drawRectangle');
		const box = { x: 100, top: 300, side: 120 };
		await drawQr({ pdf, page, text, box, corporate: false });

		const matrix = qrMatrix({ text, withEmblem: false });
		const module = box.side / (matrix.size + QUIET_ZONE_MODULES * 2);
		const [background, ...runs] = rectangles.mock.calls.map(([options]) => options ?? {});
		expect(background).toMatchObject({ x: 100, y: 180, width: 120, height: 120 });

		// every module the runs cover, read back from where they were drawn
		const dark = new Set<string>();
		for (const { x = 0, y = 0, width = 0 } of runs) {
			const column = Math.round((x - box.x) / module) - QUIET_ZONE_MODULES;
			const row = Math.round((box.top - y) / module) - QUIET_ZONE_MODULES - 1;
			for (let offset = 0; offset < Math.round(width / module); offset++) {
				dark.add(`${column + offset},${row}`);
			}
		}
		for (let y = 0; y < matrix.size; y++) {
			for (let x = 0; x < matrix.size; x++) {
				expect(dark.has(`${x},${y}`)).toBe(matrix.has(x, y));
			}
		}
	});

	it('draws the corporate design as round modules', async () => {
		const pdf = await PDFDocument.create();
		const page = pdf.addPage([595, 842]);
		const circles = vi.spyOn(page, 'drawCircle');
		const rectangles = vi.spyOn(page, 'drawRectangle');
		await drawQr({ pdf, page, text, box: { x: 100, top: 300, side: 120 }, corporate: true });
		expect(circles).toHaveBeenCalled();
		expect(rectangles).not.toHaveBeenCalled();
	});
});
