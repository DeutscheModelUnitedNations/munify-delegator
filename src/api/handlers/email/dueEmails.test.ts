import { describe, expect, test } from 'vitest';
import {
	dueEmails,
	type EmailSnapshot,
	type SnapshotPerson,
	type SnapshotReview,
	type SnapshotSurvey,
	type SnapshotTeamMember,
	type SnapshotWaitingEntry
} from './dueEmails';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-01T12:00:00Z');
const france = {
	id: 'role-fra',
	kind: 'NATION' as const,
	name: null,
	nationAlpha3Code: 'FRA'
};

let counter = 0;
/** A membership of a delegation of its own, unless `id` names a shared one. */
function membership(
	overrides: Partial<NonNullable<SnapshotPerson['delegation']>> & { applied: boolean }
): NonNullable<SnapshotPerson['delegation']> {
	counter++;
	return {
		id: `d${counter}`,
		entryCode: `CODE${counter}`,
		isHeadDelegate: true,
		joinedAt: new Date(now.getTime() - 10 * DAY),
		role: null,
		committee: null,
		committeeId: null,
		...overrides
	};
}

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
		supervisorIds: [],
		...overrides
	};
}

function snapshot(
	people: SnapshotPerson[],
	conference: Partial<EmailSnapshot['conference']> = {},
	reviews: SnapshotReview[] = [],
	surveys: SnapshotSurvey[] = [],
	team: SnapshotTeamMember[] = [],
	waitingList: SnapshotWaitingEntry[] = [],
	neighbours: SnapshotPerson[] = []
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
			chaseUrl: null,
			...conference
		},
		people,
		neighbours,
		team,
		reviews,
		surveys,
		waitingList
	};
}

const kindsOf = (snap: EmailSnapshot, at = now) =>
	dueEmails({ snapshot: snap, now: at }).map(
		(email) => `${email.kind}:${email.recipient.id}:${email.subjectKey}`
	);
/** Only the mails of `kinds`. */
const onlyKinds = ({
	snap,
	kinds,
	at = now
}: {
	snap: EmailSnapshot;
	kinds: readonly string[];
	at?: Date;
}) => kindsOf(snap, at).filter((key) => kinds.some((kind) => key.startsWith(`${kind}:`)));

const seated = () =>
	person({
		delegation: membership({ applied: true, role: france, committee: 'GV', committeeId: 'c-gv' })
	});
const rejected = () =>
	person({
		delegation: membership({ applied: true, role: null, committee: null, committeeId: null })
	});
const unsent = () =>
	person({
		delegation: membership({ applied: false, role: null, committee: null, committeeId: null })
	});

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
		const snap = snapshot([seated(), rejected()], { assignmentReleased: false });
		expect(onlyKinds({ snap, kinds: ['ASSIGNMENT_ACCEPTED', 'ASSIGNMENT_REJECTED'] })).toEqual([]);
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
		const sent = person({
			delegation: membership({ applied: true, role: null, committee: null, committeeId: null })
		});
		const deadline = new Date(now.getTime() + 2 * DAY);
		const snap = snapshot([a, sent], {
			state: 'PARTICIPANT_REGISTRATION',
			assignmentReleased: false,
			applicationDeadline: deadline
		});
		const kinds = ['APPLICATION_DEADLINE_REMINDER'];
		expect(onlyKinds({ snap, kinds })).toEqual([
			`APPLICATION_DEADLINE_REMINDER:${a.user.id}:${deadline.toISOString().slice(0, 10)}`
		]);
		expect(onlyKinds({ snap, kinds, at: new Date(now.getTime() - 5 * DAY) })).toEqual([]);
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
		const unseated = person({
			delegation: membership({ applied: true, role: null, committee: null, committeeId: null })
		});
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
		const due = dueEmails({
			snapshot: snapshot([author], { assignmentReleased: false }, [review('r1', author)]),
			now
		}).find((email) => email.kind === 'PAPER_REVIEWED');
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

describe('the CHASE introduction', () => {
	const start = new Date(now.getTime() + 8 * DAY);
	const linked = { startConference: start, chaseUrl: 'https://chase.example' };
	const key = (p: SnapshotPerson) =>
		`CHASE_INTRO_REMINDER:${p.user.id}:${start.toISOString().slice(0, 10)}`;

	test('invites delegates with a committee, NSAs and singles, ten days before', () => {
		const delegate = seated();
		const nsa = person({
			delegation: membership({
				applied: true,
				role: { ...france, id: 'nsa', kind: 'NON_STATE_ACTOR', nationAlpha3Code: null },
				committee: null,
				committeeId: null
			})
		});
		const press = person({
			single: { applied: true, role: { ...france, id: 'press', kind: 'CUSTOM' } }
		});
		const kinds = kindsOf(snapshot([delegate, nsa, press], linked));
		expect(kinds.filter((k) => k.startsWith('CHASE_INTRO_REMINDER'))).toEqual([
			key(delegate),
			key(nsa),
			key(press)
		]);
		expect(
			kindsOf(
				snapshot([delegate], { ...linked, startConference: new Date(now.getTime() + 12 * DAY) })
			)
		).not.toContain(key(delegate));
	});

	test('owes nothing while no CHASE instance is linked', () => {
		const kinds = kindsOf(snapshot([seated()], { ...linked, chaseUrl: null }));
		expect(kinds.some((k) => k.startsWith('CHASE_INTRO_REMINDER'))).toBe(false);
	});
});

describe('while a delegation is put together', () => {
	const registration = { state: 'PARTICIPANT_REGISTRATION' as const, assignmentReleased: false };
	const kinds = ['DELEGATION_CREATED', 'DELEGATION_JOINED', 'DELEGATION_MEMBER_JOINED'];
	const member = ({ joinedDaysAgo, head = false }: { joinedDaysAgo: number; head?: boolean }) =>
		person({
			delegation: membership({
				id: 'd-shared',
				applied: false,
				isHeadDelegate: head,
				joinedAt: new Date(now.getTime() - joinedDaysAgo * DAY)
			})
		});

	test('gives the head the code, welcomes the others, and tells earlier members of later ones', () => {
		const head = member({ joinedDaysAgo: 3, head: true });
		const second = member({ joinedDaysAgo: 2 });
		const third = member({ joinedDaysAgo: 1 });
		const snap = snapshot([third, head, second], registration);
		expect(onlyKinds({ snap, kinds }).toSorted()).toEqual(
			[
				`DELEGATION_CREATED:${head.user.id}:d-shared`,
				`DELEGATION_JOINED:${second.user.id}:d-shared`,
				`DELEGATION_JOINED:${third.user.id}:d-shared`,
				`DELEGATION_MEMBER_JOINED:${head.user.id}:d-shared:${second.participantId}`,
				`DELEGATION_MEMBER_JOINED:${head.user.id}:d-shared:${third.participantId}`,
				`DELEGATION_MEMBER_JOINED:${second.user.id}:d-shared:${third.participantId}`
			].toSorted()
		);
	});

	test('names the newcomer in the mail', () => {
		const head = member({ joinedDaysAgo: 2, head: true });
		const newcomer = member({ joinedDaysAgo: 1 });
		const due = dueEmails({ snapshot: snapshot([head, newcomer], registration), now }).find(
			(email) => email.kind === 'DELEGATION_MEMBER_JOINED'
		);
		expect(due?.recipient.id).toBe(head.user.id);
		expect(due?.member).toBe(newcomer);
	});

	test('stops once the delegation applied or registration closed', () => {
		const applied = person({ delegation: membership({ applied: true }) });
		expect(onlyKinds({ snap: snapshot([applied], registration), kinds })).toEqual([]);
		const open = member({ joinedDaysAgo: 1, head: true });
		const closed = snapshot([open], { state: 'PREPARATION', assignmentReleased: false });
		expect(onlyKinds({ snap: closed, kinds })).toEqual([]);
	});
});

describe('the application sent', () => {
	test('confirms to every applicant once, until the release', () => {
		const delegate = person({ delegation: membership({ applied: true }) });
		const single = person({ single: { applied: true, role: null } });
		const notYet = unsent();
		const snap = snapshot([delegate, single, notYet], { assignmentReleased: false });
		expect(onlyKinds({ snap, kinds: ['APPLICATION_SENT'] })).toEqual([
			`APPLICATION_SENT:${delegate.user.id}:applied`,
			`APPLICATION_SENT:${single.user.id}:applied`
		]);
		const released = snapshot([delegate, single]);
		expect(onlyKinds({ snap: released, kinds: ['APPLICATION_SENT'] })).toEqual([]);
	});
});

describe('the waiting list', () => {
	test('confirms each entry to the person waiting', () => {
		const { user } = person();
		const snap = snapshot([], {}, [], [], [], [{ id: 'w1', user }]);
		expect(kindsOf(snap)).toEqual([`WAITING_LIST_REGISTERED:${user.id}:w1`]);
	});
});

describe('a supervisor connected', () => {
	test('tells the student about each supervisor', () => {
		const student = person();
		const supervisor = person({
			supervisor: { plansOwnAttendance: false, studentIds: [student.participantId] }
		});
		student.supervisorIds.push(supervisor.participantId);
		const due = dueEmails({ snapshot: snapshot([student, supervisor]), now }).filter(
			(email) => email.kind === 'SUPERVISOR_CONNECTED'
		);
		expect(due.map((email) => [email.recipient.id, email.subjectKey])).toEqual([
			[student.user.id, supervisor.participantId]
		]);
		expect(due[0]?.supervisor).toBe(supervisor);
	});
});

describe('a survey published', () => {
	const published = (deadline: Date, answeredBy: SnapshotPerson[] = []): SnapshotSurvey => ({
		id: 's1',
		title: 'Workshops',
		deadline,
		answeredBy: answeredBy.map((p) => p.participantId)
	});

	test('tells everybody seated who has not answered, while it is open', () => {
		const answered = seated();
		const open = seated();
		const unseated = rejected();
		const deadline = new Date(now.getTime() + 20 * DAY);
		const snap = snapshot([answered, open, unseated], {}, [], [published(deadline, [answered])]);
		expect(onlyKinds({ snap, kinds: ['SURVEY_PUBLISHED'] })).toEqual([
			`SURVEY_PUBLISHED:${open.user.id}:s1`
		]);
		const over = snapshot([open], {}, [], [published(new Date(now.getTime() - DAY))]);
		expect(onlyKinds({ snap: over, kinds: ['SURVEY_PUBLISHED'] })).toEqual([]);
	});
});

describe('a page of people', () => {
	test('reads about neighbours but owes them nothing', () => {
		const student = seated();
		const supervisor = person({
			supervisor: { plansOwnAttendance: false, studentIds: [student.participantId] }
		});
		const kinds = kindsOf(snapshot([supervisor], {}, [], [], [], [], [student]));
		expect(kinds).toContain(
			`SUPERVISOR_STUDENT_LINKED:${supervisor.user.id}:${student.participantId}`
		);
		expect(kinds.some((key) => key.includes(`:${student.user.id}:`))).toBe(false);
	});

	test('tells a member of a newcomer outside the page', () => {
		const registration = { state: 'PARTICIPANT_REGISTRATION' as const, assignmentReleased: false };
		const shared = (daysAgo: number, head: boolean) =>
			membership({
				id: 'd-page',
				applied: false,
				isHeadDelegate: head,
				joinedAt: new Date(now.getTime() - daysAgo * DAY)
			});
		const head = person({ delegation: shared(2, true) });
		const newcomer = person({ delegation: shared(1, false) });
		const snap = snapshot([head], registration, [], [], [], [], [newcomer]);
		expect(onlyKinds({ snap, kinds: ['DELEGATION_MEMBER_JOINED'] })).toEqual([
			`DELEGATION_MEMBER_JOINED:${head.user.id}:d-page:${newcomer.participantId}`
		]);
	});
});
