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

// Example usage
async function generateSamplePDF(): Promise<void> {
	const sampleData: DocumentData = {
		title: 'Sample Multi-Page Document',
		author: 'John Doe',
		content: [
			{
				heading: 'Introduction',
				paragraphs: [
					'This is the first paragraph of the introduction section. It contains some sample text to demonstrate how the PDF generator handles text flow and pagination.',
					"Here's another paragraph with different content to show how multiple paragraphs are handled within a section."
				]
			},
			{
				heading: 'Main Content',
				paragraphs: [
					'The main content section begins here with its first paragraph. This section demonstrates how the generator handles multiple sections across pages.',
					'A second paragraph in the main content section provides more sample text for testing the layout and formatting capabilities.'
				]
			}
		]
	};

	try {
		const pdfBytes = await createMultiPagePDF(sampleData);

		// In a browser environment, you can create a download link:
		const blob = new Blob([pdfBytes], { type: 'application/pdf' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'sample-document.pdf';
		link.click();

		// In Node.js, you can write to a file:
		// await fs.writeFile('sample-document.pdf', pdfBytes);
	} catch (error) {
		console.error('Error generating PDF:', error);
	}
}
