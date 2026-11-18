import { describe, expect, it } from 'vitest';
import type { DueEmail, SnapshotSurvey, SnapshotUser } from './dueEmails';
import { bundleEmails } from './emailBundles';

const user = (id: string): SnapshotUser => ({
	id,
	email: `${id}@example.org`,
	givenName: id,
	familyName: 'X',
	locale: 'de',
	birthday: null
});
const survey = (id: string, deadline: string): SnapshotSurvey => ({
	id,
	title: id,
	deadline: new Date(deadline),
	answeredBy: []
});
const mail = ({
	kind,
	to = 'anna',
	subjectKey = kind,
	extra = {}
}: {
	kind: DueEmail['kind'];
	to?: string;
	subjectKey?: string;
	extra?: Partial<DueEmail>;
}): DueEmail => ({ kind, subjectKey, recipient: user(to), ...extra });

const keys = (bundles: ReturnType<typeof bundleEmails>) =>
	bundles.map((bundle) => bundle.map((email) => `${email.recipient.id}:${email.subjectKey}`));

describe('bundleEmails', () => {
	it('sends the students linked to one supervisor at once as one mail', () => {
		const due = [
			mail({ kind: 'SUPERVISOR_STUDENT_LINKED', subjectKey: 's1' }),
			mail({ kind: 'PAYMENT_RECEIVED', subjectKey: 'payment' }),
			mail({ kind: 'SUPERVISOR_STUDENT_LINKED', subjectKey: 's2' }),
			mail({ kind: 'SUPERVISOR_STUDENT_LINKED', to: 'bob', subjectKey: 's3' }),
			mail({ kind: 'SUPERVISOR_STUDENT_LINKED', subjectKey: 's4' })
		];
		expect(keys(bundleEmails(due))).toEqual([
			['anna:s1', 'anna:s2', 'anna:s4'],
			['anna:payment'],
			['bob:s3']
		]);
	});

	it('never bundles kinds that are about one thing each', () => {
		const due = [
			mail({ kind: 'PAPER_REVIEWED', subjectKey: 'r1' }),
			mail({ kind: 'PAPER_REVIEWED', subjectKey: 'r2' })
		];
		expect(keys(bundleEmails(due))).toEqual([['anna:r1'], ['anna:r2']]);
	});

	it('bundles surveys only when they close at the same time', () => {
		const soon = '2027-03-01T18:00:00Z';
		const due = [
			mail({ kind: 'SURVEY_PUBLISHED', subjectKey: 'a', extra: { survey: survey('a', soon) } }),
			mail({
				kind: 'SURVEY_PUBLISHED',
				subjectKey: 'b',
				extra: { survey: survey('b', '2027-03-08T18:00:00Z') }
			}),
			mail({ kind: 'SURVEY_PUBLISHED', subjectKey: 'c', extra: { survey: survey('c', soon) } })
		];
		expect(keys(bundleEmails(due))).toEqual([['anna:a', 'anna:c'], ['anna:b']]);
	});

	it('keeps different kinds to the same person apart', () => {
		const due = [
			mail({ kind: 'SUPERVISOR_STUDENT_LINKED', subjectKey: 's1' }),
			mail({ kind: 'SUPERVISOR_CONNECTED', subjectKey: 'p1' })
		];
		expect(keys(bundleEmails(due))).toEqual([['anna:s1'], ['anna:p1']]);
	});
});
