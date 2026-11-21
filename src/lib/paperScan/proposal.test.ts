import { describe, expect, it } from 'vitest';
import { combineReadings, proposePaperChange, type PostalStatus } from './proposal';
import type { FieldReading } from './readPaper';

const pending: PostalStatus = {
	termsAndConditions: 'PENDING',
	guardianConsent: 'PENDING',
	mediaConsent: 'PENDING',
	mediaConsentStatus: 'NOT_SET'
};

const mediaPage = (
	all: FieldReading['state'],
	partial: FieldReading['state'],
	none: FieldReading['state'],
	signed: FieldReading['state']
): FieldReading[] => [
	{ field: 'mediaAll', state: all },
	{ field: 'mediaPartial', state: partial },
	{ field: 'mediaNone', state: none },
	{ field: 'mediaSignature', state: signed }
];

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
	it('marks signed documents in and takes the one ticked media choice', () => {
		const { change, notes } = proposePaperChange({
			readings: [{ field: 'termsSignature', state: 'yes' }, ...mediaPage('no', 'yes', 'no', 'yes')],
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
			proposePaperChange({ readings: mediaPage('yes', 'no', 'no', 'yes'), status, confirm: false })
				.change
		).toEqual({});
	});

	it('takes no media choice from an unsigned form, nor one of two ticked boxes', () => {
		expect(
			proposePaperChange({
				readings: mediaPage('yes', 'no', 'no', 'no'),
				status: pending,
				confirm: true
			}).change
		).toEqual({});
		const twoTicked = proposePaperChange({
			readings: mediaPage('yes', 'yes', 'no', 'yes'),
			status: pending,
			confirm: true
		});
		expect(twoTicked.change).toEqual({ mediaConsent: 'DONE' });
		expect(twoTicked.notes).toEqual([{ kind: 'mediaChoiceUnclear' }]);
	});

	it('takes a choice signed on an earlier page', () => {
		const readings = mediaPage('no', 'no', 'yes', 'no').slice(0, 3);
		expect(
			proposePaperChange({ readings, status: { ...pending, mediaConsent: 'DONE' }, confirm: false })
				.change
		).toEqual({ mediaConsentStatus: 'NOT_ALLOWED' });
	});

	it('leaves a choice other than the stored one to a person', () => {
		const status: PostalStatus = { ...pending, mediaConsentStatus: 'ALLOWED_ALL' };
		const readings = mediaPage('no', 'no', 'yes', 'yes');
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
		const readings = [
			...mediaPage('yes', 'no', 'no', 'yes'),
			{ field: 'mediaPlaceDate', state: 'no' } as const
		];
		expect(proposePaperChange({ readings, status: pending, confirm: true })).toEqual({
			change: {},
			notes: [{ kind: 'undated', document: 'mediaConsent' }]
		});
	});
});
