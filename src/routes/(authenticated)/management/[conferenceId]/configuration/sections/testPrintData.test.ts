import { describe, expect, test } from 'vitest';
import { templateOrDefault, testPrintParticipant, testPrintRecipient } from './testPrintData';

describe('testPrintRecipient', () => {
	test('uses the entered postal address', () => {
		expect(
			testPrintRecipient({
				postalName: 'DMUN e.V.',
				postalStreet: 'Main street 1',
				postalZip: '24103',
				postalCity: 'Kiel',
				postalCountry: 'Germany'
			})
		).toEqual({
			name: 'DMUN e.V.',
			address: 'Main street 1',
			zip: '24103',
			city: 'Kiel',
			country: 'Germany'
		});
	});

	test('marks missing parts as not set', () => {
		expect(testPrintRecipient({ postalCity: 'Kiel' })).toEqual({
			name: 'Not set',
			address: 'Not set',
			zip: 'Not set',
			city: 'Kiel',
			country: 'Not set'
		});
	});
});

describe('testPrintParticipant', () => {
	test('is a fixed sample participant', () => {
		const participant = testPrintParticipant();
		expect(participant.id).toHaveLength(24);
		expect(participant.name.toUpperCase()).toBe(participant.name);
		expect(participant.name).toContain('GUTERRES');
		expect(participant.birthday).toBe(new Date('1949-04-30').toLocaleDateString());
	});
});

describe('templateOrDefault', () => {
	test('turns a missing template into undefined', () => {
		expect(templateOrDefault(null)).toBeUndefined();
		expect(templateOrDefault(undefined)).toBeUndefined();
		expect(templateOrDefault('<p>x</p>')).toBe('<p>x</p>');
	});
});
