import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ConferencestateEnum } from '#lib/api/rumbleClient/client';

// Nothing fills the app's variables in under vitest, and validating them refuses the empty set.
vi.mock('$app/env/private', () => ({ DATABASE_URL: '', REDIS_URL: undefined }));

const conference = vi.hoisted(() => ({
	state: 'PREPARATION' as ConferencestateEnum,
	// Long past: the registration window, grace period included, is closed.
	applicationDeadline: new Date('2020-01-01T00:00:00Z'),
	registrationDeadlineGracePeriodMinutes: 0
}));
const inserted = vi.hoisted(() => vi.fn());

vi.mock('#api/db/db', () => {
	const tx = {
		insert: () => ({
			values: (values: unknown) => {
				inserted(values);
				return { returning: () => Promise.resolve([{ id: 'supervisor-1' }]) };
			}
		})
	};
	return {
		schema: { conferenceSupervisor: {} },
		db: {
			query: {
				conference: {
					findFirst: ({
						where,
						columns
					}: {
						where: { id: string };
						columns: Record<string, true>;
					}) =>
						Promise.resolve(
							where.id === 'conference-1'
								? Object.fromEntries(Object.entries(conference).filter(([key]) => key in columns))
								: undefined
						)
				},
				conferenceSupervisor: { findFirst: () => Promise.resolve(undefined) }
			},
			transaction: (run: (t: typeof tx) => unknown) => run(tx)
		}
	};
});
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

const { registerSupervisor } = await import('./conferenceSupervisorService');
const { supervisorSignupOpen } = await import('#api/services/registration/applicationReadiness');

const signUp = (selfService = true) =>
	registerSupervisor({
		conferenceId: 'conference-1',
		subjectId: 'user-1',
		selfService,
		schoolId: null,
		schoolName: null
	});

describe('registerSupervisor', () => {
	beforeEach(() => inserted.mockClear());

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

describe('supervisorSignupOpen', () => {
	test('answers what the sign-up would meet, and false for an unknown conference', async () => {
		conference.state = 'ACTIVE';
		await expect(supervisorSignupOpen('conference-1')).resolves.toBe(true);
		conference.state = 'POST';
		await expect(supervisorSignupOpen('conference-1')).resolves.toBe(false);
		await expect(supervisorSignupOpen('no-such-conference')).resolves.toBe(false);
	});
});
