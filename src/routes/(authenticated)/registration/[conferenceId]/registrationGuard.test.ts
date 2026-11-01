import { describe, expect, test } from 'vitest';
import type { RegistrationStatus } from '#lib/utils/registrationStatus';
import { registrationRedirect } from './registrationGuard';

describe('registrationRedirect', () => {
	test('lets everyone in while registration is open', () => {
		expect(
			registrationRedirect({
				status: 'OPEN',
				pathname: '/registration/c1/individual',
				conferenceId: 'c1'
			})
		).toBeUndefined();
	});

	test('sends everyone to the dashboard while registration is shut', () => {
		const shut: RegistrationStatus[] = ['CLOSED', 'NOT_YET_OPEN', 'UNKNOWN'];
		for (const status of shut) {
			expect(
				registrationRedirect({ status, pathname: '/registration/c1', conferenceId: 'c1' })
			).toBe('/dashboard/c1');
		}
	});

	test('only leaves the waiting list open during the preparation', () => {
		expect(
			registrationRedirect({
				status: 'WAITING_LIST',
				pathname: '/registration/c1/individual',
				conferenceId: 'c1'
			})
		).toBe('/registration/c1/waiting-list');
		expect(
			registrationRedirect({
				status: 'WAITING_LIST',
				pathname: '/registration/c1/waiting-list',
				conferenceId: 'c1'
			})
		).toBeUndefined();
	});
});
