/**
 * Renders the first page of a PDF template onto `canvas`, `cssWidth` pixels wide (sharp on dense
 * screens), and answers the page's size in points. pdf.js is loaded on demand: only the
 * certificate layout editor needs it.
 */
export async function renderFirstPage({
	url,
	canvas,
	cssWidth
}: {
	url: string;
	canvas: HTMLCanvasElement;
	cssWidth: number;
}) {
	const [pdfjs, worker] = await Promise.all([
		import('pdfjs-dist'),
		import('pdfjs-dist/build/pdf.worker.min.mjs?url')
	]);
	pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
	const task = pdfjs.getDocument({ url });
	const document = await task.promise;
	try {
		const page = await document.getPage(1);
		const points = page.getViewport({ scale: 1 });
		const viewport = page.getViewport({
			scale: (cssWidth * window.devicePixelRatio) / points.width
		});
		canvas.width = Math.round(viewport.width);
		canvas.height = Math.round(viewport.height);
		await page.render({ canvas, viewport }).promise;
		return { width: points.width, height: points.height };
	} finally {
		await task.destroy();
	}
}
