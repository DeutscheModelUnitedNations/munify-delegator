import { PDFDocument, rgb, StandardFonts, PageSizes, PDFPage, PDFFont } from 'pdf-lib';

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage(PageSizes.A4);
const { width, height } = page.getSize();

console.log(page, width, height);