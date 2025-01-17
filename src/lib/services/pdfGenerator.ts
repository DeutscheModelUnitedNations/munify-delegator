import { PDFDocument, rgb, StandardFonts, PageSizes } from 'pdf-lib';

interface DocumentData {
	title: string;
	author: string;
	content: {
		heading: string;
		paragraphs: string[];
	}[];
}

async function createMultiPagePDF(data: DocumentData): Promise<Uint8Array> {
	// Create a new PDF document
	const pdfDoc = await PDFDocument.create();

	// Set document metadata
	pdfDoc.setTitle(data.title);
	pdfDoc.setAuthor(data.author);
	pdfDoc.setCreationDate(new Date());

	// Embed the default font
	const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
	const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

	// Define styles
	const styles = {
		title: {
			fontSize: 24,
			lineHeight: 1.2,
			marginTop: 60,
			marginBottom: 20
		},
		heading: {
			fontSize: 18,
			lineHeight: 1.2,
			marginTop: 40,
			marginBottom: 15
		},
		paragraph: {
			fontSize: 12,
			lineHeight: 1.5,
			marginBottom: 12
		},
		page: {
			margin: {
				top: 50,
				right: 50,
				bottom: 50,
				left: 50
			}
		}
	};

	// Create title page
	const titlePage = pdfDoc.addPage(PageSizes.A4);
	const { width, height } = titlePage.getSize();

	// Add title
	titlePage.drawText(data.title, {
		x: styles.page.margin.left,
		y: height - styles.title.marginTop,
		font: boldFont,
		size: styles.title.fontSize,
		color: rgb(0, 0, 0)
	});

	// Add author
	titlePage.drawText(`By ${data.author}`, {
		x: styles.page.margin.left,
		y: height - styles.title.marginTop - styles.title.fontSize * styles.title.lineHeight,
		font: font,
		size: styles.paragraph.fontSize,
		color: rgb(0, 0, 0)
	});

	// Add content pages
	data.content.forEach((section) => {
		const page = pdfDoc.addPage(PageSizes.A4);
		let currentY = height - styles.page.margin.top;

		// Add section heading
		page.drawText(section.heading, {
			x: styles.page.margin.left,
			y: currentY,
			font: boldFont,
			size: styles.heading.fontSize,
			color: rgb(0, 0, 0)
		});

		currentY -= styles.heading.fontSize * styles.heading.lineHeight + styles.heading.marginBottom;

		// Add paragraphs
		section.paragraphs.forEach((paragraph) => {
			// Split paragraph into lines that fit within page margins
			const maxWidth = width - styles.page.margin.left - styles.page.margin.right;
			const words = paragraph.split(' ');
			let currentLine = '';
			const lines: string[] = [];

			words.forEach((word) => {
				const testLine = currentLine ? `${currentLine} ${word}` : word;
				const lineWidth = font.widthOfTextAtSize(testLine, styles.paragraph.fontSize);

				if (lineWidth <= maxWidth) {
					currentLine = testLine;
				} else {
					lines.push(currentLine);
					currentLine = word;
				}
			});

			if (currentLine) {
				lines.push(currentLine);
			}

			// Draw lines
			lines.forEach((line) => {
				// Check if we need a new page
				if (currentY < styles.page.margin.bottom + styles.paragraph.fontSize) {
					const newPage = pdfDoc.addPage(PageSizes.A4);
					currentY = height - styles.page.margin.top;
				}

				page.drawText(line, {
					x: styles.page.margin.left,
					y: currentY,
					font: font,
					size: styles.paragraph.fontSize,
					color: rgb(0, 0, 0)
				});

				currentY -= styles.paragraph.fontSize * styles.paragraph.lineHeight;
			});

			currentY -= styles.paragraph.marginBottom;
		});
	});

	// Generate PDF bytes
	return pdfDoc.save();
}


// Define interfaces for our data structure
interface RegistrationFormData {
  title: string;
  logoPath?: string;
  recipientAddress: {
    name: string;
    address: string;
    postalCode: string;
    city: string;
    country: string;
  };
}

/**
 * Creates a checkbox in the PDF using simple geometric shapes
 * instead of Unicode characters to ensure compatibility
 */
function drawCheckbox(page: PDFPage, x: number, y: number, size: number = 12) {
  // Draw the checkbox outline
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
}

async function createRegistrationForm(data: RegistrationFormData): Promise<Uint8Array> {
  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();

  // Embed fonts
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Define common styles
  const styles = {
    page: {
      margin: { top: 50, right: 50, bottom: 50, left: 50 }
    },
    title: {
      fontSize: 24,
      lineHeight: 1.2,
      color: rgb(0, 0, 0)
    },
    heading: {
      fontSize: 14,
      lineHeight: 1.2,
      color: rgb(0, 0, 0)
    },
    normal: {
      fontSize: 11,
      lineHeight: 1.5,
      color: rgb(0, 0, 0)
    }
  };

  // Create registration page
  const registrationPage = pdfDoc.addPage(PageSizes.A4);
  const { width, height } = registrationPage.getSize();

  // Add header with MUN-SH logo text
  let currentY = height - styles.page.margin.top;
  
  // Draw the main title using gray color
  registrationPage.drawText('Model United Nations', {
    x: styles.page.margin.left,
    y: currentY,
    font: helveticaBold,
    size: styles.title.fontSize,
    color: rgb(0.5, 0.5, 0.5)
  });

  currentY -= 30;
  registrationPage.drawText('Schleswig-Holstein', {
    x: styles.page.margin.left,
    y: currentY,
    font: helveticaBold,
    size: styles.title.fontSize,
    color: rgb(0.5, 0.5, 0.5)
  });

  // Add form title
  currentY -= 60;
  registrationPage.drawText('Postalische Anmeldung MUN-SH 2025', {
    x: styles.page.margin.left,
    y: currentY,
    font: helveticaBold,
    size: styles.heading.fontSize
  });

  // Add recipient address section
  currentY -= 40;
  registrationPage.drawText('per Post zu senden an:', {
    x: styles.page.margin.left,
    y: currentY,
    font: helvetica,
    size: styles.normal.fontSize
  });

  // Draw address fields with angle brackets
  const addressFields = [
    'Name',
    'Adresse',
    'PLZ',
    'Ort',
    'COUNTRY'
  ];

  addressFields.forEach(field => {
    currentY -= 20;
    registrationPage.drawText(`<${field}>`, {
      x: styles.page.margin.left,
      y: currentY,
      font: helvetica,
      size: styles.normal.fontSize
    });
  });

  // Add registration fields
  currentY -= 40;
  registrationPage.drawText('Verbindliche Anmeldung von', {
    x: styles.page.margin.left,
    y: currentY,
    font: helveticaBold,
    size: styles.heading.fontSize
  });

  currentY -= 30;
  registrationPage.drawLine({
    start: { x: styles.page.margin.left, y: currentY },
    end: { x: width - styles.page.margin.right, y: currentY },
    thickness: 0.5,
    color: rgb(0, 0, 0)
  });

  currentY -= 30;
  registrationPage.drawText('geboren am', {
    x: styles.page.margin.left,
    y: currentY,
    font: helveticaBold,
    size: styles.heading.fontSize
  });

  currentY -= 30;
  registrationPage.drawLine({
    start: { x: styles.page.margin.left + 100, y: currentY },
    end: { x: width / 2, y: currentY },
    thickness: 0.5,
    color: rgb(0, 0, 0)
  });

  // Add consent text with proper word wrapping
  currentY -= 40;
  const consentText = `Mit meiner Unterschrift bestätige ich, dass alle Angaben auf dieser Anmeldung sowie in der dazugehörigen Online-Anmeldung, nach bestem Wissen und Gewissen gemacht worden sind. Ich bestätige weiter, nach Erhalt einer Zusage die Teilnahmegebühr in Höhe von 75,00 € pro Person umgehend zu überweisen. Die Vertragsbedingungen und die Datenschutzerklärung habe ich zur Kenntnis genommen und akzeptiere diese mit meiner Unterschrift. Ich melde mich hiermit zu MUN-SH 2025 an.`;
  
  const words = consentText.split(' ');
  let line = '';
  let lineY = currentY;
  
  words.forEach(word => {
    const testLine = line + (line ? ' ' : '') + word;
    const lineWidth = helvetica.widthOfTextAtSize(testLine, styles.normal.fontSize);
    
    if (lineWidth > width - styles.page.margin.left - styles.page.margin.right) {
      registrationPage.drawText(line, {
        x: styles.page.margin.left,
        y: lineY,
        font: helvetica,
        size: styles.normal.fontSize
      });
      line = word;
      lineY -= styles.normal.fontSize * styles.normal.lineHeight;
    } else {
      line = testLine;
    }
  });

  if (line) {
    registrationPage.drawText(line, {
      x: styles.page.margin.left,
      y: lineY,
      font: helvetica,
      size: styles.normal.fontSize
    });
  }

  // Add checkbox and agreement text
  currentY = lineY - 60;
  // Draw a proper checkbox instead of using Unicode character
  drawCheckbox(registrationPage, styles.page.margin.left, currentY);
  
  registrationPage.drawText('Ich habe die Vertragsbedingungen und Datenschutzerklärung gelesen und akzeptiere sie.', {
    x: styles.page.margin.left + 20,
    y: currentY + 2, // Align text with checkbox
    font: helvetica,
    size: styles.normal.fontSize
  });

  // Add signature fields
  currentY -= 60;
  registrationPage.drawText('Ort, Datum', {
    x: styles.page.margin.left,
    y: currentY,
    font: helvetica,
    size: styles.normal.fontSize
  });

  currentY -= 20;
  registrationPage.drawLine({
    start: { x: styles.page.margin.left, y: currentY },
    end: { x: width / 2 - 20, y: currentY },
    thickness: 0.5,
    color: rgb(0, 0, 0)
  });

  currentY -= 40;
  registrationPage.drawText('Unterschrift des*der Teilnehmenden', {
    x: styles.page.margin.left,
    y: currentY,
    font: helvetica,
    size: styles.normal.fontSize
  });

  currentY -= 20;
  registrationPage.drawLine({
    start: { x: styles.page.margin.left, y: currentY },
    end: { x: width - styles.page.margin.right, y: currentY },
    thickness: 0.5,
    color: rgb(0, 0, 0)
  });

  // Add page number
  registrationPage.drawText('1', {
    x: styles.page.margin.left,
    y: styles.page.margin.bottom,
    font: helvetica,
    size: 10
  });

  // Generate PDF bytes
  return pdfDoc.save();
}

// Example usage function
export async function generateSamplePDF(): Promise<void> {
  const sampleData: RegistrationFormData = {
    title: 'MUN-SH 2025 Registration',
    recipientAddress: {
      name: 'DMUN e.V.',
      address: 'Sample Street 123',
      postalCode: '24118',
      city: 'Kiel',
      country: 'Germany'
    }
  };

  try {
    const pdfBytes = await createRegistrationForm(sampleData);
    
    // Create download link for browser environment
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mun-sh-registration.pdf';
    link.click();
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}
