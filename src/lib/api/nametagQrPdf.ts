import bwipjs from '@bwip-js/browser';
import type { Color, PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import {
	createNametagPdf,
	MUTED,
	NEUTRAL,
	PRIMARY,
	roundedRectPath,
	WHITE,
	type NametagFonts
} from './nametagPdf';

export interface NametagQrPdfOptions {
	/** Where the QR code leads: the page that tells a participant where to go. */
	url: string;
	/** "Bitte scannen und bereithalten!" in the reader's language. */
	prompt: string;
	conferenceTitle: string;
	/** The conference's logo as PNG, in the header. */
	logo: Uint8Array | null;
	/** The conference's emblem as PNG, in the middle of the QR code. */
	emblem: Uint8Array | null;
	fonts: NametagFonts;
}

// A4, portrait: the sheet hangs at the entrance and is scanned from a short distance
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;

/** The modules of the QR code, at the highest error correction so a logo can sit in the middle. */
function qrMatrix(text: string) {
	const [symbol] = bwipjs.raw('qrcode', text, 'eclevel=H');
	if (!symbol || !('pixs' in symbol)) throw new Error('Could not encode the QR code');
	return {
		size: symbol.pixx,
		has: (x: number, y: number) => symbol.pixs[y * symbol.pixx + x] === 1
	};
}

/** A rounded square with its top left corner at (x, y), measured from the page's bottom left. */
function drawRoundedSquare(
	page: PDFPage,
	x: number,
	top: number,
	side: number,
	radius: number,
	color: Color
) {
	page.drawSvgPath(roundedRectPath(side, side, radius), { x, y: top, color });
}

type Matrix = ReturnType<typeof qrMatrix>;
type Grid = { originX: number; originTop: number; module: number };

// fallow-ignore-next-line complexity
const inFinder = (matrix: Matrix, x: number, y: number) =>
	(x < 7 && y < 7) || (x >= matrix.size - 7 && y < 7) || (x < 7 && y >= matrix.size - 7);

/** The three corner markers as nested rounded squares. */
function drawFinders(page: PDFPage, matrix: Matrix, { originX, originTop, module }: Grid) {
	for (const [fx, fy] of [
		[0, 0],
		[matrix.size - 7, 0],
		[0, matrix.size - 7]
	]) {
		const left = originX + fx * module;
		const top = originTop - fy * module;
		drawRoundedSquare(page, left, top, module * 7, module * 2, NEUTRAL);
		drawRoundedSquare(page, left + module, top - module, module * 5, module * 1.4, WHITE);
		drawRoundedSquare(page, left + module * 2, top - module * 2, module * 3, module * 0.9, PRIMARY);
	}
}

/** The emblem on a white zone in the middle, `reach` modules to each side of the centre. */
async function drawEmblem(
	pdf: PDFDocument,
	page: PDFPage,
	emblemBytes: Uint8Array,
	matrix: Matrix,
	reach: number,
	{ originX, originTop, module }: Grid
) {
	const emblem = await pdf.embedPng(emblemBytes);
	const middle = (matrix.size - 1) / 2;
	const zone = (reach * 2 + 1) * module;
	const left = originX + (middle - reach) * module;
	const top = originTop - (middle - reach) * module;
	drawRoundedSquare(page, left, top, zone, zone * 0.22, WHITE);
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
async function drawBrandedQr(
	pdf: PDFDocument,
	page: PDFPage,
	text: string,
	box: { x: number; top: number; side: number },
	emblemBytes: Uint8Array | null
) {
	const matrix = qrMatrix(text);
	const padding = box.side * 0.06;
	const grid: Grid = {
		module: (box.side - padding * 2) / matrix.size,
		originX: box.x + padding,
		originTop: box.top - padding
	};

	// the card the code sits on
	drawRoundedSquare(page, box.x, box.top, box.side, box.side * 0.05, WHITE);
	page.drawSvgPath(roundedRectPath(box.side, box.side, box.side * 0.05), {
		x: box.x,
		y: box.top,
		borderColor: PRIMARY,
		borderWidth: 3
	});

	const reach = Math.floor(matrix.size * 0.13);
	const middle = (matrix.size - 1) / 2;
	const inLogo = (x: number, y: number) =>
		Math.abs(x - middle) <= reach && Math.abs(y - middle) <= reach;

	for (let y = 0; y < matrix.size; y++) {
		for (let x = 0; x < matrix.size; x++) {
			if (!matrix.has(x, y) || inFinder(matrix, x, y) || (emblemBytes && inLogo(x, y))) continue;
			page.drawCircle({
				x: grid.originX + (x + 0.5) * grid.module,
				y: grid.originTop - (y + 0.5) * grid.module,
				size: grid.module * 0.47,
				color: PRIMARY
			});
		}
	}

	drawFinders(page, matrix, grid);
	if (emblemBytes) await drawEmblem(pdf, page, emblemBytes, matrix, reach, grid);
}

/** The logo centred at the top; returns how far down the next element starts. */
async function drawLogo(pdf: PDFDocument, page: PDFPage, logoBytes: Uint8Array, top: number) {
	const logo = await pdf.embedPng(logoBytes);
	const height = 64;
	const width = Math.min((logo.width / logo.height) * height, 260);
	page.drawImage(logo, {
		x: (PAGE_WIDTH - width) / 2,
		y: top - (width / logo.width) * logo.height,
		width,
		height: (width / logo.width) * logo.height
	});
	return height + 40;
}

/** Breaks the prompt into as few lines as fit the width. */
function wrapLines(prompt: string, bold: PDFFont, size: number, width: number): string[] {
	const lines: string[] = [];
	for (const word of prompt.split(' ')) {
		const current = lines.at(-1);
		if (current && bold.widthOfTextAtSize(`${current} ${word}`, size) <= width) {
			lines[lines.length - 1] = `${current} ${word}`;
		} else {
			lines.push(word);
		}
	}
	return lines;
}

/** A single sheet: the logo, the call to scan, and the QR code. */
export async function buildNametagQrPdf({
	url,
	prompt,
	conferenceTitle,
	logo: logoBytes,
	emblem,
	fonts
}: NametagQrPdfOptions): Promise<Uint8Array> {
	const { pdf, regular, bold } = await createNametagPdf(fonts);
	const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
	const contentWidth = PAGE_WIDTH - MARGIN * 2;

	let y = PAGE_HEIGHT - MARGIN;
	if (logoBytes) y -= await drawLogo(pdf, page, logoBytes, y);

	// as large as the width allows, over as many lines as needed
	const size = 44;
	for (const line of wrapLines(prompt, bold, size, contentWidth)) {
		y -= size;
		page.drawText(line, {
			x: (PAGE_WIDTH - bold.widthOfTextAtSize(line, size)) / 2,
			y,
			size,
			font: bold,
			color: NEUTRAL
		});
		y -= 8;
	}
	page.drawRectangle({ x: (PAGE_WIDTH - 96) / 2, y: y - 18, width: 96, height: 6, color: PRIMARY });

	const side = Math.min(contentWidth, y - 18 - 60 - MARGIN - 20);
	await drawBrandedQr(pdf, page, url, { x: (PAGE_WIDTH - side) / 2, top: y - 50, side }, emblem);

	page.drawText(conferenceTitle, {
		x: (PAGE_WIDTH - regular.widthOfTextAtSize(conferenceTitle, 12)) / 2,
		y: MARGIN,
		size: 12,
		font: regular,
		color: MUTED
	});

	return pdf.save();
}
