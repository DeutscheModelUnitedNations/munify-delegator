import { describe, expect, test } from 'vitest';
import type { RegistrationStatus } from '#lib/utils/registrationStatus.js';
import { registrationRedirect } from './registrationGuard';

describe('registrationRedirect', () => {
	test('lets everyone in while registration is open', () => {
		expect(registrationRedirect('OPEN', '/registration/c1/individual', 'c1')).toBeUndefined();
	});

	test('sends everyone to the dashboard while registration is shut', () => {
		const shut: RegistrationStatus[] = ['CLOSED', 'NOT_YET_OPEN', 'UNKNOWN'];
		for (const status of shut) {
			expect(registrationRedirect(status, '/registration/c1', 'c1')).toBe('/dashboard/c1');
		}
	});

	test('only leaves the waiting list open during the preparation', () => {
		expect(registrationRedirect('WAITING_LIST', '/registration/c1/individual', 'c1')).toBe(
			'/registration/c1/waiting-list'
		);
		expect(
			registrationRedirect('WAITING_LIST', '/registration/c1/waiting-list', 'c1')
		).toBeUndefined();
	});
});
