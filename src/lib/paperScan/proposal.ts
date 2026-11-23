import type { PaperField } from './fields';
import type { FieldReading, FieldState } from './readPaper';

/**
 * What a person's scanned pages mean for their postal status. A document is in (`DONE`) once
 * everything it asks for is clearly there: ticked, written in and signed, by the guardians too
 * where the person is a minor. The media consent's boxes give the photo status once the form is
 * in. Nothing is ever set back: a field read as empty or unclear only leaves a note, so a misread
 * never undoes what the team set.
 */

type Administrative = 'DONE' | 'PROBLEM' | 'PENDING';
type MediaChoice = 'ALLOWED_ALL' | 'PARTIALLY_ALLOWED' | 'NOT_ALLOWED';

/** The postal status as it stands. */
export type PostalStatus = {
	termsAndConditions: Administrative;
	guardianConsent: Administrative;
	mediaConsent: Administrative;
	mediaConsentStatus: MediaChoice | 'NOT_SET';
};

/** What the scan changes (`upsertConferenceParticipant`'s fields). */
export type PaperChange = {
	termsAndConditions?: 'DONE';
	guardianConsent?: 'DONE';
	mediaConsent?: 'DONE';
	mediaConsentStatus?: MediaChoice;
};

/** The documents a note is about. */
export type PaperDocument = 'contract' | 'guardianConsent' | 'mediaConsent';

/**
 * Why something was not changed: a field it asks for left empty (`missing`) or not read with
 * certainty (`unclear`), a document only partly scanned (`incomplete`), the media consent's boxes
 * not all read with certainty, or (left alone without a person) a choice or a detail
 * (`./agreementDetails`) other than the one stored.
 */
export type PaperNote =
	| { kind: 'missing' | 'unclear'; document: PaperDocument; field: PaperField }
	| { kind: 'incomplete'; document: PaperDocument }
	| { kind: 'mediaChoiceUnclear' }
	| { kind: 'detailDiffers'; field: PaperField }
	| { kind: 'mediaChoiceDiffers'; read: MediaChoice; stored: MediaChoice };

/** The uses and purposes the media consent asks to tick (DMUN's form). */
const MEDIA_USES = [
	'mediaPhoto',
	'mediaVideo',
	'mediaByDmun',
	'mediaByOthers',
	'mediaInternal',
	'mediaDocumentation',
	'mediaPapers',
	'mediaPress',
	'mediaWebsite',
	'mediaSocial',
	'mediaSearch',
	'mediaAdvertising'
] as const satisfies readonly PaperField[];

/**
 * What each document asks for before it counts (`required`), what it asks of a minor's guardians
 * besides (`forMinors`), and the fields it has that decide nothing about it (`others`).
 */
const DOCUMENTS = [
	{
		document: 'contract',
		status: 'termsAndConditions',
		required: ['termsAccepted', 'termsPlaceDate', 'termsSignature'],
		forMinors: [],
		others: []
	},
	{
		document: 'guardianConsent',
		status: 'guardianConsent',
		required: [
			'guardianPlaceDate',
			'guardian1Name',
			'guardian2Name',
			'guardian1Signature',
			'guardian2Signature'
		],
		forMinors: [],
		// the form may print the name itself; whose it is the page's code says either way
		others: ['guardianChildName']
	},
	{
		document: 'mediaConsent',
		status: 'mediaConsent',
		required: ['mediaPlaceDate', 'mediaSignature'],
		forMinors: [
			'mediaGuardian1Name',
			'mediaGuardian2Name',
			'mediaGuardianPlaceDate',
			'mediaGuardian1Signature',
			'mediaGuardian2Signature'
		],
		others: MEDIA_USES
	}
] as const satisfies readonly {
	document: PaperDocument;
	status: keyof PaperChange;
	required: readonly PaperField[];
	forMinors: readonly PaperField[];
	others: readonly PaperField[];
}[];

type DocumentRule = (typeof DOCUMENTS)[number];

/**
 * A field read on several pages (a page sent twice) as one: what every reading says, unclear where
 * they disagree, `undefined` when no page had it.
 */
export function combineReadings({
	readings,
	field
}: {
	readings: readonly FieldReading[];
	field: PaperField;
}): FieldState | undefined {
	const states = new Set(readings.filter((r) => r.field === field).map((r) => r.state));
	if (states.size === 0) return undefined;
	const [only] = states;
	return states.size === 1 ? only : 'unclear';
}

/** A field as a person's details already have it. */
type KnownField = { field: PaperField; state: FieldState };

/**
 * The readings with what earlier scans told of the fields these say nothing certain of, so pages
 * scanned one after the other complete a document together.
 */
function withKnown({
	readings,
	known
}: {
	readings: readonly FieldReading[];
	known: readonly KnownField[];
}): FieldReading[] {
	const missing = known.filter(({ field, state }) => {
		const read = combineReadings({ readings, field });
		return state !== 'unclear' && (read === undefined || read === 'unclear');
	});
	const replaced = new Set<PaperField>(missing.map(({ field }) => field));
	return [
		...readings.filter(({ field }) => !replaced.has(field)),
		...missing.map(({ field, state }) => ({ field, state }))
	];
}

/**
 * The photo status the ticked uses make: every one allowed, some (to check in the form), or none.
 * Every box has to be read, each clearly ticked or empty; otherwise a person decides.
 */
function mediaChoice(readings: readonly FieldReading[]): MediaChoice | 'unclear' | undefined {
	const states = MEDIA_USES.map((field) => combineReadings({ readings, field }));
	if (states.every((state) => state === undefined)) return undefined;
	if (states.some((state) => state === undefined || state === 'unclear')) return 'unclear';
	const ticked = states.filter((state) => state === 'yes').length;
	if (ticked === 0) return 'NOT_ALLOWED';
	return ticked === MEDIA_USES.length ? 'ALLOWED_ALL' : 'PARTIALLY_ALLOWED';
}

/** Whether any of a document's fields was scanned. */
function scannedAny({ readings, rule }: { readings: readonly FieldReading[]; rule: DocumentRule }) {
	return [...rule.required, ...rule.forMinors, ...rule.others].some(
		(field) => combineReadings({ readings, field }) !== undefined
	);
}

/** Whether a document is complete in what is known of it, and if not, why. */
function documentState({
	readings,
	rule,
	minor
}: {
	readings: readonly FieldReading[];
	rule: DocumentRule;
	minor: boolean;
}): { complete: boolean; notes: PaperNote[] } {
	const asked: readonly PaperField[] = [...rule.required, ...(minor ? rule.forMinors : [])];
	const notes: PaperNote[] = [];
	let unread = false;
	for (const field of asked) {
		const state = combineReadings({ readings, field });
		if (state === undefined) unread = true;
		if (state === 'no') notes.push({ kind: 'missing', document: rule.document, field });
		if (state === 'unclear') notes.push({ kind: 'unclear', document: rule.document, field });
	}
	if (unread) notes.push({ kind: 'incomplete', document: rule.document });
	return { complete: notes.length === 0, notes };
}

/** What the media choice read changes, once the form is in; or why it changes nothing. */
function mediaChange({
	readings,
	status,
	confirm,
	complete
}: {
	readings: readonly FieldReading[];
	status: PostalStatus;
	confirm: boolean;
	/** Whether the media consent is complete in what was scanned. */
	complete: boolean;
}): { change: PaperChange; notes: PaperNote[] } {
	const choice = mediaChoice(readings);
	if (choice === 'unclear') return { change: {}, notes: [{ kind: 'mediaChoiceUnclear' }] };
	const signed = status.mediaConsent === 'DONE' || complete;
	const stored = status.mediaConsentStatus;
	if (!choice || !signed || choice === stored) return { change: {}, notes: [] };
	if (confirm || stored === 'NOT_SET') return { change: { mediaConsentStatus: choice }, notes: [] };
	return { change: {}, notes: [{ kind: 'mediaChoiceDiffers', read: choice, stored }] };
}

/**
 * The change `readings` (all of a person's scanned pages) make to `status`, and why anything was
 * left. `known` are the details earlier scans left (`./agreementDetails`): they complete a document
 * some of which was scanned now. `minor`: the person is under age at the conference, so their
 * guardians have to sign the media consent too. `confirm`: a person looks at it before it is saved
 * (the camera), so a media choice other than the stored one is proposed; without one (a batch of
 * scans) it is left and noted.
 */
export function proposePaperChange({
	readings,
	known = [],
	status,
	confirm,
	minor
}: {
	readings: readonly FieldReading[];
	known?: readonly KnownField[];
	status: PostalStatus;
	confirm: boolean;
	minor: boolean;
}): { change: PaperChange; notes: PaperNote[] } {
	const change: PaperChange = {};
	const notes: PaperNote[] = [];
	const together = withKnown({ readings, known });
	for (const rule of DOCUMENTS) {
		if (!scannedAny({ readings, rule })) continue;
		const state = documentState({ readings: together, rule, minor });
		notes.push(...state.notes);
		if (state.complete && status[rule.status] !== 'DONE') change[rule.status] = 'DONE';
		if (rule.document === 'mediaConsent') {
			const media = mediaChange({
				readings: together,
				status,
				confirm,
				complete: state.complete
			});
			Object.assign(change, media.change);
			notes.push(...media.notes);
		}
	}
	return { change, notes };
}

/** Whether a change changes anything. */
export const changesAnything = (change: PaperChange) => Object.keys(change).length > 0;
