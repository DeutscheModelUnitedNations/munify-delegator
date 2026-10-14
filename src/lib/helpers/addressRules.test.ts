import { describe, expect, it } from 'vitest';
import { addressIssues, addressRules } from './addressRules';

describe('addressRules', () => {
	it('knows that German addresses need a postal code and city but no region', () => {
		const rules = addressRules('DEU');
		expect(rules.zip).toBe('required');
		expect(rules.city).toBe('required');
		expect(rules.region).toBeUndefined();
	});

	it('knows that US addresses need a state, and which states there are', () => {
		const rules = addressRules('USA');
		expect(rules.region).toBe('required');
		expect(rules.regions).toContainEqual({ value: 'CA', label: 'California' });
	});
});

describe('addressIssues', () => {
	it('accepts a complete German address', () => {
		expect(addressIssues({ zip: '10115', city: 'Berlin', country: 'DEU' })).toEqual([]);
	});

	it('flags a postal code in the wrong format', () => {
		expect(addressIssues({ zip: '1011', city: 'Berlin', country: 'DEU' })).toEqual([
			{ path: 'zip', kind: 'invalid' }
		]);
	});

	it('flags a missing or unknown US state', () => {
		expect(addressIssues({ zip: '94103', city: 'San Francisco', country: 'USA' })).toEqual([
			{ path: 'region', kind: 'missing' }
		]);
		expect(
			addressIssues({ zip: '94103', city: 'San Francisco', region: 'XX', country: 'USA' })
		).toEqual([{ path: 'region', kind: 'invalid' }]);
		expect(
			addressIssues({ zip: '94103', city: 'San Francisco', region: 'ca', country: 'USA' })
		).toEqual([]);
	});
});
