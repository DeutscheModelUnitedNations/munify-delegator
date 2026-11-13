import { afterEach, describe, expect, test, vi } from 'vitest';
import type { Context } from '#api/context';
import { createCallerFactsCache } from './callerFactsCache';

/** The queries the loader runs, answered per test. */
const query = {
	teamMember: { findMany: vi.fn() },
	conference: { findFirst: vi.fn(), findMany: vi.fn() },
	conferenceParticipant: { findMany: vi.fn() },
	conferenceSupervisor: { findMany: vi.fn() },
	paper: { findMany: vi.fn() },
	possibleDuplicate: { findMany: vi.fn() }
};
vi.mock('#api/db/db', () => ({ db: { query } }));

const {
	NO_CALLER_FACTS,
	callerFacts,
	currentCallerFacts,
	liveRule,
	loadCallerFacts,
	participationFacts,
	refreshCallerFacts,
	teamFacts
} = await import('./callerFacts');

const flags = { assignmentReleased: true, showCalendar: false };

/** Answers every query with nothing but the public conference `pub`. */
function emptyDatabase() {
	for (const table of Object.values(query)) {
		for (const fn of Object.values(table)) fn.mockReset().mockResolvedValue([]);
	}
	query.conference.findFirst.mockResolvedValue(undefined);
	query.conference.findMany.mockResolvedValue([{ id: 'pub' }]);
}

afterEach(() => vi.clearAllMocks());

/** A context with only what the loader reads. */
function contextFor(sub: string | undefined, mcp: Context['mcp'] = undefined): Context {
	const ctx: Pick<Context, 'oidc' | 'mcp' | 'callerFactsCache' | 'hasRole'> = {
		mcp,
		hasRole: () => false,
		callerFactsCache: createCallerFactsCache(),
		oidc: {
			user: sub ? { sub, email: undefined, OIDCRoleNames: [], hasRole: () => false } : undefined,
			claims: {},
			impersonator: undefined
		}
	};
	// TYPE-SAFETY-EXCEPTION: the loader reads only who the caller is; a real RequestEvent would
	// test SvelteKit, not it.
	return ctx as Context;
}

describe('teamFacts', () => {
	test('merges the roles held per conference and lists each teammate once', () => {
		const conference = { id: 'c1', ...flags, teamMembers: [{ userId: 'u1' }, { userId: 'u2' }] };
		expect(
			teamFacts([
				{ conferenceId: 'c1', roles: ['REVIEWER'], conference, functions: [] },
				{
					conferenceId: 'c1',
					roles: ['MEMBER'],
					conference,
					functions: [{ committeeId: 'k1', kind: 'CHAIR' }]
				}
			])
		).toEqual({
			team: [{ conferenceId: 'c1', roles: ['REVIEWER', 'MEMBER'] }],
			teamFunctions: [{ conferenceId: 'c1', committeeId: 'k1', kind: 'CHAIR' }],
			teammates: [
				{ conferenceId: 'c1', userId: 'u1' },
				{ conferenceId: 'c1', userId: 'u2' }
			],
			conferences: new Map([['c1', flags]])
		});
	});
});

describe('participationFacts', () => {
	const member = (id: string, userId: string) => ({
		id,
		conferenceParticipantId: `p-${userId}`,
		participant: { userId }
	});
	const facts = participationFacts({
		participation: [
			{
				id: 'p1',
				conferenceId: 'c1',
				conference: flags,
				delegationMember: {
					id: 'm1',
					delegationId: 'd1',
					isHeadDelegate: true,
					delegation: {
						applied: false,
						assignedRoleId: 'r1',
						members: [member('m1', 'me'), member('m2', 'mate')]
					}
				},
				singleParticipant: null,
				conferenceSupervisor: null,
				supervisors: [{ id: 's1', participant: { userId: 'teacher' } }]
			},
			{
				id: 'p2',
				conferenceId: 'c2',
				conference: { assignmentReleased: false, showCalendar: true },
				delegationMember: null,
				singleParticipant: null,
				conferenceSupervisor: { id: 'own-s' },
				// a supervisor of a row without a delegate or single registration supervises nothing
				supervisors: [{ id: 's9', participant: { userId: 'nobody' } }]
			},
			{
				id: 'p3',
				conferenceId: 'c3',
				conference: flags,
				delegationMember: null,
				singleParticipant: null,
				conferenceSupervisor: null,
				supervisors: []
			}
		],
		supervision: [
			{
				id: 'own-s',
				supervised: [
					{
						id: 'student-p',
						userId: 'student',
						conferenceId: 'c2',
						delegationMember: {
							id: 'student-m',
							delegationId: 'student-d',
							delegation: { assignedRoleId: null }
						},
						singleParticipant: null,
						supervisors: [
							{ id: 'own-s', participant: { userId: 'me' } },
							{ id: 'co-s', participant: { userId: 'colleague' } }
						]
					},
					{
						id: 'gone-p',
						userId: 'gone',
						conferenceId: 'c2',
						delegationMember: null,
						singleParticipant: null,
						supervisors: [{ id: 'other-s', participant: { userId: 'other' } }]
					}
				]
			}
		]
	});

	test('the caller’s parts, registered while they hold a registration', () => {
		expect(facts.participants).toEqual([
			{ id: 'p1', conferenceId: 'c1', registered: true },
			{ id: 'p2', conferenceId: 'c2', registered: true },
			{ id: 'p3', conferenceId: 'c3', registered: false }
		]);
		expect(facts.delegationMemberships).toEqual([
			{ id: 'm1', delegationId: 'd1', conferenceId: 'c1', isHeadDelegate: true, applied: false }
		]);
		expect(facts.supervisorRegistrations).toEqual([{ id: 'own-s', conferenceId: 'c2' }]);
		expect(facts.conferences.get('c2')).toEqual({ assignmentReleased: false, showCalendar: true });
	});

	test('the people around them', () => {
		expect(facts.delegationMates.map((mate) => mate.userId)).toEqual(['me', 'mate']);
		expect(facts.ownSupervisors).toEqual([{ supervisorId: 's1', userId: 'teacher' }]);
		expect(facts.supervised).toEqual([
			{
				participantId: 'student-p',
				userId: 'student',
				conferenceId: 'c2',
				delegationMemberId: 'student-m',
				delegationId: 'student-d',
				singleParticipantId: null
			},
			{
				participantId: 'gone-p',
				userId: 'gone',
				conferenceId: 'c2',
				delegationMemberId: null,
				delegationId: null,
				singleParticipantId: null
			}
		]);
		// only the supervisors of people holding a registration a supervisor looks after
		expect(facts.coSupervisors.map((supervisor) => supervisor.userId)).toEqual(['me', 'colleague']);
	});

	test('a seat where their delegation holds a role, not where nobody they supervise does', () => {
		expect(facts.seatConferenceIds).toEqual(['c1']);
	});

	test('a seat as single participant with a role, and through a supervised person with one', () => {
		const row = {
			conference: flags,
			delegationMember: null,
			singleParticipant: null,
			conferenceSupervisor: null,
			supervisors: []
		};
		const student = { userId: 'student', delegationMember: null, supervisors: [] };
		const seats = participationFacts({
			participation: [
				{
					...row,
					id: 'p1',
					conferenceId: 'single',
					singleParticipant: { id: 'sp1', applied: true, assignedRoleId: 'r1' }
				},
				{
					...row,
					id: 'p2',
					conferenceId: 'waiting',
					singleParticipant: { id: 'sp2', applied: true, assignedRoleId: null }
				},
				{ ...row, id: 'p3', conferenceId: 'supervising', conferenceSupervisor: { id: 's3' } }
			],
			supervision: [
				{
					id: 's3',
					supervised: [
						{
							...student,
							id: 'p8',
							conferenceId: 'supervising',
							singleParticipant: { id: 'sp8', assignedRoleId: 'r8' }
						},
						{
							...student,
							id: 'p9',
							conferenceId: 'supervising',
							singleParticipant: { id: 'sp9', assignedRoleId: null }
						}
					]
				}
			]
		}).seatConferenceIds;
		expect(seats).toEqual(['single', 'supervising']);
	});
});

describe('loadCallerFacts', () => {
	test('an anonymous caller only learns the public conferences', async () => {
		emptyDatabase();
		const facts = await loadCallerFacts({
			teamUserId: undefined,
			participantUserId: undefined,
			mcp: undefined
		});
		expect(facts).toEqual({ ...NO_CALLER_FACTS, publicConferenceIds: ['pub'] });
		expect(query.teamMember.findMany).not.toHaveBeenCalled();
		expect(query.conferenceParticipant.findMany).not.toHaveBeenCalled();
		expect(query.conferenceSupervisor.findMany).not.toHaveBeenCalled();
	});

	test('an AI assistant’s team is the tool call’s conference, while it has switched MCP on', async () => {
		emptyDatabase();
		const conference = (mcpEnabled: boolean) => ({ mcpEnabled, ...flags, teamMembers: [] });
		query.teamMember.findMany.mockResolvedValue([
			{ conferenceId: 'c1', role: 'PARTICIPANT_CARE', conference: conference(true), functions: [] },
			{ conferenceId: 'c1', role: 'MEMBER', conference: conference(false), functions: [] }
		]);
		const facts = await loadCallerFacts({
			teamUserId: 'u1',
			participantUserId: undefined,
			mcp: { conferenceId: 'c1', isAdmin: false }
		});
		expect(query.teamMember.findMany.mock.calls[0]?.[0]?.where).toEqual({
			userId: 'u1',
			conferenceId: 'c1'
		});
		expect(facts.team).toEqual([{ conferenceId: 'c1', roles: ['PARTICIPANT_CARE'] }]);
		// the assistant's own registrations count nowhere
		expect(query.conferenceParticipant.findMany).not.toHaveBeenCalled();
	});

	test('an admin’s assistant holds every role there, and nothing elsewhere', async () => {
		emptyDatabase();
		query.conference.findFirst.mockResolvedValue({ id: 'c1', ...flags, teamMembers: [] });
		const facts = await loadCallerFacts({
			teamUserId: 'a1',
			participantUserId: undefined,
			mcp: { conferenceId: 'c1', isAdmin: true }
		});
		expect(query.conference.findFirst.mock.calls[0]?.[0]?.where).toEqual({
			id: 'c1',
			mcpEnabled: true
		});
		expect(facts.team).toHaveLength(1);
		expect(facts.team[0]?.roles).toContain('PROJECT_MANAGEMENT');
		expect(facts.team[0]?.roles).toContain('PARTICIPANT_CARE');
		expect(query.teamMember.findMany).not.toHaveBeenCalled();
	});

	test('looks the supervision, papers and care pairs up only for who has them', async () => {
		emptyDatabase();
		query.teamMember.findMany.mockResolvedValue([
			{
				conferenceId: 'c1',
				role: 'PARTICIPANT_CARE',
				functions: [],
				conference: { mcpEnabled: false, ...flags, teamMembers: [{ userId: 'u1' }] }
			}
		]);
		query.paper.findMany.mockResolvedValue([{ authorParticipant: { userId: 'author' } }]);
		query.possibleDuplicate.findMany
			.mockResolvedValueOnce([{ userId: 'other-a', status: 'OPEN' }])
			.mockResolvedValueOnce([{ candidateId: 'other-b', status: 'DISMISSED' }]);
		const facts = await loadCallerFacts({
			teamUserId: 'u1',
			participantUserId: 'u1',
			mcp: undefined
		});
		// no supervisor registration, no participant row: nothing to look up for them
		expect(query.conferenceSupervisor.findMany).not.toHaveBeenCalled();
		expect(facts.paperTeamAuthorUserIds).toEqual(['author']);
		expect(facts.careDuplicates).toEqual([
			{ userId: 'other-a', status: 'OPEN' },
			{ userId: 'other-b', status: 'DISMISSED' }
		]);
		expect(facts.teammates).toEqual([{ conferenceId: 'c1', userId: 'u1' }]);
	});
});

describe('the facts of a request', () => {
	test('are loaded once, and again only when refreshed', async () => {
		emptyDatabase();
		const ctx = contextFor(undefined);
		expect(ctx.callerFactsCache.loading).toBeUndefined();
		// a request that never needed them does not load them on a refresh
		await refreshCallerFacts(ctx);
		expect(query.conference.findMany).not.toHaveBeenCalled();

		const first = await callerFacts(ctx);
		await callerFacts(ctx);
		expect(query.conference.findMany).toHaveBeenCalledTimes(1);
		expect(currentCallerFacts(ctx)).toBe(first);

		query.conference.findMany.mockResolvedValue([{ id: 'pub' }, { id: 'new' }]);
		await refreshCallerFacts(ctx);
		expect(query.conference.findMany).toHaveBeenCalledTimes(2);
		expect(currentCallerFacts(ctx).publicConferenceIds).toEqual(['pub', 'new']);
	});

	test('a failed load is not kept', async () => {
		emptyDatabase();
		const ctx = contextFor(undefined);
		query.conference.findMany.mockRejectedValueOnce(new Error('down'));
		await expect(callerFacts(ctx)).rejects.toThrow('down');
		expect((await callerFacts(ctx)).publicConferenceIds).toEqual(['pub']);
	});

	test('a slower earlier load does not overwrite a later one', async () => {
		emptyDatabase();
		const ctx = contextFor(undefined);
		let finishSlow: (rows: { id: string }[]) => void = () => {};
		query.conference.findMany.mockReturnValueOnce(
			new Promise((resolve) => {
				finishSlow = resolve;
			})
		);
		const slow = callerFacts(ctx);
		query.conference.findMany.mockResolvedValueOnce([{ id: 'later' }]);
		await refreshCallerFacts(ctx);
		finishSlow([{ id: 'earlier' }]);
		await slow;
		expect(currentCallerFacts(ctx).publicConferenceIds).toEqual(['later']);
	});

	test('currentCallerFacts refuses before any load', () => {
		expect(() => currentCallerFacts(contextFor('u1'))).toThrow();
	});

	test('an earlier load finishing first fills the empty cache until the later one lands', async () => {
		emptyDatabase();
		const ctx = contextFor(undefined);
		const earlier = callerFacts(ctx);
		let finishLater: (rows: { id: string }[]) => void = () => {};
		query.conference.findMany.mockReturnValueOnce(
			new Promise((resolve) => {
				finishLater = resolve;
			})
		);
		const later = refreshCallerFacts(ctx);
		await earlier;
		// a rule that awaited the earlier load reads facts, not an error, while the later one runs
		expect(currentCallerFacts(ctx).publicConferenceIds).toEqual(['pub']);
		finishLater([{ id: 'later' }]);
		await later;
		expect(currentCallerFacts(ctx).publicConferenceIds).toEqual(['later']);
	});
});

describe('liveRule', () => {
	/** A context whose facts are `facts` already. */
	function withFacts(publicConferenceIds: string[]) {
		const ctx = contextFor('u1');
		const facts = { ...NO_CALLER_FACTS, publicConferenceIds };
		ctx.callerFactsCache.loading = Promise.resolve(facts);
		ctx.callerFactsCache.current = facts;
		return ctx;
	}

	const rule = liveRule(({ ctx, facts }) =>
		ctx.oidc.user
			? { where: { id: { in: [...facts.publicConferenceIds] } }, columns: { title: true } }
			: undefined
	);

	test('builds the filter from the facts as they are when rumble reads it', async () => {
		const ctx = withFacts(['a']);
		const grant = await rule(ctx);
		expect(grant?.where).toEqual({ id: { in: ['a'] } });
		expect(grant?.columns).toEqual({ title: true });

		ctx.callerFactsCache.current = { ...NO_CALLER_FACTS, publicConferenceIds: ['b'] };
		expect(grant?.where).toEqual({ id: { in: ['b'] } });
	});

	test('keeps a rule out that grants nothing when it is evaluated', async () => {
		const ctx = contextFor(undefined);
		ctx.callerFactsCache.loading = Promise.resolve(NO_CALLER_FACTS);
		expect(await rule(ctx)).toBeUndefined();
	});

	test('matches nothing once the facts no longer grant it', async () => {
		const ctx = withFacts(['a']);
		const optional = liveRule(({ facts }) =>
			facts.publicConferenceIds.length > 0
				? { where: { id: { in: [...facts.publicConferenceIds] } } }
				: undefined
		);
		const grant = await optional(ctx);
		ctx.callerFactsCache.current = NO_CALLER_FACTS;
		expect(grant?.where).toHaveProperty('RAW');
	});
});
