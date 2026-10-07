import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	users: vi.fn(),
	delegations: vi.fn(),
	singleParticipants: vi.fn(),
	committees: vi.fn(),
	committeeAgendaItems: vi.fn(),
	paymentTransactions: vi.fn()
}));

vi.mock('$lib/api/rumbleClient/client', () => ({ client: { query: mocks } }));

import { getFullTranslatedCountryNameFromISO3Code } from '$lib/utils/nationTranslationHelper.svelte';
import { searchConference } from './commandPaletteSearch';

const conferenceId = 'conf-1';
const inConference = { conferenceId: { eq: conferenceId } };
const noRoles = {
	teamMember: [],
	conferenceSupervisor: [],
	delegationMemberships: [],
	singleParticipant: [],
	waitingListEntry: []
};

/** The `__args` the mock was last called with. */
function argsOf(mock: ReturnType<typeof vi.fn>, call = 0) {
	return mock.mock.calls[call][0].__args;
}

/**
 * `delegations` is asked twice: for the delegation group and for the seats, whose query is the
 * one that filters with an `OR`. Answers only the one asked for.
 */
function answerDelegations(asked: 'delegations' | 'seats', rows: unknown[]) {
	mocks.delegations.mockImplementation(async ({ __args }) =>
		'OR' in __args.where === (asked === 'seats') ? rows : []
	);
}

beforeEach(() => {
	for (const mock of Object.values(mocks)) mock.mockReset().mockResolvedValue([]);
});

describe('searchConference', () => {
	test('a term that is too short asks nothing', async () => {
		const results = await searchConference(conferenceId, ' a ');
		expect(results).toEqual({
			users: [],
			delegations: [],
			seats: [],
			committees: [],
			foreignUsers: [],
			transactions: []
		});
		for (const mock of Object.values(mocks)) expect(mock).not.toHaveBeenCalled();
	});

	describe('people', () => {
		test('only the first word is searched, the others narrow by name and email', async () => {
			await searchConference(conferenceId, '  anna   schmidt ');

			const [members, foreign] = [argsOf(mocks.users, 0), argsOf(mocks.users, 1)];
			expect(members.search).toBe('anna');
			expect(foreign.search).toBe('anna');

			const narrowing = {
				OR: [
					{ givenName: { ilike: '%schmidt%' } },
					{ familyName: { ilike: '%schmidt%' } },
					{ email: { ilike: '%schmidt%' } }
				]
			};
			expect(members.where.AND[1]).toEqual(narrowing);
			expect(foreign.where.AND[1]).toEqual(narrowing);
		});

		test('a single word adds no narrowing', async () => {
			await searchConference(conferenceId, 'anna');
			expect(argsOf(mocks.users, 0).where.AND).toHaveLength(1);
		});

		test('members are anyone with a part in the conference, waiting list included', async () => {
			await searchConference(conferenceId, 'anna');

			const { OR } = argsOf(mocks.users, 0).where.AND[0];
			expect(OR).toEqual([
				{ delegationMemberships: inConference },
				{ singleParticipant: inConference },
				{ conferenceSupervisor: inConference },
				{ teamMember: inConference },
				{ waitingListEntry: inConference }
			]);
		});

		test('foreign users are the ones without any part', async () => {
			await searchConference(conferenceId, 'anna');

			const participates = argsOf(mocks.users, 0).where.AND[0];
			expect(argsOf(mocks.users, 1).where.AND[0]).toEqual({ NOT: participates });
		});

		test('each result is typed by its role', async () => {
			mocks.users.mockResolvedValueOnce([
				{ id: 'u1', givenName: 'A', familyName: 'B', email: 'a@b.c', ...noRoles, teamMember: [{}] },
				{
					id: 'u2',
					givenName: 'C',
					familyName: 'D',
					email: 'c@d.e',
					...noRoles,
					waitingListEntry: [{}]
				}
			]);
			mocks.users.mockResolvedValueOnce([
				{ id: 'u3', givenName: 'E', familyName: 'F', email: 'e@f.g' }
			]);

			const { users, foreignUsers } = await searchConference(conferenceId, 'anna');

			expect(users.map((user) => [user.id, user.participationType])).toEqual([
				['u1', 'team'],
				['u2', 'waitingList']
			]);
			expect(foreignUsers).toEqual([{ id: 'u3', givenName: 'E', familyName: 'F', email: 'e@f.g' }]);
		});
	});

	describe('seats', () => {
		test('a nation is found by its translated name and searched by code', async () => {
			await searchConference(conferenceId, getFullTranslatedCountryNameFromISO3Code('FRA'));

			const { where } = argsOf(mocks.delegations, 1);
			expect(where.conferenceId).toEqual(inConference.conferenceId);
			expect(where.OR[0].assignedNationAlpha3Code.in).toContain('FRA');
		});

		test('non-state actors are matched by name or abbreviation', async () => {
			await searchConference(conferenceId, 'zzzzqqq');

			const { where } = argsOf(mocks.delegations, 1);
			// No nation resembles the term, so the nation condition is left out entirely
			expect(where.OR).toEqual([
				{
					assignedNonStateActor: {
						OR: [{ name: { ilike: '%zzzzqqq%' } }, { abbreviation: { ilike: '%zzzzqqq%' } }]
					}
				}
			]);
		});

		test('roles are matched by name among the single participants', async () => {
			await searchConference(conferenceId, 'press');

			expect(argsOf(mocks.singleParticipants).where).toEqual({
				...inConference,
				assignedRole: { name: { ilike: '%press%' } }
			});
		});

		test('a delegation seat shows its nation, school and head delegate', async () => {
			answerDelegations('seats', [
				{
					id: 'd1',
					school: 'Gym',
					assignedNationAlpha3Code: 'FRA',
					assignedNonStateActor: null,
					members: [
						{ isHeadDelegate: false, user: { id: 'u1' } },
						{ isHeadDelegate: true, user: { id: 'u2' } }
					]
				}
			]);

			const { seats } = await searchConference(conferenceId, 'frankreich');

			expect(seats).toEqual([
				{
					id: 'd1',
					title: getFullTranslatedCountryNameFromISO3Code('FRA'),
					subtitle: 'Gym',
					holderUserId: 'u2'
				}
			]);
		});

		test('a delegation seat without a nation is named after its non-state actor, or its id', async () => {
			const base = { school: null, assignedNationAlpha3Code: null, members: [] };
			answerDelegations('seats', [
				{ ...base, id: 'd1', assignedNonStateActor: { name: 'Red Cross' } },
				{ ...base, id: 'd2', assignedNonStateActor: null }
			]);

			const { seats } = await searchConference(conferenceId, 'cross');

			expect(seats.map((seat) => [seat.title, seat.holderUserId])).toEqual([
				['Red Cross', null],
				['d2', null]
			]);
		});

		test('a single participant seat shows its role and its holder', async () => {
			mocks.singleParticipants.mockResolvedValueOnce([
				{
					id: 's1',
					assignedRole: { name: 'Press' },
					user: { id: 'u7', givenName: 'Ada', familyName: 'Lovelace' }
				}
			]);

			const { seats } = await searchConference(conferenceId, 'press');

			expect(seats).toEqual([
				{ id: 's1', title: 'Press', subtitle: 'Ada Lovelace', holderUserId: 'u7' }
			]);
		});
	});

	describe('committees', () => {
		test('committees come before their agenda items, both searched by rumble', async () => {
			mocks.committees.mockResolvedValueOnce([
				{ id: 'c1', name: 'Security Council', abbreviation: 'SC' }
			]);
			mocks.committeeAgendaItems.mockResolvedValueOnce([
				{ id: 'a1', title: 'Sanctions', committee: { abbreviation: 'SC' } }
			]);

			const { committees } = await searchConference(conferenceId, 'sec');

			expect(argsOf(mocks.committees).search).toBe('sec');
			expect(argsOf(mocks.committeeAgendaItems).where).toEqual({ committee: inConference });
			expect(committees).toEqual([
				{ id: 'c1', title: 'Security Council', subtitle: 'SC' },
				{ id: 'a1', title: 'Sanctions', subtitle: 'SC' }
			]);
		});
	});

	describe('transactions and delegations', () => {
		test('transactions carry their currency, EUR when the conference has none', async () => {
			const received = new Date('2026-03-01T10:00:00Z');
			mocks.paymentTransactions.mockResolvedValueOnce([
				{ id: 't1', amount: 10, recievedAt: received, conference: { currency: 'USD' } },
				{ id: 't2', amount: 5, recievedAt: null, conference: { currency: null } }
			]);

			const { transactions } = await searchConference(conferenceId, 'ref');

			expect(transactions).toEqual([
				{ id: 't1', amount: 10, currency: 'USD', recievedAt: received.toISOString() },
				{ id: 't2', amount: 5, currency: 'EUR', recievedAt: null }
			]);
		});

		test('delegations report their size and head delegate', async () => {
			answerDelegations('delegations', [
				{
					id: 'd1',
					school: 'Gym',
					assignedNationAlpha3Code: null,
					assignedNonStateActor: null,
					members: [
						{ isHeadDelegate: true, user: { id: 'u1' } },
						{ isHeadDelegate: false, user: { id: 'u2' } }
					]
				}
			]);

			const { delegations } = await searchConference(conferenceId, 'gym');

			expect(delegations).toEqual([
				{ id: 'd1', school: 'Gym', memberCount: 2, headDelegateUserId: 'u1' }
			]);
		});
	});
});
