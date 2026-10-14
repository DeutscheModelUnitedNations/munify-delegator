import { describe, expect, test } from 'vitest';
import { orderVersions } from './orderVersions';

describe('orderVersions', () => {
	const v1 = { version: 1 };
	const v2 = { version: 2 };
	test('lower version comes first either way round', () => {
		expect(orderVersions(v1, v2)).toEqual({ before: v1, after: v2 });
		expect(orderVersions(v2, v1)).toEqual({ before: v1, after: v2 });
	});
	test('equal versions keep the second as before', () => {
		const a = { version: 3, id: 'a' };
		const b = { version: 3, id: 'b' };
		expect(orderVersions(a, b)).toEqual({ before: b, after: a });
	});
});
