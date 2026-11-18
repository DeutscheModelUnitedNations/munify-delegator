/**
 * Guards the reason the rules are built from the caller's facts (`callerFacts`): for an ordinary
 * participant, supervisor or team member, the rules of the user and delegation tables filter on
 * the tables' own columns only. A rule naming a relation renders as nested `exists`, which rumble
 * looks up in one statement per table and root field; planning the user table's (101 of them)
 * cost Postgres hundreds of megabytes, and several at once killed it.
 */
import { describe, expect, test, vi } from 'vitest';
import { relationsFilterToSQL, SQL, type AnyTableFilter } from 'drizzle-orm';
import { PgDialect, type PgTable } from 'drizzle-orm/pg-core';
import type { Context } from '#api/context';
import * as schema from '#api/db/schema/index';
import { relations } from '#api/db/relations';
import { createCallerFactsCache } from './callerFactsCache';
import type { CallerFacts } from './callerFacts';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({
	DATABASE_URL: '',
	DATABASE_POOL_SIZE: 1,
	REDIS_URL: undefined
}));
vi.mock('#api/db/db', () => ({ db: {} }));
vi.mock('#api/services/oidc/OIDC', () => ({ OIDC: {} }));

/** The rules registered per table, as `abilityBuilder.<table>.allow(...).when(rule)` received them. */
const registered = new Map<string, unknown[]>();
vi.mock('#api/rumble', () => ({
	abilityBuilder: new Proxy(
		{},
		{
			get: (_target, table: string) => ({
				allow: () => ({
					when: (rule: unknown) => registered.set(table, [...(registered.get(table) ?? []), rule])
				})
			})
		}
	)
}));

const { NO_CALLER_FACTS } = await import('./callerFacts');
const { registerUserAbilities } = await import('#api/handlers/user/userPermissions');
const { registerDelegationAbilities } =
	await import('#api/handlers/delegation/delegationPermissions');
registerUserAbilities();
registerDelegationAbilities();

/** A signed-in caller (no system role) whose facts are `facts`. */
function callerWith(facts: Partial<CallerFacts>): Context {
	const all = { ...NO_CALLER_FACTS, ...facts };
	const cache = createCallerFactsCache();
	cache.loading = Promise.resolve(all);
	cache.current = all;
	const ctx: Pick<Context, 'hasRole' | 'oidc' | 'mcp' | 'callerFactsCache'> = {
		mcp: undefined,
		hasRole: () => false,
		callerFactsCache: cache,
		oidc: {
			user: { sub: 'me', email: 'me@example.org', OIDCRoleNames: [], hasRole: () => false },
			claims: {},
			impersonator: undefined
		}
	};
	// TYPE-SAFETY-EXCEPTION: the rules read only who the caller is and their facts; a real
	// RequestEvent would test SvelteKit, not them.
	return ctx as Context;
}

const released = { assignmentReleased: true, showCalendar: true };

const participant = callerWith({
	participants: [{ id: 'p1', conferenceId: 'c1', registered: true }],
	delegationMemberships: [
		{ id: 'm1', delegationId: 'd1', conferenceId: 'c1', isHeadDelegate: true, applied: true }
	],
	delegationMates: [
		{ memberId: 'm1', participantId: 'p1', userId: 'me', delegationId: 'd1' },
		{ memberId: 'm2', participantId: 'p2', userId: 'mate', delegationId: 'd1' }
	],
	ownSupervisors: [{ supervisorId: 's1', userId: 'teacher' }],
	authoredPapers: [{ id: 'paper', versionIds: ['v1'], reviewerIds: ['reviewer'] }],
	conferences: new Map([['c1', released]]),
	publicConferenceIds: ['c1']
});

const supervisor = callerWith({
	participants: [{ id: 'p9', conferenceId: 'c1', registered: true }],
	supervisorRegistrations: [{ id: 's1', conferenceId: 'c1' }],
	supervised: [
		{
			participantId: 'p1',
			userId: 'student',
			conferenceId: 'c1',
			delegationMemberId: 'm1',
			delegationId: 'd1',
			singleParticipantId: null
		},
		{
			participantId: 'p3',
			userId: 'single',
			conferenceId: 'c1',
			delegationMemberId: null,
			delegationId: null,
			singleParticipantId: 'sp3'
		}
	],
	coSupervisors: [{ supervisorId: 's2', userId: 'colleague' }],
	conferences: new Map([['c1', released]])
});

const teamMember = callerWith({
	team: [
		{ conferenceId: 'c1', roles: ['MEMBER'] },
		{ conferenceId: 'c2', roles: ['REVIEWER'] },
		{ conferenceId: 'c3', roles: ['TEAM_COORDINATOR'] }
	],
	teammates: [
		{ conferenceId: 'c1', userId: 'me' },
		{ conferenceId: 'c1', userId: 'colleague' }
	],
	paperTeamAuthorUserIds: ['author'],
	conferences: new Map([
		['c1', released],
		['c2', released],
		['c3', released]
	])
});

const careTeamMember = callerWith({
	team: [{ conferenceId: 'c1', roles: ['PARTICIPANT_CARE'] }],
	careDuplicates: [{ userId: 'twin', status: 'OPEN' }],
	conferences: new Map([['c1', released]])
});

type TableName = 'user' | 'delegation';

/** Whether `where` names a relation of `table` (what rumble looks up as a relational rule). */
function namesRelation(where: unknown, tableRelations: Record<string, unknown>): boolean {
	if (!where || typeof where !== 'object') return false;
	return Object.entries(where).some(([key, value]) => {
		if (key === 'AND' || key === 'OR') {
			return Array.isArray(value) && value.some((part) => namesRelation(part, tableRelations));
		}
		if (key === 'NOT') return namesRelation(value, tableRelations);
		return key in tableRelations;
	});
}

/** The `where` of every rule of `table` that grants the caller something. */
async function wheresFor({ table, ctx }: { table: TableName; ctx: Context }) {
	const wheres: unknown[] = [];
	for (const rule of registered.get(table) ?? []) {
		const grant: unknown = typeof rule === 'function' ? await rule(ctx) : rule;
		if (grant && typeof grant === 'object' && 'where' in grant) wheres.push(grant.where);
	}
	return wheres;
}

/** The SQL a filter on the table's own columns renders to; throws on a relation. */
function ownColumnSql({ table, where }: { table: PgTable; where: AnyTableFilter }) {
	const { sql: chunks } = relationsFilterToSQL(table, where);
	return chunks ? new PgDialect().sqlToQuery(new SQL(chunks)).sql : '';
}

const tables = { user: schema.user, delegation: schema.delegation } satisfies Record<
	TableName,
	PgTable
>;

describe.each([
	['a participant', participant],
	['a supervisor', supervisor],
	['a team member', teamMember]
])('the rules of %s', (_name, ctx) => {
	test.each(['user', 'delegation'] as const)('on %s name no relation', async (table) => {
		const wheres = await wheresFor({ table, ctx });
		expect(wheres.length).toBeGreaterThan(0);
		for (const where of wheres) {
			expect(namesRelation(where, relations[table].relations)).toBe(false);
			// TYPE-SAFETY-EXCEPTION: the rules' filters are typed for rumble, not for the plain
			// drizzle call that renders them here.
			const sql = ownColumnSql({ table: tables[table], where: where as AnyTableFilter });
			expect(sql).not.toMatch(/exists/i);
		}
	});
});

test('participant care keeps one relational rule on the user table: the people in its care', async () => {
	const wheres = await wheresFor({ table: 'user', ctx: careTeamMember });
	const relational = wheres.filter((where) => namesRelation(where, relations.user.relations));
	expect(relational).toHaveLength(1);
	expect(await wheresFor({ table: 'delegation', ctx: careTeamMember })).not.toContainEqual(
		expect.objectContaining({ conference: expect.anything() })
	);
});

test('an empty id list matches no row', () => {
	expect(ownColumnSql({ table: schema.user, where: { id: { in: [] } } })).toBe('1 = 0');
});
