import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({ DATABASE_URL: '', REDIS_URL: undefined }));

const conference = vi.hoisted(() => ({
	state: 'PREPARATION' as ConferencestateEnum,
	// Long past: the registration window, grace period included, is closed.
	applicationDeadline: new Date('2020-01-01T00:00:00Z'),
	registrationDeadlineGracePeriodMinutes: 0,
	startConference: new Date('2026-06-01T00:00:00Z'),
	participantMinAge: 15,
	participantMaxAge: 21,
	supervisorMinAge: 21
}));
const inserted = vi.hoisted(() => vi.fn());
const updated = vi.hoisted(() => vi.fn());
/** The person signing up or supervising, as the database holds them, and whether they attend. */
const person = vi.hoisted(() => ({
	user: {} as Record<string, unknown>,
	attends: false
}));

vi.mock('#api/db/db', () => {
	const query = {
		conference: {
			findFirst: ({ where, columns }: { where: { id: string }; columns: Record<string, true> }) =>
				Promise.resolve(
					where.id === 'conference-1'
						? Object.fromEntries(Object.entries(conference).filter(([key]) => key in columns))
						: undefined
				)
		},
		user: { findFirst: () => Promise.resolve(person.user) },
		conferenceSupervisor: {
			findFirst: ({ where }: { where: { id?: string } }) =>
				Promise.resolve(
					where.id === 'supervisor-1'
						? {
								plansOwnAttendenceAtConference: person.attends,
								conference,
								user: person.user
							}
						: undefined
				)
		}
	};
	const tx = {
		query,
		insert: () => ({
			values: (values: unknown) => {
				inserted(values);
				return { returning: () => Promise.resolve([{ id: 'supervisor-1' }]) };
			}
		}),
		update: () => ({
			set: (values: unknown) => ({
				where: () => {
					updated(values);
					return Promise.resolve();
				}
			})
		})
	};
	return {
		schema: { conferenceSupervisor: {} },
		db: { query, transaction: (run: (t: typeof tx) => unknown) => run(tx) }
	};
});
vi.mock('#api/db/whereRows', () => ({ whereRows: () => undefined }));
vi.mock('#api/pubsub', () => {
	const pubsub = { created: vi.fn(), updated: vi.fn(), removed: vi.fn() };
	return {
		conferenceSupervisorPubsub: pubsub,
		delegationMemberPubsub: pubsub,
		conferenceParticipantPubsub: pubsub,
		singleParticipantPubsub: pubsub
	};
});
vi.mock('#api/services/registration/participation', () => ({
	isParticipantOrTeamMember: () => Promise.resolve(false)
}));
vi.mock('#api/handlers/conferenceParticipant/conferenceParticipantService', () => ({
	ensureConferenceParticipant: () => Promise.resolve('participant-1'),
	setParticipantSchool: () => Promise.resolve()
}));
vi.mock('#api/handlers/school/schoolService', () => ({
	resolveSchoolChoice: () => Promise.resolve(null)
}));

const { registerSupervisor, updateConferenceSupervisor } =
	await import('./conferenceSupervisorService');

/** Forty on the first conference day, with a profile the account form accepts. */
const complete = {
	id: 'user-1',
	givenName: 'Ada',
	familyName: 'Lovelace',
	birthday: new Date('1986-03-01T00:00:00Z'),
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
	emergencyContacts: 'Partner: +4915112345679',
	wantsToReceiveGeneralInformation: false,
	wantsJoinTeamInformation: false
};
/** Twenty on the first conference day: younger than `supervisorMinAge`. */
const tooYoung = { ...complete, birthday: new Date('2006-03-01T00:00:00Z') };
const { supervisorSignupOpen } = await import('#api/services/registration/applicationReadiness');

const signUp = (selfService = true, plansOwnAttendenceAtConference?: boolean) =>
	registerSupervisor({
		conferenceId: 'conference-1',
		subjectId: 'user-1',
		selfService,
		plansOwnAttendenceAtConference,
		schoolId: null,
		schoolName: null
	});

describe('registerSupervisor', () => {
	beforeEach(() => {
		inserted.mockClear();
		person.user = complete;
	});

	// The bug: a supervisor's own sign-up was held to the delegates' registration window, so the
	// supervisor page, which stays open after registration closed, answered with an error.
	test.each(['PRE', 'PARTICIPANT_REGISTRATION', 'PREPARATION', 'ACTIVE'] as const)(
		'signs a supervisor up themselves in %s, after the registration deadline',
		async (state) => {
			conference.state = state;
			await expect(signUp()).resolves.toBe('supervisor-1');
			expect(inserted).toHaveBeenCalledOnce();
		}
	);

	test('refuses a sign-up of their own once the conference is over', async () => {
		conference.state = 'POST';
		await expect(signUp()).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		expect(inserted).not.toHaveBeenCalled();
	});

	test('lets the team register a supervisor even then', async () => {
		conference.state = 'POST';
		await expect(signUp(false)).resolves.toBe('supervisor-1');
	});
});

describe('registerSupervisor attending in person', () => {
	beforeEach(() => {
		inserted.mockClear();
		conference.state = 'PARTICIPANT_REGISTRATION';
	});

	test('refuses signing oneself up to attend while something is wrong, naming the person', async () => {
		person.user = { ...tooYoung, phone: null };
		const refused = signUp();
		await expect(refused).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		await expect(refused).rejects.toThrow(/Ada Lovelace/);
		await expect(signUp(true, true)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		expect(inserted).not.toHaveBeenCalled();
	});

	test('lets them sign up as not attending', async () => {
		person.user = tooYoung;
		await expect(signUp(true, false)).resolves.toBe('supervisor-1');
		expect(inserted).toHaveBeenCalledWith(
			expect.objectContaining({ plansOwnAttendenceAtConference: false })
		);
	});

	test('lets the team place somebody all the same', async () => {
		person.user = tooYoung;
		await expect(signUp(false)).resolves.toBe('supervisor-1');
	});
});

describe('updateConferenceSupervisor', () => {
	beforeEach(() => updated.mockClear());

	const attend = (plansOwnAttendenceAtConference: boolean) =>
		updateConferenceSupervisor({ id: 'supervisor-1', plansOwnAttendenceAtConference });

	test('confirms attending in person for a supervisor nothing is wrong with', async () => {
		person.user = complete;
		person.attends = false;
		await attend(true);
		expect(updated).toHaveBeenCalledWith(
			expect.objectContaining({ plansOwnAttendenceAtConference: true })
		);
	});

	test('refuses confirming it while the supervisor is too young or incomplete', async () => {
		person.attends = false;
		person.user = tooYoung;
		await expect(attend(true)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		person.user = { ...complete, street: null };
		await expect(attend(true)).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		expect(updated).not.toHaveBeenCalled();
	});

	test('always lets them take it back', async () => {
		person.user = tooYoung;
		person.attends = true;
		await attend(false);
		expect(updated).toHaveBeenCalledWith(
			expect.objectContaining({ plansOwnAttendenceAtConference: false })
		);
	});

	test('lets participant care confirm it all the same', async () => {
		person.attends = false;
		person.user = tooYoung;
		await updateConferenceSupervisor({
			id: 'supervisor-1',
			plansOwnAttendenceAtConference: true,
			byParticipantCare: true
		});
		expect(updated).toHaveBeenCalledWith(
			expect.objectContaining({ plansOwnAttendenceAtConference: true })
		);
	});
});

describe('supervisorSignupOpen', () => {
	test('answers what the sign-up would meet, and false for an unknown conference', async () => {
		conference.state = 'ACTIVE';
		await expect(supervisorSignupOpen('conference-1')).resolves.toBe(true);
		conference.state = 'POST';
		await expect(supervisorSignupOpen('conference-1')).resolves.toBe(false);
		await expect(supervisorSignupOpen('no-such-conference')).resolves.toBe(false);
	});
});
