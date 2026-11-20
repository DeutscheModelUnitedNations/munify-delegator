import { m } from '#lib/paraglide/messages';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFName, PDFString } from 'pdf-lib';
import { toast } from 'svelte-sonner';
import fontkit from '@pdf-lib/fontkit';
import { downloadPDF } from '#lib/utils/downloadHelpers';
import { layoutCertificateSessions } from '#lib/utils/certificateSessionLayout';
import { signedCodeLink } from '#lib/signedCode/signedCode';
import {
	boxInPoints,
	defaultLayout,
	DOCUMENT_ELEMENTS,
	POINTS_PER_MM,
	resolveDocumentLayout,
	squareInPoints,
	textInPoints,
	type BoxPlacement,
	type DocumentLayout,
	type SquarePlacement,
	type TextPlacement
} from '#lib/helpers/documentLayout';
import { fitQrSquare, minQrSide, qrMatrix } from '#lib/helpers/qrSize';
import { drawQr } from '#lib/api/pdfQr';
import { logger } from '#lib/logger';
import { markerCells, MARKER_CELLS } from '#lib/paperScan/markers';
import { MARKER, markerCenters } from '#lib/paperScan/markerGeometry';
import { PAPER_FIELDS } from '#lib/paperScan/fields';
import { pageAreas, type PostalDocument, type PrintedPage } from '#lib/paperScan/pageAreas';

/**
 * Signs the codes the pages of a person's application documents carry, one per page in the order
 * given (`issueDocumentCodes`).
 */
export type IssueDocumentCodes = (pages: PrintedPage[]) => Promise<string[]>;

export interface ParticipantData {
	id: string;
	name: string;
	address: string;
	birthday: string;
}

export interface RecipientData {
	name: string;
	address: string;
	zip: string;
	city: string;
	country: string;
}

export interface ParticipantCertificateData {
	fullName?: string | null;
	/** The signed certificate (`getCertificate`), drawn as a QR code of its link. */
	code?: string | null;
	/** The names of the check-in sessions the holder was checked in at. */
	sessions?: readonly string[];
}

/**
 * Draws the check-in sessions the holder was at in the box the layout gives them: a heading, then
 * each session with a checkmark drawn as two lines (no font glyph needed). Sessions they missed are
 * not on the list.
 */
function drawCertificateSessions({
	page,
	font,
	sessions,
	area
}: {
	page: PDFPage;
	font: PDFFont;
	sessions: readonly string[];
	area: { left: number; top: number; bottom: number };
}) {
	const heading = m.certificateSessionsHeading();
	const layout = layoutCertificateSessions({
		sessions,
		options: {
			left: area.left,
			top: area.top - 9,
			bottom: area.bottom,
			measure: (text, size) => font.widthOfTextAtSize(text, size)
		}
	});
	if (!layout) return;

	const black = rgb(0, 0, 0);
	page.drawText(heading, { ...layout.heading, font, color: black });
	for (const row of layout.rows) {
		const { box } = layout;
		const boxY = row.y - box * 0.1;
		const thickness = Math.max(0.9, box / 7);
		page.drawLine({
			start: { x: row.x + box * 0.08, y: boxY + box * 0.5 },
			end: { x: row.x + box * 0.36, y: boxY + box * 0.15 },
			thickness,
			color: black
		});
		page.drawLine({
			start: { x: row.x + box * 0.36, y: boxY + box * 0.15 },
			end: { x: row.x + box * 0.92, y: boxY + box * 0.9 },
			thickness,
			color: black
		});
		page.drawText(row.name, {
			x: row.x + box + 5,
			y: row.y,
			size: layout.size,
			font,
			color: black
		});
	}
}

interface PageStyles {
	margin: { left: number; right: number; top: number; bottom: number };
	colors: {
		gray: { r: number; g: number; b: number };
		black: { r: number; g: number; b: number };
		blue: { r: number; g: number; b: number }; // Added blue color
	};
	fontSize: { title: number; heading: number; normal: number };
	lineHeight: { normal: number };
}

const defaultStyles: PageStyles = {
	margin: { left: 70, right: 40, top: 40, bottom: 20 },
	colors: {
		gray: { r: 0.5, g: 0.5, b: 0.5 },
		black: { r: 0, g: 0, b: 0 },
		blue: { r: 0, g: 0.478, b: 1 } // RGB value for a bright blue color (approximating the PDF)
	},
	fontSize: { title: 18, heading: 14, normal: 11 },
	lineHeight: { normal: 1.2 }
};

// Create common utility functions
function createPDFUtils({
	page,
	helvetica,
	styles
}: {
	page: PDFPage;
	helvetica: PDFFont;
	helveticaBold: PDFFont;
	styles: PageStyles;
}) {
	function drawWrappedText({
		text,
		startY,
		font = helvetica,
		indent = 0
	}: {
		text: string;
		startY: number;
		font?: PDFFont;
		indent?: number;
	}): number {
		let currentY = startY;
		const words = text.split(' ');
		let currentLine = '';
		const { width } = page.getSize();
		const maxWidth = width - styles.margin.left - styles.margin.right - indent;

		words.forEach((word) => {
			const testLine = currentLine + (currentLine ? ' ' : '') + word;
			const lineWidth = font.widthOfTextAtSize(testLine, styles.fontSize.normal);

			if (lineWidth > maxWidth) {
				page.drawText(currentLine, {
					x: styles.margin.left + indent,
					y: currentY,
					size: styles.fontSize.normal,
					font: font,
					color: rgb(0, 0, 0)
				});
				currentY -= styles.fontSize.normal * styles.lineHeight.normal;
				currentLine = word;
			} else {
				currentLine = testLine;
			}
		});

		if (currentLine) {
			page.drawText(currentLine, {
				x: styles.margin.left + indent,
				y: currentY,
				size: styles.fontSize.normal,
				font: font,
				color: rgb(0, 0, 0)
			});
		}

		return currentY;
	}

	return {
		drawWrappedText,

		drawCheckbox({
			x,
			y,
			text,
			size = 10
		}: {
			x: number;
			y: number;
			text: string;
			size?: number;
		}): number {
			// Draw checkbox
			page.drawRectangle({
				x,
				y,
				width: size,
				height: size,
				borderWidth: 1,
				borderColor: rgb(0, 0, 0),
				color: rgb(1, 1, 1),
				opacity: 0
			});

			// Draw text with proper spacing
			const textY = y + 2; // Align text with checkbox center
			return drawWrappedText({ text, startY: textY, font: helvetica, indent: size + 5 });
		},

		drawFoldMarks() {
			const { height } = page.getSize();
			const foldHeight = 1; // Height of the fold mark

			const marks = [
				{ y: 105, width: 15 },
				{ y: 148.5, width: 20 },
				{ y: 210, width: 15 }
			];

			marks.forEach((mark) => {
				page.drawRectangle({
					x: 0,
					y: height - millimeterToPixel(mark.y),
					width: mark.width,
					height: foldHeight,
					color: rgb(0, 0, 0)
				});
			});
		}
	};
}

function millimeterToPixel(mm: number): number {
	const A4_PIXELS = 841.89; // A4 height in pixels
	const A4_MM = 297; // A4 height in mm
	return Math.round((mm * A4_PIXELS) / A4_MM);
}

interface PDFFonts {
	helvetica: PDFFont;
	helveticaBold: PDFFont;
	courier: PDFFont;
	custfont: PDFFont;
	custfontBold: PDFFont;
}

/** Embeds the standard fonts and the custom font into a document. */
async function embedFonts(pdfDoc: PDFDocument): Promise<PDFFonts> {
	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
	const courier = await pdfDoc.embedFont(StandardFonts.Courier);
	//Load custom font

	pdfDoc.registerFontkit(fontkit);
	const custfontBytes = await fetch('/fonts/SpaceMono-Regular.ttf').then((res) =>
		res.arrayBuffer()
	);
	const custfontBoldBytes = await fetch('/fonts/SpaceMono-Bold.ttf').then((res) =>
		res.arrayBuffer()
	);

	const custfont = await pdfDoc.embedFont(custfontBytes);
	const custfontBold = await pdfDoc.embedFont(custfontBoldBytes);
	return { helvetica, helveticaBold, courier, custfont, custfontBold };
}

/** A generator that turns a template document into a finished one. */
interface PDFPageGenerator {
	generate(): Promise<PDFDocument>;
}

/**
 * The shared flow of every generator: embed the fonts, let `generateContent` draw, then mark the
 * folds on every page.
 */
function createPDFPageGenerator({
	pdfDoc,
	styles,
	generateContent,
	foldMarks = true
}: {
	pdfDoc: PDFDocument;
	styles: PageStyles;
	generateContent: (fonts: PDFFonts) => Promise<void>;
	/** Letters get fold marks; a certificate is not folded. */
	foldMarks?: boolean;
}): PDFPageGenerator {
	return {
		async generate(): Promise<PDFDocument> {
			const fonts = await embedFonts(pdfDoc);
			await generateContent(fonts);
			if (!foldMarks) return pdfDoc;
			for (const page of pdfDoc.getPages()) {
				const utils = createPDFUtils({
					page,
					helvetica: fonts.helvetica,
					helveticaBold: fonts.helveticaBold,
					styles
				});
				utils.drawFoldMarks();
			}
			return pdfDoc;
		}
	};
}

/** A generator that fills a participant's details into the first page of a template. */
function createParticipantFormGenerator({
	pdfDoc,
	styles,
	participantData,
	generateContent
}: {
	pdfDoc: PDFDocument;
	styles: PageStyles;
	participantData: ParticipantData;
	generateContent: (form: ParticipantForm, fonts: PDFFonts) => Promise<void>;
}): PDFPageGenerator {
	const page = pdfDoc.getPage(0);
	const { width, height } = page.getSize();
	return createPDFPageGenerator({
		pdfDoc,
		styles,
		generateContent: async (fonts) => {
			await generateContent(
				{
					page,
					participantData,
					/** Writes one form field value in the custom font where the layout places it. */
					drawField({ text, placement }) {
						const at = textInPoints({ placement, width, height });
						page.drawText(text, {
							x: at.x,
							y: at.baseline,
							size: at.size,
							font: fonts.custfont,
							color: rgb(0, 0, 0)
						});
					}
				},
				fonts
			);
		}
	});
}

interface ParticipantForm {
	page: PDFPage;
	participantData: ParticipantData;
	drawField(args: { text: string; placement: TextPlacement }): void;
}

/**
 * The link a signed code stands for: what its QR code holds, so the team's phones open the person's
 * page with the camera app, and what the scanners check.
 */
const codeLink = (code: string) => signedCodeLink({ origin: window.location.origin, code });

/**
 * Draws a QR code of `text` where `placement` puts it on `page`, as vectors so it prints sharp.
 * It is never smaller than `minSide` (millimetres) nor than its modules need to stay readable
 * (`minQrSide`): a code that would be smaller grows around its centre, staying on the page.
 * Answers where it ended up, in points.
 */
async function placeQrCode({
	pdfDoc,
	page,
	text,
	placement,
	minSide,
	corporate
}: {
	pdfDoc: PDFDocument;
	page: PDFPage;
	text: string;
	placement: SquarePlacement;
	minSide: number;
	corporate: boolean;
}) {
	const { width, height } = page.getSize();
	const modules = qrMatrix({ text, withEmblem: false }).size;
	const square = fitQrSquare({
		square: squareInPoints({ placement, width, height }),
		minSide: Math.max(minSide * POINTS_PER_MM, minQrSide({ modules, corporate })),
		page: { width, height }
	});
	await drawQr({
		pdf: pdfDoc,
		page,
		text,
		box: { x: square.left, top: square.bottom + square.side, side: square.side },
		corporate
	});
	return square;
}

function createContractGenerator({
	pdfDoc,
	styles,
	recipientData,
	participantData,
	layout
}: {
	pdfDoc: PDFDocument;
	styles: PageStyles;
	recipientData: RecipientData;
	participantData: ParticipantData;
	layout: DocumentLayout<'contract'>;
}): PDFPageGenerator {
	return createParticipantFormGenerator({
		pdfDoc,
		styles,
		participantData,
		generateContent: async ({ page, drawField }, fonts) => {
			const { width, height } = page.getSize();
			// The address the letter goes to, a line at a time, where the envelope's window is.
			const recipient = textInPoints({ placement: layout.recipient, width, height });
			const lineHeight = recipient.size * 1.36;
			[
				recipientData.name,
				recipientData.address,
				`${recipientData.zip} ${recipientData.city}`,
				recipientData.country
			].forEach((line, index) => {
				page.drawText(line, {
					x: recipient.x,
					y: recipient.baseline - index * lineHeight,
					size: recipient.size,
					font: fonts.helvetica,
					color: rgb(0, 0, 0)
				});
			});

			drawField({ text: participantData.name, placement: layout.name });
			drawField({ text: participantData.birthday, placement: layout.birthday });
		}
	});
}

/** A consent form: name and birthday, and the address where the form has a field for it. */
function createConsentGenerator({
	pdfDoc,
	styles,
	participantData,
	layout
}: {
	pdfDoc: PDFDocument;
	styles: PageStyles;
	participantData: ParticipantData;
	layout: { name: TextPlacement; birthday: TextPlacement; address?: TextPlacement };
}): PDFPageGenerator {
	return createParticipantFormGenerator({
		pdfDoc,
		styles,
		participantData,
		generateContent: async ({ drawField }) => {
			drawField({ text: participantData.name, placement: layout.name });
			drawField({ text: participantData.birthday, placement: layout.birthday });
			if (layout.address) {
				drawField({ text: participantData.address, placement: layout.address });
			}
		}
	});
}

function toRomanNumeral(num: number): string {
	const romanNumerals: [number, string][] = [
		[10, 'x'],
		[9, 'ix'],
		[5, 'v'],
		[4, 'iv'],
		[1, 'i']
	];
	let result = '';
	for (const [value, numeral] of romanNumerals) {
		while (num >= value) {
			result += numeral;
			num -= value;
		}
	}
	return result;
}

/** A postal document's layout: every one has the footer (code and page number) and the fields. */
type PostalLayout =
	DocumentLayout<'contract'> | DocumentLayout<'guardianConsent'> | DocumentLayout<'mediaConsent'>;

/** One main page: which page of which document's template it is, and that document's layout. */
type MainPage = { document: PostalDocument; page: number; layout: PostalLayout };

/** The page number, right-aligned in the area the layout keeps for it, its size the area's. */
function drawPageNumber({
	page,
	font,
	text,
	placement
}: {
	page: PDFPage;
	font: PDFFont;
	text: string;
	placement: BoxPlacement;
}) {
	const { width, height } = page.getSize();
	const box = boxInPoints({ placement, width, height });
	const boxHeight = box.top - box.bottom;
	const size = Math.max(6, Math.min(10, boxHeight * 0.8));
	page.drawText(text, {
		x: box.left + box.width - font.widthOfTextAtSize(text, size),
		// capitals are about 0.7 of the size high: centred in the area
		y: box.bottom + (boxHeight - size * 0.7) / 2,
		size,
		font,
		color: rgb(0, 0, 0)
	});
}

/**
 * The person's name above their id, beside the code at its bottom: to its left, or to its right
 * when the code sits too close to the left edge for them.
 */
function drawCodeCaption({
	page,
	font,
	name,
	id,
	square
}: {
	page: PDFPage;
	font: PDFFont;
	name: string;
	id: string;
	square: { left: number; bottom: number; side: number };
}) {
	const size = 8;
	const gap = 5;
	const widest = Math.max(font.widthOfTextAtSize(name, size), font.widthOfTextAtSize(id, size));
	const onLeft = square.left - gap - widest >= 0;
	[id, name].forEach((line, index) => {
		const lineWidth = font.widthOfTextAtSize(line, size);
		page.drawText(line, {
			x: onLeft ? square.left - gap - lineWidth : square.left + square.side + gap,
			y: square.bottom + index * (size + 2),
			size,
			font,
			color: rgb(0, 0, 0)
		});
	});
}

/**
 * The alignment marks in the page's corners (`#lib/paperScan/markers`), each on white a cell wider
 * than it, so whatever the template has there does not touch it.
 */
function drawAlignmentMarks(page: PDFPage) {
	const { width, height } = page.getSize();
	const cell = (MARKER.side / MARKER_CELLS) * POINTS_PER_MM;
	const centers = markerCenters({ width: width / POINTS_PER_MM, height: height / POINTS_PER_MM });
	for (const [corner, center] of centers.entries()) {
		const left = center.x * POINTS_PER_MM - (MARKER_CELLS / 2) * cell;
		const top = height - center.y * POINTS_PER_MM + (MARKER_CELLS / 2) * cell;
		const side = MARKER_CELLS * cell;
		page.drawRectangle({
			x: left - cell,
			y: top - side - cell,
			width: side + 2 * cell,
			height: side + 2 * cell,
			color: rgb(1, 1, 1)
		});
		markerCells(corner).forEach((row, r) => {
			row.forEach((black, c) => {
				if (!black) return;
				// a hair larger, so no seam shows between neighbouring cells
				page.drawRectangle({
					x: left + c * cell,
					y: top - (r + 1) * cell - 0.02,
					width: cell + 0.02,
					height: cell + 0.02,
					color: rgb(0, 0, 0)
				});
			});
		});
	}
}

/** The fields of the page read off a scan: a box to tick, a line to sign on along a box's bottom. */
function drawPaperFields({ page, at }: { page: PDFPage; at: MainPage }) {
	const { width, height } = page.getSize();
	const { areas } = pageAreas({
		document: at.document,
		layout: at.layout,
		page: at.page,
		size: { width, height }
	});
	for (const area of areas) {
		const left = area.x * width;
		const bottom = height - (area.y + area.height) * height;
		if (PAPER_FIELDS[area.field].mark === 'signature') {
			page.drawLine({
				start: { x: left, y: bottom },
				end: { x: left + area.width * width, y: bottom },
				thickness: 0.75,
				color: rgb(0, 0, 0)
			});
		} else {
			page.drawRectangle({
				x: left,
				y: bottom,
				width: area.width * width,
				height: area.height * height,
				borderColor: rgb(0, 0, 0),
				borderWidth: 0.75
			});
		}
	}
}

/**
 * Numbers the pages and puts each main page's signed code (`codes`, one per main page), with the
 * person's name and id beside it, where that page's document places it. Where the conference
 * reads its paper (`scanning`), the main pages also get the alignment marks and their fields. The
 * appendix (the terms and conditions) is numbered in roman numerals, where `appendixPageNumber`
 * says. Codes are plain: printed at home and scanned back, black on white reads best.
 */
// fallow-ignore-next-line complexity
async function numerateDocument({
	pdfDoc,
	participantId,
	participantName,
	mainPages,
	codes,
	appendixPageNumber,
	scanning
}: {
	pdfDoc: PDFDocument;
	participantId: string;
	participantName: string;
	mainPages: MainPage[];
	codes: string[];
	appendixPageNumber: BoxPlacement;
	scanning: boolean;
}) {
	const pages = pdfDoc.getPages();
	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const mainPageCount = mainPages.length;
	const appendixPageCount = pages.length - mainPageCount;

	for (const [index, page] of pages.entries()) {
		const at = mainPages.at(index);
		const code = codes.at(index);
		if (!at || !code) {
			const appendixIndex = index - mainPageCount + 1;
			drawPageNumber({
				page,
				font: helvetica,
				text: `${toRomanNumeral(appendixIndex)} / ${toRomanNumeral(appendixPageCount)}`,
				placement: appendixPageNumber
			});
			continue;
		}
		if (scanning) {
			drawAlignmentMarks(page);
			drawPaperFields({ page, at });
		}
		const square = await placeQrCode({
			pdfDoc,
			page,
			text: codeLink(code),
			placement: at.layout.code,
			minSide: DOCUMENT_ELEMENTS.contract.code.minSide,
			corporate: false
		});
		drawCodeCaption({ page, font: helvetica, name: participantName, id: participantId, square });
		drawPageNumber({
			page,
			font: helvetica,
			text: `${index + 1} / ${mainPageCount}`,
			placement: at.layout.pageNumber
		});
	}
}

function createCertificateGenerator({
	pdfDoc,
	styles,
	data,
	layout,
	corporate
}: {
	pdfDoc: PDFDocument;
	styles: PageStyles;
	data: ParticipantCertificateData;
	layout: DocumentLayout<'certificate'>;
	corporate: boolean;
}): PDFPageGenerator {
	const page = pdfDoc.getPage(0);
	return createPDFPageGenerator({
		pdfDoc,
		styles,
		generateContent: async ({ custfont }) => {
			if (!data.fullName) {
				throw new Error('Full name is required for the certificate');
			}
			if (!data.code) {
				throw new Error('The signed code is required for the certificate');
			}

			const { width, height } = page.getSize();
			const black = rgb(0, 0, 0);

			const name = data.fullName;
			const at = textInPoints({ placement: layout.name, width, height });
			page.drawText(name, {
				x: at.x - custfont.widthOfTextAtSize(name, at.size) / 2,
				y: at.baseline,
				size: at.size,
				font: custfont,
				color: black
			});

			const verifyUrl = codeLink(data.code);
			const { left, bottom, side } = await placeQrCode({
				pdfDoc,
				page,
				text: verifyUrl,
				placement: layout.qr,
				minSide: DOCUMENT_ELEMENTS.certificate.qr.minSide,
				corporate
			});

			// The caption above the code links where the code does, for those reading on screen.
			const verifyText = m.certificateVerify();
			const captionSize = 8;
			const captionWidth = custfont.widthOfTextAtSize(verifyText, captionSize);
			const captionX = left + (side - captionWidth) / 2;
			const captionY = bottom + side + 4;
			page.drawText(verifyText, {
				x: captionX,
				y: captionY,
				size: captionSize,
				font: custfont,
				color: black
			});
			const link = pdfDoc.context.register(
				pdfDoc.context.obj({
					Type: 'Annot',
					Subtype: 'Link',
					Rect: [
						Math.min(left, captionX),
						bottom,
						Math.max(left + side, captionX + captionWidth),
						captionY + captionSize
					],
					Border: [0, 0, 0],
					A: pdfDoc.context.obj({ Type: 'Action', S: 'URI', URI: PDFString.of(verifyUrl) })
				})
			);
			page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([link]));

			drawCertificateSessions({
				page,
				font: custfont,
				sessions: data.sessions ?? [],
				area: boxInPoints({ placement: layout.sessions, width, height })
			});
		},
		foldMarks: false
	});
}

/**
 * Loads a template from where the API serves it. A data URL still works, which is what the
 * built-in test print templates are.
 */
async function loadTemplate(source: string): Promise<PDFDocument> {
	if (source.startsWith('data:')) return PDFDocument.load(source);
	const response = await fetch(source);
	if (!response.ok) throw new Error(`Could not load the template (${response.status})`);
	return PDFDocument.load(await response.arrayBuffer());
}

/** Copies every page of `source` to the end of `target`. */
async function appendPages({ target, source }: { target: PDFDocument; source: PDFDocument }) {
	const copiedPages = await target.copyPages(source, source.getPageIndices());
	copiedPages.forEach((page) => {
		target.addPage(page);
	});
}

// Main function to generate complete PDF
async function generateCompletePostalRegistrationPDF({
	isOfAge,
	participant,
	issueCodes,
	recipient,
	contract,
	guardianAgreement,
	medialAgreement,
	termsAndConditions,
	layouts,
	scanning
}: {
	isOfAge: boolean;
	participant: ParticipantData;
	issueCodes: IssueDocumentCodes;
	recipient: RecipientData;
	contract: string;
	guardianAgreement: string;
	medialAgreement: string;
	termsAndConditions: string;
	/** `conference.documentLayouts`: where the team placed the fields; the defaults otherwise. */
	layouts: unknown;
	/** `conference.paperScanning`: alignment marks and fields to read off a scan. */
	scanning: boolean;
}): Promise<Uint8Array> {
	const contractLayout = resolveDocumentLayout({ document: 'contract', stored: layouts });
	const guardianLayout = resolveDocumentLayout({ document: 'guardianConsent', stored: layouts });
	const mediaLayout = resolveDocumentLayout({ document: 'mediaConsent', stored: layouts });

	// Each main document with the layout its pages' footers follow; the guardian consent only for
	// a minor
	const mainDocuments: {
		generator: PDFPageGenerator;
		document: PostalDocument;
		layout: PostalLayout;
	}[] = [
		{
			generator: createContractGenerator({
				pdfDoc: await loadTemplate(contract),
				styles: defaultStyles,
				recipientData: recipient,
				participantData: participant,
				layout: contractLayout
			}),
			document: 'contract',
			layout: contractLayout
		}
	];
	if (!isOfAge) {
		mainDocuments.push({
			generator: createConsentGenerator({
				pdfDoc: await loadTemplate(guardianAgreement),
				styles: defaultStyles,
				participantData: participant,
				layout: guardianLayout
			}),
			document: 'guardianConsent',
			layout: guardianLayout
		});
	}
	mainDocuments.push({
		generator: createConsentGenerator({
			pdfDoc: await loadTemplate(medialAgreement),
			styles: defaultStyles,
			participantData: participant,
			layout: mediaLayout
		}),
		document: 'mediaConsent',
		layout: mediaLayout
	});

	const mergedPdfDoc = await PDFDocument.create();
	const mainPages: MainPage[] = [];
	for (const { generator, document, layout } of mainDocuments) {
		const pdf = await generator.generate();
		await appendPages({ target: mergedPdfDoc, source: pdf });
		for (let page = 0; page < pdf.getPageCount(); page++) {
			mainPages.push({ document, page, layout });
		}
	}
	const codes = await issueCodes(
		mainPages.map(({ document, page }, index) => ({
			document,
			page,
			...mergedPdfDoc.getPage(index).getSize()
		}))
	);

	await appendPages({ target: mergedPdfDoc, source: await loadTemplate(termsAndConditions) });

	// Add page numbers, participant name, the signed code, and participant ID to each page
	await numerateDocument({
		pdfDoc: mergedPdfDoc,
		participantId: participant.id,
		participantName: participant.name,
		mainPages,
		codes,
		appendixPageNumber: contractLayout.pageNumber,
		scanning
	});

	// Merge all pages into a single PDF
	const mergedPdfBytes = await mergedPdfDoc.save();
	return mergedPdfBytes;
}

/** A stored template as the API selects it; missing until the team uploads one. */
type TemplateFile = { url: string } | null | undefined;

/** The four templates a postal registration is built from, as a conference selects them. */
interface PostalTemplateFiles {
	contractFile?: TemplateFile;
	guardianConsentFile?: TemplateFile;
	mediaConsentFile?: TemplateFile;
	termsAndConditionsFile?: TemplateFile;
	/** Where the team placed the fields on them (`conference.documentLayouts`). */
	documentLayouts?: unknown;
	/** Whether the documents are printed to be read back by a scan (`conference.paperScanning`). */
	paperScanning: boolean;
}

/** The template's URL, or a toast naming what is missing and an error when there is none. */
function requireContent({
	file,
	missingMessage
}: {
	file: TemplateFile;
	missingMessage: string;
}): string {
	if (file) return file.url;
	toast.error(missingMessage);
	throw new Error('Missing required PDF content');
}

// Export function for usage
export async function downloadCompletePostalRegistrationPDF({
	isOfAge,
	participant,
	issueCodes,
	recipient,
	templates,
	fileName = 'postal_registration.pdf'
}: {
	isOfAge: boolean;
	participant: ParticipantData;
	/** Signs the codes the pages carry, drawn as QR codes of their links. */
	issueCodes: IssueDocumentCodes;
	recipient: RecipientData;
	templates: PostalTemplateFiles;
	fileName?: string;
}): Promise<void> {
	const contractContent = requireContent({
		file: templates.contractFile,
		missingMessage: m.pdfMissingContract()
	});
	const guardianContent = requireContent({
		file: templates.guardianConsentFile,
		missingMessage: m.pdfMissingGuardianAgreement()
	});
	const mediaContent = requireContent({
		file: templates.mediaConsentFile,
		missingMessage: m.pdfMissingMediaAgreement()
	});
	const termsContent = requireContent({
		file: templates.termsAndConditionsFile,
		missingMessage: m.pdfMissingTerms()
	});
	try {
		const pdfBytes = await generateCompletePostalRegistrationPDF({
			isOfAge,
			participant,
			issueCodes,
			recipient,
			contract: contractContent,
			guardianAgreement: guardianContent,
			medialAgreement: mediaContent,
			termsAndConditions: termsContent,
			layouts: templates.documentLayouts,
			scanning: templates.paperScanning
		});

		downloadPDF({ bytes: pdfBytes, filename: fileName });
	} catch (error) {
		logger.error('Error generating registration form', error);
		throw error;
	}
}

async function generateCertificatePDF({
	data,
	certificate,
	layout,
	corporate
}: {
	data: ParticipantCertificateData;
	certificate: string;
	layout: DocumentLayout<'certificate'>;
	corporate: boolean;
}) {
	const pageGenerator = createCertificateGenerator({
		pdfDoc: await loadTemplate(certificate),
		styles: defaultStyles,
		data,
		layout,
		corporate
	});

	const pdf = await pageGenerator.generate();

	// Merge all pages into a single PDF
	const pdfBytes = await pdf.save();
	return pdfBytes;
}

export async function downloadCompleteCertificate({
	data,
	certificate,
	fileName,
	layout = defaultLayout('certificate'),
	corporate
}: {
	data: ParticipantCertificateData;
	certificate: string | undefined;
	fileName: string;
	/** Where the conference placed the name, sessions and QR code; the default otherwise. */
	layout?: DocumentLayout<'certificate'>;
	/** Whether the code is in the corporate design (`conference.qrCorporateDesign`). */
	corporate: boolean;
}): Promise<void> {
	try {
		if (!certificate) {
			toast.error(m.pdfMissingCertificate());
			throw new Error('Missing required PDF content');
		}
		const pdfBytes = await generateCertificatePDF({ data, certificate, layout, corporate });

		downloadPDF({ bytes: pdfBytes, filename: fileName });
	} catch (error) {
		logger.error('Error generating registration form', error);
		throw error;
	}
}
