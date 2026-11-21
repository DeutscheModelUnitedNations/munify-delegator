/**
 * The fields a scanned application document is read for, as DMUN's forms have them: what a
 * person ticks, writes or signs on the contract, the guardians' consent and the media consent.
 * Where each sits is the team's to place (`DOCUMENT_ELEMENTS` in `#lib/helpers/documentLayout`,
 * where each field is the element of its name); the printed code names each field on its page by
 * its `code` (`./areas`), so a page is read the way it was printed whatever the layout became since.
 */
export const PAPER_FIELDS = {
	// the contract
	termsAccepted: { code: 1, mark: 'checkbox' },
	termsPlaceDate: { code: 2, mark: 'line' },
	termsSignature: { code: 3, mark: 'line' },
	// the guardians' consent (only a minor's documents have it)
	guardianChildName: { code: 4, mark: 'line' },
	guardianPlaceDate: { code: 5, mark: 'line' },
	guardian1Name: { code: 6, mark: 'line' },
	guardian2Name: { code: 7, mark: 'line' },
	guardian1Signature: { code: 8, mark: 'line' },
	guardian2Signature: { code: 9, mark: 'line' },
	// the media consent: the forms of use, then the purposes
	mediaPhoto: { code: 10, mark: 'checkbox' },
	mediaVideo: { code: 11, mark: 'checkbox' },
	mediaByDmun: { code: 12, mark: 'checkbox' },
	mediaByOthers: { code: 13, mark: 'checkbox' },
	mediaInternal: { code: 14, mark: 'checkbox' },
	mediaDocumentation: { code: 15, mark: 'checkbox' },
	mediaPapers: { code: 16, mark: 'checkbox' },
	mediaPress: { code: 17, mark: 'checkbox' },
	mediaWebsite: { code: 18, mark: 'checkbox' },
	mediaSocial: { code: 19, mark: 'checkbox' },
	mediaSearch: { code: 20, mark: 'checkbox' },
	mediaAdvertising: { code: 21, mark: 'checkbox' },
	// … signed by the person, and for a minor also by the guardians
	mediaPlaceDate: { code: 22, mark: 'line' },
	mediaSignature: { code: 23, mark: 'line' },
	mediaGuardian1Name: { code: 24, mark: 'line' },
	mediaGuardian2Name: { code: 25, mark: 'line' },
	mediaGuardianPlaceDate: { code: 26, mark: 'line' },
	mediaGuardian1Signature: { code: 27, mark: 'line' },
	mediaGuardian2Signature: { code: 28, mark: 'line' }
} as const satisfies Record<string, { code: number; mark: PaperMark }>;

export type PaperField = keyof typeof PAPER_FIELDS;
/** What is drawn for a field and read back: a box to tick, or a line to write on (a signature, a name). */
export type PaperMark = 'checkbox' | 'line';

const isPaperField = (name: string): name is PaperField => Object.hasOwn(PAPER_FIELDS, name);

/** The field a printed code names, or `undefined` for a code this version does not know. */
export function fieldOfCode(code: number): PaperField | undefined {
	return Object.keys(PAPER_FIELDS)
		.filter(isPaperField)
		.find((field) => PAPER_FIELDS[field].code === code);
}
