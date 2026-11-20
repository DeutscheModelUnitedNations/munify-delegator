import { rgb, type Color, type PDFDocument, type PDFPage } from 'pdf-lib';
import { BRANDED_PADDING, QUIET_ZONE_MODULES, qrMatrix, type QrMatrix } from '#lib/helpers/qrSize';
import { NEUTRAL, PRIMARY, roundedRectPath, WHITE } from './nametagPdf';

/**
 * QR codes drawn into PDFs as vectors, so they print sharp at any resolution: in the corporate
 * design or plain, as the conference's `qrCorporateDesign` says (`drawQr`).
 */

const BLACK = rgb(0, 0, 0);

/** Where a code goes: its top left corner, measured from the page's bottom left, and its side. */
type QrBox = { x: number; top: number; side: number };

/** A rounded square with its top left corner at (x, y), measured from the page's bottom left. */
function drawRoundedSquare({
	page,
	x,
	top,
	side,
	radius,
	color
}: {
	page: PDFPage;
	x: number;
	top: number;
	side: number;
	radius: number;
	color: Color;
}) {
	page.drawSvgPath(roundedRectPath({ width: side, height: side, radius }), { x, y: top, color });
}

type Grid = { originX: number; originTop: number; module: number };

// fallow-ignore-next-line complexity
const inFinder = ({ matrix, x, y }: { matrix: QrMatrix; x: number; y: number }) =>
	(x < 7 && y < 7) || (x >= matrix.size - 7 && y < 7) || (x < 7 && y >= matrix.size - 7);

/** The three corner markers as nested rounded squares. */
function drawFinders({
	page,
	matrix,
	grid: { originX, originTop, module }
}: {
	page: PDFPage;
	matrix: QrMatrix;
	grid: Grid;
}) {
	for (const [fx, fy] of [
		[0, 0],
		[matrix.size - 7, 0],
		[0, matrix.size - 7]
	]) {
		const left = originX + fx * module;
		const top = originTop - fy * module;
		drawRoundedSquare({ page, x: left, top, side: module * 7, radius: module * 2, color: NEUTRAL });
		drawRoundedSquare({
			page,
			x: left + module,
			top: top - module,
			side: module * 5,
			radius: module * 1.4,
			color: WHITE
		});
		drawRoundedSquare({
			page,
			x: left + module * 2,
			top: top - module * 2,
			side: module * 3,
			radius: module * 0.9,
			color: PRIMARY
		});
	}
}

/** The emblem on a white zone in the middle, `reach` modules to each side of the centre. */
async function drawEmblem({
	pdf,
	page,
	emblemBytes,
	matrix,
	reach,
	grid: { originX, originTop, module }
}: {
	pdf: PDFDocument;
	page: PDFPage;
	emblemBytes: Uint8Array;
	matrix: QrMatrix;
	reach: number;
	grid: Grid;
}) {
	const emblem = await pdf.embedPng(emblemBytes);
	const middle = (matrix.size - 1) / 2;
	const zone = (reach * 2 + 1) * module;
	const left = originX + (middle - reach) * module;
	const top = originTop - (middle - reach) * module;
	drawRoundedSquare({ page, x: left, top, side: zone, radius: zone * 0.22, color: WHITE });
	const inner = zone * 0.78;
	const scale = Math.min(inner / emblem.width, inner / emblem.height);
	page.drawImage(emblem, {
		x: left + (zone - emblem.width * scale) / 2,
		y: top - zone + (zone - emblem.height * scale) / 2,
		width: emblem.width * scale,
		height: emblem.height * scale
	});
}

/**
 * The QR code in the corporate look: round modules in the primary colour, the three corner
 * markers as nested rounded squares, and room for the emblem in the middle.
 */
// fallow-ignore-next-line complexity
async function drawBrandedQr({
	pdf,
	page,
	text,
	box,
	emblemBytes
}: {
	pdf: PDFDocument;
	page: PDFPage;
	text: string;
	box: QrBox;
	emblemBytes: Uint8Array | null;
}) {
	const matrix = qrMatrix({ text, withEmblem: emblemBytes !== null });
	const padding = box.side * BRANDED_PADDING;
	const grid: Grid = {
		module: (box.side - padding * 2) / matrix.size,
		originX: box.x + padding,
		originTop: box.top - padding
	};

	// the card the code sits on; its border thins with a small code so it stays off the modules
	const radius = box.side * 0.05;
	drawRoundedSquare({ page, x: box.x, top: box.top, side: box.side, radius, color: WHITE });
	page.drawSvgPath(roundedRectPath({ width: box.side, height: box.side, radius }), {
		x: box.x,
		y: box.top,
		borderColor: PRIMARY,
		borderWidth: Math.min(3, box.side * 0.02)
	});

	const reach = Math.floor(matrix.size * 0.13);
	const middle = (matrix.size - 1) / 2;
	const inLogo = (x: number, y: number) =>
		Math.abs(x - middle) <= reach && Math.abs(y - middle) <= reach;

	for (let y = 0; y < matrix.size; y++) {
		for (let x = 0; x < matrix.size; x++) {
			if (!matrix.has(x, y) || inFinder({ matrix, x, y }) || (emblemBytes && inLogo(x, y)))
				continue;
			page.drawCircle({
				x: grid.originX + (x + 0.5) * grid.module,
				y: grid.originTop - (y + 0.5) * grid.module,
				size: grid.module * 0.47,
				color: PRIMARY
			});
		}
	}

	drawFinders({ page, matrix, grid });
	if (emblemBytes) await drawEmblem({ pdf, page, emblemBytes, matrix, reach, grid });
}

/**
 * A plain code: black squares on white, the quiet zone inside `box`. Each run of dark modules in a
 * row is one rectangle, which keeps the PDF small; they overlap a hair so no seam shows between
 * rows.
 */
function drawPlainQr({ page, text, box }: { page: PDFPage; text: string; box: QrBox }) {
	const matrix = qrMatrix({ text, withEmblem: false });
	const module = box.side / (matrix.size + QUIET_ZONE_MODULES * 2);
	const originX = box.x + QUIET_ZONE_MODULES * module;
	const originTop = box.top - QUIET_ZONE_MODULES * module;
	page.drawRectangle({
		x: box.x,
		y: box.top - box.side,
		width: box.side,
		height: box.side,
		color: WHITE
	});
	const seam = module * 0.02;
	for (let y = 0; y < matrix.size; y++) {
		let x = 0;
		while (x < matrix.size) {
			if (!matrix.has(x, y)) {
				x += 1;
				continue;
			}
			const start = x;
			while (x < matrix.size && matrix.has(x, y)) x += 1;
			page.drawRectangle({
				x: originX + start * module,
				y: originTop - (y + 1) * module - seam,
				width: (x - start) * module + seam,
				height: module + seam,
				color: BLACK
			});
		}
	}
}

/**
 * Draws a QR code of `text` into `box`: in the corporate design (with the emblem in the middle
 * when there is one) or plain. Callers size `box` with `minQrSide` so it scans.
 */
export async function drawQr({
	pdf,
	page,
	text,
	box,
	corporate,
	emblemBytes = null
}: {
	pdf: PDFDocument;
	page: PDFPage;
	text: string;
	box: QrBox;
	corporate: boolean;
	/** The conference's emblem as PNG; only the corporate design shows it. */
	emblemBytes?: Uint8Array | null;
}) {
	if (corporate) await drawBrandedQr({ pdf, page, text, box, emblemBytes });
	else drawPlainQr({ page, text, box });
}
