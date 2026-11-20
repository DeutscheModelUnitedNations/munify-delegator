/**
 * The fields a scanned application document is read for: the signatures and the media consent's
 * choice. Where each sits is the team's to place (`DOCUMENT_ELEMENTS` in `#lib/helpers/documentLayout`);
 * the printed code names each field on its page by its `code` (`./areas`), so a page is read
 * the way it was printed whatever the layout became since.
 */
export const PAPER_FIELDS = {
	termsSignature: { code: 1, mark: 'signature' },
	guardianSignature: { code: 2, mark: 'signature' },
	mediaSignature: { code: 3, mark: 'signature' },
	mediaAll: { code: 4, mark: 'checkbox' },
	mediaPartial: { code: 5, mark: 'checkbox' },
	mediaNone: { code: 6, mark: 'checkbox' }
} as const satisfies Record<string, { code: number; mark: PaperMark }>;

export type PaperField = keyof typeof PAPER_FIELDS;
/** What is drawn for a field and read back: a box to tick, or a line to sign on. */
export type PaperMark = 'checkbox' | 'signature';

const isPaperField = (name: string): name is PaperField => Object.hasOwn(PAPER_FIELDS, name);

/** The field a printed code names, or `undefined` for a code this version does not know. */
export function fieldOfCode(code: number): PaperField | undefined {
	return Object.keys(PAPER_FIELDS)
		.filter(isPaperField)
		.find((field) => PAPER_FIELDS[field].code === code);
}
