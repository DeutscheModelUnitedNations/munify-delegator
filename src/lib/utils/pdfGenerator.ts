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
class PDFUtils {
	private page: PDFPage;
	private helvetica: PDFFont;
	private helveticaBold: PDFFont;
	private styles: PageStyles;

	constructor(page: PDFPage, helvetica: PDFFont, helveticaBold: PDFFont, styles: PageStyles) {
		this.page = page;
		this.helvetica = helvetica;
		this.helveticaBold = helveticaBold;
		this.styles = styles;
	}

	drawWrappedText(text: string, startY: number, font = this.helvetica, indent = 0): number {
		let currentY = startY;
		const words = text.split(' ');
		let currentLine = '';
		const { width } = this.page.getSize();
		const maxWidth = width - this.styles.margin.left - this.styles.margin.right - indent;

		words.forEach((word) => {
			const testLine = currentLine + (currentLine ? ' ' : '') + word;
			const lineWidth = font.widthOfTextAtSize(testLine, this.styles.fontSize.normal);

			if (lineWidth > maxWidth) {
				this.page.drawText(currentLine, {
					x: this.styles.margin.left + indent,
					y: currentY,
					size: this.styles.fontSize.normal,
					font: font,
					color: rgb(0, 0, 0)
				});
				currentY -= this.styles.fontSize.normal * this.styles.lineHeight.normal;
				currentLine = word;
			} else {
				currentLine = testLine;
			}
		});

		if (currentLine) {
			this.page.drawText(currentLine, {
				x: this.styles.margin.left + indent,
				y: currentY,
				size: this.styles.fontSize.normal,
				font: font,
				color: rgb(0, 0, 0)
			});
		}

		return currentY;
	}

	drawCheckbox(x: number, y: number, text: string, size = 10): number {
		// Draw checkbox
		this.page.drawRectangle({
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
		return this.drawWrappedText(text, textY, this.helvetica, size + 5);
	}

	drawFoldMarks() {
		const { height } = this.page.getSize();
		const foldHeight = 1; // Height of the fold mark

		const marks = [
			{ y: 105, width: 15 },
			{ y: 148.5, width: 20 },
			{ y: 210, width: 15 }
		];

		marks.forEach((mark) => {
			this.page.drawRectangle({
				x: 0,
				y: height - millimeterToPixel(mark.y),
				width: mark.width,
				height: foldHeight,
				color: rgb(0, 0, 0)
			});
		});
	}
}

function millimeterToPixel(mm: number): number {
	const A4_PIXELS = 841.89; // A4 height in pixels
	const A4_MM = 297; // A4 height in mm
	return Math.round((mm * A4_PIXELS) / A4_MM);
}

// Create a base class for PDF pages
abstract class PDFPageGenerator {
	protected pdfDoc: PDFDocument;
	protected styles: PageStyles;
	protected helvetica!: PDFFont; // Add font properties
	protected helveticaBold!: PDFFont; // Add font properties
	protected courier!: PDFFont; // Add font properties
	protected custfont!: PDFFont;
	protected custfontBold!: PDFFont;

	constructor(pdfDoc: PDFDocument, styles = defaultStyles) {
		this.pdfDoc = pdfDoc;
		this.styles = styles;
	}

	protected abstract generateContent(): Promise<void>;

	protected async initialize(): Promise<void> {
		this.helvetica = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
		this.helveticaBold = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
		this.courier = await this.pdfDoc.embedFont(StandardFonts.Courier);
		//Load custom font

		this.pdfDoc.registerFontkit(fontkit);
		const custfontBytes = await fetch('/fonts/SpaceMono-Regular.ttf').then((res) =>
			res.arrayBuffer()
		);
		const custfontBoldBytes = await fetch('/fonts/SpaceMono-Bold.ttf').then((res) =>
			res.arrayBuffer()
		);

		this.custfont = await this.pdfDoc.embedFont(custfontBytes);
		this.custfontBold = await this.pdfDoc.embedFont(custfontBoldBytes);
	}

	protected async drawFoldMarks() {
		for (const page of this.pdfDoc.getPages()) {
			const utils = new PDFUtils(page, this.helvetica, this.helveticaBold, this.styles);
			utils.drawFoldMarks();
		}
	}

	public async generate(): Promise<PDFDocument> {
		await this.initialize();
		await this.generateContent();
		await this.drawFoldMarks();
		return this.pdfDoc;
	}
}

/** A generator that fills a participant's details into the first page of a template. */
abstract class ParticipantFormGenerator extends PDFPageGenerator {
	protected participantData: ParticipantData;
	protected page: PDFPage;
	constructor(pdfDoc: PDFDocument, styles = defaultStyles, participantData: ParticipantData) {
		super(pdfDoc, styles);
		this.participantData = participantData;
		this.page = this.pdfDoc.getPage(0);
	}

	/** Writes one form field value in the custom font at the left margin. */
	protected drawField(text: string, y: number, size = this.styles.fontSize.heading) {
		this.page.drawText(text, {
			x: this.styles.margin.left,
			y,
			size,
			font: this.custfont,
			color: rgb(0, 0, 0)
		});
	}

	/** Writes the participant's name and birthday, the second one `gap` points below the first. */
	protected drawNameAndBirthday(nameY: number, gap: number) {
		this.drawField(this.participantData.name, nameY);
		this.drawField(this.participantData.birthday, nameY - gap);
	}
}

class ContractGenerator extends ParticipantFormGenerator {
	private recipientData: RecipientData;
	constructor(
		pdfDoc: PDFDocument,
		styles = defaultStyles,
		recipientData: RecipientData,
		participantData: ParticipantData
	) {
		super(pdfDoc, styles, participantData);
		this.recipientData = recipientData;
	}
	protected async generateContent(): Promise<void> {
		const { width, height } = this.page.getSize();
		let yPosition: number;

		// Address Field
		const recipientFields = [
			{ label: this.recipientData.name },
			{ label: this.recipientData.address },
			{ label: `${this.recipientData.zip} ${this.recipientData.city}` },
			{ label: this.recipientData.country }
		];

		// Only for orientation (marks the boundaries of the letter recipient address field)
		// this.page.drawRectangle({
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
			this.page.drawText(field.label, {
				x: millimeterToPixel(25),
				y: yPosition,
				size: this.styles.fontSize.normal,
				font: this.helvetica,
				color: rgb(0, 0, 0)
			});
		});

		// PDF417 Barcode
		const barcodeData = this.participantData.id;

		const barcodeCanvas = document.createElement('canvas');

		bwipjs.toCanvas(barcodeCanvas, {
			bcid: 'datamatrix',
			text: barcodeData,
			scale: 2,
			rotate: 'L'
		});

		const barcodeImg = barcodeCanvas.toDataURL('image/png');
		const pngImage = await this.pdfDoc.embedPng(barcodeImg);
		const pngDims = pngImage.scale(1);
		this.page.drawImage(pngImage, {
			x: width - pngDims.width - this.styles.margin.right,
			y: height - 100 - pngDims.height,
			width: pngDims.width,
			height: pngDims.height
		});

		// Participant Fields
		this.drawNameAndBirthday(height - 320, 60);
	}
}

class GuardianGenerator extends ParticipantFormGenerator {
	protected async generateContent(): Promise<void> {
		const { height } = this.page.getSize();
		this.drawNameAndBirthday(height - 180, 60);
	}
}

class MediaGenerator extends ParticipantFormGenerator {
	protected async generateContent(): Promise<void> {
		const { height } = this.page.getSize();
		this.drawNameAndBirthday(height - 225, 42);
		this.drawField(this.participantData.address, height - 225 - 84, 10);
	}
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

class CertificateGenerator extends PDFPageGenerator {
	private data: ParticipantCertificateData;
	private page: PDFPage;
	constructor(pdfDoc: PDFDocument, styles = defaultStyles, data: ParticipantCertificateData) {
		super(pdfDoc, styles);
		this.data = data;
		this.page = this.pdfDoc.getPage(0);
	}
	protected async generateContent(): Promise<void> {
		if (!this.data.fullName) {
			throw new Error('Full name is required for the certificate');
		}
		if (!this.data.jwt) {
			throw new Error('JWT is required for the certificate');
		}

		const { width, height } = this.page.getSize();
		const yPosition = height - 215;
		const text = this.data.fullName;
		let textWidth = this.custfont.widthOfTextAtSize(text, this.styles.fontSize.title);
		const xPosition = (width - textWidth) / 2;

		this.page.drawText(text, {
			x: xPosition,
			y: yPosition,
			size: this.styles.fontSize.title,
			font: this.custfont,
			color: rgb(0, 0, 0)
		});

		const origin = new URL(window.location.href).origin;

		const barcodeData = `${origin}/vc/${this.data.jwt}`;

		const barcodeCanvas = document.createElement('canvas');

		bwipjs.toCanvas(barcodeCanvas, {
			bcid: 'qrcode',
			text: barcodeData,
			scale: 1
		});

		const barcodeImg = barcodeCanvas.toDataURL('image/png');
		const pngImage = await this.pdfDoc.embedPng(barcodeImg);
		const pngDims = pngImage.scale(0.5);
		this.page.drawImage(pngImage, {
			x: width - pngDims.width - 10,
			y: 10,
			width: pngDims.width,
			height: pngDims.height
		});

		const verifyText = 'Verify Certificate';
		textWidth = this.custfont.widthOfTextAtSize(verifyText, 8);
		const textX = width - pngDims.width - 10 + (pngDims.width - textWidth) / 2;
		this.page.drawText(verifyText, {
			x: textX,
			y: pngDims.height + 13,
			size: 8,
			font: this.custfont,
			color: rgb(0, 0, 0)
		});

		const link = this.pdfDoc.context.register(
			this.pdfDoc.context.obj({
				Type: 'Annot',
				Subtype: 'Link',
				Rect: [textX, pngDims.height + 13, textX + textWidth, pngDims.height + 13 + 8],
				Border: [0, 0, 0],
				A: this.pdfDoc.context.obj({
					Type: 'Action',
					S: 'URI',
					URI: PDFString.of(barcodeData)
				})
			})
		);

		this.page.node.set(PDFName.of('Annots'), this.pdfDoc.context.obj([link]));
	}
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
		new ContractGenerator(await PDFDocument.load(contract), defaultStyles, recipient, participant)
	);

	if (!isOfAge) {
		// Second PDF depends on age
		pageGenerators.push(
			new GuardianGenerator(await PDFDocument.load(guardianAgreement), defaultStyles, participant)
		);
	}

	// // Third page depends on age
	pageGenerators.push(
		new MediaGenerator(await PDFDocument.load(medialAgreement), defaultStyles, participant)
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

	await appendPages(mergedPdfDoc, await PDFDocument.load(termsAndConditions));

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
	const contractContent = requireContent(contract, 'Missing contract content');
	const guardianContent = requireContent(guardianAgreement, 'Missing guardian agreement content');
	const mediaContent = requireContent(medialAgreement, 'Missing media agreement content');
	const termsContent = requireContent(termsAndConditions, 'Missing terms and conditions content');
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
	const pageGenerator = new CertificateGenerator(
		await PDFDocument.load(certificate || ''),
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
			toast.error('Missing certificate content');
			throw new Error('Missing required PDF content');
		}
		const pdfBytes = await generateCertificatePDF(data, certificate);

		downloadPDF(pdfBytes, fileName);
	} catch (error) {
		console.error('Error generating registration form:', error);
		throw error;
	}
}
