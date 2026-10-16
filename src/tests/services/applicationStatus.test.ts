import { describe, expect, it } from 'vitest';
import { getApplicationStatus } from '$lib/services/applicationStatus';

describe('getApplicationStatus', () => {
	it('hides an existing assignment while registration is running', () => {
		expect(getApplicationStatus(true, true, true)).toBe('applied');
	});

	it('reports an incomplete application as pending', () => {
		expect(getApplicationStatus(true, false, false)).toBe('pending');
		expect(getApplicationStatus(false, false, false)).toBe('pending');
	});

	it('reveals the assignment after registration', () => {
		expect(getApplicationStatus(false, true, true)).toBe('accepted');
		expect(getApplicationStatus(false, true, false)).toBe('accepted');
	});

	it('reports an unassigned application as rejected after registration', () => {
		expect(getApplicationStatus(false, false, true)).toBe('rejected');
	});
});
