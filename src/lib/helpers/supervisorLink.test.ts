import { describe, expect, it } from 'vitest';
import { linkedSupervisorCode, supervisorConnectionLink } from './supervisorLink';

describe('supervisorConnectionLink', () => {
	it('opens the dashboard at the supervisor section with the code filled in', () => {
		const link = supervisorConnectionLink({
			origin: 'https://delegator.example',
			conferenceId: 'conf-1',
			connectionCode: 'BCDFGHJK'
		});
		expect(link).toBe(
			'https://delegator.example/dashboard/conf-1?supervisorCode=BCDFGHJK#supervisors'
		);
	});

	it('round-trips the code', () => {
		const link = supervisorConnectionLink({
			origin: 'https://delegator.example',
			conferenceId: 'conf-1',
			connectionCode: 'BCDFGHJK'
		});
		expect(linkedSupervisorCode(new URL(link))).toBe('BCDFGHJK');
	});

	it('reads no code from a page opened without one', () => {
		expect(linkedSupervisorCode(new URL('https://delegator.example/dashboard/conf-1'))).toBe('');
		expect(
			linkedSupervisorCode(new URL('https://delegator.example/dashboard/conf-1?supervisorCode=%20'))
		).toBe('');
	});
});
