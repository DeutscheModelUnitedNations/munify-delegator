import { m } from '$lib/paraglide/messages';
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont, PDFName, PDFString } from 'pdf-lib';
import bwipjs from '@bwip-js/browser';
import { toast } from 'svelte-sonner';
import fontkit from '@pdf-lib/fontkit';
import { downloadPDF } from '$lib/utils/downloadHelpers';

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
	generateContent: (fonts: PDFFonts) => Promise<void>
): PDFPageGenerator {
	return {
		async generate(): Promise<PDFDocument> {
			const fonts = await embedFonts(pdfDoc);
			await generateContent(fonts);
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
	return createPDFPageGenerator(pdfDoc, styles, async (fonts) => {
		/** Writes one form field value in the custom font at the left margin. */
		function drawField(text: string, y: number, size = styles.fontSize.heading) {
			page.drawText(text, {
				x: styles.margin.left,
				y,
				size,
				font: fonts.custfont,
				color: rgb(0, 0, 0)
			});
		}

		await generateContent(
			{
				page,
				participantData,
				drawField,
				/** Writes the participant's name and birthday, the second one `gap` points below the first. */
				drawNameAndBirthday(nameY: number, gap: number) {
					drawField(participantData.name, nameY);
					drawField(participantData.birthday, nameY - gap);
				}
			},
			fonts
		);
	});
}

interface ParticipantForm {
	page: PDFPage;
	participantData: ParticipantData;
	drawField(text: string, y: number, size?: number): void;
	drawNameAndBirthday(nameY: number, gap: number): void;
}

function createContractGenerator(
	pdfDoc: PDFDocument,
	styles: PageStyles,
	recipientData: RecipientData,
	participantData: ParticipantData
): PDFPageGenerator {
	return createParticipantFormGenerator(
		pdfDoc,
		styles,
		participantData,
		async ({ page, drawNameAndBirthday }, fonts) => {
			const { width, height } = page.getSize();
			let yPosition: number;

			// Address Field
			const recipientFields = [
				{ label: recipientData.name },
				{ label: recipientData.address },
				{ label: `${recipientData.zip} ${recipientData.city}` },
				{ label: recipientData.country }
			];

			// Only for orientation (marks the boundaries of the letter recipient address field)
			// page.drawRectangle({
			// 	x: millimeterToPixel(20),
			// 	y: height - millimeterToPixel(50) - millimeterToPixel(40),
			// 	width: millimeterToPixel(85),
			// 	height: millimeterToPixel(40),
			// 	borderWidth: 1,
			// 	opacity: 0.2
			// });

			yPosition = height - millimeterToPixel(60);
			recipientFields.forEach((field) => {
				yPosition -= 15;
				page.drawText(field.label, {
					x: millimeterToPixel(25),
					y: yPosition,
					size: styles.fontSize.normal,
					font: fonts.helvetica,
					color: rgb(0, 0, 0)
				});
			});

			// PDF417 Barcode
			const barcodeData = participantData.id;

			const barcodeCanvas = document.createElement('canvas');

			bwipjs.toCanvas(barcodeCanvas, {
				bcid: 'datamatrix',
				text: barcodeData,
				scale: 2,
				rotate: 'L'
			});

			const barcodeImg = barcodeCanvas.toDataURL('image/png');
			const pngImage = await pdfDoc.embedPng(barcodeImg);
			const pngDims = pngImage.scale(1);
			page.drawImage(pngImage, {
				x: width - pngDims.width - styles.margin.right,
				y: height - 100 - pngDims.height,
				width: pngDims.width,
				height: pngDims.height
			});

			// Participant Fields
			drawNameAndBirthday(height - 320, 60);
		}
	);
}

function createGuardianGenerator(
	pdfDoc: PDFDocument,
	styles: PageStyles,
	participantData: ParticipantData
): PDFPageGenerator {
	return createParticipantFormGenerator(
		pdfDoc,
		styles,
		participantData,
		async ({ page, drawNameAndBirthday }) => {
			const { height } = page.getSize();
			drawNameAndBirthday(height - 180, 60);
		}
	);
}

function createMediaGenerator(
	pdfDoc: PDFDocument,
	styles: PageStyles,
	participantData: ParticipantData
): PDFPageGenerator {
	return createParticipantFormGenerator(
		pdfDoc,
		styles,
		participantData,
		async ({ page, drawNameAndBirthday, drawField }) => {
			const { height } = page.getSize();
			drawNameAndBirthday(height - 225, 42);
			drawField(participantData.address, height - 225 - 84, 10);
		}
	);
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
	data: ParticipantCertificateData
): PDFPageGenerator {
	const page = pdfDoc.getPage(0);
	return createPDFPageGenerator(pdfDoc, styles, async ({ custfont }) => {
		if (!data.fullName) {
			throw new Error('Full name is required for the certificate');
		}
		if (!data.jwt) {
			throw new Error('JWT is required for the certificate');
		}

		const { width, height } = page.getSize();
		const yPosition = height - 215;
		const text = data.fullName;
		let textWidth = custfont.widthOfTextAtSize(text, styles.fontSize.title);
		const xPosition = (width - textWidth) / 2;

		page.drawText(text, {
			x: xPosition,
			y: yPosition,
			size: styles.fontSize.title,
			font: custfont,
			color: rgb(0, 0, 0)
		});

		const origin = new URL(window.location.href).origin;

		const barcodeData = `${origin}/vc/${data.jwt}`;

		const barcodeCanvas = document.createElement('canvas');

		bwipjs.toCanvas(barcodeCanvas, {
			bcid: 'qrcode',
			text: barcodeData,
			scale: 1
		});

		const barcodeImg = barcodeCanvas.toDataURL('image/png');
		const pngImage = await pdfDoc.embedPng(barcodeImg);
		const pngDims = pngImage.scale(0.5);
		page.drawImage(pngImage, {
			x: width - pngDims.width - 10,
			y: 10,
			width: pngDims.width,
			height: pngDims.height
		});

		const verifyText = m.certificateVerify();
		textWidth = custfont.widthOfTextAtSize(verifyText, 8);
		const textX = width - pngDims.width - 10 + (pngDims.width - textWidth) / 2;
		page.drawText(verifyText, {
			x: textX,
			y: pngDims.height + 13,
			size: 8,
			font: custfont,
			color: rgb(0, 0, 0)
		});

		const link = pdfDoc.context.register(
			pdfDoc.context.obj({
				Type: 'Annot',
				Subtype: 'Link',
				Rect: [textX, pngDims.height + 13, textX + textWidth, pngDims.height + 13 + 8],
				Border: [0, 0, 0],
				A: pdfDoc.context.obj({
					Type: 'Action',
					S: 'URI',
					URI: PDFString.of(barcodeData)
				})
			})
		);

		page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([link]));
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
	termsAndConditions: string
): Promise<Uint8Array> {
	// Determine which pages to include based on age
	const pageGenerators: PDFPageGenerator[] = [];

	// First PDF is always included
	pageGenerators.push(
		createContractGenerator(await loadTemplate(contract), defaultStyles, recipient, participant)
	);

	if (!isOfAge) {
		// Second PDF depends on age
		pageGenerators.push(
			createGuardianGenerator(await loadTemplate(guardianAgreement), defaultStyles, participant)
		);
	}

	// // Third page depends on age
	pageGenerators.push(
		createMediaGenerator(await loadTemplate(medialAgreement), defaultStyles, participant)
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

/** The template content, or a toast naming what is missing and an error when there is none. */
function requireContent(content: string | null | undefined, missingMessage: string): string {
	if (content) return content;
	toast.error(missingMessage);
	throw new Error('Missing required PDF content');
}

// Export function for usage
export async function downloadCompletePostalRegistrationPDF(
	isOfAge: boolean,
	participant: ParticipantData,
	recipient: RecipientData,
	contract?: string | null,
	guardianAgreement?: string | null,
	medialAgreement?: string | null,
	termsAndConditions?: string | null,
	fileName: string = 'postal_registration.pdf'
): Promise<void> {
	const contractContent = requireContent(contract, m.pdfMissingContract());
	const guardianContent = requireContent(guardianAgreement, m.pdfMissingGuardianAgreement());
	const mediaContent = requireContent(medialAgreement, m.pdfMissingMediaAgreement());
	const termsContent = requireContent(termsAndConditions, m.pdfMissingTerms());
	try {
		const pdfBytes = await generateCompletePostalRegistrationPDF(
			isOfAge,
			participant,
			recipient,
			contractContent,
			guardianContent,
			mediaContent,
			termsContent
		);

		downloadPDF(pdfBytes, fileName);
	} catch (error) {
		console.error('Error generating registration form:', error);
		throw error;
	}
}

async function generateCertificatePDF(data: ParticipantCertificateData, certificate: string) {
	const pageGenerator = createCertificateGenerator(
		await loadTemplate(certificate),
		defaultStyles,
		data
	);

	const pdf = await pageGenerator.generate();

	// Merge all pages into a single PDF
	const pdfBytes = await pdf.save();
	return pdfBytes;
}

export async function downloadCompleteCertificate(
	data: ParticipantCertificateData,
	certificate: string | undefined,
	fileName: string
): Promise<void> {
	try {
		if (!certificate) {
			toast.error(m.pdfMissingCertificate());
			throw new Error('Missing required PDF content');
		}
		const pdfBytes = await generateCertificatePDF(data, certificate);

		downloadPDF(pdfBytes, fileName);
	} catch (error) {
		console.error('Error generating registration form:', error);
		throw error;
	}
}
