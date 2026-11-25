import { describe, expect, it, vi } from 'vitest';
import type { Cache, Data, DataFields, ResolveInfo, Variables } from '@urql/exchange-graphcache';
import { liveQueryUpdates } from '#lib/api/cacheUpdates';
import { schema } from '#lib/api/rumbleClient/schema';

describe('liveQueryUpdates', () => {
	const updates = liveQueryUpdates(schema);
	const run = (field: string, result: DataFields, args: Variables) => {
		const link = vi.fn();
		const invalidate = vi.fn();
		// entities with an id have a key, computed views (GuideView) none, as in the real cache
		const keyOfEntity = (entity: Data) =>
			typeof entity.id === 'string' ? `${String(entity.__typename)}:${entity.id}` : null;
		const cache: Pick<Cache, 'link' | 'invalidate' | 'keyOfEntity'> = {
			link,
			invalidate,
			keyOfEntity
		};
		// TYPE-SAFETY-EXCEPTION: the updater only calls these three, and building graphcache's whole
		// Cache and ResolveInfo here would test graphcache, not the updater.
		updates.Subscription?.[field]?.(result, args, cache as Cache, {} as ResolveInfo);
		return { link, invalidate };
	};

	it('writes a list subscription result to the query of the same name and arguments', () => {
		const args = { where: { conferenceId: { eq: 'c1' } } };
		const committees = [{ __typename: 'Committee', id: 'a' }];
		expect(run('committees', { committees }, args).link).toHaveBeenCalledWith(
			'Query',
			'committees',
			args,
			committees
		);
	});

	it('writes a removed single entity as null', () => {
		expect(run('committee', { committee: null }, { id: 'a' }).link).toHaveBeenCalledWith(
			'Query',
			'committee',
			{ id: 'a' },
			null
		);
	});

	it('invalidates the query instead of linking a result without a key', () => {
		// `cache.link` would store null for it: the guide read "not yet available" on the next page
		const args = { conferenceId: 'c1' };
		const myGuide = { __typename: 'GuideView', preview: false, sections: [] };
		const { link, invalidate } = run('myGuide', { myGuide }, args);
		expect(link).not.toHaveBeenCalled();
		expect(invalidate).toHaveBeenCalledWith('Query', 'myGuide', args);
	});

	it('covers only fields both roots have', () => {
		expect(Object.keys(updates.Subscription ?? {})).toContain('committees');
		expect(updates.Subscription?.seedNewConference).toBeUndefined();
	});
});
