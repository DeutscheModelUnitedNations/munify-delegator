import { describe, expect, it } from 'vitest';
import { DEFAULT_WEIGHTS } from './autoAssign';
import { weightImpacts } from './weightImpact';

const impactOf = (weights: Partial<typeof DEFAULT_WEIGHTS>, subject: string) =>
	weightImpacts({ ...DEFAULT_WEIGHTS, ...weights }).find((impact) => impact.subject === subject);
const effectsOf = (weights: Partial<typeof DEFAULT_WEIGHTS>, subject: string) =>
	impactOf(weights, subject)?.effects.map(({ effect, tone }) => `${effect}:${tone}`);

describe('weightImpacts', () => {
	it('says flags and experience do nothing with the default weights', () => {
		expect(effectsOf({}, 'flagged')).toEqual(['noEffect:neutral']);
		expect(effectsOf({}, 'experienced')).toEqual(['noEffect:neutral']);
		expect(impactOf({}, 'newcomers')).toBeUndefined();
	});

	it('favours well-rated and disfavours poorly rated groups around the average', () => {
		expect(impactOf({ nullRating: 3 }, 'aboveAverage')?.rating).toBe(3);
		expect(effectsOf({}, 'aboveAverage')).toEqual([
			'seatedFirstPlain:good',
			'wishesWeighMore:good'
		]);
		expect(effectsOf({}, 'belowAverage')).toEqual(['leftOutFirstPlain:bad', 'wishesWeighLess:bad']);
	});

	it('ignores ratings at a factor of 0', () => {
		expect(effectsOf({ ratingFactor: 0 }, 'ratings')).toEqual(['noEffect:neutral']);
		expect(impactOf({ ratingFactor: 0 }, 'aboveAverage')).toBeUndefined();
	});

	it('turns a flag bonus into a benefit and a negative one into a punishment', () => {
		expect(effectsOf({ markBonus: 2 }, 'flagged')).toEqual([
			'seatedFirst:good',
			'noRoleEffect:neutral'
		]);
		expect(effectsOf({ markBonus: -2 }, 'flagged')).toEqual([
			'leftOutFirst:bad',
			'noRoleEffect:neutral'
		]);
	});

	it('lets flags weigh the wishes too when asked to', () => {
		const wishes = { markEffect: 'WISHES_AND_SEATING' as const };
		expect(effectsOf({ markBonus: 2, ...wishes }, 'flagged')).toEqual([
			'seatedFirst:good',
			'wishesWeighMore:good'
		]);
		expect(effectsOf({ markBonus: -2, ...wishes }, 'flagged')).toEqual([
			'leftOutFirst:bad',
			'wishesWeighLess:bad'
		]);
	});

	it('punishes experienced groups and helps newcomers for a positive modifier', () => {
		const weights = { experienceModifier: 0.1, experienceEffect: 'WISHES_AND_SEATING' as const };
		expect(effectsOf(weights, 'experienced')).toEqual(['leftOutFirst:bad', 'wishesWeighLess:bad']);
		expect(effectsOf(weights, 'newcomers')).toEqual(['seatedFirstPlain:good', 'winContested:good']);
		expect(impactOf(weights, 'experienced')?.effects[0].value).toBe(0.1);
	});

	it('rewards experienced groups and sets newcomers back for a negative modifier', () => {
		const weights = { experienceModifier: -2, experienceEffect: 'WISHES_AND_SEATING' as const };
		expect(effectsOf(weights, 'experienced')).toEqual(['seatedFirst:good', 'wishesWeighMore:good']);
		expect(effectsOf(weights, 'newcomers')).toEqual(['leftOutFirstPlain:bad', 'loseContested:bad']);
	});

	it('says the seating-only option leaves the choice of role alone', () => {
		const weights = { experienceModifier: 0.1, experienceEffect: 'SEATING_ONLY' as const };
		expect(effectsOf(weights, 'experienced')).toEqual(['leftOutFirst:bad', 'noRoleEffect:neutral']);
		expect(effectsOf(weights, 'newcomers')).toEqual(['seatedFirstPlain:good']);
	});
});
