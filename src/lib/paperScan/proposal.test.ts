import { describe, expect, it } from 'vitest';
import type { PaperField } from './fields';
import {
	combineReadings,
	proposePaperChange,
	rejectedDocuments,
	type PostalStatus
} from './proposal';
import type { FieldReading, FieldState } from './readPaper';

const pending: PostalStatus = {
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING',
	mediaConsent: 'PENDING',
	mediaConsentStatus: 'NOT_SET'
};

const read = (fields: readonly PaperField[], state: FieldState = 'yes'): FieldReading[] =>
	fields.map((field) => ({ field, state }));

const CONTRACT = ['termsAccepted', 'termsPlaceDate', 'termsSignature'] as const;
const GUARDIAN = [
	'guardianChildName',
	'guardianPlaceDate',
	'guardian1Name',
	'guardian2Name',
	'guardian1Signature',
	'guardian2Signature'
] as const;
const USES = [
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
] as const;
const MEDIA_SIGNED = ['mediaPlaceDate', 'mediaSignature'] as const;
const MEDIA_GUARDIANS = [
	'mediaGuardian1Name',
	'mediaGuardian2Name',
	'mediaGuardianPlaceDate',
	'mediaGuardian1Signature',
	'mediaGuardian2Signature'
] as const;

/** The media consent's three pages: the uses ticked as `ticked` says, signed by the person. */
const mediaConsent = (ticked: (field: PaperField) => FieldState) => [
	...USES.map((field) => ({ field, state: ticked(field) })),
	...read(MEDIA_SIGNED)
];

const propose = ({
	readings,
	status = pending,
	confirm = false,
	minor = false
}: {
	readings: FieldReading[];
	status?: PostalStatus;
	confirm?: boolean;
	minor?: boolean;
}) => proposePaperChange({ readings, status, confirm, minor });

describe('combineReadings', () => {
	it('takes what every page says, and calls disagreement unclear', () => {
		const field = 'termsSignature';
		expect(combineReadings({ readings: [], field })).toBeUndefined();
		expect(combineReadings({ readings: [...read([field]), ...read([field])], field })).toBe('yes');
		expect(combineReadings({ readings: [...read([field]), ...read([field], 'no')], field })).toBe(
			'unclear'
		);
	});
});

describe('proposePaperChange', () => {
	it('marks a document in once everything it asks for is there', () => {
		expect(propose({ readings: read(CONTRACT) })).toEqual({
			change: { termsAndConditions: 'DONE' },
			notes: []
		});
		expect(propose({ readings: read(GUARDIAN), minor: true }).change).toEqual({
			guardianConsent: 'DONE'
		});
	});

	it('names what is missing or unclear and changes nothing then, nor sets anything back', () => {
		const readings = [
			...read(['termsAccepted', 'termsSignature']),
			...read(['termsPlaceDate'], 'no'),
			...read(GUARDIAN.slice(0, -1)),
			...read(['guardian2Signature'], 'unclear')
		];
		expect(propose({ readings, status: { ...pending, termsAndConditions: 'DONE' } })).toEqual({
			change: {},
			notes: [
				{ kind: 'missing', document: 'contract', field: 'termsPlaceDate' },
				{ kind: 'unclear', document: 'guardianConsent', field: 'guardian2Signature' }
			]
		});
	});

	it('says a document was only partly scanned', () => {
		expect(propose({ readings: read(['termsSignature']) })).toEqual({
			change: {},
			notes: [{ kind: 'incomplete', document: 'contract' }]
		});
		// the media consent's first page alone
		expect(propose({ readings: read(USES.slice(0, 4)) }).notes).toEqual([
			{ kind: 'incomplete', document: 'mediaConsent' },
			{ kind: 'mediaChoiceUnclear' }
		]);
	});

	it("asks the guardians' part of the media consent of minors only", () => {
		const readings = [...mediaConsent(() => 'yes'), ...read(MEDIA_GUARDIANS, 'no')];
		expect(propose({ readings }).change).toEqual({
			mediaConsent: 'DONE',
			mediaConsentStatus: 'ALLOWED_ALL'
		});
		const minor = propose({ readings, minor: true });
		expect(minor.change).toEqual({});
		expect(minor.notes).toHaveLength(MEDIA_GUARDIANS.length);
		expect(
			propose({
				readings: [...mediaConsent(() => 'yes'), ...read(MEDIA_GUARDIANS)],
				minor: true
			}).change
		).toEqual({ mediaConsent: 'DONE', mediaConsentStatus: 'ALLOWED_ALL' });
	});

	it('takes every use ticked as allowed without restriction, some as partly, none as not', () => {
		const choice = (ticked: (field: PaperField) => FieldState) =>
			propose({ readings: mediaConsent(ticked) }).change.mediaConsentStatus;
		expect(choice(() => 'yes')).toBe('ALLOWED_ALL');
		expect(choice(() => 'no')).toBe('NOT_ALLOWED');
		expect(choice((field) => (field === 'mediaPress' ? 'no' : 'yes'))).toBe('PARTIALLY_ALLOWED');
	});

	it('takes no media choice from a form not complete, nor with a box unclear', () => {
		expect(propose({ readings: read(USES) }).change).toEqual({});
		const unclear = propose({
			readings: mediaConsent((field) => (field === 'mediaSocial' ? 'unclear' : 'yes'))
		});
		expect(unclear.change).toEqual({ mediaConsent: 'DONE' });
		expect(unclear.notes).toEqual([{ kind: 'mediaChoiceUnclear' }]);
	});

	it('takes a choice whose form was signed on an earlier scan', () => {
		expect(
			propose({ readings: read(USES, 'no'), status: { ...pending, mediaConsent: 'DONE' } }).change
		).toEqual({ mediaConsentStatus: 'NOT_ALLOWED' });
	});

	it('leaves a choice other than the stored one to a person, unless one confirms it', () => {
		const status: PostalStatus = { ...pending, mediaConsentStatus: 'ALLOWED_ALL' };
		const readings = mediaConsent(() => 'no');
		expect(propose({ readings, status })).toEqual({
			change: { mediaConsent: 'DONE' },
			notes: [{ kind: 'mediaChoiceDiffers', read: 'NOT_ALLOWED', stored: 'ALLOWED_ALL' }]
		});
		expect(propose({ readings, status, confirm: true }).change).toEqual({
			mediaConsent: 'DONE',
			mediaConsentStatus: 'NOT_ALLOWED'
		});
	});

	it('changes nothing already as read', () => {
		const status: PostalStatus = {
			...pending,
			mediaConsent: 'DONE',
			mediaConsentStatus: 'ALLOWED_ALL'
		};
		expect(propose({ readings: mediaConsent(() => 'yes'), status }).change).toEqual({});
	});

	it('completes a document with what earlier scans told of its other pages', () => {
		const known = [
			...USES.map((field) => ({ field, state: 'yes' as const, source: 'SCAN' as const })),
			{ field: 'termsSignature' as const, state: 'yes' as const, source: 'SCAN' as const }
		];
		expect(
			proposePaperChange({
				readings: read(MEDIA_SIGNED),
				known,
				status: pending,
				confirm: false,
				minor: false
			})
		).toEqual({ change: { mediaConsent: 'DONE', mediaConsentStatus: 'ALLOWED_ALL' }, notes: [] });
	});

	it('lets an earlier clear reading stand in for one unclear now, not for an empty one', () => {
		const known = [
			{ field: 'termsSignature' as const, state: 'yes' as const, source: 'SCAN' as const }
		];
		const contract = (state: FieldState) => [
			...read(['termsAccepted', 'termsPlaceDate']),
			...read(['termsSignature'], state)
		];
		const change = (state: FieldState) =>
			proposePaperChange({
				readings: contract(state),
				known,
				status: pending,
				confirm: false,
				minor: false
			}).change;
		expect(change('unclear')).toEqual({ termsAndConditions: 'DONE' });
		expect(change('no')).toEqual({});
	});

	it("does not wait for the child's name, which the form may print itself", () => {
		expect(
			propose({ readings: read(GUARDIAN.filter((field) => field !== 'guardianChildName')) }).change
		).toEqual({ guardianConsent: 'DONE' });
	});

	it('counts what a person set over what is read, either way', () => {
		const change = ({ set, read: state }: { set: FieldState; read: FieldState }) =>
			proposePaperChange({
				readings: [
					...read(['termsAccepted', 'termsPlaceDate']),
					...read(['termsSignature'], state)
				],
				known: [{ field: 'termsSignature', state: set, source: 'MANUAL' }],
				status: pending,
				confirm: false,
				minor: false
			}).change;
		expect(change({ set: 'no', read: 'yes' })).toEqual({});
		expect(change({ set: 'unclear', read: 'yes' })).toEqual({});
		expect(change({ set: 'yes', read: 'no' })).toEqual({ termsAndConditions: 'DONE' });
	});

	describe('of a document marked as a problem', () => {
		const status: PostalStatus = {
			...pending,
			guardianConsent: 'PROBLEM',
			mediaConsent: 'PROBLEM'
		};
		const readings = [...read(GUARDIAN), ...mediaConsent(() => 'yes')];

		it('changes nothing unattended, the media choice neither, and says so', () => {
			expect(propose({ readings, status })).toEqual({
				change: {},
				notes: [
					{ kind: 'rejected', document: 'guardianConsent' },
					{ kind: 'rejected', document: 'mediaConsent' }
				]
			});
		});

		it('is not completed by a poor scan of it and what earlier ones told', () => {
			const known = GUARDIAN.map((field) => ({ field, state: 'yes', source: 'SCAN' }) as const);
			const poor = { readings: read(GUARDIAN, 'unclear'), known, status, minor: true };
			expect(proposePaperChange({ ...poor, confirm: false }).change).toEqual({});
		});

		it('is taken as in when a person confirms it', () => {
			expect(propose({ readings, status, confirm: true })).toEqual({
				change: {
					guardianConsent: 'DONE',
					mediaConsent: 'DONE',
					mediaConsentStatus: 'ALLOWED_ALL'
				},
				notes: []
			});
		});

		it('says nothing more than what is missing of one not complete', () => {
			expect(propose({ readings: read(GUARDIAN, 'no'), status }).notes).not.toContainEqual({
				kind: 'rejected',
				document: 'guardianConsent'
			});
		});
	});
});

describe('rejectedDocuments', () => {
	it('names those newly marked as a problem', () => {
		expect(
			rejectedDocuments({
				before: { ...pending, mediaConsent: 'PROBLEM' },
				set: { termsAndConditions: 'DONE', guardianConsent: 'PROBLEM', mediaConsent: 'PROBLEM' }
			})
		).toEqual(['guardianConsent']);
		expect(rejectedDocuments({ before: pending, set: {} })).toEqual([]);
	});
});
