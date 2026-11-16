import { describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', async () => ({ db: {}, schema: await import('#api/db/schema/index') }));
vi.mock('#api/pubsub', () => ({}));

const { reviewAnonymityArgsSchema, reviewAnonymousNameSchema } =
	await import('./paperReviewService');

describe('reviewAnonymousNameSchema', () => {
	test('trims the name', () => {
		expect(reviewAnonymousNameSchema.parse('  Vorsitz GV ')).toBe('Vorsitz GV');
	});

	test('refuses an empty or overlong name', () => {
		expect(reviewAnonymousNameSchema.safeParse('   ').success).toBe(false);
		expect(reviewAnonymousNameSchema.safeParse('x'.repeat(81)).success).toBe(false);
	});
});

describe('reviewAnonymityArgsSchema', () => {
	const parse = (args: Record<string, unknown>) =>
		reviewAnonymityArgsSchema.safeParse({ paperId: 'p1', ...args });

	test('takes a typed name with CUSTOM and keeps the other arguments', () => {
		const result = parse({ anonymousAs: 'CUSTOM', anonymousName: 'Vorsitz' });
		expect(result.success).toBe(true);
		expect(result.data).toMatchObject({ paperId: 'p1', anonymousName: 'Vorsitz' });
	});

	test('takes a team name or no anonymity without a typed name', () => {
		expect(parse({ anonymousAs: 'SECRETARIAT' }).success).toBe(true);
		expect(parse({}).success).toBe(true);
	});

	test('refuses CUSTOM without a name, and a name without CUSTOM', () => {
		expect(parse({ anonymousAs: 'CUSTOM' }).success).toBe(false);
		expect(parse({ anonymousAs: 'SECRETARIAT', anonymousName: 'Vorsitz' }).success).toBe(false);
		expect(parse({ anonymousName: 'Vorsitz' }).success).toBe(false);
	});
});
