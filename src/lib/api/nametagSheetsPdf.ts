import { rgb, type PDFDocument, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import { createNametagPdf, MUTED, NEUTRAL, PRIMARY, type NametagFonts } from './nametagPdf';

export interface NametagSheetEntry {
	label: string;
	/** The flag or icon in front of the label, as PNG. */
	image: Uint8Array | null;
}

export interface NametagSheetSection {
	heading?: string;
	entries: NametagSheetEntry[];
}

export interface NametagSheet {
	/** "Tisch 2" */
	tableLabel: string;
	/** The big text: "A – H", or the name of the table of those without a nation. */
	title: string;
	sections: NametagSheetSection[];
}

export interface NametagSheetsOptions {
	sheets: NametagSheet[];
	/** The conference's name, in the footer. */
	conferenceTitle: string;
	/** The conference's logo as PNG. */
	logo: Uint8Array | null;
	fonts: NametagFonts;
}

// A4, landscape: the signs stand on the tables and are read from a few metres away
const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 44;
const HEADER_HEIGHT = 56;
const FOOTER_HEIGHT = 34;

const WHITE = rgb(1, 1, 1);

/** A rectangle with rounded corners, which pdf-lib can only draw as a path. */
function roundedRectPath(width: number, height: number, radius: number) {
	return [
		`M ${radius} 0`,
		`L ${width - radius} 0`,
		`Q ${width} 0 ${width} ${radius}`,
		`L ${width} ${height - radius}`,
		`Q ${width} ${height} ${width - radius} ${height}`,
		`L ${radius} ${height}`,
		`Q 0 ${height} 0 ${height - radius}`,
		`L 0 ${radius}`,
		`Q 0 0 ${radius} 0`,
		'Z'
	].join(' ');
}

function isKnown(known: Set<number>, char: string): boolean {
	return known.has(char.codePointAt(0) ?? -1);
}

function encodableChar(char: string, known: Set<number>): string {
	if (isKnown(known, char)) return char;
	const plain = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
	return plain && [...plain].every((c) => isKnown(known, c)) ? plain : '?';
}

/** Text the font has no glyph for loses its diacritics, or becomes a "?". */
function encodable(font: PDFFont, text: string): string {
	const known = new Set(font.getCharacterSet());
	return [...text].map((char) => encodableChar(char, known)).join('');
}

interface Row {
	text: string;
	image: PDFImage | null;
	heading: boolean;
}

/** The smallest the list may get; a longer one continues on another page instead. */
const MIN_LIST_SIZE = 13;
const MAX_COLUMNS = 5;
const LIST_GAP = 24;
const LIST_SIZES = [28, 26, 24, 22, 20, 18, 16, 15, 14, 13];

// the flag is 4:3 and as tall as the text is high
const flagWidthAt = (size: number) => size * 1.5 * (4 / 3);

function listLayout(size: number, columns: number, width: number, height: number) {
	const rowHeight = size * 1.4 + 6;
	const perColumn = Math.max(1, Math.floor(height / rowHeight));
	return {
		size,
		columns,
		rowHeight,
		perColumn,
		perPage: perColumn * columns,
		columnWidth: (width - LIST_GAP * (columns - 1)) / columns,
		gap: LIST_GAP,
		flagWidth: flagWidthAt(size)
	};
}

type ListLayout = ReturnType<typeof listLayout>;

function rowWidth(row: Row, size: number, regular: PDFFont, bold: PDFFont) {
	return row.heading
		? bold.widthOfTextAtSize(row.text, size)
		: flagWidthAt(size) + 12 + regular.widthOfTextAtSize(row.text, size);
}

/**
 * The largest font size, then the fewest columns, in which every row fits the area. When even the
 * smallest size does not hold them all, it keeps that size with as many columns as the names
 * allow, and `perPage` says how many rows one page takes.
 */
function fitList(rows: Row[], regular: PDFFont, bold: PDFFont, width: number, height: number) {
	const fitsWidth = (candidate: ListLayout) =>
		rows.every((row) => rowWidth(row, candidate.size, regular, bold) <= candidate.columnWidth);
	const columnCounts = Array.from({ length: MAX_COLUMNS }, (_, index) => index + 1);

	const roomy = LIST_SIZES.flatMap((size) =>
		columnCounts.map((columns) => listLayout(size, columns, width, height))
	).find((candidate) => candidate.perPage >= rows.length && fitsWidth(candidate));
	if (roomy) return roomy;

	const squeezed = columnCounts
		.slice(1)
		.reverse()
		.map((columns) => listLayout(MIN_LIST_SIZE, columns, width, height))
		.find(fitsWidth);
	return squeezed ?? listLayout(MIN_LIST_SIZE, 1, width, height);
}

/** Cuts the rows into pages, keeping a heading together with what follows it. */
function paginate(rows: Row[], perPage: number): Row[][] {
	const pages: Row[][] = [];
	let rest = rows;
	while (rest.length > perPage) {
		let end = perPage;
		if (rest[end - 1].heading) end--;
		pages.push(rest.slice(0, end));
		rest = rest.slice(end);
	}
	pages.push(rest);
	return pages;
}

function drawHeader(page: PDFPage, tableLabel: string, bold: PDFFont, logo: PDFImage | null) {
	const top = PAGE_HEIGHT - MARGIN;

	if (logo) {
		const height = HEADER_HEIGHT - 8;
		const width = Math.min((logo.width / logo.height) * height, 220);
		page.drawImage(logo, {
			x: MARGIN,
			y: top - height,
			width,
			height: (width / logo.width) * logo.height
		});
	}

	// the table, as a pill on the right
	const label = encodable(bold, tableLabel);
	const size = 22;
	const pillWidth = bold.widthOfTextAtSize(label, size) + 40;
	const pillHeight = 40;
	const pillX = PAGE_WIDTH - MARGIN - pillWidth;
	const pillTop = top - (HEADER_HEIGHT - pillHeight) / 2 - 4;
	page.drawSvgPath(roundedRectPath(pillWidth, pillHeight, pillHeight / 2), {
		x: pillX,
		y: pillTop,
		color: PRIMARY
	});
	page.drawText(label, {
		x: pillX + 20,
		y: pillTop - pillHeight / 2 - size * 0.34,
		size,
		font: bold,
		color: WHITE
	});
}

type ImageEmbedder = (bytes: Uint8Array | null) => Promise<PDFImage | null>;

/** Flags repeat across sheets only by chance, but the same bytes are one image in the file. */
function imageEmbedder(pdf: PDFDocument): ImageEmbedder {
	const embedded = new Map<Uint8Array, PDFImage>();
	return async (bytes) => {
		if (!bytes) return null;
		const known = embedded.get(bytes);
		if (known) return known;
		const image = await pdf.embedPng(bytes);
		embedded.set(bytes, image);
		return image;
	};
}

async function sheetRows(
	sheet: NametagSheet,
	regular: PDFFont,
	bold: PDFFont,
	embedImage: ImageEmbedder
): Promise<Row[]> {
	const rows: Row[] = [];
	for (const section of sheet.sections) {
		if (section.heading) {
			rows.push({ text: encodable(bold, section.heading), image: null, heading: true });
		}
		for (const entry of section.entries) {
			rows.push({
				text: encodable(regular, entry.label),
				image: await embedImage(entry.image),
				heading: false
			});
		}
	}
	return rows;
}

interface SheetFrame {
	title: string;
	titleSize: number;
	titleBaseline: number;
	barY: number;
	listTop: number;
	listHeight: number;
}

/** Where the big title, its bar and the list go on a sheet. */
function sheetFrame(title: string, bold: PDFFont): SheetFrame {
	const contentWidth = PAGE_WIDTH - MARGIN * 2;
	// as large as the page allows, but never shrunk for a long list: that runs onto more pages
	const titleSize = Math.min(130, (contentWidth / bold.widthOfTextAtSize(title, 100)) * 100);
	const titleTop = PAGE_HEIGHT - MARGIN - HEADER_HEIGHT - 8;
	const titleBaseline = titleTop - titleSize * 0.78;
	const barY = titleBaseline - titleSize * 0.2 - 14;
	const listTop = barY - 26;
	return {
		title,
		titleSize,
		titleBaseline,
		barY,
		listTop,
		listHeight: listTop - MARGIN - FOOTER_HEIGHT
	};
}

function drawRow(
	page: PDFPage,
	row: Row,
	index: number,
	layout: ListLayout,
	frame: SheetFrame,
	fonts: { regular: PDFFont; bold: PDFFont }
) {
	const flagHeight = layout.size * 1.5;
	const column = Math.floor(index / layout.perColumn);
	const line = index % layout.perColumn;
	const x = MARGIN + column * (layout.columnWidth + layout.gap);
	const rowTop = frame.listTop - line * layout.rowHeight;
	const baseline = rowTop - flagHeight / 2 - layout.size * 0.34;

	if (row.heading) {
		page.drawText(row.text, {
			x,
			y: baseline,
			size: layout.size,
			font: fonts.bold,
			color: PRIMARY
		});
		return;
	}
	if (row.image) {
		page.drawImage(row.image, {
			x,
			y: rowTop - flagHeight,
			width: layout.flagWidth,
			height: flagHeight
		});
	}
	page.drawText(row.text, {
		x: x + layout.flagWidth + 12,
		y: baseline,
		size: layout.size,
		font: fonts.regular,
		color: NEUTRAL
	});
}

function drawFooter(page: PDFPage, conferenceTitle: string, regular: PDFFont) {
	page.drawLine({
		start: { x: MARGIN, y: MARGIN + FOOTER_HEIGHT - 8 },
		end: { x: PAGE_WIDTH - MARGIN, y: MARGIN + FOOTER_HEIGHT - 8 },
		thickness: 1,
		color: MUTED
	});
	page.drawText(encodable(regular, conferenceTitle), {
		x: MARGIN,
		y: MARGIN + 2,
		size: 12,
		font: regular,
		color: MUTED
	});
}

/** One landscape A4 page per sheet, as a PDF. */
export async function buildNametagSheetsPdf({
	sheets,
	conferenceTitle,
	logo: logoBytes,
	fonts
}: NametagSheetsOptions): Promise<Uint8Array> {
	const { pdf, regular, bold } = await createNametagPdf(fonts);
	const logo = logoBytes ? await pdf.embedPng(logoBytes) : null;
	const embedImage = imageEmbedder(pdf);
	const contentWidth = PAGE_WIDTH - MARGIN * 2;

	for (const sheet of sheets) {
		const frame = sheetFrame(encodable(bold, sheet.title), bold);
		const rows = await sheetRows(sheet, regular, bold, embedImage);
		const layout = fitList(rows, regular, bold, contentWidth, frame.listHeight);
		const pages = paginate(rows, layout.perPage);

		pages.forEach((pageRows, pageIndex) => {
			const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
			const tableLabel =
				pages.length > 1
					? `${sheet.tableLabel} · ${pageIndex + 1}/${pages.length}`
					: sheet.tableLabel;
			drawHeader(page, tableLabel, bold, logo);
			page.drawText(frame.title, {
				x: MARGIN,
				y: frame.titleBaseline,
				size: frame.titleSize,
				font: bold,
				color: NEUTRAL
			});
			page.drawRectangle({ x: MARGIN, y: frame.barY, width: 96, height: 6, color: PRIMARY });
			pageRows.forEach((row, index) => drawRow(page, row, index, layout, frame, { regular, bold }));
			drawFooter(page, conferenceTitle, regular);
		});
	}

	return pdf.save();
}

/** Hands the PDF to the browser as a download. */
export function downloadPdf(bytes: Uint8Array, filename: string) {
	// copied into a plain ArrayBuffer-backed array, which is what a Blob accepts
	const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.click();
	URL.revokeObjectURL(url);
}
