import bwipjs from '@bwip-js/browser';
import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import { createNametagPdf, MUTED, NEUTRAL, PRIMARY, type NametagFonts } from './nametagPdf';

export interface NametagQrPdfOptions {
	/** Where the QR code leads: the page that tells a participant where to go. */
	url: string;
	/** "Bitte scannen und bereithalten!" in the reader's language. */
	prompt: string;
	conferenceTitle: string;
	/** The conference's logo as PNG. */
	logo: Uint8Array | null;
	fonts: NametagFonts;
}

// A4, portrait: the sheet hangs at the entrance and is scanned from a short distance
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 44;

/** The QR code as PNG, drawn large so the print stays sharp. */
function qrPng(url: string): Uint8Array {
	const canvas = document.createElement('canvas');
	bwipjs.toCanvas(canvas, { bcid: 'qrcode', text: url, scale: 12, paddingwidth: 0 });
	const base64 = canvas.toDataURL('image/png').split(',')[1];
	return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
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

	const qr = await pdf.embedPng(qrPng(url));
	const qrSize = Math.min(contentWidth, y - 18 - 60 - MARGIN - 20);
	page.drawImage(qr, {
		x: (PAGE_WIDTH - qrSize) / 2,
		y: y - 50 - qrSize,
		width: qrSize,
		height: qrSize
	});

	page.drawText(conferenceTitle, {
		x: (PAGE_WIDTH - regular.widthOfTextAtSize(conferenceTitle, 12)) / 2,
		y: MARGIN,
		size: 12,
		font: regular,
		color: MUTED
	});

	return pdf.save();
}
