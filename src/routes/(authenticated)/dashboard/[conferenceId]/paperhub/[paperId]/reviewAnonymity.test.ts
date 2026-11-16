import { describe, expect, it } from 'vitest';
import {
	anonymityArgs,
	DEFAULT_REVIEW_ANONYMITY,
	REVIEW_ANONYMOUS_NAME_MAX,
	reviewAnonymityComplete,
	reviewAnonymityName,
	storedReviewAnonymity
} from './reviewAnonymity';

describe('storedReviewAnonymity', () => {
	it('keeps a valid choice', () => {
		expect(storedReviewAnonymity({ anonymous: true, as: 'CUSTOM', name: 'Vorsitz' })).toEqual({
			anonymous: true,
			as: 'CUSTOM',
			name: 'Vorsitz'
		});
	});

	it('falls back to signing by name for anything but a stored object', () => {
		for (const stored of [null, undefined, 'SECRETARIAT', 1, true]) {
			expect(storedReviewAnonymity(stored)).toEqual(DEFAULT_REVIEW_ANONYMITY);
		}
	});

	it('replaces each unknown part on its own', () => {
		expect(storedReviewAnonymity({ anonymous: true, as: 'PRESIDENT' })).toEqual({
			anonymous: true,
			as: 'SECRETARIAT',
			name: ''
		});
		expect(storedReviewAnonymity({ anonymous: 'yes', as: 'RESEARCH_SERVICE', name: 3 })).toEqual({
			anonymous: false,
			as: 'RESEARCH_SERVICE',
			name: ''
		});
	});
});

describe('anonymityArgs', () => {
	it('sends the team name only while anonymous', () => {
		expect(anonymityArgs({ anonymous: true, as: 'RESEARCH_SERVICE', name: 'Vorsitz' })).toEqual({
			anonymousAs: 'RESEARCH_SERVICE',
			anonymousName: undefined
		});
		expect(anonymityArgs({ anonymous: false, as: 'CUSTOM', name: 'Vorsitz' })).toEqual({
			anonymousAs: undefined,
			anonymousName: undefined
		});
	});

	it('sends the trimmed custom name with CUSTOM', () => {
		expect(anonymityArgs({ anonymous: true, as: 'CUSTOM', name: '  Vorsitz GV ' })).toEqual({
			anonymousAs: 'CUSTOM',
			anonymousName: 'Vorsitz GV'
		});
	});
});

describe('reviewAnonymityComplete', () => {
	it('asks for a custom name, and one short enough', () => {
		expect(reviewAnonymityComplete({ anonymous: true, as: 'CUSTOM', name: '   ' })).toBe(false);
		expect(
			reviewAnonymityComplete({
				anonymous: true,
				as: 'CUSTOM',
				name: 'x'.repeat(REVIEW_ANONYMOUS_NAME_MAX + 1)
			})
		).toBe(false);
		expect(reviewAnonymityComplete({ anonymous: true, as: 'CUSTOM', name: 'Vorsitz' })).toBe(true);
	});

	it('needs nothing typed for a team name or when signing by name', () => {
		expect(reviewAnonymityComplete({ anonymous: true, as: 'SECRETARIAT', name: '' })).toBe(true);
		expect(reviewAnonymityComplete({ anonymous: false, as: 'CUSTOM', name: '' })).toBe(true);
	});
});

describe('reviewAnonymityName', () => {
	it('is the typed name for CUSTOM and nothing when signing by name', () => {
		expect(reviewAnonymityName({ anonymous: true, as: 'CUSTOM', name: ' Vorsitz ' })).toBe(
			'Vorsitz'
		);
		expect(
			reviewAnonymityName({ anonymous: false, as: 'CUSTOM', name: 'Vorsitz' })
		).toBeUndefined();
	});
});
