import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('#api/db/db', async () => ({ db: {}, schema: await import('#api/db/schema/index') }));
const teamFunctionPubsub = { created: vi.fn() };
const teamMemberPubsub = { updated: vi.fn() };
vi.mock('#api/pubsub', () => ({ teamFunctionPubsub, teamMemberPubsub }));

const { giveTeamFunction } = await import('./teamFunctionService');
const { db } = await import('#api/db/db');

/** What the insert answers, and the function found when the insert added nothing. */
let inserted: { id: string }[] = [];
const findFirst = vi.fn();
Object.assign(db, {
	insert: () => ({
		values: () => ({ onConflictDoNothing: () => ({ returning: async () => inserted }) })
	}),
	query: { teamFunction: { findFirst } }
});

beforeEach(() => {
	vi.clearAllMocks();
	inserted = [];
});

describe('giveTeamFunction', () => {
	test('gives the support of a custom role and announces it', async () => {
		inserted = [{ id: 'f1' }];
		expect(
			await giveTeamFunction({
				teamMemberId: 'm',
				committeeId: null,
				roleId: 'press',
				kind: 'ROLE_SUPPORT'
			})
		).toBe('f1');
		expect(teamFunctionPubsub.created).toHaveBeenCalledOnce();
		expect(teamMemberPubsub.updated).toHaveBeenCalledWith('m');
	});

	test('a function held already stays as it is', async () => {
		findFirst.mockResolvedValue({ id: 'held' });
		expect(
			await giveTeamFunction({ teamMemberId: 'm', committeeId: 'ga', roleId: null, kind: 'CHAIR' })
		).toBe('held');
		expect(teamFunctionPubsub.created).not.toHaveBeenCalled();
	});

	test('fails loudly when a function is neither new nor held', async () => {
		findFirst.mockResolvedValue(undefined);
		await expect(
			giveTeamFunction({
				teamMemberId: 'm',
				committeeId: null,
				roleId: null,
				kind: 'TRUSTED_PERSON'
			})
		).rejects.toThrow('neither new nor held');
	});

	test('refuses a function without its committee or role (INVALID_INPUT)', async () => {
		for (const wrong of [
			{ committeeId: null, roleId: null, kind: 'ROLE_SUPPORT' as const },
			{ committeeId: 'ga', roleId: 'press', kind: 'CHAIR' as const },
			{ committeeId: null, roleId: 'press', kind: 'TRUSTED_PERSON' as const }
		]) {
			await expect(giveTeamFunction({ teamMemberId: 'm', ...wrong })).rejects.toMatchObject({
				extensions: { code: 'INVALID_INPUT' }
			});
		}
	});
});
