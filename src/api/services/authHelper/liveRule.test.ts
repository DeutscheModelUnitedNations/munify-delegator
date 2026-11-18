/**
 * Pins down what `liveRule` relies on in rumble: it evaluates a rule once per request and keeps
 * the result, but reads the result's `where` again whenever it prepares the table's filter, which
 * `refreshAbilities` (every root field, `RefreshCallerFactsPlugin`) makes it do. Should a rumble
 * upgrade read the filter only once, a caller's facts would freeze for the request, and this fails.
 */
import { expect, test, vi } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { refreshAbilities, rumble } from '@m1212e/rumble';
import { context, type Context } from '#api/context';
import * as schema from '#api/db/schema/index';
import { relations } from '#api/db/relations';
import { createCallerFactsCache } from './callerFactsCache';
import type { CallerFacts } from './callerFacts';

vi.mock('#api/db/db', () => ({ db: {} }));
vi.mock('$app/env/private', () => ({ OIDC_ROLE_CLAIM: undefined, OIDC_ROLE_MAP: undefined }));

const { NO_CALLER_FACTS, liveRule } = await import('./callerFacts');

/** The caller's facts with `delegationIds` as their delegations. */
function factsOf(delegationIds: string[]): CallerFacts {
	return {
		...NO_CALLER_FACTS,
		delegationMemberships: delegationIds.map((delegationId) => ({
			id: `m-${delegationId}`,
			delegationId,
			conferenceId: 'c1',
			isHeadDelegate: false,
			applied: false
		}))
	};
}

test('rumble reads a live rule’s filter again after a refresh', async () => {
	const db = drizzle.mock({ relations });
	const { abilityBuilder } = rumble({
		db,
		schema,
		context,
		resolveRelationalRules: { enabled: true }
	});
	abilityBuilder.delegation.allow('read').when(
		liveRule(({ facts }) => ({
			where: { id: { in: facts.delegationMemberships.map((m) => m.delegationId) } }
		}))
	);

	const cache = createCallerFactsCache();
	cache.loading = Promise.resolve(factsOf(['d1']));
	cache.current = factsOf(['d1']);
	// TYPE-SAFETY-EXCEPTION: the rule reads only the facts; a real request context would test
	// SvelteKit, not rumble.
	const ctx = { callerFactsCache: cache } as Context;
	const abilities = abilityBuilder._.build()(ctx);
	const where = async () =>
		JSON.stringify((await abilities.delegation.filter('read')).query.many.where);

	expect(await where()).toContain('d1');

	cache.current = factsOf(['d2']);
	// until the next refresh, the prepared filter stands
	expect(await where()).toContain('d1');

	refreshAbilities(abilities);
	expect(await where()).toContain('d2');
	expect(await where()).not.toContain('d1');
});

test('a live rule answers with the facts it was built from while a newer load is on its way', async () => {
	const db = drizzle.mock({ relations });
	const { abilityBuilder } = rumble({
		db,
		schema,
		context,
		resolveRelationalRules: { enabled: true }
	});
	abilityBuilder.delegation.allow('read').when(
		liveRule(({ facts }) => ({
			where: { id: { in: facts.delegationMemberships.map((m) => m.delegationId) } }
		}))
	);

	const cache = createCallerFactsCache();
	// the rule's load finished, but a later one started meanwhile, so nothing is current yet
	cache.loading = Promise.resolve(factsOf(['d1']));
	cache.current = undefined;
	// TYPE-SAFETY-EXCEPTION: the rule reads only the facts; a real request context would test
	// SvelteKit, not rumble.
	const ctx = { callerFactsCache: cache } as Context;
	const abilities = abilityBuilder._.build()(ctx);

	const filter = await abilities.delegation.filter('read');
	expect(JSON.stringify(filter.query.many.where)).toContain('d1');
});
