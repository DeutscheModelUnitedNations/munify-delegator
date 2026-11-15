import { describe, expect, it } from 'vitest';
import { anonymousAsArg, DEFAULT_REVIEW_ANONYMITY, storedReviewAnonymity } from './reviewAnonymity';

describe('storedReviewAnonymity', () => {
	it('keeps a valid choice', () => {
		expect(storedReviewAnonymity({ anonymous: true, as: 'RESEARCH_SERVICE' })).toEqual({
			anonymous: true,
			as: 'RESEARCH_SERVICE'
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
			as: 'SECRETARIAT'
		});
		expect(storedReviewAnonymity({ anonymous: 'yes', as: 'RESEARCH_SERVICE' })).toEqual({
			anonymous: false,
			as: 'RESEARCH_SERVICE'
		});
	});
});

describe('anonymousAsArg', () => {
	it('sends the team name only while anonymous', () => {
		expect(anonymousAsArg({ anonymous: true, as: 'RESEARCH_SERVICE' })).toBe('RESEARCH_SERVICE');
		expect(anonymousAsArg({ anonymous: false, as: 'RESEARCH_SERVICE' })).toBeUndefined();
	});
});
