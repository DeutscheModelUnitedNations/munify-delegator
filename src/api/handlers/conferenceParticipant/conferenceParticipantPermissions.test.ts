import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ApiContext } from '#api/rumble';
import type { Context } from '#api/context';
import type { CallerFacts } from '#api/services/authHelper/callerFacts';
import { createCallerFactsCache } from '#api/services/authHelper/callerFactsCache';

const { findFirst, findUser, assertTeamPermission, assertAllowed, rules } = vi.hoisted(() => ({
	/** The rules as `abilityBuilder.conferenceParticipant.allow(...).when(rule)` received them. */
	rules: [] as unknown[],
	findFirst: vi.fn(),
	findUser: vi.fn(),
	assertTeamPermission: vi.fn(),
	assertAllowed: vi.fn()
}));

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({
	DATABASE_URL: '',
	DATABASE_POOL_SIZE: 1,
	REDIS_URL: undefined
}));
vi.mock('#api/db/db', () => ({
	db: { query: { conferenceParticipant: { findFirst }, user: { findFirst: findUser } } },
	schema: { conferenceParticipant: {} }
}));
vi.mock('#api/db/whereRows', () => ({
	whereRows: ({ filter }: { filter: object }) => ({ filter })
}));
vi.mock('#api/services/authHelper/rules', async (original) => ({
	...(await original<typeof import('#api/services/authHelper/rules')>()),
	assertTeamPermission
}));
vi.mock('#api/services/authHelper/utils', async (original) => ({
	...(await original<typeof import('#api/services/authHelper/utils')>()),
	assertAllowed
}));
vi.mock('#api/rumble', () => ({
	abilityBuilder: {
		conferenceParticipant: { allow: () => ({ when: (rule: unknown) => rules.push(rule) }) }
	}
}));
vi.mock('#api/services/oidc/OIDC', () => ({ OIDC: {} }));
const { NO_CALLER_FACTS } = await import('#api/services/authHelper/callerFacts');
const {
	assertCanUpdatePostalProgress,
	assertCanUpsertParticipantStatus,
	registerConferenceParticipantAbilities
} = await import('./conferenceParticipantPermissions');

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

describe('the postal progress of others', () => {
	registerConferenceParticipantAbilities();

	/** What the rules grant a participant or supervisor with these facts. */
	async function grantsWith(facts: Partial<CallerFacts>) {
		const all = { ...NO_CALLER_FACTS, ...facts };
		const cache = createCallerFactsCache();
		cache.loading = Promise.resolve(all);
		cache.current = all;
		// TYPE-SAFETY-EXCEPTION: the rules read only who the caller is and their facts.
		const ctx = {
			hasRole: () => false,
			callerFactsCache: cache,
			oidc: { user: { sub: 'ada' } }
		} as unknown as Context;
		const grants: { where: object; columns?: Record<string, boolean> }[] = [];
		for (const rule of rules) {
			if (typeof rule !== 'function') continue;
			const grant = await rule(ctx);
			if (grant && typeof grant === 'object') grants.push(grant);
		}
		return grants;
	}

	const hidden = {
		postalInfoRead: false,
		postalConfirmedDetails: false,
		postalConfirmedOfAge: false
	};
	const reaching = (grants: Awaited<ReturnType<typeof grantsWith>>, id: string) =>
		grants.filter(({ where }) => JSON.stringify(where).includes(`"${id}"`));

	test('is hidden from co-delegates', async () => {
		const grants = await grantsWith({
			delegationMates: [
				{ memberId: 'm2', participantId: 'mate', userId: 'bob', delegationId: 'd1' }
			]
		});
		expect(reaching(grants, 'mate').map(({ columns }) => columns)).toEqual([hidden]);
	});

	test('is hidden from supervisors', async () => {
		const grants = await grantsWith({
			supervised: [
				{
					participantId: 'student',
					userId: 'bob',
					conferenceId: 'c',
					delegationMemberId: 'm1',
					delegationId: 'd1',
					singleParticipantId: null
				}
			]
		});
		expect(reaching(grants, 'student').map(({ columns }) => columns)).toEqual([hidden]);
	});

	test('is there for the person', async () => {
		const [own] = reaching(await grantsWith({}), 'ada');
		expect(own.columns).toBeUndefined();
	});
});

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

describe('assertCanUpsertParticipantStatus', () => {
	const target = (args: { id?: string; userId?: string; userEmail?: string }) =>
		assertCanUpsertParticipantStatus({ ctx: caller(), args: { conferenceId: 'c', ...args } });

	beforeEach(() => {
		findFirst.mockReset();
		findUser.mockReset();
		assertTeamPermission.mockReset();
		assertAllowed.mockReset();
	});

	test('is a row by its id, of the conference and reached by the caller', async () => {
		expect(await target({ id: 'part', userId: 'bob' })).toEqual({ existingId: 'part' });
		expect(assertAllowed).toHaveBeenCalledWith(
			expect.objectContaining({
				table: 'conferenceParticipant',
				action: 'update',
				id: 'part',
				options: { extra: { filter: { conferenceId: 'c' } } }
			})
		);
		expect(assertTeamPermission).not.toHaveBeenCalled();
	});

	test("is nobody's whose row the caller does not reach", async () => {
		assertAllowed.mockRejectedValue(new Error('not found'));
		await expect(target({ id: 'part' })).rejects.toThrow('not found');
	});

	test('looks nobody up before the caller may manage participants', async () => {
		assertTeamPermission.mockRejectedValue(new Error('forbidden'));
		await expect(target({ userEmail: 'bob@delegator.test' })).rejects.toThrow('forbidden');
		expect(assertTeamPermission).toHaveBeenCalledWith(
			expect.objectContaining({ conferenceId: 'c', permission: 'manageParticipants' })
		);
		expect(findUser).not.toHaveBeenCalled();
		expect(findFirst).not.toHaveBeenCalled();
	});

	test("is the person's row, whom an address names as well", async () => {
		findFirst.mockResolvedValue({ id: 'part' });
		expect(await target({ userId: 'bob' })).toEqual({ existingId: 'part' });
		expect(findUser).not.toHaveBeenCalled();

		findUser.mockResolvedValue({ id: 'eve' });
		expect(await target({ userEmail: 'eve@delegator.test' })).toEqual({ existingId: 'part' });
		expect(findFirst.mock.lastCall?.[0].where).toEqual({ conferenceId: 'c', userId: 'eve' });
	});

	test('is a new row for a person in the conference without one', async () => {
		findUser.mockResolvedValue({ id: 'bob' });
		expect(await target({ userId: 'bob' })).toEqual({ userId: 'bob' });
	});

	test.each([
		['a person not in the conference', { userId: 'bob' }, 'INVALID_INPUT'],
		['an address without an account', { userEmail: 'x@delegator.test' }, 'NOT_FOUND'],
		['nobody at all', {}, 'INVALID_INPUT']
	])('refuses %s', async (_, args, code) => {
		await expect(target(args)).rejects.toMatchObject({ extensions: { code } });
	});
});
