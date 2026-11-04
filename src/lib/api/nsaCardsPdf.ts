import type { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import { drawBrandedQr } from './nametagQrPdf';
import {
	createNametagPdf,
	encodable,
	MUTED,
	NEUTRAL,
	PRIMARY,
	type NametagFonts
} from './nametagPdf';

/**
 * Printed NSA cards (`docs/plans/chase-link.md`): A6, four to an A4 sheet with cut lines, to go
 * into a badge holder. Each carries the signed card code as a QR, and the person's and the NSA's
 * names, so a chair can find the person by name when the code does not scan.
 */

export interface NsaCardEntry {
	givenName: string;
	familyName: string;
	nsaName: string | null;
	/** The NSA's icon as PNG. */
	icon: Uint8Array | null;
	cardNumber: number;
	/** The signed card code (`MUC1…`). */
	code: string;
}

export interface NsaCardsPdfOptions {
	cards: NsaCardEntry[];
	conferenceTitle: string;
	/** The conference's logo as PNG. */
	logo: Uint8Array | null;
	/** "Karte 2", in the reader's language. */
	cardLabel: (cardNumber: number) => string;
	fonts: NametagFonts;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const CARD_WIDTH = PAGE_WIDTH / 2;
const CARD_HEIGHT = PAGE_HEIGHT / 2;
const PADDING = 22;
const CUT_LINE = { thickness: 0.5, color: MUTED, dashArray: [4, 4] };

/** The largest size from `size` down to `min` at which `text` fits `width`. */
function fittingSize({
	font,
	text,
	width,
	size,
	min
}: {
	font: PDFFont;
	text: string;
	width: number;
	size: number;
	min: number;
}) {
	let fitted = size;
	while (fitted > min && font.widthOfTextAtSize(text, fitted) > width) fitted -= 1;
	return fitted;
}

function drawCentred({
	page,
	text,
	font,
	size,
	y,
	left,
	color
}: {
	page: PDFPage;
	text: string;
	font: PDFFont;
	size: number;
	y: number;
	left: number;
	color: typeof NEUTRAL;
}) {
	const width = font.widthOfTextAtSize(text, size);
	page.drawText(text, { x: left + (CARD_WIDTH - width) / 2, y, size, font, color });
}

// fallow-ignore-next-line complexity
async function drawCard({
	pdf,
	page,
	card,
	left,
	bottom,
	fonts: { regular, bold },
	options
}: {
	pdf: PDFDocument;
	page: PDFPage;
	card: NsaCardEntry;
	left: number;
	bottom: number;
	fonts: { regular: PDFFont; bold: PDFFont };
	options: NsaCardsPdfOptions;
}) {
	const width = CARD_WIDTH - PADDING * 2;
	let y = bottom + CARD_HEIGHT - PADDING;

	if (options.logo) {
		const logo = await pdf.embedPng(options.logo);
		const height = 30;
		const logoWidth = Math.min((logo.width / logo.height) * height, width);
		const logoHeight = (logoWidth / logo.width) * logo.height;
		page.drawImage(logo, {
			x: left + (CARD_WIDTH - logoWidth) / 2,
			y: y - logoHeight,
			width: logoWidth,
			height: logoHeight
		});
		y -= logoHeight + 18;
	}

	for (const [text, size] of [
		[card.givenName, 24],
		[card.familyName, 24]
	] as const) {
		const line = encodable({ font: bold, text });
		const fitted = fittingSize({ font: bold, text: line, width, size, min: 12 });
		y -= fitted;
		drawCentred({ page, text: line, font: bold, size: fitted, y, left, color: NEUTRAL });
		y -= 6;
	}

	if (card.nsaName) {
		const name = encodable({ font: regular, text: card.nsaName });
		const iconSide = 16;
		const size = fittingSize({
			font: regular,
			text: name,
			width: width - iconSide - 6,
			size: 15,
			min: 9
		});
		const textWidth = regular.widthOfTextAtSize(name, size);
		const rowWidth = (card.icon ? iconSide + 6 : 0) + textWidth;
		const rowLeft = left + (CARD_WIDTH - rowWidth) / 2;
		y -= iconSide + 4;
		if (card.icon) {
			const icon = await pdf.embedPng(card.icon);
			page.drawImage(icon, { x: rowLeft, y: y - 2, width: iconSide, height: iconSide });
		}
		page.drawText(name, {
			x: rowLeft + (card.icon ? iconSide + 6 : 0),
			y: y + (iconSide - size) / 2,
			size,
			font: regular,
			color: PRIMARY
		});
	}

	const footer = bottom + PADDING;
	const side = Math.min(width, y - 14 - footer - 22);
	await drawBrandedQr({
		pdf,
		page,
		text: card.code,
		box: { x: left + (CARD_WIDTH - side) / 2, top: y - 14, side },
		emblemBytes: null
	});

	const title = encodable({ font: regular, text: options.conferenceTitle });
	const label = options.cardLabel(card.cardNumber);
	const labelSize = 8;
	page.drawText(title, {
		x: left + PADDING,
		y: footer,
		size: fittingSize({ font: regular, text: title, width: width - 60, size: labelSize, min: 6 }),
		font: regular,
		color: MUTED
	});
	page.drawText(label, {
		x: left + CARD_WIDTH - PADDING - regular.widthOfTextAtSize(label, labelSize),
		y: footer,
		size: labelSize,
		font: regular,
		color: MUTED
	});
}

export async function buildNsaCardsPdf(options: NsaCardsPdfOptions): Promise<Uint8Array> {
	const { pdf, regular, bold } = await createNametagPdf(options.fonts);
	for (let start = 0; start < options.cards.length; start += 4) {
		const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
		page.drawLine({
			start: { x: CARD_WIDTH, y: 0 },
			end: { x: CARD_WIDTH, y: PAGE_HEIGHT },
			...CUT_LINE
		});
		page.drawLine({
			start: { x: 0, y: CARD_HEIGHT },
			end: { x: PAGE_WIDTH, y: CARD_HEIGHT },
			...CUT_LINE
		});
		const onPage = options.cards.slice(start, start + 4);
		for (const [index, card] of onPage.entries()) {
			await drawCard({
				pdf,
				page,
				card,
				left: (index % 2) * CARD_WIDTH,
				bottom: index < 2 ? CARD_HEIGHT : 0,
				fonts: { regular, bold },
				options
			});
		}
	}
	return pdf.save();
}
