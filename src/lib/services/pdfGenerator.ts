import { PDFDocument, rgb, StandardFonts, PageSizes, PDFPage, PDFFont } from 'pdf-lib';

export interface RecipientInfo {
	name: string;
	address: string;
	plz: string;
	ort: string;
	country: string;
}
interface PageStyles {
	margin: {
		left: number;
		right: number;
		top: number;
		bottom: number;
	};
	colors: {
		gray: { r: number; g: number; b: number };
		black: { r: number; g: number; b: number };
		blue: { r: number; g: number; b: number }; // Added blue color
	};
	fontSize: {
		title: number;
		heading: number;
		normal: number;
	};
	lineHeight: {
		normal: number;
	};
}

const defaultStyles: PageStyles = {
	margin: {
		left: 40,
		right: 40,
		top: 40,
		bottom: 40
	},
	colors: {
		gray: { r: 0.5, g: 0.5, b: 0.5 },
		black: { r: 0, g: 0, b: 0 },
		blue: { r: 0, g: 0.478, b: 1 } // RGB value for a bright blue color (approximating the PDF)
	},
	fontSize: {
		title: 24,
		heading: 14,
		normal: 11
	},
	lineHeight: {
		normal: 1.2
	}
};

class PDFHeader {
	private page: PDFPage;
	private helveticaBold: PDFFont;
	private styles: PageStyles;
	private conferenceName: string;

	constructor(page: PDFPage, helveticaBold: PDFFont, styles: PageStyles, conferenceName: string) {
		this.page = page;
		this.helveticaBold = helveticaBold;
		this.styles = styles;
		this.conferenceName = conferenceName;
	}

	draw(yPosition: number): number {
		// Draw conference name
		this.page.drawText(this.conferenceName, {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.title,
			font: this.helveticaBold,
			color: rgb(this.styles.colors.blue.r, this.styles.colors.blue.g, this.styles.colors.blue.b)
		});

		yPosition -= 25;
		this.page.drawText('Schleswig-Holstein', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.title,
			font: this.helveticaBold,
			color: rgb(this.styles.colors.blue.r, this.styles.colors.blue.g, this.styles.colors.blue.b)
		});

		return yPosition;
	}
}

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
}

// Create a base class for PDF pages
abstract class PDFPageGenerator {
	protected pdfDoc: PDFDocument;
	protected utils!: PDFUtils; // Add definite assignment assertion
	protected page!: PDFPage; // Add definite assignment assertion
	protected styles: PageStyles;
	protected helvetica!: PDFFont; // Add font properties
	protected helveticaBold!: PDFFont; // Add font properties
	protected header!: PDFHeader;
	protected conferenceName: string;
	protected pageNumber: number; // Add page number property

	constructor(pdfDoc: PDFDocument, styles = defaultStyles, conferenceName: string, pageNumber: number) {
		this.pdfDoc = pdfDoc;
		this.styles = styles;
		this.conferenceName = conferenceName;
		this.pageNumber = pageNumber;
	}

	protected abstract generateContent(): Promise<void>;

	protected async initialize(): Promise<void> {
		this.helvetica = await this.pdfDoc.embedFont(StandardFonts.Helvetica);
		this.helveticaBold = await this.pdfDoc.embedFont(StandardFonts.HelveticaBold);
		this.page = this.pdfDoc.addPage(PageSizes.A4);
		this.utils = new PDFUtils(this.page, this.helvetica, this.helveticaBold, this.styles);
		this.header = new PDFHeader(this.page, this.helveticaBold, this.styles, this.conferenceName);
	}

	public async generate(): Promise<PDFPage> {
		await this.initialize();
		await this.generateContent();
		
		// Add page number at the bottom
		this.page.drawText(this.pageNumber.toString(), {
			x: this.styles.margin.left,
			y: 30,
			size: 10,
			font: this.helvetica,
			color: rgb(0, 0, 0)
			});
		
		return this.page;
	}
}
// Registration Form First Page
class FirstPageGenerator extends PDFPageGenerator {
	private recipientInfo: RecipientInfo;
	constructor(
		pdfDoc: PDFDocument,
		styles: PageStyles,
		conferenceName: string,
		recipientInfo: RecipientInfo,
		pageNumber: number
	) {
		super(pdfDoc, styles, conferenceName, pageNumber);
		this.recipientInfo = recipientInfo;
	}
	protected async generateContent(): Promise<void> {
		const { width, height } = this.page.getSize();
		let yPosition = height - this.styles.margin.top;

		// Add header
		yPosition = this.header.draw(yPosition);

		// Add form title
		yPosition -= 60;
		this.page.drawText('Postalische Anmeldung MUN-SH 2025', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.heading,
			font: this.helveticaBold,
			color: rgb(0, 0, 0)
		});

		// Add recipient address section
		yPosition -= 30;
		this.page.drawText('per Post zu senden an:', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		const recipientFields = [
			{ label: this.recipientInfo.name },
			{ label: this.recipientInfo.address },
			{ label: `${this.recipientInfo.plz} ${this.recipientInfo.ort}` },
			{ label: this.recipientInfo.country }
		];

		recipientFields.forEach((field) => {
			yPosition -= 20;
			this.page.drawText(field.label, {
				x: this.styles.margin.left,
				y: yPosition,
				size: this.styles.fontSize.normal,
				font: this.helvetica,
				color: rgb(0, 0, 0)
			});
		});

		// Rest of the page content remains the same
		yPosition -= 40;
		this.page.drawText('Verbindliche Anmeldung von', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.heading,
			font: this.helveticaBold,
			color: rgb(this.styles.colors.blue.r, this.styles.colors.blue.g, this.styles.colors.blue.b)
		});

		// Add name line
		yPosition -= 25;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		// Add birth date field
		yPosition -= 30;
		this.page.drawText('geboren am', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.heading,
			font: this.helveticaBold,
			color: rgb(0, 0, 0)
		});

		// Add date line
		yPosition -= 25;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		// Add declaration text
		yPosition -= 35;
		const declarationText =
			'Mit meiner Unterschrift bestätige ich, dass alle Angaben auf dieser Anmeldung sowie in der dazugehörigen Online-Anmeldung, nach bestem Wissen und Gewissen gemacht worden sind. Ich bestätige weiter, nach Erhalt einer Zusage die Teilnahmegebühr in Höhe von 75,00 € pro Person umgehend zu überweisen. Die Vertragsbedingungen und die Datenschutzerklärung habe ich zur Kenntnis genommen und akzeptiere diese mit meiner Unterschrift. Ich melde mich hiermit zu MUN-SH 2025 an.';
		yPosition = this.utils.drawWrappedText(declarationText, yPosition);

		// Add checkbox and acceptance text
		yPosition -= 40;
		yPosition = this.utils.drawCheckbox(
			this.styles.margin.left,
			yPosition,
			'Ich habe die Vertragsbedingungen und Datenschutzerklärung gelesen und akzeptiere sie.'
		);

		// Add signature section
		yPosition -= 40;
		this.page.drawText('Ort, Datum', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: width / 2 - 20, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		yPosition -= 40;
		this.page.drawText('Unterschrift des*der Teilnehmenden', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});
	}
}

class SecondPageGenerator extends PDFPageGenerator {
	protected async generateContent(): Promise<void> {
		const { width, height } = this.page.getSize();
		let yPosition = height - this.styles.margin.top;

		// Add header
		yPosition = this.header.draw(yPosition);

		// Add main title
		yPosition -= 60;
		this.page.drawText('Einverständniserklärung der gesetzlichen Vertretung', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.heading,
			font: this.helveticaBold,
			color: rgb(0, 0, 0)
		});

		// Add subtitle
		yPosition -= 25;
		this.page.drawText('minderjähriger Erziehungsberechtigten', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.heading,
			font: this.helveticaBold,
			color: rgb(0, 0, 0)
		});

		// Add notice about age requirement
		yPosition -= 40;
		const noticeText =
			'Hat der*die Teilnehmende zu Beginn der Konferenz am 6. März 2025 das 18. Lebensjahr noch nicht vollendet, so müssen ZUSÄTZLICH zur Unterschrift der*des Teilnehmenden auf Seite 1 auch die/der Erziehungsberechtigte(n) diese Einverständniserklärung unterzeichnen.';
		yPosition = this.utils.drawWrappedText(noticeText, yPosition);

		// Add participant name section
		yPosition -= 40;
		this.page.drawText('Da', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		// Add name line
		this.page.drawLine({
			start: { x: this.styles.margin.left + 30, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		// Add participant designation
		yPosition -= 25;
		this.page.drawText('(Vor- und Nachname des*der Teilnehmende*n)', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		// Add consent text
		yPosition -= 35;
		const consentText =
			'im folgenden "Teilnehmende*r", das 18. Lebensjahr am 6. März 2025 noch nicht vollendet hat, erkläre(n) wir/ich uns/mich in meiner Funktion als Erziehungsberechtigte*r mit der Teilnahme des*der Teilnehmenden an MUN-SH 2025 einverstanden und akzeptiere(n) die beigefügten Vertragsbedingungen und die Datenschutzerklärung und in Vertretung von des*der Teilnehmenden.';
		yPosition = this.utils.drawWrappedText(consentText, yPosition);

		// Add supervision notice
		yPosition -= 35;
		const supervisionText =
			'Mir ist bewusst, dass DMUN e.V. als Veranstalter keine Aufsichtspflicht obliegt. Vor allem außerhalb der Tagungszeit und außerhalb des Tagungsortes bzw. außerhalb der von DMUN e.V. angebotenen Abendveranstaltungen handeln die Teilnehmenden eigenverantwortlich; eine Haftung durch DMUN e.V. für das Verhalten von Teilnehmenden ist nicht möglich. Auf allen von DMUN e.V. angebotenen Veranstaltungen haben die Teilnehmenden den Anordnungen des Organisationsteams Folge zu leisten. Für die An- und Abfahrt zu den Veranstaltungsgebäuden sowie für das Geschehen in den Unterkünften sind die Teilnehmenden selbst verantwortlich.';
		yPosition = this.utils.drawWrappedText(supervisionText, yPosition);

		// Add late hour notice
		yPosition -= 35;
		const lateHoursText =
			'Uns/Mir ist des weiteren bekannt, dass sich der*die Teilnehmende während der Abendveranstaltung möglicherweise länger als 22 bzw. 24 Uhr außerhalb der Unterkunft bewegt und auf den Wegen von und zu den Tagungsorten nicht beaufsichtigt wird.';
		yPosition = this.utils.drawWrappedText(lateHoursText, yPosition);

		// Add checkbox for terms
		yPosition -= 35;
		yPosition = this.utils.drawCheckbox(
			this.styles.margin.left,
			yPosition,
			'Ich habe die Vertragsbedingungen und Datenschutzerklärung gelesen und akzeptiere sie.'
		);

		// Add date and signature section
		yPosition -= 40;
		this.page.drawText('Ort, Datum', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		// Add signature lines for both guardians
		yPosition -= 40;
		const halfWidth = (width - this.styles.margin.left - this.styles.margin.right - 20) / 2;

		// First guardian
		this.page.drawText('Vor- und Nachname Erziehungsberechtigte*r', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		// Second guardian
		this.page.drawText('Vor- und Nachname Erziehungsberechtigte*r', {
			x: this.styles.margin.left + halfWidth + 20,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		// Add signature lines
		yPosition -= 20;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: this.styles.margin.left + halfWidth - 20, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		this.page.drawLine({
			start: { x: this.styles.margin.left + halfWidth + 20, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});
	}
}

class ThirdPageGenerator extends PDFPageGenerator {
	protected async generateContent(): Promise<void> {
		const { width, height } = this.page.getSize();
		let yPosition = height - this.styles.margin.top;

		// Add header
		yPosition = this.header.draw(yPosition);

		// Add title
		yPosition -= 50; // Reduced spacing
		this.page.drawText('Einwilligung Bildnutzung', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.heading,
			font: this.helveticaBold,
			color: rgb(0, 0, 0)
		});

		// Add main consent title
		yPosition -= 25; // Reduced spacing
		const mainText =
			'EINWILLIGUNG zur Verwendung meines Vor- und Nachnamens und Bildnisses in Video oder als Foto durch die Model United Nations e. V. (DMUN) als Trägerverein von Model United Nations Baden-Württemberg (MUNBW).';
		yPosition = this.utils.drawWrappedText(mainText, yPosition);

		// Add signature introduction
		yPosition -= 20; // Reduced spacing
		this.page.drawText('Mit meiner nachfolgenden Unterschrift willige ich,', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		// Add personal information fields
		const formFields = [
			['NAME teilnehmende Person', 30], // Reduced spacing
			['GEBURTSDATUM teilnehmende Person', 20], // Reduced spacing
			['ADRESSE teilnehmende Person', 30] // Reduced spacing
		];

		formFields.forEach(([field, spacing]) => {
			yPosition -= Number(spacing);
			// Draw line
			this.page.drawLine({
				start: { x: this.styles.margin.left, y: yPosition },
				end: { x: width - this.styles.margin.right, y: yPosition },
				thickness: 0.5,
				color: rgb(0, 0, 0)
			});

			// Draw field label
			yPosition -= 12; // Reduced spacing
			this.page.drawText(`(${field})`, {
				x: this.styles.margin.left,
				y: yPosition,
				size: this.styles.fontSize.normal,
				font: this.helvetica,
				color: rgb(0, 0, 0)
			});
		});

		// Add consent introduction text
		yPosition -= 25; // Reduced spacing
		const consentIntro =
			'ein, dass DMUN meinen vorstehenden Vor- und Nachnamen sowie mein Bildnis in folgender Form verwendet (zutreffendes bitte ankreuzen!):';
		yPosition = this.utils.drawWrappedText(consentIntro, yPosition);

		// Add checkboxes for media types
		const mediaTypes = [
			'als Foto (Lichtbild),',
			'als Video oder Videosequenz (Abfolge von Videobildern),',
			'welches/welche DMUN erstellt oder erstellen lassen hat und/oder',
			'welches/welche ich erstellt habe oder andere teilnehmende Personen erstellt haben und DMUN zur Verfügung gestellt wurde.'
		];

		yPosition -= 10; // Reduced spacing
		mediaTypes.forEach((type) => {
			yPosition -= 20; // Reduced spacing
			yPosition = this.utils.drawCheckbox(this.styles.margin.left, yPosition, type);
		});

		// Add additional consent sections
		const consentSections = [
			'Soweit sich aus dem vorgenannten Foto/Video Hinweise auf meine ethnische Herkunft, Religion oder Gesundheit ergeben (z.B. Hautfarbe, Kopfbedeckung, Brille), bezieht sich meine Einwilligung auch auf diese Angaben.',
			'Die vorstehende Einwilligung ist freiwillig. Ich kann sie ohne Angabe von Gründen verweigern, ohne dass mir dadurch Nachteile entstehen können.',
			'Meine vorstehende Einwilligung umfasst, dass die DMUN das vorgenannte Foto/Video mit meinem Bildnis im Original oder in bearbeiteter Form inhaltlich, zeitlich und räumlich unbeschränkt verarbeiten, speichern, nutzen, bearbeiten, weiterentwickeln, veröffentlichen, vervielfältigen, verbreiten, verwerten, öffentlich vorführen oder wiedergeben oder öffentlich auch zum wiederholten Abruf zur Verfügung stellen darf.'
		];

		consentSections.forEach((section) => {
			yPosition -= 20; // Reduced spacing
			yPosition = this.utils.drawWrappedText(section, yPosition);
		});

		// Add usage purposes introduction
		yPosition -= 20; // Reduced spacing
		const purposesIntro =
			'Die Nutzung meines Vor- und Nachnamens und Bildnisses im vorgenannten Foto/Video erfolgt zu folgenden Zwecken (zutreffendes bitte ankreuzen!):';
		yPosition = this.utils.drawWrappedText(purposesIntro, yPosition);

		// Add purpose checkboxes
		const purposes = [
			'Zur internen Kommunikation innerhalb der DMUN-Teams und mit anderen teilnehmenden Personen über Videokonferenzen oder Software zur Zusammenarbeit (Google Drive, Slack);',
			'zur Dokumentation meiner Teilnahme an einer DMUN-Veranstaltung (auch Online);',
			'Veröffentlichung in Positions- und Arbeitspapieren, Gremienberichten, Dokumentation;', // Fixed typo
			'Berichterstattung auf DMUN-Veranstaltungen (Konferenzpresse)'
		];

		yPosition -= 10; // Reduced spacing
		purposes.forEach((purpose) => {
			yPosition -= 20; // Reduced spacing
			yPosition = this.utils.drawCheckbox(this.styles.margin.left, yPosition, purpose);
		});
	}
}

class FourthPageGenerator extends PDFPageGenerator {
	protected async generateContent(): Promise<void> {
		const { width, height } = this.page.getSize();
		let yPosition = height - this.styles.margin.top;

		// Add header
		yPosition = this.header.draw(yPosition);

		// Continue with the remaining usage purposes checkboxes
		const additionalPurposes = [
			'Darstellung und Veröffentlichung auf den Internetseiten von DMUN einschließlich MUNBW und MUN-SH sowie der öffentlichen Online-Galerie von DMUN;',
			'Darstellung in Profilen der DMUN in sozialen Netzwerken: Youtube, Instagram;',
			'Darstellung bei Einträgen in Suchmaschinen;',
			'Darstellung in internetbasierter, digitaler oder gedruckter Eigen- oder Fremdwerbung oder medialen Berichterstattung von DMUN online oder analog als Druckwerk;',
			'Darstellung und Speicherung auf genutzten Endgeräten (z. B. Smartphones, Tablets, Computern, physischen oder virtuellen Servern);'
		];

		yPosition -= 30;
		additionalPurposes.forEach((purpose) => {
			yPosition -= 25;
			yPosition = this.utils.drawCheckbox(this.styles.margin.left, yPosition, purpose);
		});

		// Add performing artists rights section
		yPosition -= 35;
		const artistsText =
			'Bei Videos (insbesondere Tanzvideos auf den Konferenzen): Sofern ich bei der Teilnahme am Video ausübende/r Künstler/-in bin, räume ich DMUN hiermit das Recht ein, dieses unter Verwendung meiner Darbietung auf eine Nutzungsart zu nutzen, die dem ausübenden Künstler / der ausübenden Künstlerin nach dem Gesetz vorbehalten ist (§§ 77, 78 UrhG). Dies betrifft insbesondere das Recht zur Aufnahme der Darbietung, deren Nutzung, Vervielfältigung, Bearbeitung, Verbreitung, öffentliche Zugänglich- und Wahrnehmbarmachung.';
		yPosition = this.utils.drawWrappedText(artistsText, yPosition);

		// Add usage rights section
		yPosition -= 30;
		const rightsText =
			'Die vorstehenden Befugnisse sind unentgeltlich. Sie gelten für alle bekannten und unbekannten Nutzungsarten. Ein Verkauf meines Bildnisses ist nicht erlaubt.';
		yPosition = this.utils.drawWrappedText(rightsText, yPosition);

		// Add withdrawal rights section
		yPosition -= 30;
		this.page.drawText('Widerrufsrecht:', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helveticaBold,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		const withdrawalText =
			'Ich habe das Recht, meine vorstehend erteilte Einwilligung jederzeit mit Wirkung für die Zukunft zu widerrufen. Dabei bleibt die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung unberührt. Für den Widerruf reicht eine einfache, formlose Erklärung an DMUN. Bis zum Widerruf bleibt meine Einwilligung wirksam.';
		yPosition = this.utils.drawWrappedText(withdrawalText, yPosition);

		// Add privacy policy reference
		yPosition -= 30;
		const privacyText = 'Es gelten die veröffentlichten Hinweise zum Datenschutz unter';
		yPosition = this.utils.drawWrappedText(privacyText, yPosition);

		yPosition -= 15;
		this.page.drawText('https://www.dmun.de/pages/datenschutz', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		yPosition -= 15;
		const additionalPrivacyText = 'und die Hinweise zum Datenschutz für Teilnehmende.';
		yPosition = this.utils.drawWrappedText(additionalPrivacyText, yPosition);

		// Add signature section
		yPosition -= 40;
		this.page.drawText('Ort, Datum', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		yPosition -= 40;
		this.page.drawText('Unterschrift des/der teilnehmenden Person', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});
	}
}

class FifthPageGenerator extends PDFPageGenerator {
	protected async generateContent(): Promise<void> {
		const { width, height } = this.page.getSize();
		let yPosition = height - this.styles.margin.top;

		// Add header
		yPosition = this.header.draw(yPosition);

		// Add section title for minors
		yPosition -= 60;
		this.page.drawText(
			'Bei Minderjährigen (zusätzlich!): Bestätigung durch die gesetzlichen Vertreter:',
			{
				x: this.styles.margin.left,
				y: yPosition,
				size: this.styles.fontSize.heading,
				font: this.helveticaBold,
				color: rgb(0, 0, 0)
			}
		);

		// Add first guardian information section
		yPosition -= 40;
		this.page.drawText('Wir', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		// First guardian name line
		this.page.drawLine({
			start: { x: this.styles.margin.left + 30, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		this.page.drawText('[Vor- und Nachname der Mutter bzw. der sorge- und', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		this.page.drawText('erziehungsberechtigten Person] und', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		// Second guardian name line
		this.page.drawLine({
			start: { x: this.styles.margin.left + 200, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		this.page.drawText('[Vor- und Nachname', {
			x: this.styles.margin.left + 200,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		const guardianDesignation =
			'des Vaters bzw. der zweiten sorge- und erziehungsberechtigten Person] bestätigen hiermit,';
		yPosition = this.utils.drawWrappedText(guardianDesignation, yPosition);

		// Add confirmation text
		yPosition -= 30;
		const confirmationText =
			'dass ich/wir der/die gesetzliche(n) Vertreter/-in der vorstehend genannten teilnehmenden Person bin/sind.';
		yPosition = this.utils.drawWrappedText(confirmationText, yPosition);

		// Add consent text
		yPosition -= 30;
		const consentText =
			'Als gesetzliche Vertreter stimmen wir der vorstehenden Einwilligungserklärung unseres Kindes zu.';
		yPosition = this.utils.drawWrappedText(consentText, yPosition);

		// Add date field
		yPosition -= 40;
		this.page.drawText('Ort, Datum', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		yPosition -= 20;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		// Add signature section for both guardians
		yPosition -= 40;
		const halfWidth = (width - this.styles.margin.left - this.styles.margin.right - 20) / 2;

		// First guardian signature
		this.page.drawText('Unterschrift Erziehungsberechtigte*r', {
			x: this.styles.margin.left,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		// Second guardian signature
		this.page.drawText('Unterschrift Erziehungsberechtigte*r', {
			x: this.styles.margin.left + halfWidth + 20,
			y: yPosition,
			size: this.styles.fontSize.normal,
			font: this.helvetica,
			color: rgb(0, 0, 0)
		});

		// Add signature lines
		yPosition -= 20;
		this.page.drawLine({
			start: { x: this.styles.margin.left, y: yPosition },
			end: { x: this.styles.margin.left + halfWidth - 20, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});

		this.page.drawLine({
			start: { x: this.styles.margin.left + halfWidth + 20, y: yPosition },
			end: { x: width - this.styles.margin.right, y: yPosition },
			thickness: 0.5,
			color: rgb(0, 0, 0)
		});
	}
}

// Main function to generate complete PDF
async function generateCompletePDF(
	conferenceName: string = 'Model United Nations',
	isAbove18: boolean,
	recipientInfo: RecipientInfo
): Promise<Uint8Array> {
	const pdfDoc = await PDFDocument.create();

	// Determine which pages to include based on age
	const pageGenerators = [];
	let currentPageNumber = 1;
	
	// First page is always included
	pageGenerators.push(
		new FirstPageGenerator(pdfDoc, defaultStyles, conferenceName, recipientInfo, currentPageNumber++)
	);
	
	// Second page is always included
	pageGenerators.push(
		new SecondPageGenerator(pdfDoc, defaultStyles, conferenceName, currentPageNumber++)
	);
	
	// Third page depends on age
	if (!isAbove18) {
		pageGenerators.push(
			new ThirdPageGenerator(pdfDoc, defaultStyles, conferenceName, currentPageNumber++)
		);
	}
	
	// Fourth page is always included (but with sequential page number)
	pageGenerators.push(
		new FourthPageGenerator(pdfDoc, defaultStyles, conferenceName, currentPageNumber++)
	);
	
	// Fifth page depends on age
	if (!isAbove18) {
		pageGenerators.push(
			new FifthPageGenerator(pdfDoc, defaultStyles, conferenceName, currentPageNumber++)
		);
	}
	
	// Generate all pages
	for (const generator of pageGenerators) {
		await generator.generate();
	}

	return pdfDoc.save();
}

// Export function for usage
export async function generateSamplePDF(
	isAbove18: boolean,
	recipientInfo: RecipientInfo
): Promise<void> {
	try {
		const pdfBytes = await generateCompletePDF('Model United Nations', isAbove18, recipientInfo);

		const blob = new Blob([pdfBytes], { type: 'application/pdf' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'mun-sh-registration.pdf';
		link.click();
		URL.revokeObjectURL(url);
	} catch (error) {
		console.error('Error generating registration form:', error);
		throw error;
	}
}
