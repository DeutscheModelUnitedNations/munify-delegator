/**
 * Renders page `page` (from 0) of a PDF template onto `canvas`, `cssWidth` pixels wide (sharp on
 * dense screens), and answers the page's size in points and how many pages the template has.
 * pdf.js is loaded on demand: only the layout editor needs it.
 */
export async function renderTemplatePage({
	url,
	canvas,
	cssWidth,
	page: index = 0
}: {
	url: string;
	canvas: HTMLCanvasElement;
	cssWidth: number;
	page?: number;
}) {
	const [pdfjs, worker] = await Promise.all([
		import('pdfjs-dist'),
		import('pdfjs-dist/build/pdf.worker.min.mjs?url')
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
	const task = pdfjs.getDocument({ url });
	const document = await task.promise;
	try {
		const pageCount = document.numPages;
		const page = await document.getPage(Math.min(index, pageCount - 1) + 1);
		const points = page.getViewport({ scale: 1 });
		const viewport = page.getViewport({
			scale: (cssWidth * window.devicePixelRatio) / points.width
		});
		canvas.width = Math.round(viewport.width);
		canvas.height = Math.round(viewport.height);
		await page.render({ canvas, viewport }).promise;
		return { width: points.width, height: points.height, pageCount };
	} finally {
		await task.destroy();
	}
}

/** A template page as pixels, `perMm` to the millimetre, with its size in points. */
export type TemplatePicture = { width: number; height: number; perMm: number; picture: ImageData };

/**
 * Every page of a PDF template rendered off screen at `perMm` pixels to the millimetre, for the
 * layout editor to read its fields off as a scan would (`checkFields`).
 */
export async function templatePictures({
	url,
	perMm = 6
}: {
	url: string;
	perMm?: number;
}): Promise<TemplatePicture[]> {
	const [pdfjs, worker] = await Promise.all([
		import('pdfjs-dist'),
		import('pdfjs-dist/build/pdf.worker.min.mjs?url')
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
	const task = pdfjs.getDocument({ url });
	const document = await task.promise;
	try {
		const pictures: TemplatePicture[] = [];
		for (let number = 1; number <= document.numPages; number++) {
			const page = await document.getPage(number);
			const points = page.getViewport({ scale: 1 });
			// points to pixels: 72 points are 25.4 millimetres
			const viewport = page.getViewport({ scale: (perMm * 25.4) / 72 });
			const canvas = window.document.createElement('canvas');
			canvas.width = Math.round(viewport.width);
			canvas.height = Math.round(viewport.height);
			await page.render({ canvas, viewport }).promise;
			const context = canvas.getContext('2d', { willReadFrequently: true });
			if (!context) break;
			pictures.push({
				width: points.width,
				height: points.height,
				perMm,
				picture: context.getImageData(0, 0, canvas.width, canvas.height)
			});
		}
		return pictures;
	} finally {
		await task.destroy();
	}
}
