import { describe, expect, it } from 'vitest';
import { loginUrl } from './loginRedirect';

describe('loginUrl', () => {
	it('returns to the page, query and fragment included', () => {
		expect(loginUrl({ pathname: '/dashboard/c1/team', search: '?tab=2', hash: '#x' })).toBe(
			'/login?next=%2Fdashboard%2Fc1%2Fteam%3Ftab%3D2%23x'
		);
	});
});
