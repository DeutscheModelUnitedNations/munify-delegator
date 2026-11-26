import type { PaperField } from './fields';
import type { FieldReading, FieldState } from './readPaper';
import type { StoredReadings } from './intake/rescan';
import { combineReadings, type PaperDocument } from './proposal';

/**
 * The details of what a person agreed to on paper (`agreementDetail`): every box and line of DMUN's
 * application documents, document by document, as scans fill them in. The team's own work is on the
 * statuses (`./proposal`); a person may set a detail too, which no scan changes any more.
 */
export const AGREEMENT_GROUPS = [
	{
		id: 'contract',
		document: 'contract',
		fields: ['termsAccepted', 'termsPlaceDate', 'termsSignature']
	},
	{
		id: 'guardianConsent',
		document: 'guardianConsent',
		fields: [
			'guardianPlaceDate',
			'guardian1Name',
			'guardian2Name',
			'guardian1Signature',
			'guardian2Signature'
		]
	},
	{
		id: 'mediaForms',
		document: 'mediaConsent',
		fields: ['mediaPhoto', 'mediaVideo', 'mediaByDmun', 'mediaByOthers']
	},
	{
		id: 'mediaPurposes',
		document: 'mediaConsent',
		fields: [
			'mediaInternal',
			'mediaDocumentation',
			'mediaPapers',
			'mediaPress',
			'mediaWebsite',
			'mediaSocial',
			'mediaSearch',
			'mediaAdvertising'
		]
	},
	{
		id: 'mediaSigned',
		document: 'mediaConsent',
		fields: [
			'mediaPlaceDate',
			'mediaSignature',
			'mediaGuardian1Name',
			'mediaGuardian2Name',
			'mediaGuardianPlaceDate',
			'mediaGuardian1Signature',
			'mediaGuardian2Signature'
		]
	}
] as const satisfies readonly {
	id: string;
	document: PaperDocument;
	fields: readonly PaperField[];
}[];

export type AgreementGroup = (typeof AGREEMENT_GROUPS)[number];
export type AgreementField = AgreementGroup['fields'][number];

/** Every detail, in the order of the documents. */
export const AGREEMENT_FIELDS: readonly AgreementField[] = AGREEMENT_GROUPS.flatMap<AgreementField>(
	({ fields }) => fields
);

/** The details of these documents. */
export const fieldsOfDocuments = (documents: readonly PaperDocument[]) =>
	AGREEMENT_GROUPS.filter(({ document }) => documents.includes(document)).flatMap<AgreementField>(
		({ fields }) => fields
	);

/** A detail as it is stored. */
export interface StoredDetail {
	field: AgreementField;
	state: FieldState;
	source: 'SCAN' | 'MANUAL';
}

/** The choices of the media consent: a box the person may or may not tick, neither being a mistake. */
const CHOICES: readonly string[] = AGREEMENT_GROUPS.flatMap<AgreementField>(({ id, fields }) =>
	id === 'mediaForms' || id === 'mediaPurposes' ? fields : []
);

/** What a reading does to a stored detail: written, left because a person decides, or nothing new. */
function judgeDetail({
	read,
	stored,
	field,
	confirm
}: {
	read: FieldState;
	stored: StoredDetail | undefined;
	field: AgreementField;
	confirm: boolean;
}): 'write' | 'differs' | 'keep' {
	if (!stored) return 'write';
	if (stored.state === read || read === 'unclear') return 'keep';
	if (stored.source === 'MANUAL') return 'differs';
	if (stored.state === 'unclear' || confirm) return 'write';
	// a form sent in again, now signed; a choice, though, may have changed either way
	return stored.state === 'no' && !CHOICES.includes(field) ? 'write' : 'differs';
}

/**
 * What `readings` (a person's scanned pages) change of their stored details, and which of them say
 * something else than what is stored and were left: what a person set, and, unless a person looks at
 * it (`confirm`), a clear detail read differently. Like the statuses, a scan read unattended never
 * takes back what is stored.
 */
export function planDetails({
	readings,
	stored,
	confirm
}: {
	readings: readonly FieldReading[];
	stored: readonly StoredDetail[];
	confirm: boolean;
}): { write: { field: AgreementField; state: FieldState }[]; differing: AgreementField[] } {
	const write: { field: AgreementField; state: FieldState }[] = [];
	const differing: AgreementField[] = [];
	for (const field of AGREEMENT_FIELDS) {
		const state = combineReadings({ readings, field });
		if (state === undefined) continue;
		const known = stored.find((detail) => detail.field === field);
		const verdict = judgeDetail({ read: state, stored: known, field, confirm });
		if (verdict === 'write') write.push({ field, state });
		if (verdict === 'differs') differing.push(field);
	}
	return { write, differing };
}

/**
 * The details only a removed scan (read as `removed`) told of: read off it, not set by a person, and
 * said by none of the person's `remaining` scans.
 */
export function detailsToForget({
	removed,
	remaining,
	stored
}: {
	removed: StoredReadings;
	remaining: readonly StoredReadings[];
	stored: readonly StoredDetail[];
}): AgreementField[] {
	const fields = new Set((removed ?? []).map(({ field }) => field));
	const told = remaining.flatMap((readings) => readings ?? []);
	return stored
		.filter(({ field, state, source }) => {
			if (source === 'MANUAL' || !fields.has(field)) return false;
			return !told.some((reading) => reading.field === field && reading.state === state);
		})
		.map(({ field }) => field);
}
