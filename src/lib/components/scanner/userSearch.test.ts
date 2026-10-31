import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	users: vi.fn()
}));

vi.mock('#lib/api/rumbleClient/client', () => ({ client: { query: mocks } }));

import { searchUsers } from './userSearch';

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

describe('searchUsers', () => {
	test('people with a part in the conference come first', async () => {
		const outsider = { id: 'u1', givenName: 'A', familyName: 'B', email: 'a@b.c', ...noRoles };
		const member = {
			id: 'u2',
			givenName: 'C',
			familyName: 'D',
			email: 'c@d.e',
			...noRoles,
			waitingListEntry: { id: 'w1' }
		};
		mocks.users.mockResolvedValue([outsider, member]);

		const found = await searchUsers({ conferenceId: 'conf', term: 'Max' });

		expect(found.map((user) => user.id)).toEqual(['u2', 'u1']);
		expect(mocks.users.mock.calls[0][0].__args.search).toBe('Max');
	});

	test('a term that is too short asks nothing', async () => {
		expect(await searchUsers({ conferenceId: 'conf', term: ' a ' })).toEqual([]);
		expect(mocks.users).not.toHaveBeenCalled();
	});
});
