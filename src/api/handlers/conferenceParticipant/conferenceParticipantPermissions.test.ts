import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ApiContext } from '#api/rumble';

const findFirst = vi.hoisted(() => vi.fn());

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({
	DATABASE_URL: '',
	DATABASE_POOL_SIZE: 1,
	REDIS_URL: undefined
}));
vi.mock('#api/db/db', () => ({ db: { query: { conferenceParticipant: { findFirst } } } }));
vi.mock('#api/rumble', () => ({ abilityBuilder: {} }));
vi.mock('#api/services/oidc/OIDC', () => ({ OIDC: {} }));
const { assertCanUpdatePostalProgress } = await import('./conferenceParticipantPermissions');

function caller(options: { impersonator?: object; mcp?: object } = {}): ApiContext {
	const ctx = {
		oidc: { user: { sub: 'ada' }, impersonator: options.impersonator },
		mcp: options.mcp,
		mustBeLoggedIn: () => ({ sub: 'ada' })
	};
	// TYPE-SAFETY-EXCEPTION: the check reads only who the caller is, and building a real
	// RequestEvent here would test SvelteKit, not it.
	return ctx as unknown as ApiContext;
}

const check = (ctx: ApiContext) => assertCanUpdatePostalProgress({ ctx, conferenceId: 'c' });

describe('assertCanUpdatePostalProgress', () => {
	beforeEach(() => findFirst.mockReset());

	test("is the caller's own part in the conference", async () => {
		findFirst.mockResolvedValue({ id: 'part' });
		expect(await check(caller())).toEqual({ participantId: 'part' });
		expect(findFirst.mock.calls[0][0].where).toEqual({ conferenceId: 'c', userId: 'ada' });
	});

	test('needs a part in it', async () => {
		findFirst.mockResolvedValue(undefined);
		await expect(check(caller())).rejects.toMatchObject({ extensions: { code: 'NOT_FOUND' } });
	});

	test('neither who impersonates nor an AI assistant confirms for somebody else', async () => {
		for (const ctx of [caller({ impersonator: { sub: 'care' } }), caller({ mcp: {} })])
			await expect(check(ctx)).rejects.toMatchObject({ extensions: { code: 'FORBIDDEN' } });
		expect(findFirst).not.toHaveBeenCalled();
	});
});
