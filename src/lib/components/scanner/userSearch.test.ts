import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	users: vi.fn(),
	conferenceParticipantStatuses: vi.fn()
}));

vi.mock('$lib/api/rumbleClient/client', () => ({ client: { query: mocks } }));

import { resolveScannedCode, searchUsers } from './userSearch';

const noRoles = {
	teamMember: null,
	conferenceSupervisor: null,
	delegationMemberships: [],
	singleParticipant: null,
	waitingListEntry: null
};

beforeEach(() => {
	for (const mock of Object.values(mocks)) mock.mockReset().mockResolvedValue([]);
});

describe('resolveScannedCode', () => {
	test('a card number leads to its owner', async () => {
		mocks.conferenceParticipantStatuses.mockResolvedValue([{ userId: 'u1' }]);

		expect(await resolveScannedCode('conf', 'CARD-0003')).toBe('u1');
		expect(mocks.conferenceParticipantStatuses.mock.calls[0][0].__args.where).toEqual({
			conferenceId: { eq: 'conf' },
			accessCardId: { eq: 'CARD-0003' }
		});
	});

	test('a code that is no card stays as it is', async () => {
		expect(await resolveScannedCode('conf', 'short')).toBe('short');
	});

	test('a user id is never looked up', async () => {
		const id = 'abcdefghijklmnopqrstu';
		expect(await resolveScannedCode('conf', id)).toBe(id);
		expect(mocks.conferenceParticipantStatuses).not.toHaveBeenCalled();
	});

	test('a lookup that fails, e.g. offline, leaves the code as it is', async () => {
		mocks.conferenceParticipantStatuses.mockRejectedValue(new TypeError('Failed to fetch'));
		expect(await resolveScannedCode('conf', 'CARD-0003')).toBe('CARD-0003');
	});
});

describe('searchUsers', () => {
	test('the owner of a matching card comes first, once', async () => {
		const owner = { id: 'u1', givenName: 'A', familyName: 'B', email: 'a@b.c', ...noRoles };
		const other = { id: 'u2', givenName: 'C', familyName: 'D', email: 'c@d.e', ...noRoles };
		mocks.conferenceParticipantStatuses.mockResolvedValue([{ user: owner }]);
		mocks.users.mockResolvedValue([other, owner]);

		const found = await searchUsers('conf', 'CARD-0003');

		expect(found.map((user) => user.id)).toEqual(['u1', 'u2']);
		expect(mocks.conferenceParticipantStatuses.mock.calls[0][0].__args.where.accessCardId).toEqual({
			ilike: '%CARD-0003%'
		});
	});

	test('a term that is too short asks nothing', async () => {
		expect(await searchUsers('conf', ' a ')).toEqual([]);
		expect(mocks.users).not.toHaveBeenCalled();
	});
});
