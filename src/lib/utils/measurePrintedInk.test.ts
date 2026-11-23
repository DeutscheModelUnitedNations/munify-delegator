import { beforeEach, describe, expect, test, vi } from 'vitest';
import { logger } from '#lib/logger';
import type { PaperArea } from '#lib/paperScan/areas';
import { measurePrintedInk } from './measurePrintedInk';

const { templatePictures } = vi.hoisted(() => ({ templatePictures: vi.fn() }));
vi.mock('#lib/helpers/pdfPages', () => ({ templatePictures }));

const PER_MM = 4;
const box: PaperArea = { field: 'termsAccepted', x: 10, y: 10, width: 5, height: 5 };

/** A white page of 40 by 40 millimetres, black where `ink` says. */
function page(ink: (x: number, y: number) => boolean = () => false) {
	const side = 40 * PER_MM;
	const data = new Uint8ClampedArray(side * side * 4).fill(255);
	for (let y = 0; y < side; y++) {
		for (let x = 0; x < side; x++) {
			if (ink(x / PER_MM, y / PER_MM)) data.fill(0, (y * side + x) * 4, (y * side + x) * 4 + 3);
		}
	}
	return { width: 113, height: 113, perMm: PER_MM, picture: { width: side, height: side, data } };
}

const measure = (pages: readonly PaperArea[][]) =>
	measurePrintedInk({ bytes: new Uint8Array(), pages });

beforeEach(() => {
	// answering the mock would have it called as a clean-up
	templatePictures.mockReset();
});

describe('measurePrintedInk', () => {
	test("names the fields with print of the form's own, page by page", async () => {
		const bar = page((x, y) => x > 12 && x < 13 && y > 5 && y < 20);
		templatePictures.mockResolvedValue([page(), bar]);
		const [clean, printed = []] = await measure([[box], [box]]);
		expect(clean).toEqual([]);
		expect(printed).toEqual([
			expect.objectContaining({ field: 'termsAccepted', core: expect.any(Number) })
		]);
		expect(printed[0].ink).toBeGreaterThan(0.2);
	});

	test("counts print a scan aligned a little off would have on a line, not a box's frame", async () => {
		// print just above where a line is read (0.5 mm in), and at the edge of where a box is (1 mm in)
		const line: PaperArea = { ...box, field: 'termsSignature', width: 25, height: 8 };
		templatePictures.mockResolvedValue([
			page((x, y) => x < 16 && y > 10.1 && y < 10.35),
			page((x) => x > 10.2 && x < 10.8)
		]);
		const [onLine = [], onFrame] = await measure([[line], [box]]);
		expect(onLine.map(({ field }) => field)).toEqual(['termsSignature']);
		expect(onFrame).toEqual([]);
	});

	test('measures nothing, and says so, where the pages cannot be rendered', async () => {
		const warn = vi.spyOn(logger, 'warn').mockReturnValue(undefined);
		templatePictures.mockImplementation(async () => {
			throw new Error('no canvas');
		});
		expect(await measure([[box], []])).toEqual([undefined, undefined]);
		expect(warn).toHaveBeenCalledOnce();
	});
});
