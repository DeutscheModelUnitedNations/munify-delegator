import { describe, expect, test, vi } from 'vitest';

vi.mock('$config/public', () => ({
	configPublic: {
		PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH: 100,
		PUBLIC_MAX_APPLICATION_TEXT_LENGTH: 1200
	}
}));

const { assertApplicationReady } = await import('./applicationReadiness');

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

/** A delegation that has filled in everything, in an open registration. */
const ready = {
	school: 'Gymnasium Kiel',
	experience: 'Two conferences',
	motivation: 'Debating',
	appliedForRoles: [1, 2, 3],
	conference: {
		state: 'PARTICIPANT_REGISTRATION' as const,
		startAssignment: tomorrow,
		registrationDeadlineGracePeriodMinutes: 0
	}
};

describe('assertApplicationReady', () => {
	test('lets a complete application through while registration is open', () => {
		expect(() => assertApplicationReady(ready, {}, 3)).not.toThrow();
	});

	test.each(['PRE', 'PREPARATION', 'ACTIVE', 'POST'] as const)(
		'refuses to send an application while the conference is in %s',
		(state) => {
			expect(() =>
				assertApplicationReady({ ...ready, conference: { ...ready.conference, state } }, {}, 3)
			).toThrow();
		}
	);

	test('refuses after the deadline, unless still within the grace period', () => {
		const late = { ...ready.conference, startAssignment: yesterday };
		expect(() => assertApplicationReady({ ...ready, conference: late }, {}, 3)).toThrow();
		expect(() =>
			assertApplicationReady(
				{ ...ready, conference: { ...late, registrationDeadlineGracePeriodMinutes: 2 * 24 * 60 } },
				{},
				3
			)
		).not.toThrow();
	});

	test('refuses too few role applications and missing texts', () => {
		expect(() => assertApplicationReady({ ...ready, appliedForRoles: [1] }, {}, 3)).toThrow();
		expect(() => assertApplicationReady({ ...ready, school: null }, {}, 3)).toThrow();
	});
});
