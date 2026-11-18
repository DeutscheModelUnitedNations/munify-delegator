// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const findPreferences = vi.fn();

vi.mock('#api/db/db', () => ({
	db: { query: { notificationPreference: { findMany: findPreferences } } },
	schema: {}
}));

const { preferencesOfMembers, workspacesOfConferences } = await import('./notificationStore');

const row = (teamMemberId: string, channel: 'EMAIL' | 'SLACK', enabled: boolean) => ({
	teamMemberId,
	topic: 'PARTICIPANT_CARE' as const,
	teamFunctionId: null,
	channel,
	enabled
});

describe('preferencesOfMembers', () => {
	beforeEach(() => findPreferences.mockReset());

	test('groups the stored choices by member', async () => {
		findPreferences.mockResolvedValue([
			row('tm1', 'EMAIL', false),
			row('tm2', 'SLACK', false),
			row('tm1', 'SLACK', true)
		]);
		const byMember = await preferencesOfMembers({ teamMemberIds: ['tm1', 'tm2', 'tm3'] });
		expect(byMember.get('tm1')).toEqual([
			{ topic: 'PARTICIPANT_CARE', teamFunctionId: null, channel: 'EMAIL', enabled: false },
			{ topic: 'PARTICIPANT_CARE', teamFunctionId: null, channel: 'SLACK', enabled: true }
		]);
		expect(byMember.get('tm2')).toHaveLength(1);
		// somebody without a stored choice has no entry: the defaults hold
		expect(byMember.has('tm3')).toBe(false);
		expect(findPreferences.mock.calls[0]?.[0].where).toEqual({
			teamMemberId: { in: ['tm1', 'tm2', 'tm3'] }
		});
	});

	test('narrows to one channel when asked', async () => {
		findPreferences.mockResolvedValue([]);
		await preferencesOfMembers({ teamMemberIds: ['tm1'], channel: 'SLACK' });
		expect(findPreferences.mock.calls[0]?.[0].where).toEqual({
			teamMemberId: { in: ['tm1'] },
			channel: 'SLACK'
		});
	});

	test('asks nothing for nobody', async () => {
		expect((await preferencesOfMembers({ teamMemberIds: [] })).size).toBe(0);
		expect((await workspacesOfConferences([])).size).toBe(0);
		expect(findPreferences).not.toHaveBeenCalled();
	});
});
