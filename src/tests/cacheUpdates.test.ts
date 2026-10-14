import { describe, expect, it, vi } from 'vitest';
import type { Cache, DataFields, ResolveInfo, Variables } from '@urql/exchange-graphcache';
import { liveQueryUpdates } from '$lib/api/cacheUpdates';
import { schema } from '$lib/api/rumbleClient/schema';

describe('liveQueryUpdates', () => {
	const updates = liveQueryUpdates(schema);
	const run = (field: string, result: DataFields, args: Variables) => {
		const link = vi.fn();
		const cache: Pick<Cache, 'link'> = { link };
		// TYPE-SAFETY-EXCEPTION: the updater only calls `cache.link`, and building graphcache's whole
		// Cache and ResolveInfo here would test graphcache, not the updater.
		updates.Subscription?.[field]?.(result, args, cache as Cache, {} as ResolveInfo);
		return link;
	};

	it('writes a list subscription result to the query of the same name and arguments', () => {
		const args = { where: { conferenceId: { eq: 'c1' } } };
		const committees = [{ __typename: 'Committee', id: 'a' }];
		expect(run('committees', { committees }, args)).toHaveBeenCalledWith(
			'Query',
			'committees',
			args,
			committees
		);
	});

	it('writes a removed single entity as null', () => {
		expect(run('committee', { committee: null }, { id: 'a' })).toHaveBeenCalledWith(
			'Query',
			'committee',
			{ id: 'a' },
			null
		);
	});

	it('covers only fields both roots have', () => {
		expect(Object.keys(updates.Subscription ?? {})).toContain('committees');
		expect(updates.Subscription?.seedNewConference).toBeUndefined();
	});
});
