/**
 * The AIM symbology identifier: a keyboard scanner can be set to put `]` + a letter + a digit in
 * front of what it types, naming the kind of code it read (`]Q1` a QR code, `]C0` Code 128, `]d1` a
 * DataMatrix). It is the only way the page learns the format of a code that arrives as typing.
 */
export interface ReadCode {
	/** What was read, without the identifier. */
	code: string;
	/** The format as the camera detector names it; `null` when the scanner sent no identifier. */
	format: string | null;
}

const FORMATS: Record<string, string> = {
	Q: 'qr_code',
	d: 'data_matrix',
	C: 'code_128',
	A: 'code_39',
	E: 'ean_13',
	F: 'codabar',
	L: 'pdf417'
};

export function readAimIdentifier(text: string): ReadCode {
	const match = /^\](.)\d/.exec(text);
	if (!match) return { code: text, format: null };
	// A symbology we do not know is still something a scanner read, so it is not typed text
	return { code: text.slice(3), format: FORMATS[match[1]] ?? 'unknown' };
}
