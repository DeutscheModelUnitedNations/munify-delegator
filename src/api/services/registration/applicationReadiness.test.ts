import { describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/public', () => ({
	PUBLIC_MAX_APPLICATION_SCHOOL_LENGTH: 100,
	PUBLIC_MAX_APPLICATION_TEXT_LENGTH: 1200
}));

const { assertApplicationReady } = await import('./applicationReadiness');

const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

/** A delegation that has filled in everything, in an open registration. */
const ready = {
	experience: 'Two conferences',
	motivation: 'Debating',
	appliedForRoles: [1, 2, 3],
	conference: {
		state: 'PARTICIPANT_REGISTRATION' as const,
		applicationDeadline: tomorrow,
		registrationDeadlineGracePeriodMinutes: 0
	}
};

describe('assertApplicationReady', () => {
	test('lets a complete application through while registration is open', () => {
		expect(() =>
			assertApplicationReady({ applicant: ready, edits: {}, minRoleApplications: 3 })
		).not.toThrow();
	});

	test.each(['PRE', 'PREPARATION', 'ACTIVE', 'POST'] as const)(
		'refuses to send an application while the conference is in %s',
		(state) => {
			expect(() =>
				assertApplicationReady({
					applicant: { ...ready, conference: { ...ready.conference, state } },
					edits: {},
					minRoleApplications: 3
				})
			).toThrow();
		}
	);

	test('refuses after the deadline, unless still within the grace period', () => {
		const late = { ...ready.conference, applicationDeadline: yesterday };
		expect(() =>
			assertApplicationReady({
				applicant: { ...ready, conference: late },
				edits: {},
				minRoleApplications: 3
			})
		).toThrow();
		expect(() =>
			assertApplicationReady({
				applicant: {
					...ready,
					conference: { ...late, registrationDeadlineGracePeriodMinutes: 2 * 24 * 60 }
				},
				edits: {},
				minRoleApplications: 3
			})
		).not.toThrow();
	});

	test('refuses too few role applications and missing texts', () => {
		expect(() =>
			assertApplicationReady({
				applicant: { ...ready, appliedForRoles: [1] },
				edits: {},
				minRoleApplications: 3
			})
		).toThrow();
		expect(() =>
			assertApplicationReady({
				applicant: { ...ready, motivation: null },
				edits: {},
				minRoleApplications: 3
			})
		).toThrow();
	});

	test('judges the texts with the edits of the same update applied', () => {
		expect(() =>
			assertApplicationReady({
				applicant: { ...ready, experience: null },
				edits: { experience: 'Two conferences' },
				minRoleApplications: 3
			})
		).not.toThrow();
		expect(() =>
			assertApplicationReady({
				applicant: ready,
				edits: { motivation: null },
				minRoleApplications: 3
			})
		).toThrow();
	});
});
