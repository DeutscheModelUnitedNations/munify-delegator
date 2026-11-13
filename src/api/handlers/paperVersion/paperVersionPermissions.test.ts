/**
 * What the conference papers hand everybody with a seat: the submitted papers of the conference,
 * and of each only the latest submitted version (`e2e/authorization/conference-papers.spec.ts`
 * asks the API the same).
 */
import { describe, expect, test, vi } from 'vitest';
import { relationsFilterToSQL, SQL, type AnyTableFilter } from 'drizzle-orm';
import { PgDialect, type PgTable } from 'drizzle-orm/pg-core';
import type { Context } from '#api/context';
import * as schema from '#api/db/schema/index';
import { relations } from '#api/db/relations';
import { createCallerFactsCache } from '#api/services/authHelper/callerFactsCache';
import type { CallerFacts } from '#api/services/authHelper/callerFacts';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({
	DATABASE_URL: '',
	DATABASE_POOL_SIZE: 1,
	REDIS_URL: undefined
}));
vi.mock('#api/db/db', () => ({ db: {} }));
vi.mock('#api/services/oidc/OIDC', () => ({ OIDC: {} }));

type Grant = { where: object; columns?: Record<string, boolean> };
type Rule = (ctx: Context) => Promise<Grant | undefined>;

/** The read rules registered per table, as `abilityBuilder.<table>.allow(...).when(rule)` got them. */
const registered = new Map<string, Rule[]>();
vi.mock('#api/rumble', () => ({
	abilityBuilder: new Proxy(
		{},
		{
			get: (_target, table: string) => ({
				allow: () => ({
					when: (rule: Rule) => registered.set(table, [...(registered.get(table) ?? []), rule])
				})
			})
		}
	)
}));

const { NO_CALLER_FACTS } = await import('#api/services/authHelper/callerFacts');
const { NOTHING } = await import('#api/services/authHelper/rules');
const { registerPaperAbilities, submittedPaperOfSeatConference } =
	await import('../paper/paperPermissions');
const { registerPaperVersionAbilities, isLatestSubmittedVersion } =
	await import('./paperVersionPermissions');
const { registerPaperReviewAbilities } = await import('../paperReview/paperReviewPermissions');
const { registerDelegationAbilities } = await import('../delegation/delegationPermissions');
registerPaperAbilities();
registerPaperVersionAbilities();
registerPaperReviewAbilities();
registerDelegationAbilities();

/** A signed-in caller (no system role; an AI assistant with `mcp`) whose facts are `facts`. */
function callerWith(facts: Partial<CallerFacts>, mcp: Context['mcp'] = undefined): Context {
	const all = { ...NO_CALLER_FACTS, ...facts };
	const cache = createCallerFactsCache();
	cache.loading = Promise.resolve(all);
	cache.current = all;
	const ctx: Pick<Context, 'hasRole' | 'oidc' | 'mcp' | 'callerFactsCache'> = {
		mcp,
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

const conferences = new Map([
	['released', { assignmentReleased: true, showCalendar: false }],
	['unreleased', { assignmentReleased: false, showCalendar: false }]
]);
/** Holds a seat in both conferences; only one has released its assignment. */
const seated = callerWith({ seatConferenceIds: ['released', 'unreleased'], conferences });
/** Registered, but without a role. */
const seatless = callerWith({
	participants: [{ id: 'p1', conferenceId: 'released', registered: true }],
	conferences
});

/** What every rule of `table` grants the caller. */
async function grantsFor({ table, ctx }: { table: string; ctx: Context }) {
	const grants = await Promise.all((registered.get(table) ?? []).map((rule) => rule(ctx)));
	return grants.filter((grant) => grant !== undefined);
}

/** The grants that reach rows by the conference they are in rather than by ids of the caller's. */
const byConference = (grants: Grant[]) =>
	grants.filter((grant) => JSON.stringify(grant.where).includes('"released"'));

function sqlOf({
	table,
	name,
	where
}: {
	table: PgTable;
	name: keyof typeof relations;
	where: object;
}) {
	const { sql: chunks } = relationsFilterToSQL(
		table,
		// TYPE-SAFETY-EXCEPTION: the rules' filters are typed for rumble, not for the plain drizzle
		// call that renders them here.
		where as AnyTableFilter,
		relations[name].relations,
		relations,
		undefined
	);
	return chunks ? new PgDialect().sqlToQuery(new SQL(chunks)) : { sql: '', params: [] };
}

describe('the submitted papers of a conference', () => {
	test('are for everybody with a seat there once the assignment is released', () => {
		expect(
			submittedPaperOfSeatConference({ ctx: seated, facts: seated.callerFactsCache.current! })
		).toEqual({
			status: { ne: 'DRAFT' },
			delegation: { conferenceId: { in: ['released'] } }
		});
	});

	test("are nobody else's: not without a seat, an account, or for an AI assistant", async () => {
		const facts = { ...NO_CALLER_FACTS, seatConferenceIds: ['released'], conferences };
		expect(
			submittedPaperOfSeatConference({ ctx: seatless, facts: seatless.callerFactsCache.current! })
		).toBe(NOTHING);
		const assistant = callerWith(facts, { conferenceId: 'released', isAdmin: false });
		expect(submittedPaperOfSeatConference({ ctx: assistant, facts })).toBeUndefined();
		expect(byConference(await grantsFor({ table: 'paper', ctx: seatless }))).toEqual([]);
		expect(byConference(await grantsFor({ table: 'paperVersion', ctx: seatless }))).toEqual([]);
	});

	test('come without their status (the verdict) and author', async () => {
		const [grant, ...others] = byConference(await grantsFor({ table: 'paper', ctx: seated }));
		expect(others).toEqual([]);
		expect(grant?.columns).toEqual({ status: false, authorParticipantId: false });
		const rendered = sqlOf({ table: schema.paper, name: 'paper', where: grant?.where ?? {} });
		expect(rendered.sql).toMatch(/"status" <> \$1/);
		expect(rendered.params).toEqual(['DRAFT', 'released']);
	});

	test('show the delegation only as the holder of its role', async () => {
		const [grant, ...others] = byConference(await grantsFor({ table: 'delegation', ctx: seated }));
		expect(others).toEqual([]);
		expect(grant).toEqual({
			where: { conferenceId: { in: ['released'] }, assignedRoleId: { isNotNull: true } },
			columns: { id: true, conferenceId: true, assignedRoleId: true }
		});
	});
});

describe('the versions of a conference paper', () => {
	test('are the latest submitted one only, without its status', async () => {
		const [grant, ...others] = byConference(
			await grantsFor({ table: 'paperVersion', ctx: seated })
		);
		expect(others).toEqual([]);
		expect(grant?.columns).toEqual({ status: false });
		expect(grant?.where).toEqual({
			status: { ne: 'DRAFT' },
			paper: { status: { ne: 'DRAFT' }, delegation: { conferenceId: { in: ['released'] } } },
			RAW: isLatestSubmittedVersion
		});
		const { sql, params } = sqlOf({
			table: schema.paperVersion,
			name: 'paperVersion',
			where: grant?.where ?? {}
		});
		expect(sql).toContain(
			'not exists (select 1 from "paper_version" as "later_version"' +
				' where "later_version"."paper_id" = "paper_version"."paper_id"' +
				` and "later_version"."status" <> 'DRAFT'` +
				' and "later_version"."version" > "paper_version"."version")'
		);
		expect(params).toEqual(['DRAFT', 'DRAFT', 'released']);
	});

	test('and no review comes with them', async () => {
		// the author's rule (no paper of their own) and the paper team's (no conference): nothing
		expect(await grantsFor({ table: 'paperReview', ctx: seated })).toEqual([
			{ where: { paperVersionId: { in: [] } } },
			{ where: NOTHING }
		]);
	});
});
