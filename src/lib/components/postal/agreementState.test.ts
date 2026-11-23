import { describe, expect, test } from 'vitest';
import { agreementStateOf, selectedState } from './agreementState';

describe('agreementStateOf', () => {
	test('answers the state of an option, and none for the empty or an unknown one', () => {
		expect(agreementStateOf('yes')).toBe('yes');
		expect(agreementStateOf('unclear')).toBe('unclear');
		expect(agreementStateOf('')).toBeNull();
		expect(agreementStateOf('maybe')).toBeNull();
	});
});

describe('selectedState', () => {
	test('answers the option of a state, and the empty one without one', () => {
		expect(selectedState('no')).toBe('no');
		expect(selectedState(undefined)).toBe('');
	});
});
