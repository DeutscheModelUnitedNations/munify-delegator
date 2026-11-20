import type { PaperField } from './fields';
import type { FieldReading, FieldState } from './readPaper';

/**
 * What a person's scanned pages mean for their postal status. A signed document is in (`DONE`);
 * the media consent's choice counts once it is signed. Nothing is ever set back: a field read as
 * empty or unclear only leaves a note, so a misread never undoes what the team set.
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
 * Why something was not changed: a document not signed, a field no one could tell, the media
 * choice not one box, or (left alone without a person) a choice other than the one stored.
 */
export type PaperNote =
	| { kind: 'unsigned' | 'unclear'; document: PaperDocument }
	| { kind: 'mediaChoiceUnclear' }
	| { kind: 'mediaChoiceDiffers'; read: MediaChoice; stored: MediaChoice };

const SIGNATURES = [
	{ field: 'termsSignature', status: 'termsAndConditions', document: 'contract' },
	{ field: 'guardianSignature', status: 'guardianConsent', document: 'guardianConsent' },
	{ field: 'mediaSignature', status: 'mediaConsent', document: 'mediaConsent' }
] as const satisfies readonly {
	field: PaperField;
	status: keyof PaperChange;
	document: PaperDocument;
}[];

const CHOICES = [
	{ field: 'mediaAll', choice: 'ALLOWED_ALL' },
	{ field: 'mediaPartial', choice: 'PARTIALLY_ALLOWED' },
	{ field: 'mediaNone', choice: 'NOT_ALLOWED' }
] as const satisfies readonly { field: PaperField; choice: MediaChoice }[];

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

/** The media choice the boxes make: exactly one ticked, the others clearly empty. */
function mediaChoice(readings: readonly FieldReading[]) {
	const states = CHOICES.map(({ field, choice }) => ({
		choice,
		state: combineReadings({ readings, field })
	})).filter(({ state }) => state !== undefined);
	if (states.length === 0) return undefined;
	const ticked = states.filter(({ state }) => state === 'yes');
	const clear = states.every(({ state }) => state !== 'unclear');
	return ticked.length === 1 && clear ? ticked[0].choice : 'unclear';
}

/** What the signatures read change, and the documents left unsigned or unclear. */
function signatureChanges({
	readings,
	status
}: {
	readings: readonly FieldReading[];
	status: PostalStatus;
}) {
	const change: PaperChange = {};
	const notes: PaperNote[] = [];
	for (const { field, status: key, document } of SIGNATURES) {
		const state = combineReadings({ readings, field });
		if (state === 'yes' && status[key] !== 'DONE') change[key] = 'DONE';
		if (state === 'no') notes.push({ kind: 'unsigned', document });
		if (state === 'unclear') notes.push({ kind: 'unclear', document });
	}
	return { change, notes };
}

/** What the media choice read changes, once the form is signed; or why it changes nothing. */
function mediaChange({
	readings,
	status,
	confirm
}: {
	readings: readonly FieldReading[];
	status: PostalStatus;
	confirm: boolean;
}): { change: PaperChange; notes: PaperNote[] } {
	const choice = mediaChoice(readings);
	if (choice === 'unclear') return { change: {}, notes: [{ kind: 'mediaChoiceUnclear' }] };
	const signed =
		status.mediaConsent === 'DONE' ||
		combineReadings({ readings, field: 'mediaSignature' }) === 'yes';
	const stored = status.mediaConsentStatus;
	if (!choice || !signed || choice === stored) return { change: {}, notes: [] };
	if (confirm || stored === 'NOT_SET') return { change: { mediaConsentStatus: choice }, notes: [] };
	return { change: {}, notes: [{ kind: 'mediaChoiceDiffers', read: choice, stored }] };
}

/**
 * The change `readings` (all of a person's scanned pages) make to `status`, and why anything was
 * left. `confirm`: a person looks at it before it is saved (the camera), so a media choice other
 * than the stored one is proposed; without one (a batch of scans) it is left and noted.
 */
export function proposePaperChange({
	readings,
	status,
	confirm
}: {
	readings: readonly FieldReading[];
	status: PostalStatus;
	confirm: boolean;
}): { change: PaperChange; notes: PaperNote[] } {
	const signatures = signatureChanges({ readings, status });
	const media = mediaChange({ readings, status, confirm });
	return {
		change: { ...signatures.change, ...media.change },
		notes: [...signatures.notes, ...media.notes]
	};
}

/** Whether a change changes anything. */
export const changesAnything = (change: PaperChange) => Object.keys(change).length > 0;
