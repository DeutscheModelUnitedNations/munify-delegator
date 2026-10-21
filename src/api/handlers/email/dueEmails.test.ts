import { describe, expect, test } from 'vitest';
import { dueEmails, type EmailSnapshot, type SnapshotPerson } from './dueEmails';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-01T12:00:00Z');
const france = { id: 'role-fra', kind: 'NATION' as const, name: null, nationAlpha3Code: 'FRA' };

let counter = 0;
function person(overrides: Partial<SnapshotPerson> = {}): SnapshotPerson {
	counter++;
	return {
		participantId: `p${counter}`,
		user: {
			id: `u${counter}`,
			email: `u${counter}@example.org`,
			givenName: 'Ada',
			familyName: 'Lovelace',
			locale: 'de',
			birthday: new Date('2000-01-01')
		},
		paymentStatus: 'PENDING',
		termsAndConditions: 'PENDING',
		guardianConsent: 'PENDING',
		mediaConsent: 'PENDING',
		didAttend: false,
		delegation: null,
		single: null,
		supervisor: null,
		seatedFromWaitingList: null,
		...overrides
	};
}

function snapshot(
	people: SnapshotPerson[],
	conference: Partial<EmailSnapshot['conference']> = {}
): EmailSnapshot {
	return {
		conference: {
			id: 'c1',
			title: 'MUN',
			state: 'PREPARATION',
			assignmentReleased: true,
			unlockPostals: false,
			unlockPayments: false,
			startAssignment: new Date(now.getTime() - 30 * DAY),
			startConference: new Date(now.getTime() + 60 * DAY),
			certificateAvailable: false,
			...conference
		},
		people
	};
}

const kindsOf = (snap: EmailSnapshot, at = now) =>
	dueEmails(snap, at).map((email) => `${email.kind}:${email.person.user.id}:${email.subjectKey}`);

const seated = () => person({ delegation: { applied: true, role: france, committee: 'GV' } });
const rejected = () => person({ delegation: { applied: true, role: null, committee: null } });
const unsent = () => person({ delegation: { applied: false, role: null, committee: null } });

describe('the assignment result', () => {
	test('accepts the seated and rejects who applied without a seat, once released', () => {
		const a = seated();
		const b = rejected();
		const c = unsent();
		expect(kindsOf(snapshot([a, b, c]))).toEqual([
			`ASSIGNMENT_ACCEPTED:${a.user.id}:role-fra`,
			`ASSIGNMENT_REJECTED:${b.user.id}:rejected`
		]);
	});

	test('says nothing before the release', () => {
		expect(kindsOf(snapshot([seated(), rejected()], { assignmentReleased: false }))).toEqual([]);
	});

	test('tells someone seated from the waiting list that, instead of a plain acceptance', () => {
		const a = person({
			single: { applied: true, role: { ...france, id: 'press', kind: 'CUSTOM' } },
			seatedFromWaitingList: { entryId: 'w1' }
		});
		expect(kindsOf(snapshot([a]))).toEqual([`WAITING_LIST_SEATED:${a.user.id}:w1`]);
	});

	test('sums up for a supervisor whose people applied, and names each new student once', () => {
		const a = seated();
		const b = rejected();
		const supervisor = person({
			supervisor: { plansOwnAttendance: false, studentIds: [a.participantId, b.participantId] }
		});
		const emails = dueEmails(snapshot([a, b, supervisor]), now).filter(
			(email) => email.person === supervisor
		);
		expect(emails.map((email) => email.kind)).toEqual([
			'SUPERVISOR_ASSIGNMENT_SUMMARY',
			'SUPERVISOR_STUDENT_LINKED',
			'SUPERVISOR_STUDENT_LINKED'
		]);
		expect(emails[0].students).toEqual([a, b]);
	});
});

describe('paperwork and payment', () => {
	test('asks only the accepted with something open, once unlocked', () => {
		const open = seated();
		const done = person({
			...seated(),
			paymentStatus: 'DONE',
			termsAndConditions: 'DONE',
			mediaConsent: 'DONE'
		});
		const kinds = kindsOf(
			snapshot([open, done, rejected()], { unlockPostals: true, unlockPayments: true })
		);
		expect(kinds).toContain(`POSTAL_UNLOCKED:${open.user.id}:postal`);
		expect(kinds).toContain(`PAYMENT_UNLOCKED:${open.user.id}:payment`);
		expect(
			kinds.filter((kind) => kind.includes(done.user.id) && kind.includes('UNLOCKED'))
		).toEqual([]);
		expect(kinds).toContain(`POSTAL_RECEIVED:${done.user.id}:postal`);
		expect(kinds).toContain(`PAYMENT_RECEIVED:${done.user.id}:payment`);
	});

	test('needs the guardians only for minors', () => {
		const minor = person({
			...seated(),
			user: { ...seated().user, id: 'minor', birthday: new Date('2012-01-01') },
			termsAndConditions: 'DONE',
			mediaConsent: 'DONE',
			guardianConsent: 'PROBLEM'
		});
		const kinds = kindsOf(snapshot([minor]));
		expect(kinds).toContain('PAPERWORK_PROBLEM:minor:guardianConsent');
		expect(kinds).not.toContain('POSTAL_RECEIVED:minor:postal');
	});

	test('counts a supervisor who comes along with a seated student as accepted', () => {
		const student = seated();
		const along = person({
			supervisor: { plansOwnAttendance: true, studentIds: [student.participantId] }
		});
		const home = person({
			supervisor: { plansOwnAttendance: false, studentIds: [student.participantId] }
		});
		const kinds = kindsOf(snapshot([student, along, home], { unlockPayments: true }));
		expect(kinds).toContain(`PAYMENT_UNLOCKED:${along.user.id}:payment`);
		expect(kinds).not.toContain(`PAYMENT_UNLOCKED:${home.user.id}:payment`);
	});
});

describe('reminders', () => {
	test('reminds unsent applications in the last days of the application phase', () => {
		const a = unsent();
		const sent = person({ delegation: { applied: true, role: null, committee: null } });
		const deadline = new Date(now.getTime() + 2 * DAY);
		const snap = snapshot([a, sent], {
			state: 'PARTICIPANT_REGISTRATION',
			assignmentReleased: false,
			startAssignment: deadline
		});
		expect(kindsOf(snap)).toEqual([
			`APPLICATION_DEADLINE_REMINDER:${a.user.id}:${deadline.toISOString().slice(0, 10)}`
		]);
		expect(kindsOf(snap, new Date(now.getTime() - 5 * DAY))).toEqual([]);
	});

	test('reminds open issues two weeks and the phone one week before the start', () => {
		const a = seated();
		const snap = snapshot([a], {
			unlockPayments: true,
			startConference: new Date(now.getTime() + 10 * DAY)
		});
		const kinds = kindsOf(snap);
		expect(kinds).toContain(`OPEN_ISSUES_REMINDER:${a.user.id}:open-issues`);
		expect(kinds).not.toContain(`PHONE_READY_REMINDER:${a.user.id}:phone`);
		expect(kindsOf(snap, new Date(now.getTime() + 5 * DAY))).toContain(
			`PHONE_READY_REMINDER:${a.user.id}:phone`
		);
		// nothing once it has begun
		expect(
			kindsOf(snap, new Date(now.getTime() + 11 * DAY)).some((k) => k.includes('REMINDER'))
		).toBe(false);
	});
});

describe('certificates', () => {
	test('go to who attended, once the conference is over and a template exists', () => {
		const there = person({ ...seated(), didAttend: true });
		const away = seated();
		expect(
			kindsOf(snapshot([there, away], { state: 'POST', certificateAvailable: true })).filter((k) =>
				k.startsWith('CERTIFICATE')
			)
		).toEqual([`CERTIFICATE_AVAILABLE:${there.user.id}:certificate`]);
		expect(
			kindsOf(snapshot([there], { state: 'POST', certificateAvailable: false })).some((k) =>
				k.startsWith('CERTIFICATE')
			)
		).toBe(false);
	});
});
