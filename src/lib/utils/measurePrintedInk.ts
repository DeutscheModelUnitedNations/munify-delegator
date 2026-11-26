import { templatePictures } from '#lib/helpers/pdfPages';
import { logger } from '#lib/logger';
import type { PaperArea, PrintedInk } from '#lib/paperScan/areas';
import { printedInkOf } from '#lib/paperScan/printedInk';

/**
 * The print in the fields of each page of a PDF (`pages`: the fields of each, in order), as it is
 * before its code and marks are drawn. `undefined` when it cannot be rendered here: the documents are
 * printed all the same, and a person looks at their fields.
 */
export async function measurePrintedInk({
	bytes,
	pages
}: {
	bytes: Uint8Array;
	pages: readonly (readonly PaperArea[])[];
}): Promise<(PrintedInk[] | undefined)[]> {
	try {
		const pictures = await templatePictures({ source: { data: bytes } });
		return pages.map((areas, index) => {
			if (areas.length === 0) return [];
			const rendered = pictures[index];
			if (!rendered) return undefined;
			const { picture, perMm } = rendered;
			const toPicture = ({ x, y }: { x: number; y: number }) => ({ x: x * perMm, y: y * perMm });
			return printedInkOf({ picture, toPicture, areas });
		});
	} catch (error) {
		logger.warn('Measuring the print in the fields of the documents failed', error);
		return pages.map(() => undefined);
	}
}
