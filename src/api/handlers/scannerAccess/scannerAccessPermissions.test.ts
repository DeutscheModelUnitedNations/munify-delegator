import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mayDeliver } from './scannerAccessPermissions';

const { isAccountActive } = vi.hoisted(() => ({ isAccountActive: vi.fn() }));
vi.mock('#api/services/oidc/managementApi', () => ({ isAccountActive }));
vi.mock('#api/db/db', () => ({ db: {}, schema: {} }));
vi.mock('#api/services/authHelper/rules', () => ({
	assertTeamPermission: vi.fn(),
	hasTeamPermission: vi.fn()
}));
vi.mock('#api/services/authHelper/utils', () => ({ callerUserId: vi.fn() }));

const deliverer = {
	accessId: 'access',
	accessName: 'Copier',
	teamMemberId: 'member',
	userId: 'ada',
	conferenceId: 'conf',
	role: 'PARTICIPANT_CARE',
	expiresAt: new Date(Date.now() + 60_000)
};

beforeEach(() => isAccountActive.mockResolvedValue(true));

describe('mayDeliver', () => {
	test('lets in whoever manages the participants', async () => {
		expect(await mayDeliver(deliverer)).toBe(true);
		expect(await mayDeliver({ ...deliverer, role: 'PROJECT_MANAGEMENT' })).toBe(true);
		expect(await mayDeliver({ ...deliverer, role: 'MEMBER' })).toBe(false);
	});

	test('keeps out an expired login and a suspended account', async () => {
		expect(await mayDeliver({ ...deliverer, expiresAt: new Date(Date.now() - 1) })).toBe(false);
		isAccountActive.mockResolvedValue(false);
		expect(await mayDeliver(deliverer)).toBe(false);
	});
});
