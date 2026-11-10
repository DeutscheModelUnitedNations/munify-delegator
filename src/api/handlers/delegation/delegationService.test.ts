import { beforeEach, describe, expect, test, vi } from 'vitest';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({ DATABASE_URL: '', REDIS_URL: undefined }));
vi.mock('$app/env/public', () => ({
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH: 100,
	PUBLIC_MAX_APPLICATION_TEXT_LENGTH: 1200
}));

/** The delegation's members as the transaction reads them, and what it wrote. */
const state = vi.hoisted(() => ({ members: [] as { user: Record<string, unknown> }[] }));
const written = vi.hoisted(() => vi.fn());

vi.mock('#api/db/db', () => {
	const tx = {
		update: () => ({
			set: (values: unknown) => ({
				where: () => {
					written(values);
					return Promise.resolve();
				}
			})
		}),
		query: {
			delegation: {
				findFirst: () =>
					Promise.resolve({
						applied: false,
						conference: {
							startConference: new Date('2026-06-01T00:00:00Z'),
							participantMinAge: 15,
							participantMaxAge: 21,
							supervisorMinAge: 25
						},
						members: state.members
					})
			}
		}
	};
	return {
		schema: { delegation: {}, delegationMember: {} },
		db: { transaction: (run: (t: typeof tx) => unknown) => run(tx) }
	};
});
vi.mock('#api/db/whereRows', () => ({ whereRows: () => undefined }));
vi.mock('#api/pubsub', () => {
	const pubsub = { created: vi.fn(), updated: vi.fn(), removed: vi.fn() };
	return {
		conferenceParticipantPubsub: pubsub,
		delegationMemberPubsub: pubsub,
		delegationPubsub: pubsub,
		paperPubsub: pubsub,
		roleApplicationPubsub: pubsub
	};
});
vi.mock('#api/handlers/roleApplication/tidyRoleApplications', () => ({
	tidyRoleApplications: () => Promise.resolve()
}));
vi.mock('#api/handlers/conferenceParticipant/conferenceParticipantService', () => ({}));
vi.mock('#api/services/registration/participation', () => ({}));
vi.mock('#api/handlers/school/schoolService', () => ({}));

const { updateDelegationDetails } = await import('./delegationService');

/** Seventeen on the first conference day, with a profile the account form accepts. */
const complete = (id: string, givenName: string) => ({
	id,
	givenName,
	familyName: 'Lovelace',
	birthday: new Date('2009-03-01T00:00:00Z'),
	phone: '+4915112345678',
	street: 'Hauptstraße 1',
	apartment: null,
	zip: '10115',
	city: 'Berlin',
	region: null,
	country: 'DEU',
	gender: 'FEMALE',
	pronouns: null,
	foodPreference: 'VEGAN',
	emergencyContacts: 'Mutter: +4915112345679',
	wantsToReceiveGeneralInformation: false,
	wantsJoinTeamInformation: false
});

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

/** A delegation that has done everything else applying takes, in an open registration. */
const delegation: Parameters<typeof updateDelegationDetails>[0]['delegation'] = {
	id: 'delegation-1',
	experience: 'Two conferences',
	motivation: 'Debating',
	appliedForRoles: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
	members: [
		{ id: 'm1', isHeadDelegate: true, participant: { userId: 'ada' } },
		{ id: 'm2', isHeadDelegate: false, participant: { userId: 'grace' } }
	],
	conference: {
		state: 'PARTICIPANT_REGISTRATION',
		applicationDeadline: tomorrow,
		registrationDeadlineGracePeriodMinutes: 0
	}
};

const apply = (applied: boolean) =>
	updateDelegationDetails({
		delegation,
		args: { id: delegation.id, applied },
		withdrawAnyTime: false
	});

describe('updateDelegationDetails applying', () => {
	beforeEach(() => written.mockClear());

	test('sends the application when nothing is wrong with any member', async () => {
		state.members = [{ user: complete('ada', 'Ada') }, { user: complete('grace', 'Grace') }];
		await apply(true);
		expect(written).toHaveBeenCalledWith({ applied: true });
	});

	test('refuses while a member is too young or their profile incomplete, naming them', async () => {
		state.members = [
			{ user: complete('ada', 'Ada') },
			{
				user: {
					...complete('grace', 'Grace'),
					birthday: new Date('2012-03-01T00:00:00Z'),
					phone: null
				}
			}
		];
		const refused = apply(true);
		await expect(refused).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		await expect(refused).rejects.toThrow(/Grace Lovelace/);
		await expect(refused).rejects.not.toThrow(/Ada/);
		expect(written).not.toHaveBeenCalled();
	});

	test('refuses a member too old to take part', async () => {
		state.members = [
			{ user: complete('ada', 'Ada') },
			{ user: { ...complete('grace', 'Grace'), birthday: new Date('1990-03-01T00:00:00Z') } }
		];
		await expect(apply(true)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		expect(written).not.toHaveBeenCalled();
	});

	test('lets a delegation with such a member withdraw', async () => {
		state.members = [{ user: { ...complete('ada', 'Ada'), phone: null } }];
		await apply(false);
		expect(written).toHaveBeenCalledWith({ applied: false });
	});
});
