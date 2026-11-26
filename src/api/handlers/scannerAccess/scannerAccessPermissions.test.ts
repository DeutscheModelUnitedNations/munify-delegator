import { beforeEach, describe, expect, test, vi } from 'vitest';
import { conferencesToDeliverInto, mayDeliver } from './scannerAccessPermissions';

const { isAccountActive, findMany } = vi.hoisted(() => ({
	isAccountActive: vi.fn(),
	findMany: vi.fn()
}));
vi.mock('#api/services/oidc/managementApi', () => ({ isAccountActive }));
vi.mock('#api/db/db', () => ({ db: { query: { teamMember: { findMany } } }, schema: {} }));
vi.mock('#api/services/authHelper/utils', () => ({ callerUserId: vi.fn() }));

const deliverer = { userId: 'ada', expiresAt: new Date(Date.now() + 60_000) };
const membership = ({ conferenceId, starts }: { conferenceId: string; starts: string }) => ({
	id: `${conferenceId}-member`,
	conferenceId,
	conference: { startConference: new Date(starts) }
});

beforeEach(() => {
	isAccountActive.mockResolvedValue(true);
	findMany.mockResolvedValue([
		membership({ conferenceId: 'old', starts: '2025-05-01' }),
		membership({ conferenceId: 'new', starts: '2026-05-01' })
	]);
});

describe('conferencesToDeliverInto', () => {
	test('are those whose participants somebody manages, the latest first', async () => {
		expect(await conferencesToDeliverInto('ada')).toEqual([
			{ conferenceId: 'new', teamMemberId: 'new-member' },
			{ conferenceId: 'old', teamMemberId: 'old-member' }
		]);
		const [{ where }] = findMany.mock.lastCall ?? [];
		expect(where.userId).toBe('ada');
		expect([...where.role.in].sort()).toEqual(['PARTICIPANT_CARE', 'PROJECT_MANAGEMENT']);
	});
});

describe('mayDeliver', () => {
	test('lets in whoever manages the participants of some conference', async () => {
		expect(await mayDeliver(deliverer)).toBe(true);
		findMany.mockResolvedValue([]);
		expect(await mayDeliver(deliverer)).toBe(false);
	});

	test('keeps out an expired login and a suspended account', async () => {
		expect(await mayDeliver({ ...deliverer, expiresAt: new Date(Date.now() - 1) })).toBe(false);
		isAccountActive.mockResolvedValue(false);
		expect(await mayDeliver(deliverer)).toBe(false);
	});
});
