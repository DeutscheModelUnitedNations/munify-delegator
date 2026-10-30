import { m } from '#lib/paraglide/messages';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFName, PDFString } from 'pdf-lib';
import bwipjs from '@bwip-js/browser';
import { toast } from 'svelte-sonner';
import fontkit from '@pdf-lib/fontkit';
import { downloadPDF } from '#lib/utils/downloadHelpers';
import {
	layoutCertificateSessions,
	type CertificateSessionMark
} from '#lib/utils/certificateSessionLayout';
import {
	boxInPoints,
	defaultLayout,
	resolveDocumentLayout,
	squareInPoints,
	textInPoints,
	type DocumentLayout,
	type TextPlacement
} from '#lib/helpers/documentLayout';

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
	jwt?: string | null;
	/** The check-in sessions the holder was checked in at. */
	sessions?: readonly CertificateSessionMark[];
}

/**
 * Draws the check-in sessions the holder was at in the box the layout gives them: a heading, then
 * each session with a checkmark drawn as two lines (no font glyph needed). Sessions they missed are
 * not on the list.
 */
function drawCertificateSessions(
	page: PDFPage,
	font: PDFFont,
	sessions: readonly CertificateSessionMark[],
	area: { left: number; width: number; top: number; bottom: number }
) {
	const heading = m.certificateSessionsHeading();
	const layout = layoutCertificateSessions(sessions, heading, {
		pageWidth: area.width,
		left: area.left,
		top: area.top - 9,
		bottom: area.bottom,
		measure: (text, size) => font.widthOfTextAtSize(text, size)
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
function createPDFUtils(
	page: PDFPage,
	helvetica: PDFFont,
	_helveticaBold: PDFFont,
	styles: PageStyles
) {
	function drawWrappedText(text: string, startY: number, font = helvetica, indent = 0): number {
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

		drawCheckbox(x: number, y: number, text: string, size = 10): number {
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
			return drawWrappedText(text, textY, helvetica, size + 5);
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
function createPDFPageGenerator(
	pdfDoc: PDFDocument,
	styles: PageStyles,
	generateContent: (fonts: PDFFonts) => Promise<void>,
	/** Letters get fold marks; a certificate is not folded. */
	{ foldMarks = true }: { foldMarks?: boolean } = {}
): PDFPageGenerator {
	return {
		async generate(): Promise<PDFDocument> {
			const fonts = await embedFonts(pdfDoc);
			await generateContent(fonts);
			if (!foldMarks) return pdfDoc;
			for (const page of pdfDoc.getPages()) {
				const utils = createPDFUtils(page, fonts.helvetica, fonts.helveticaBold, styles);
				utils.drawFoldMarks();
			}
			return pdfDoc;
		}
	};
}

/** A generator that fills a participant's details into the first page of a template. */
function createParticipantFormGenerator(
	pdfDoc: PDFDocument,
	styles: PageStyles,
	participantData: ParticipantData,
	generateContent: (form: ParticipantForm, fonts: PDFFonts) => Promise<void>
): PDFPageGenerator {
	const page = pdfDoc.getPage(0);
	const { width, height } = page.getSize();
	return createPDFPageGenerator(pdfDoc, styles, async (fonts) => {
		await generateContent(
			{
				page,
				participantData,
				/** Writes one form field value in the custom font where the layout places it. */
				drawField(text: string, placement: TextPlacement) {
					const at = textInPoints(placement, width, height);
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
	});
}

interface ParticipantForm {
	page: PDFPage;
	participantData: ParticipantData;
	drawField(text: string, placement: TextPlacement): void;
}

/** A data-matrix code of `text`, drawn as a square where the layout places it. */
async function drawDataMatrix(
	pdfDoc: PDFDocument,
	page: PDFPage,
	text: string,
	placement: DocumentLayout<'contract'>['code']
) {
	const canvas = document.createElement('canvas');
	bwipjs.toCanvas(canvas, { bcid: 'datamatrix', text, scale: 4, rotate: 'L' });
	const image = await pdfDoc.embedPng(canvas.toDataURL('image/png'));
	const { width, height } = page.getSize();
	const { left, bottom, side } = squareInPoints(placement, width, height);
	page.drawImage(image, { x: left, y: bottom, width: side, height: side });
}

function createContractGenerator(
	pdfDoc: PDFDocument,
	styles: PageStyles,
	recipientData: RecipientData,
	participantData: ParticipantData,
	layout: DocumentLayout<'contract'>
): PDFPageGenerator {
	return createParticipantFormGenerator(
		pdfDoc,
		styles,
		participantData,
		async ({ page, drawField }, fonts) => {
			const { width, height } = page.getSize();
			// The address the letter goes to, a line at a time, where the envelope's window is.
			const recipient = textInPoints(layout.recipient, width, height);
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

			await drawDataMatrix(pdfDoc, page, participantData.id, layout.code);
			drawField(participantData.name, layout.name);
			drawField(participantData.birthday, layout.birthday);
		}
	);
}

function createGuardianGenerator(
	pdfDoc: PDFDocument,
	styles: PageStyles,
	participantData: ParticipantData,
	layout: DocumentLayout<'guardianConsent'>
): PDFPageGenerator {
	return createParticipantFormGenerator(pdfDoc, styles, participantData, async ({ drawField }) => {
		drawField(participantData.name, layout.name);
		drawField(participantData.birthday, layout.birthday);
	});
}

function createMediaGenerator(
	pdfDoc: PDFDocument,
	styles: PageStyles,
	participantData: ParticipantData,
	layout: DocumentLayout<'mediaConsent'>
): PDFPageGenerator {
	return createParticipantFormGenerator(pdfDoc, styles, participantData, async ({ drawField }) => {
		drawField(participantData.name, layout.name);
		drawField(participantData.birthday, layout.birthday);
		drawField(participantData.address, layout.address);
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

async function numerateDocument(
	pdfDoc: PDFDocument,
	participantId: string,
	participantName: string,
	mainPageCount: number
) {
	const pages = pdfDoc.getPages();
	const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

	const totalPages = pages.length;
	const appendixPageCount = totalPages - mainPageCount;
	const { width } = pdfDoc.getPage(0).getSize();
	const fontSize = 10;

	// Generate data-matrix barcode for footer (only needed for main pages)
	const barcodeCanvas = document.createElement('canvas');
	bwipjs.toCanvas(barcodeCanvas, {
		bcid: 'datamatrix',
		text: participantId,
		scale: 1,
		rotate: 'N'
	});
	const barcodeImg = barcodeCanvas.toDataURL('image/png');
	const pngImage = await pdfDoc.embedPng(barcodeImg);
	const pngDims = pngImage.scale(1);

	const smallFontSize = 8;

	pages.forEach((page, index) => {
		const isMainPage = index < mainPageCount;
		const rightX = width - defaultStyles.margin.right;
		const barcodeY = defaultStyles.margin.bottom;

		if (isMainPage) {
			// Main pages: show participant info and barcode
			const pageNumber = `${index + 1} / ${mainPageCount}`;

			// Draw data-matrix barcode at bottom right
			const barcodeX = rightX - pngDims.width;
			page.drawImage(pngImage, {
				x: barcodeX,
				y: barcodeY,
				width: pngDims.width,
				height: pngDims.height
			});

			// Draw participant ID to the left of the barcode (bottom line, hugging bottom)
			const idTextWidth = helvetica.widthOfTextAtSize(participantId, smallFontSize);
			page.drawText(participantId, {
				x: barcodeX - idTextWidth - 5,
				y: barcodeY,
				size: smallFontSize,
				font: helvetica,
				color: rgb(0, 0, 0)
			});

			// Draw participant name to the left of the barcode (just above ID, hugging it)
			const nameWidth = helvetica.widthOfTextAtSize(participantName, smallFontSize);
			page.drawText(participantName, {
				x: barcodeX - nameWidth - 5,
				y: barcodeY + smallFontSize + 2,
				size: smallFontSize,
				font: helvetica,
				color: rgb(0, 0, 0)
			});

			// Draw page number at the top (right-aligned, with space above name/barcode)
			const pageNumberWidth = helvetica.widthOfTextAtSize(pageNumber, fontSize);
			page.drawText(pageNumber, {
				x: rightX - pageNumberWidth,
				y: barcodeY + pngDims.height + 10,
				size: fontSize,
				font: helvetica,
				color: rgb(0, 0, 0)
			});
		} else {
			// Appendix pages: roman numerals, no participant info
			const appendixIndex = index - mainPageCount + 1;
			const pageNumber = `${toRomanNumeral(appendixIndex)} / ${toRomanNumeral(appendixPageCount)}`;

			// Draw page number at the bottom right
			const pageNumberWidth = helvetica.widthOfTextAtSize(pageNumber, fontSize);
			page.drawText(pageNumber, {
				x: rightX - pageNumberWidth,
				y: barcodeY + fontSize,
				size: fontSize,
				font: helvetica,
				color: rgb(0, 0, 0)
			});
		}
	});
}

function createCertificateGenerator(
	pdfDoc: PDFDocument,
	styles: PageStyles,
	data: ParticipantCertificateData,
	layout: DocumentLayout<'certificate'>
): PDFPageGenerator {
	const page = pdfDoc.getPage(0);
	return createPDFPageGenerator(
		pdfDoc,
		styles,
		async ({ custfont }) => {
			if (!data.fullName) {
				throw new Error('Full name is required for the certificate');
			}
			if (!data.jwt) {
				throw new Error('JWT is required for the certificate');
			}

			const { width, height } = page.getSize();
			const black = rgb(0, 0, 0);

			const name = data.fullName;
			const at = textInPoints(layout.name, width, height);
			page.drawText(name, {
				x: at.x - custfont.widthOfTextAtSize(name, at.size) / 2,
				y: at.baseline,
				size: at.size,
				font: custfont,
				color: black
			});

			const verifyUrl = `${new URL(window.location.href).origin}/vc/${data.jwt}`;
			const barcodeCanvas = document.createElement('canvas');
			bwipjs.toCanvas(barcodeCanvas, { bcid: 'qrcode', text: verifyUrl, scale: 4 });
			const qr = await pdfDoc.embedPng(barcodeCanvas.toDataURL('image/png'));
			const { left, bottom, side } = squareInPoints(layout.qr, width, height);
			page.drawImage(qr, { x: left, y: bottom, width: side, height: side });

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

			drawCertificateSessions(
				page,
				custfont,
				data.sessions ?? [],
				boxInPoints(layout.sessions, width, height)
			);
		},
		{ foldMarks: false }
	);
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
async function appendPages(target: PDFDocument, source: PDFDocument) {
	const copiedPages = await target.copyPages(source, source.getPageIndices());
	copiedPages.forEach((page) => {
		target.addPage(page);
	});
}

// Main function to generate complete PDF
async function generateCompletePostalRegistrationPDF(
	isOfAge: boolean,
	participant: ParticipantData,
	recipient: RecipientData,
	contract: string,
	guardianAgreement: string,
	medialAgreement: string,
	termsAndConditions: string,
	/** `conference.documentLayouts`: where the team placed the fields; the defaults otherwise. */
	layouts: unknown
): Promise<Uint8Array> {
	// Determine which pages to include based on age
	const pageGenerators: PDFPageGenerator[] = [];

	// First PDF is always included
	pageGenerators.push(
		createContractGenerator(
			await loadTemplate(contract),
			defaultStyles,
			recipient,
			participant,
			resolveDocumentLayout('contract', layouts)
		)
	);

	if (!isOfAge) {
		// Second PDF depends on age
		pageGenerators.push(
			createGuardianGenerator(
				await loadTemplate(guardianAgreement),
				defaultStyles,
				participant,
				resolveDocumentLayout('guardianConsent', layouts)
			)
		);
	}

	// // Third page depends on age
	pageGenerators.push(
		createMediaGenerator(
			await loadTemplate(medialAgreement),
			defaultStyles,
			participant,
			resolveDocumentLayout('mediaConsent', layouts)
		)
	);

	const singlePDFs: PDFDocument[] = [];

	// Generate all pages
	for (const generator of pageGenerators) {
		singlePDFs.push(await generator.generate());
	}

	// Create a new PDF document
	const mergedPdfDoc = await PDFDocument.create();
	for (const pdf of singlePDFs) {
		await appendPages(mergedPdfDoc, pdf);
	}

	// Track main page count before adding appendix (terms and conditions)
	const mainPageCount = mergedPdfDoc.getPageCount();

	await appendPages(mergedPdfDoc, await loadTemplate(termsAndConditions));

	// Add page numbers, participant name, data-matrix barcode, and participant ID to each page
	await numerateDocument(mergedPdfDoc, participant.id, participant.name, mainPageCount);

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
}

/** The template's URL, or a toast naming what is missing and an error when there is none. */
function requireContent(file: TemplateFile, missingMessage: string): string {
	if (file) return file.url;
	toast.error(missingMessage);
	throw new Error('Missing required PDF content');
}

// Export function for usage
export async function downloadCompletePostalRegistrationPDF(
	isOfAge: boolean,
	participant: ParticipantData,
	recipient: RecipientData,
	templates: PostalTemplateFiles,
	fileName: string = 'postal_registration.pdf'
): Promise<void> {
	const contractContent = requireContent(templates.contractFile, m.pdfMissingContract());
	const guardianContent = requireContent(
		templates.guardianConsentFile,
		m.pdfMissingGuardianAgreement()
	);
	const mediaContent = requireContent(templates.mediaConsentFile, m.pdfMissingMediaAgreement());
	const termsContent = requireContent(templates.termsAndConditionsFile, m.pdfMissingTerms());
	try {
		const pdfBytes = await generateCompletePostalRegistrationPDF(
			isOfAge,
			participant,
			recipient,
			contractContent,
			guardianContent,
			mediaContent,
			termsContent,
			templates.documentLayouts
		);

		downloadPDF(pdfBytes, fileName);
	} catch (error) {
		console.error('Error generating registration form:', error);
		throw error;
	}
}

async function generateCertificatePDF(
	data: ParticipantCertificateData,
	certificate: string,
	layout: DocumentLayout<'certificate'>
) {
	const pageGenerator = createCertificateGenerator(
		await loadTemplate(certificate),
		defaultStyles,
		data,
		layout
	);

	const pdf = await pageGenerator.generate();

	// Merge all pages into a single PDF
	const pdfBytes = await pdf.save();
	return pdfBytes;
}

export async function downloadCompleteCertificate(
	data: ParticipantCertificateData,
	certificate: string | undefined,
	fileName: string,
	/** Where the conference placed the name, sessions and QR code; the default otherwise. */
	layout: DocumentLayout<'certificate'> = defaultLayout('certificate')
): Promise<void> {
	try {
		if (!certificate) {
			toast.error(m.pdfMissingCertificate());
			throw new Error('Missing required PDF content');
		}
		const pdfBytes = await generateCertificatePDF(data, certificate, layout);

		downloadPDF(pdfBytes, fileName);
	} catch (error) {
		console.error('Error generating registration form:', error);
		throw error;
	}
}
