import { beforeEach, describe, expect, test, vi } from 'vitest';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({ DATABASE_URL: '', REDIS_URL: undefined }));

/** The address's invitations and account, as the database holds them. */
const stored = vi.hoisted(() => ({
	expired: [] as { id: string }[],
	pending: undefined as { id: string } | undefined,
	account: undefined as { id: string } | undefined,
	/** The invitation a token names, its claim being `expired` above */
	redeemed: undefined as { id: string; email: string } | undefined,
	/** The address of who redeems it, and whether they are on the team or take part already */
	redeemer: undefined as { email: string } | undefined,
	member: undefined as { id: string } | undefined,
	takesPart: false
}));
const steps = vi.hoisted(() => [] as string[]);
const published = vi.hoisted(() => ({ created: vi.fn(), updated: vi.fn() }));
const memberPublished = vi.hoisted(() => ({ created: vi.fn(), updated: vi.fn() }));
const filters = vi.hoisted(() => [] as Record<string, unknown>[]);
const mailed = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const insertError = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('#api/db/db', () => {
	const teamMemberInvitation = { id: 'id' };
	const teamMember = { id: 'id' };
	const tx = {
		update: () => ({
			set: (values: object) => ({
				where: () => ({
					returning: () => {
						steps.push(`update ${Object.keys(values).join()}`);
						return Promise.resolve(stored.expired);
					}
				})
			})
		}),
		insert: (table: unknown) => ({
			values: () => ({
				returning: () => {
					steps.push(table === teamMember ? 'insert member' : 'insert invitation');
					return insertError.current
						? Promise.reject(insertError.current)
						: Promise.resolve([{ id: 'new' }]);
				}
			})
		})
	};
	return {
		schema: { teamMemberInvitation, teamMember, teamRole: { enumValues: ['MEMBER'] } },
		db: {
			query: {
				conference: { findFirst: () => Promise.resolve({ title: 'Conference' }) },
				user: {
					findFirst: ({ where }: { where: { email?: string; id?: string } }) => {
						if (where.email) return Promise.resolve(stored.account);
						if (where.id === 'redeemer') return Promise.resolve(stored.redeemer);
						return Promise.resolve({ givenName: 'Ada', familyName: 'Lovelace' });
					}
				},
				teamMember: { findFirst: () => Promise.resolve(stored.member) },
				teamMemberInvitation: {
					findFirst: ({ where }: { where: { token?: string } }) =>
						Promise.resolve(where.token ? stored.redeemed : stored.pending)
				}
			},
			transaction: (run: (t: typeof tx) => unknown) => run(tx)
		}
	};
});
vi.mock('#api/db/whereRows', () => ({
	whereRows: ({ filter }: { filter: Record<string, unknown> }) => void filters.push(filter)
}));
vi.mock('#api/pubsub', () => ({
	teamMemberInvitationPubsub: published,
	teamMemberPubsub: memberPublished
}));
vi.mock('#api/services/registration/participation', () => ({
	isParticipantOrTeamMember: () => Promise.resolve(stored.takesPart)
}));
vi.mock('#api/handlers/email/teamInvitationEmail', () => ({ sendTeamInvitationEmail: mailed }));

const { createInvitations, redeemInvitation } = await import('./teamMemberInvitationService');
const { m } = await import('#lib/paraglide/messages');
const { logger } = await import('#lib/logger');

const invite = () =>
	createInvitations({
		callerId: 'caller',
		origin: 'https://delegator.test',
		conferenceId: 'conference',
		invitations: [{ email: 'Someone@delegator.test', role: 'MEMBER' }]
	});

beforeEach(() => {
	Object.assign(stored, {
		expired: [],
		pending: undefined,
		account: undefined,
		redeemed: undefined,
		redeemer: undefined,
		member: undefined,
		takesPart: false
	});
	insertError.current = undefined;
	steps.length = 0;
	filters.length = 0;
	vi.clearAllMocks();
});

describe('createInvitations', () => {
	test('replaces an expired invitation: revoked first, then the new one is mailed', async () => {
		stored.expired = [{ id: 'expired' }];
		const { created, errors } = await invite();

		expect(errors).toEqual([]);
		expect(created).toMatchObject([{ id: 'new', addedDirectly: false }]);
		expect(steps).toEqual(['update revokedAt', 'insert invitation']);
		expect(filters).toEqual([
			{
				conferenceId: 'conference',
				email: 'someone@delegator.test',
				usedAt: { isNull: true },
				revokedAt: { isNull: true },
				expiresAt: { lte: expect.any(Date) }
			}
		]);
		expect(published.created).toHaveBeenCalled();
		expect(published.updated).toHaveBeenCalledWith(['expired']);
		expect(mailed).toHaveBeenCalledTimes(1);
	});

	test('revokes it as well when the person has an account by now and joins directly', async () => {
		stored.expired = [{ id: 'expired' }];
		stored.account = { id: 'user' };
		const { created } = await invite();

		expect(created).toMatchObject([{ addedDirectly: true }]);
		expect(steps).toEqual(['update revokedAt', 'insert member', 'insert invitation']);
		expect(published.updated).toHaveBeenCalledWith(['expired']);
		expect(mailed).not.toHaveBeenCalled();
	});

	test('refuses an address whose invitation is still valid, writing nothing', async () => {
		stored.pending = { id: 'pending' };
		const { created, errors } = await invite();

		expect(created).toEqual([]);
		expect(errors).toEqual([
			{ email: 'someone@delegator.test', error: m.invitationAlreadyPending() }
		]);
		expect(steps).toEqual([]);
	});

	test('reports a second invitation that won the race, announcing nothing', async () => {
		insertError.current = Object.assign(new Error('duplicate'), {
			code: '23505',
			constraint: 'team_member_invitation_conference_id_email_pending_key'
		});
		const { errors } = await invite();

		expect(errors).toMatchObject([{ error: m.invitationAlreadyPending() }]);
		expect(published.created).not.toHaveBeenCalled();
		expect(mailed).not.toHaveBeenCalled();
	});
});

describe('redeemInvitation', () => {
	const redeem = () => redeemInvitation({ token: 'token', userId: 'redeemer' });

	beforeEach(() => {
		vi.spyOn(logger, 'warn').mockReturnValue(undefined);
		stored.redeemed = { id: 'invitation', email: 'ada@delegator.test' };
		stored.redeemer = { email: 'Ada@delegator.test' };
		// what the conditional update claims
		stored.expired = [{ id: 'invitation' }];
	});

	test('takes the invited person onto the team, claiming it only while it is open', async () => {
		expect(await redeem()).toBe('joined');
		expect(steps).toEqual(['update usedAt,acceptedById', 'insert member']);
		expect(filters).toEqual([
			{
				id: 'invitation',
				usedAt: { isNull: true },
				revokedAt: { isNull: true },
				expiresAt: { gt: expect.any(Date) }
			}
		]);
		expect(published.updated).toHaveBeenCalledWith('invitation');
		expect(memberPublished.created).toHaveBeenCalled();
		expect(memberPublished.updated).toHaveBeenCalledWith('new');
	});

	test('only closes it for someone on the team already', async () => {
		stored.member = { id: 'member' };
		stored.takesPart = true;
		expect(await redeem()).toBe('joined');
		expect(steps).toEqual(['update usedAt,acceptedById']);
		expect(published.updated).toHaveBeenCalledWith('invitation');
		expect(memberPublished.created).not.toHaveBeenCalled();
	});

	test.each([
		['an unknown token', { redeemed: undefined }, 'notRedeemed'],
		['an account of another address', { redeemer: { email: 'b@delegator.test' } }, 'otherEmail'],
		['a missing account', { redeemer: undefined }, 'otherEmail'],
		['someone who takes part', { takesPart: true }, 'notRedeemed']
	])('makes nobody a member and writes nothing for %s', async (_, state, outcome) => {
		Object.assign(stored, state);
		expect(await redeem()).toBe(outcome);
		expect(steps).toEqual([]);
		expect(published.updated).not.toHaveBeenCalled();
	});

	test('makes nobody a member once another request claimed it', async () => {
		stored.expired = [];
		expect(await redeem()).toBe('notRedeemed');
		expect(steps).toEqual(['update usedAt,acceptedById']);
		expect(published.updated).not.toHaveBeenCalled();
		expect(memberPublished.created).not.toHaveBeenCalled();
	});
});
