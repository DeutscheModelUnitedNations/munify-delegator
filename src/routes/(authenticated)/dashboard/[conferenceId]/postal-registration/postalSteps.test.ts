import { describe, expect, test } from 'vitest';
import { postalSteps } from './postalSteps';

const DONE = {
	read: true,
	details: '0000000a',
	confirmedDetails: '0000000a',
	ofAge: false,
	confirmedOfAge: false,
	hintsSeen: true
};

describe('postalSteps', () => {
	test('opens one step after the other, the done ones staying above it', () => {
		const nothing = {
			...DONE,
			read: false,
			confirmedDetails: undefined,
			confirmedOfAge: undefined
		};
		expect(postalSteps({ ...nothing, hintsSeen: false }).shown).toEqual([
			{ step: 'info', number: 1, done: false }
		]);
		expect(postalSteps({ ...DONE, confirmedDetails: undefined }).open).toBe('details');
		expect(postalSteps({ ...DONE, confirmedOfAge: undefined }).open).toBe('age');
		expect(postalSteps({ ...DONE, hintsSeen: false }).open).toBe('hints');
		expect(postalSteps(DONE).shown).toEqual([
			{ step: 'info', number: 1, done: true },
			{ step: 'details', number: 2, done: true },
			{ step: 'age', number: 3, done: true },
			{ step: 'hints', number: 4, done: true },
			{ step: 'send', number: 5, done: false }
		]);
	});

	test('asks again once what was confirmed has changed', () => {
		expect(postalSteps({ ...DONE, details: '0000000b' }).open).toBe('details');
		expect(postalSteps({ ...DONE, ofAge: true }).open).toBe('age');
	});

	test('missing details cannot be confirmed', () => {
		expect(postalSteps({ ...DONE, details: undefined, confirmedDetails: undefined }).open).toBe(
			'details'
		);
	});

	test('leaves out the age where it is not known', () => {
		const { shown } = postalSteps({ ...DONE, ofAge: undefined, confirmedOfAge: undefined });
		expect(shown.map(({ step }) => step)).toEqual(['info', 'details', 'hints', 'send']);
		expect(shown.at(-1)?.number).toBe(4);
	});
});
