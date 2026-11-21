import { describe, expect, it } from 'vitest';
import { combineReadings, proposePaperChange, type PostalStatus } from './proposal';
import type { FieldReading } from './readPaper';

const pending: PostalStatus = {
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING',
	mediaConsent: 'PENDING',
	mediaConsentStatus: 'NOT_SET'
};

type State = FieldReading['state'];
const USES = ['mediaPhoto', 'mediaVideo', 'mediaByDmun', 'mediaByOthers'] as const;

/** A media consent page: its four boxes (photo, video, by DMUN, by others) and its signature. */
const mediaPage = (boxes: [State, State, State, State], signed: State): FieldReading[] => [
	...USES.map((field, index) => ({ field, state: boxes[index] })),
	{ field: 'mediaSignature', state: signed }
];
const all: [State, State, State, State] = ['yes', 'yes', 'yes', 'yes'];
const none: [State, State, State, State] = ['no', 'no', 'no', 'no'];

describe('combineReadings', () => {
	it('takes what every page says, and calls disagreement unclear', () => {
		const field = 'termsSignature';
		expect(combineReadings({ readings: [], field })).toBeUndefined();
		expect(
			combineReadings({
				readings: [
					{ field, state: 'yes' },
					{ field, state: 'yes' }
				],
				field
			})
		).toBe('yes');
		expect(
			combineReadings({
				readings: [
					{ field, state: 'yes' },
					{ field, state: 'no' }
				],
				field
			})
		).toBe('unclear');
	});
});

describe('proposePaperChange', () => {
	it('marks signed documents in and takes some ticked uses as partially allowed', () => {
		const { change, notes } = proposePaperChange({
			readings: [
				{ field: 'termsSignature', state: 'yes' },
				...mediaPage(['yes', 'no', 'yes', 'no'], 'yes')
			],
			status: pending,
			confirm: false
		});
		expect(change).toEqual({
			termsAndConditions: 'DONE',
			mediaConsent: 'DONE',
			mediaConsentStatus: 'PARTIALLY_ALLOWED'
		});
		expect(notes).toEqual([]);
	});

	it('never sets anything back, and notes what is missing', () => {
		const { change, notes } = proposePaperChange({
			readings: [
				{ field: 'termsSignature', state: 'no' },
				{ field: 'guardianSignature', state: 'unclear' }
			],
			status: { ...pending, termsAndConditions: 'DONE' },
			confirm: false
		});
		expect(change).toEqual({});
		expect(notes).toEqual([
			{ kind: 'unsigned', document: 'contract' },
			{ kind: 'unclear', document: 'guardianConsent' }
		]);
	});

	it('changes nothing already as read', () => {
		const status: PostalStatus = {
			...pending,
			mediaConsent: 'DONE',
			mediaConsentStatus: 'ALLOWED_ALL'
		};
		expect(
			proposePaperChange({ readings: mediaPage(all, 'yes'), status, confirm: false }).change
		).toEqual({});
	});

	it('takes every use ticked as allowed without restriction, none as not allowed', () => {
		const choice = (boxes: [State, State, State, State]) =>
			proposePaperChange({ readings: mediaPage(boxes, 'yes'), status: pending, confirm: false })
				.change.mediaConsentStatus;
		expect(choice(all)).toBe('ALLOWED_ALL');
		expect(choice(none)).toBe('NOT_ALLOWED');
		expect(choice(['no', 'yes', 'no', 'no'])).toBe('PARTIALLY_ALLOWED');
	});

	it('takes no media choice from an unsigned form, nor with a box unclear or unread', () => {
		expect(
			proposePaperChange({ readings: mediaPage(all, 'no'), status: pending, confirm: true }).change
		).toEqual({});
		const unclear = proposePaperChange({
			readings: mediaPage(['yes', 'unclear', 'no', 'no'], 'yes'),
			status: pending,
			confirm: true
		});
		expect(unclear.change).toEqual({ mediaConsent: 'DONE' });
		expect(unclear.notes).toEqual([{ kind: 'mediaChoiceUnclear' }]);
		const unread = proposePaperChange({
			readings: mediaPage(all, 'yes').slice(1),
			status: pending,
			confirm: true
		});
		expect(unread.notes).toEqual([{ kind: 'mediaChoiceUnclear' }]);
	});

	it('takes a choice signed on an earlier page', () => {
		const readings = mediaPage(none, 'no').slice(0, 4);
		expect(
			proposePaperChange({ readings, status: { ...pending, mediaConsent: 'DONE' }, confirm: false })
				.change
		).toEqual({ mediaConsentStatus: 'NOT_ALLOWED' });
	});

	it('leaves a choice other than the stored one to a person', () => {
		const status: PostalStatus = { ...pending, mediaConsentStatus: 'ALLOWED_ALL' };
		const readings = mediaPage(none, 'yes');
		expect(proposePaperChange({ readings, status, confirm: false })).toEqual({
			change: { mediaConsent: 'DONE' },
			notes: [{ kind: 'mediaChoiceDiffers', read: 'NOT_ALLOWED', stored: 'ALLOWED_ALL' }]
		});
		expect(proposePaperChange({ readings, status, confirm: true }).change).toEqual({
			mediaConsent: 'DONE',
			mediaConsentStatus: 'NOT_ALLOWED'
		});
	});

	it('counts a document signed only with its place and date, where the page has them', () => {
		const signed = (date: FieldReading['state']) =>
			proposePaperChange({
				readings: [
					{ field: 'termsSignature', state: 'yes' },
					{ field: 'termsPlaceDate', state: date }
				],
				status: pending,
				confirm: true
			});
		expect(signed('yes').change).toEqual({ termsAndConditions: 'DONE' });
		expect(signed('no')).toEqual({
			change: {},
			notes: [{ kind: 'undated', document: 'contract' }]
		});
		expect(signed('unclear').notes).toEqual([{ kind: 'unclear', document: 'contract' }]);
	});

	it('takes no media choice from a form signed without place and date', () => {
		const readings = [...mediaPage(all, 'yes'), { field: 'mediaPlaceDate', state: 'no' } as const];
		expect(proposePaperChange({ readings, status: pending, confirm: true })).toEqual({
			change: {},
			notes: [{ kind: 'undated', document: 'mediaConsent' }]
		});
	});
});
