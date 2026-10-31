import { describe, expect, test } from 'vitest';
import {
	dueEmails,
	type EmailSnapshot,
	type SnapshotPerson,
	type SnapshotReview,
	type SnapshotSurvey,
	type SnapshotTeamMember
} from './dueEmails';

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
	conference: Partial<EmailSnapshot['conference']> = {},
	reviews: SnapshotReview[] = [],
	surveys: SnapshotSurvey[] = [],
	team: SnapshotTeamMember[] = []
): EmailSnapshot {
	return {
		conference: {
			id: 'c1',
			title: 'MUN',
			state: 'PREPARATION',
			assignmentReleased: true,
			unlockPostals: false,
			unlockPayments: false,
			applicationDeadline: new Date(now.getTime() - 30 * DAY),
			startConference: new Date(now.getTime() + 60 * DAY),
			timezone: 'Europe/Berlin',
			certificateAvailable: false,
			...conference
		},
		people,
		team,
		reviews,
		surveys
	};
}

const kindsOf = (snap: EmailSnapshot, at = now) =>
	dueEmails({ snapshot: snap, now: at }).map(
		(email) => `${email.kind}:${email.recipient.id}:${email.subjectKey}`
	);

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
		const emails = dueEmails({ snapshot: snapshot([a, b, supervisor]), now }).filter(
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
			applicationDeadline: deadline
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

	test('are owed any time before their date when sent by hand, while what they remind of holds', () => {
		const open = seated();
		const settled = seated();
		settled.paymentStatus = 'DONE';
		const deadline = new Date(now.getTime() + 30 * DAY);
		const snap = snapshot(
			[open, settled],
			{ unlockPayments: true, startConference: new Date(now.getTime() + 60 * DAY) },
			[],
			[{ id: 's1', title: 'Workshops', deadline, answeredBy: [settled.participantId] }]
		);
		const byHand = (at: Date) =>
			dueEmails({ snapshot: snap, now: at, anyTimeBefore: true })
				.filter((email) => email.kind.endsWith('REMINDER'))
				.map((email) => `${email.kind}:${email.recipient.id}`);

		expect(kindsOf(snap).some((k) => k.includes('REMINDER'))).toBe(false);
		expect(byHand(now)).toEqual([
			`OPEN_ISSUES_REMINDER:${open.user.id}`,
			`PHONE_READY_REMINDER:${open.user.id}`,
			`SURVEY_REMINDER:${open.user.id}`,
			`PHONE_READY_REMINDER:${settled.user.id}`
		]);
		// not once the date has passed
		expect(byHand(new Date(now.getTime() + 61 * DAY))).toEqual([]);
	});
});

describe('survey reminders', () => {
	const survey = (deadline: Date, answeredBy: SnapshotPerson[] = []): SnapshotSurvey => ({
		id: 's1',
		title: 'Workshops',
		deadline,
		answeredBy: answeredBy.map((p) => p.participantId)
	});
	const surveyKinds = (snap: EmailSnapshot, at = now) =>
		kindsOf(snap, at).filter((k) => k.startsWith('SURVEY_REMINDER'));

	test('remind everybody seated who has not answered, in the last days before the deadline', () => {
		const answered = seated();
		const open = seated();
		const unseated = person({ delegation: { applied: true, role: null, committee: null } });
		const deadline = new Date(now.getTime() + 2 * DAY);
		const snap = snapshot([answered, open, unseated], {}, [], [survey(deadline, [answered])]);
		expect(surveyKinds(snap)).toEqual([
			`SURVEY_REMINDER:${open.user.id}:s1:${deadline.toISOString().slice(0, 10)}`
		]);
		// not yet, and not once it has closed
		expect(surveyKinds(snap, new Date(now.getTime() - 5 * DAY))).toEqual([]);
		expect(surveyKinds(snap, new Date(now.getTime() + 3 * DAY))).toEqual([]);
	});

	test('wait for the assignment to be released', () => {
		const open = seated();
		const deadline = new Date(now.getTime() + 2 * DAY);
		expect(
			surveyKinds(snapshot([open], { assignmentReleased: false }, [], [survey(deadline)]))
		).toEqual([]);
	});

	test('carry the survey along', () => {
		const open = seated();
		const due = dueEmails({
			snapshot: snapshot([open], {}, [], [survey(new Date(now.getTime() + DAY))]),
			now
		}).find((email) => email.kind === 'SURVEY_REMINDER');
		expect(due?.survey?.title).toBe('Workshops');
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

describe('paper reviews', () => {
	const review = (id: string, author: SnapshotPerson): SnapshotReview => ({
		id,
		authorParticipantId: author.participantId,
		paperId: 'paper-1',
		paperType: 'POSITION_PAPER',
		agendaItem: null,
		reviewer: { name: 'Robin Reviewer', email: 'robin@example.org' },
		statusAfter: 'CHANGES_REQUESTED'
	});

	test('tell the author of each review, whatever stage the conference is in', () => {
		const author = seated();
		const other = seated();
		const reviews = [review('r1', author), review('r2', author)];
		for (const conference of [{ assignmentReleased: false }, { state: 'POST' as const }]) {
			const kinds = kindsOf(snapshot([author, other], conference, reviews)).filter((k) =>
				k.startsWith('PAPER_REVIEWED')
			);
			expect(kinds).toEqual([
				`PAPER_REVIEWED:${author.user.id}:r1`,
				`PAPER_REVIEWED:${author.user.id}:r2`
			]);
		}
	});

	test('carry the review along', () => {
		const author = seated();
		const [due] = dueEmails({
			snapshot: snapshot([author], { assignmentReleased: false }, [review('r1', author)]),
			now
		});
		expect(due?.review?.id).toBe('r1');
	});
});

describe('the team welcome', () => {
	const member = (id: string): SnapshotTeamMember => ({
		id,
		role: 'MEMBER',
		user: { ...person().user },
		inviterName: 'Ada Lovelace'
	});

	test('welcomes every member once per membership, whatever stage the conference is in', () => {
		const a = member('tm1');
		const b = member('tm2');
		for (const conference of [
			{ state: 'PRE' as const, assignmentReleased: false },
			{ state: 'POST' as const }
		]) {
			expect(kindsOf(snapshot([], conference, [], [], [a, b]))).toEqual([
				`TEAM_WELCOME:${a.user.id}:tm1`,
				`TEAM_WELCOME:${b.user.id}:tm2`
			]);
		}
	});

	test('carries the membership along and is addressed to the member', () => {
		const a = member('tm1');
		const [due] = dueEmails({ snapshot: snapshot([], {}, [], [], [a]), now });
		expect(due?.teamMember).toBe(a);
		expect(due?.recipient).toBe(a.user);
		expect(due?.person).toBeUndefined();
	});
});
