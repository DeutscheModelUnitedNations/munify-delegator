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
	/** What the QR holds: the signed card code's link (`signedCodeLink`). */
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

/** What every part of one card is drawn with. */
interface CardCanvas {
	pdf: PDFDocument;
	page: PDFPage;
	left: number;
	/** The card's width inside its padding. */
	width: number;
	fonts: { regular: PDFFont; bold: PDFFont };
}

/** The conference's logo at the top, answering where the next part starts. */
async function drawLogo({ canvas, logo, y }: { canvas: CardCanvas; logo: Uint8Array; y: number }) {
	const image = await canvas.pdf.embedPng(logo);
	const height = 30;
	const logoWidth = Math.min((image.width / image.height) * height, canvas.width);
	const logoHeight = (logoWidth / image.width) * image.height;
	canvas.page.drawImage(image, {
		x: canvas.left + (CARD_WIDTH - logoWidth) / 2,
		y: y - logoHeight,
		width: logoWidth,
		height: logoHeight
	});
	return y - logoHeight - 18;
}

/** The given and the family name, each on its own line, answering where the next part starts. */
function drawNames({ canvas, card, y }: { canvas: CardCanvas; card: NsaCardEntry; y: number }) {
	const font = canvas.fonts.bold;
	for (const text of [card.givenName, card.familyName]) {
		const line = encodable({ font, text });
		const fitted = fittingSize({ font, text: line, width: canvas.width, size: 24, min: 12 });
		y -= fitted;
		drawCentred({
			page: canvas.page,
			text: line,
			font,
			size: fitted,
			y,
			left: canvas.left,
			color: NEUTRAL
		});
		y -= 6;
	}
	return y;
}

/** The organisation's name with its icon, centred, answering where the next part starts. */
async function drawOrganisation({
	canvas,
	name: rawName,
	icon,
	y
}: {
	canvas: CardCanvas;
	name: string;
	icon: Uint8Array | null | undefined;
	y: number;
}) {
	const font = canvas.fonts.regular;
	const name = encodable({ font, text: rawName });
	const iconSide = 16;
	const iconRoom = icon ? iconSide + 6 : 0;
	const size = fittingSize({
		font,
		text: name,
		width: canvas.width - iconSide - 6,
		size: 15,
		min: 9
	});
	const rowLeft = canvas.left + (CARD_WIDTH - (iconRoom + font.widthOfTextAtSize(name, size))) / 2;
	y -= iconSide + 4;
	if (icon) {
		const image = await canvas.pdf.embedPng(icon);
		canvas.page.drawImage(image, { x: rowLeft, y: y - 2, width: iconSide, height: iconSide });
	}
	canvas.page.drawText(name, {
		x: rowLeft + iconRoom,
		y: y + (iconSide - size) / 2,
		size,
		font,
		color: PRIMARY
	});
	return y;
}

/** The conference's title and the card's label along the bottom edge. */
function drawFooter({
	canvas,
	card,
	options,
	footer
}: {
	canvas: CardCanvas;
	card: NsaCardEntry;
	options: NsaCardsPdfOptions;
	footer: number;
}) {
	const font = canvas.fonts.regular;
	const title = encodable({ font, text: options.conferenceTitle });
	const label = options.cardLabel(card.cardNumber);
	const labelSize = 8;
	canvas.page.drawText(title, {
		x: canvas.left + PADDING,
		y: footer,
		size: fittingSize({ font, text: title, width: canvas.width - 60, size: labelSize, min: 6 }),
		font,
		color: MUTED
	});
	canvas.page.drawText(label, {
		x: canvas.left + CARD_WIDTH - PADDING - font.widthOfTextAtSize(label, labelSize),
		y: footer,
		size: labelSize,
		font,
		color: MUTED
	});
}

async function drawCard({
	pdf,
	page,
	card,
	left,
	bottom,
	fonts,
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
	const canvas: CardCanvas = { pdf, page, left, width: CARD_WIDTH - PADDING * 2, fonts };
	let y = bottom + CARD_HEIGHT - PADDING;
	if (options.logo) y = await drawLogo({ canvas, logo: options.logo, y });
	y = drawNames({ canvas, card, y });
	if (card.nsaName) y = await drawOrganisation({ canvas, name: card.nsaName, icon: card.icon, y });

	const footer = bottom + PADDING;
	const side = Math.min(canvas.width, y - 14 - footer - 22);
	await drawBrandedQr({
		pdf,
		page,
		text: card.code,
		box: { x: left + (CARD_WIDTH - side) / 2, top: y - 14, side },
		emblemBytes: null
	});
	drawFooter({ canvas, card, options, footer });
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
