/**
 * The fields a scanned application document is read for: the signatures with their place and
 * date, and the media consent's choice. Where each sits is the team's to place (`DOCUMENT_ELEMENTS` in `#lib/helpers/documentLayout`);
 * the printed code names each field on its page by its `code` (`./areas`), so a page is read
 * the way it was printed whatever the layout became since.
 */
export const PAPER_FIELDS = {
	termsSignature: { code: 1, mark: 'line' },
	guardianSignature: { code: 2, mark: 'line' },
	mediaSignature: { code: 3, mark: 'line' },
	mediaAll: { code: 4, mark: 'checkbox' },
	mediaPartial: { code: 5, mark: 'checkbox' },
	mediaNone: { code: 6, mark: 'checkbox' },
	termsPlaceDate: { code: 7, mark: 'line' },
	guardianPlaceDate: { code: 8, mark: 'line' },
	mediaPlaceDate: { code: 9, mark: 'line' }
} as const satisfies Record<string, { code: number; mark: PaperMark }>;

export type PaperField = keyof typeof PAPER_FIELDS;
/** What is drawn for a field and read back: a box to tick, or a line to write on (a signature, place and date). */
export type PaperMark = 'checkbox' | 'line';

const isPaperField = (name: string): name is PaperField => Object.hasOwn(PAPER_FIELDS, name);

/** The field a printed code names, or `undefined` for a code this version does not know. */
export function fieldOfCode(code: number): PaperField | undefined {
	return Object.keys(PAPER_FIELDS)
		.filter(isPaperField)
		.find((field) => PAPER_FIELDS[field].code === code);
}
