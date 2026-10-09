import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb } from 'pdf-lib';

// the corporate colours (the dmun daisyUI theme)
export const PRIMARY = rgb(1 / 255, 84 / 255, 143 / 255);
export const NEUTRAL = rgb(27 / 255, 24 / 255, 55 / 255);
export const MUTED = rgb(109 / 255, 147 / 255, 146 / 255);

/** Outfit, the corporate typeface, regular and bold. */
export interface NametagFonts {
	regular: ArrayBuffer;
	bold: ArrayBuffer;
}

/** A new document with both weights of the typeface embedded. */
export async function createNametagPdf(fonts: NametagFonts) {
	const pdf = await PDFDocument.create();
	pdf.registerFontkit(fontkit);
	const regular = await pdf.embedFont(fonts.regular, { subset: true });
	const bold = await pdf.embedFont(fonts.bold, { subset: true });
	return { pdf, regular, bold };
}
