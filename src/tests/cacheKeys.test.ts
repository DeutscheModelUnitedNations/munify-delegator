import { describe, expect, it } from 'vitest';
import { graphcacheKeys } from '$lib/api/cacheKeys';
import { schema } from '$lib/api/rumbleClient/schema';

describe('graphcacheKeys', () => {
	const keys = graphcacheKeys(schema);

	it('keys nations by their ISO code', () => {
		expect(keys.Nation?.({ __typename: 'Nation', alpha3Code: 'DEU' })).toBe('DEU');
	});

	it('embeds types without an identity', () => {
		expect(keys.StatisticsResult?.({ __typename: 'StatisticsResult' })).toBeNull();
	});

	it('leaves types with an id to the default keying', () => {
		expect(keys.Conference).toBeUndefined();
		expect(keys.Query).toBeUndefined();
	});
});
