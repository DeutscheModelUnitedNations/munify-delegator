import { beforeEach, describe, expect, test, vi } from 'vitest';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({ DATABASE_URL: '', REDIS_URL: undefined }));
vi.mock('$app/env/public', () => ({
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH: 100,
	PUBLIC_MAX_APPLICATION_TEXT_LENGTH: 1200
}));

/** The registered person as the transaction reads them, and what it wrote. */
const state = vi.hoisted(() => ({ user: {} as Record<string, unknown> }));
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
			singleParticipant: {
				findFirst: ({ columns }: { columns: Record<string, true> }) =>
					Promise.resolve(
						'applied' in columns
							? {
									applied: false,
									conference: {
										startConference: new Date('2026-06-01T00:00:00Z'),
										participantMinAge: 15,
										participantMaxAge: 21,
										supervisorMinAge: 25
									},
									user: state.user
								}
							: {
									experience: 'Two conferences',
									motivation: 'Debating',
									appliedForRoles: [{ id: 'role-1' }],
									conference: {
										state: 'PARTICIPANT_REGISTRATION',
										applicationDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000),
										registrationDeadlineGracePeriodMinutes: 0
									}
								}
					)
			}
		}
	};
	return {
		schema: { singleParticipant: {}, singleParticipantRoleWish: {} },
		db: { transaction: (run: (t: typeof tx) => unknown) => run(tx) }
	};
});
vi.mock('#api/db/whereRows', () => ({ whereRows: () => undefined }));
vi.mock('#api/pubsub', () => ({
	singleParticipantPubsub: { created: vi.fn(), updated: vi.fn(), removed: vi.fn() }
}));
vi.mock('#api/handlers/conferenceParticipant/conferenceParticipantService', () => ({}));
vi.mock('#api/services/registration/participation', () => ({}));
vi.mock('#api/handlers/school/schoolService', () => ({}));
vi.mock('#api/handlers/waitingListEntry/waitingListEntryService', () => ({}));

const { updateSingleParticipantApplication } = await import('./singleParticipantService');

/** Seventeen on the first conference day, with a profile the account form accepts. */
const complete = {
	id: 'ada',
	givenName: 'Ada',
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
};

const apply = (applied: boolean) => updateSingleParticipantApplication({ id: 'single-1', applied });

describe('updateSingleParticipantApplication applying', () => {
	beforeEach(() => written.mockClear());

	test('sends the application of a complete person of the right age', async () => {
		state.user = complete;
		await apply(true);
		expect(written).toHaveBeenCalledWith(expect.objectContaining({ applied: true }));
	});

	test('refuses an incomplete profile, naming the person and the fields', async () => {
		state.user = { ...complete, phone: null, street: null };
		const refused = apply(true);
		await expect(refused).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		await expect(refused).rejects.toThrow(/Ada Lovelace/);
		expect(written).not.toHaveBeenCalled();
	});

	test('refuses someone too young', async () => {
		state.user = { ...complete, birthday: new Date('2012-03-01T00:00:00Z') };
		await expect(apply(true)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		expect(written).not.toHaveBeenCalled();
	});

	test('lets them withdraw all the same', async () => {
		state.user = { ...complete, phone: null };
		await apply(false);
		expect(written).toHaveBeenCalledWith(expect.objectContaining({ applied: false }));
	});
});
