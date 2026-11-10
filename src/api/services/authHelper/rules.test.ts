import { describe, expect, test, vi } from 'vitest';
import type { Context } from '#api/context';
import { createCallerFactsCache } from './callerFactsCache';
import type { CallerFacts } from './callerFacts';

vi.mock('#api/db/db', () => ({ db: {} }));

const {
	anyOf,
	hasPartIn,
	hasPartInConference,
	hasTeamPermission,
	hop,
	isCaredForUser,
	isInOwnDelegation,
	isOwnParticipation,
	isOwnUser,
	isParticipantOf,
	isParticipantOfConference,
	isTeamMemberOf,
	isTeamMemberOfConference,
	NOTHING,
	readableConference,
	readableConferenceRows,
	releasedIds,
	supervisedDelegationIds,
	systemAdmin,
	teamConference
} = await import('./rules');
const { grantWhere } = await import('./utils');
const { NO_CALLER_FACTS } = await import('./callerFacts');

/** Just enough of a request context for the filter builders, which read only these parts. */
function contextFor(
	sub: string | undefined,
	roles: string[] = [],
	mcp: Context['mcp'] = undefined
): Context {
	const ctx: Pick<Context, 'hasRole' | 'oidc' | 'mcp' | 'callerFactsCache' | 'mustBeLoggedIn'> = {
		mcp,
		hasRole: (role) => roles.includes(role),
		callerFactsCache: createCallerFactsCache(),
		mustBeLoggedIn: () => {
			if (!sub) throw new Error('not logged in');
			return { sub, email: undefined, OIDCRoleNames: [], hasRole: () => false };
		},
		oidc: {
			user: sub
				? {
						sub,
						email: `${sub}@example.org`,
						OIDCRoleNames: [],
						hasRole: () => false
					}
				: undefined,
			claims: {},
			impersonator: undefined
		}
	};
	// TYPE-SAFETY-EXCEPTION: the filter builders never touch the rest of the context (the request
	// event, the URL), and building a real RequestEvent here would test SvelteKit, not them.
	return ctx as Context;
}

/** The facts of a caller, with `parts` of them filled in. */
function factsWith(parts: Partial<CallerFacts> = {}): CallerFacts {
	return { ...NO_CALLER_FACTS, ...parts };
}

const anonymous = contextFor(undefined);
const user = contextFor('u1');
const admin = contextFor('a1', ['admin']);
const none = factsWith();

/** A caller reviewing in c1, a plain member in c2 and participant care in c3. */
const teamFacts = factsWith({
	team: [
		{ conferenceId: 'c1', roles: ['REVIEWER'] },
		{ conferenceId: 'c2', roles: ['MEMBER'] },
		{ conferenceId: 'c3', roles: ['PARTICIPANT_CARE'] }
	]
});

describe('filters grant nothing to anonymous requests', () => {
	const args = { ctx: anonymous, facts: none };
	test.each([
		['isTeamMemberOf', () => isTeamMemberOf(args)],
		['isTeamMemberOfConference', () => isTeamMemberOfConference(args)],
		['isOwnUser', () => isOwnUser(anonymous)],
		['isOwnParticipation', () => isOwnParticipation(args)],
		['isInOwnDelegation', () => isInOwnDelegation(args)],
		['isParticipantOfConference', () => isParticipantOfConference(args)],
		['isCaredForUser', () => isCaredForUser(args)],
		['hasPartIn', () => hasPartIn(args)]
	])('%s', (_name, filter) => {
		expect(filter()).toBeUndefined();
	});

	test('systemAdmin', () => {
		expect(systemAdmin(anonymous)).toBeUndefined();
		expect(systemAdmin(user)).toBeUndefined();
		expect(systemAdmin(admin)).toBe('allow');
	});

	test('but the public conferences', () => {
		const facts = factsWith({ publicConferenceIds: ['p1'] });
		expect(readableConference({ ctx: anonymous, facts })).toEqual({ id: { in: ['p1'] } });
	});
});

describe('team filters', () => {
	test('match the conferences of the caller’s team, on the rows’ own columns', () => {
		const args = { ctx: user, facts: teamFacts };
		expect(isTeamMemberOf(args)).toEqual({ id: { in: ['c1', 'c2', 'c3'] } });
		expect(isTeamMemberOf({ ...args, roles: ['REVIEWER'] })).toEqual({ id: { in: ['c1'] } });
		expect(isTeamMemberOfConference({ ...args, roles: ['REVIEWER', 'MEMBER'] })).toEqual({
			conferenceId: { in: ['c1', 'c2'] }
		});
	});

	test('an empty team matches no row, never every row', () => {
		expect(isTeamMemberOf({ ctx: user, facts: none })).toEqual({ id: { in: [] } });
		expect(
			isTeamMemberOfConference({ ctx: user, facts: teamFacts, roles: ['CONTENT_LEAD'] })
		).toEqual({ conferenceId: { in: [] } });
	});

	test('let a system admin through every team, on or off it', () => {
		expect(isTeamMemberOf({ ctx: admin, facts: none, roles: ['PROJECT_MANAGEMENT'] })).toEqual({});
		expect(isTeamMemberOfConference({ ctx: admin, facts: none })).toEqual({});
		expect(isCaredForUser({ ctx: admin, facts: none })).toEqual({});
	});

	test('hasTeamPermission and teamConference answer from the facts', async () => {
		const ctx = contextFor('u1');
		ctx.callerFactsCache.loading = Promise.resolve(teamFacts);
		const check = (conferenceId: string, permission: 'manageParticipants' | 'useTeamTools') =>
			hasTeamPermission({ ctx, conferenceId, permission });
		expect(await check('c3', 'manageParticipants')).toBe(true);
		expect(await check('c2', 'manageParticipants')).toBe(false);
		expect(await check('c2', 'useTeamTools')).toBe(true);
		expect(await check('c9', 'useTeamTools')).toBe(false);
		expect(await teamConference({ ctx, permission: 'manageParticipants' })).toEqual({
			id: { in: ['c3'] }
		});
		const outsider = contextFor('u2');
		outsider.callerFactsCache.loading = Promise.resolve(none);
		expect(await teamConference({ ctx: outsider, permission: 'manageParticipants' })).toEqual({
			id: { in: [] }
		});
	});
});

describe('the caller’s own rows', () => {
	const facts = factsWith({
		participants: [
			{ id: 'p1', conferenceId: 'c1', registered: true },
			{ id: 'p2', conferenceId: 'c2', registered: false }
		],
		delegationMemberships: [
			{ id: 'm1', delegationId: 'd1', conferenceId: 'c1', isHeadDelegate: true, applied: false }
		],
		supervised: [
			{
				participantId: 'p9',
				userId: 'u9',
				conferenceId: 'c1',
				delegationMemberId: 'm9',
				delegationId: 'd9',
				singleParticipantId: null
			}
		]
	});
	const args = { ctx: user, facts };

	test('by their own columns', () => {
		expect(isOwnUser(user)).toEqual({ userId: 'u1' });
		expect(isOwnParticipation(args)).toEqual({ conferenceParticipantId: { in: ['p1', 'p2'] } });
		expect(isInOwnDelegation(args)).toEqual({ delegationId: { in: ['d1'] } });
		expect(supervisedDelegationIds(args)).toEqual(['d9']);
	});

	test('a conference counts while the caller is registered there', () => {
		expect(isParticipantOf(args)).toEqual({ id: { in: ['c1'] } });
		expect(isParticipantOfConference(args)).toEqual({ conferenceId: { in: ['c1'] } });
	});
});

describe('isCaredForUser', () => {
	test('covers participants and waiting list of the conferences the caller cares for, not the team', () => {
		const conferenceId = { in: ['c3'] };
		expect(isCaredForUser({ ctx: user, facts: teamFacts })).toEqual({
			OR: [
				{
					conferenceParticipants: {
						conferenceId,
						OR: [
							{ delegationMember: true },
							{ singleParticipant: true },
							{ conferenceSupervisor: true }
						]
					}
				},
				{ waitingListEntry: { conferenceId } }
			]
		});
	});

	test('reaches nobody, without a hop, for a caller caring for no conference', () => {
		expect(isCaredForUser({ ctx: user, facts: none })).toBe(NOTHING);
	});
});

describe('grantWhere', () => {
	test('wraps a filter for an ability rule, and grants nothing without one', () => {
		expect(grantWhere({ id: 'x' })).toEqual({ where: { id: 'x' } });
		expect(grantWhere(undefined)).toBeUndefined();
	});
});

describe('hop', () => {
	test('nests a filter into a relation', () => {
		expect(hop({ conferenceId: { in: ['c1'] } }, (participant) => ({ participant }))).toEqual({
			participant: { conferenceId: { in: ['c1'] } }
		});
	});

	test('is NOTHING, not a hop, for a filter on an empty id list', () => {
		expect(hop({ conferenceId: { in: [] } }, (participant) => ({ participant }))).toBe(NOTHING);
		expect(hop(NOTHING, (participant) => ({ participant }))).toBe(NOTHING);
	});

	test('keeps undefined (nobody)', () => {
		expect(hop(undefined, (participant: object) => ({ participant }))).toBeUndefined();
	});
});

// drizzle drops an empty filter from an `OR`: a system admin's match-all way has to stand alone
describe('conference filters of a system admin', () => {
	test('reads every conference, not only the public ones', () => {
		expect(readableConference({ ctx: admin, facts: none })).toEqual({});
		expect(readableConferenceRows({ ctx: admin, facts: none })).toEqual({});
	});

	test('has a part in every conference', () => {
		expect(hasPartIn({ ctx: admin, facts: none })).toEqual({});
	});
});

describe('conferences the caller has a part in', () => {
	const facts = factsWith({
		team: [{ conferenceId: 't1', roles: ['MEMBER'] }],
		participants: [
			{ id: 'p1', conferenceId: 'shown', registered: true },
			{ id: 'p2', conferenceId: 'hidden', registered: true }
		],
		conferences: new Map([
			['shown', { assignmentReleased: false, showCalendar: true }],
			['hidden', { assignmentReleased: false, showCalendar: false }]
		]),
		publicConferenceIds: ['p']
	});

	test('as participant or on the team, and the public ones to read', () => {
		expect(hasPartIn({ ctx: user, facts })).toEqual({ id: { in: ['shown', 'hidden', 't1'] } });
		expect(readableConference({ ctx: user, facts })).toEqual({
			id: { in: ['p', 'shown', 'hidden', 't1'] }
		});
	});

	test('narrowed for participants only', () => {
		expect(hasPartInConference({ ctx: user, facts, asParticipant: (c) => c.showCalendar })).toEqual(
			{ conferenceId: { in: ['shown', 't1'] } }
		);
	});
});

describe('releasedIds', () => {
	test('keeps the rows of conferences whose assignment is released', () => {
		const facts = factsWith({
			conferences: new Map([
				['open', { assignmentReleased: true, showCalendar: false }],
				['closed', { assignmentReleased: false, showCalendar: false }]
			])
		});
		const rows = [
			{ id: 'a', conferenceId: 'open' },
			{ id: 'b', conferenceId: 'closed' },
			{ id: 'c', conferenceId: 'unknown' }
		];
		expect(releasedIds({ facts, rows })).toEqual(['a']);
	});
});

describe('anyOf', () => {
	test('matches everything when one filter does', () => {
		expect(anyOf([{ state: 'POST' }, {}])).toEqual({});
	});

	test('ORs the filters otherwise', () => {
		expect(anyOf([{ state: 'POST' }, { id: 'c' }])).toEqual({
			OR: [{ state: 'POST' }, { id: 'c' }]
		});
	});
});

describe('an AI assistant (MCP) reaches only the conference of its tool call', () => {
	// Over MCP nobody holds a system role (`#api/context`), an admin included. The facts confine
	// the team to the tool call's conference already (`callerFacts`).
	const assistant = contextFor('u1', [], { isAdmin: false, conferenceId: 'c1' });
	const facts = factsWith({ team: [{ conferenceId: 'c1', roles: ['PARTICIPANT_CARE'] }] });

	test('the caller’s own team roles count there', () => {
		expect(isTeamMemberOf({ ctx: assistant, facts, roles: ['PARTICIPANT_CARE'] })).toEqual({
			id: { in: ['c1'] }
		});
		expect(systemAdmin(assistant)).toBeUndefined();
	});

	test('rules about the caller’s own part grant nothing: they could only reach other conferences', () => {
		const withParts = factsWith({
			participants: [{ id: 'p1', conferenceId: 'c9', registered: true }]
		});
		expect(isParticipantOfConference({ ctx: assistant, facts: withParts })).toBeUndefined();
		expect(isOwnParticipation({ ctx: assistant, facts: withParts })).toBeUndefined();
		expect(isOwnUser(assistant)).toBeUndefined();
	});
});
