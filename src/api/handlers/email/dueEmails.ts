import type * as schema from '#api/db/schema/index';
import getSimplifiedPostalStatus from '#lib/helpers/getSimplifiedPostalStatus';
import { ofAgeAtConference } from '#lib/helpers/ageChecker';
import {
	APPLICATION_REMINDER_DAYS,
	OPEN_ISSUES_REMINDER_DAYS,
	PHONE_READY_REMINDER_DAYS,
	SURVEY_REMINDER_DAYS,
	type AlwaysSentKind
} from '#lib/helpers/emailKinds';

/**
 * Which automatic mails a conference owes whom, decided from its current state alone. Every mail
 * follows from a state - an assignment released, a status set, a date near - rather than from the
 * moment something changed, so the sweep (`emailSweep.ts`) can run any time and as often as it
 * likes: what was already sent is in the log, keyed by kind, person and `subjectKey`.
 */

export type EmailKind = (typeof schema.emailKind.enumValues)[number];
/** The kinds that follow from state; the team invitation is sent where it happens. */
export type AutomaticEmailKind = Exclude<EmailKind, AlwaysSentKind>;
type Status = (typeof schema.administrativeStatus.enumValues)[number];

export interface SnapshotRole {
	id: string;
	kind: (typeof schema.conferenceRoleKind.enumValues)[number];
	name: string | null;
	nationAlpha3Code: string | null;
}

/** Who a mail goes to. */
export interface SnapshotUser {
	id: string;
	email: string;
	givenName: string;
	familyName: string;
	locale: string | null;
	birthday: Date | null;
}

export interface SnapshotPerson {
	participantId: string;
	user: SnapshotUser;
	paymentStatus: Status;
	termsAndConditions: Status;
	guardianConsent: Status;
	mediaConsent: Status;
	didAttend: boolean;
	delegation: { applied: boolean; role: SnapshotRole | null; committee: string | null } | null;
	single: { applied: boolean; role: SnapshotRole | null } | null;
	/** The people (participant ids) a supervisor supervises. */
	supervisor: { plansOwnAttendance: boolean; studentIds: string[] } | null;
	/** The waiting list entry the person was given their seat from. */
	seatedFromWaitingList: { entryId: string } | null;
}

/** A review of a paper, owed to its author. */
export interface SnapshotReview {
	id: string;
	/** The participant who wrote the paper. */
	authorParticipantId: string;
	paperId: string;
	paperType: (typeof schema.paperType.enumValues)[number];
	/** Committee and agenda item (`GV: Climate`), for a paper that belongs to one. */
	agendaItem: string | null;
	reviewer: { name: string; email: string } | null;
	statusAfter: (typeof schema.paperStatus.enumValues)[number] | null;
}

/** A member of the conference's team. */
export interface SnapshotTeamMember {
	id: string;
	role: (typeof schema.teamRole.enumValues)[number];
	user: SnapshotUser;
	/** Who invited them onto the team; `null` when nobody did or the account is gone. */
	inviterName: string | null;
}

/** A published survey, owed an answer by everybody holding a seat. */
export interface SnapshotSurvey {
	id: string;
	title: string;
	deadline: Date;
	/** The participants who answered it. */
	answeredBy: string[];
}

export interface EmailSnapshot {
	conference: {
		id: string;
		title: string;
		state: (typeof schema.conferenceState.enumValues)[number];
		assignmentReleased: boolean;
		unlockPostals: boolean;
		unlockPayments: boolean;
		applicationDeadline: Date;
		startConference: Date;
		/** The conference's IANA time zone, which times in its mails are given in. */
		timezone: string;
		/** A certificate template is uploaded, so certificates can be downloaded. */
		certificateAvailable: boolean;
	};
	people: SnapshotPerson[];
	team: SnapshotTeamMember[];
	reviews: SnapshotReview[];
	surveys: SnapshotSurvey[];
}

export type PaperworkField =
	'paymentStatus' | 'termsAndConditions' | 'guardianConsent' | 'mediaConsent';

export interface DueEmail {
	kind: AutomaticEmailKind;
	/** What the mail is about; with kind and recipient it identifies the mail in the log. */
	subjectKey: string;
	recipient: SnapshotUser;
	/** For a mail to a participant: the participant. */
	person?: SnapshotPerson;
	/** For a mail to a team member: the membership. */
	teamMember?: SnapshotTeamMember;
	/** For a supervisor's summary: the students who applied. */
	students?: SnapshotPerson[];
	/** For a supervisor: the student who was linked. */
	student?: SnapshotPerson;
	/** For a problem with the paperwork: which part. */
	field?: PaperworkField;
	/** For a review: the review. */
	review?: SnapshotReview;
	/** For a survey reminder: the survey. */
	survey?: SnapshotSurvey;
}

const DAY = 24 * 60 * 60 * 1000;

/** The role the person holds, as a delegate or as a single participant. */
export function seatOf(person: SnapshotPerson) {
	return person.delegation?.role ?? person.single?.role ?? null;
}

const appliedWithoutSeat = (person: SnapshotPerson) =>
	(!!person.delegation?.applied && !person.delegation.role) ||
	(!!person.single?.applied && !person.single.role);

const hasApplied = (person: SnapshotPerson) =>
	!!person.delegation?.applied || !!person.single?.applied;

const hasUnsentApplication = (person: SnapshotPerson) =>
	(!!person.delegation && !person.delegation.applied) ||
	(!!person.single && !person.single.applied);

/** Within `days` days before `date`, the date itself excluded. */
const inWindowBefore = ({ now, date, days }: { now: Date; date: Date; days: number }) =>
	now.getTime() >= date.getTime() - days * DAY && now.getTime() < date.getTime();

/** What the rules below ask about a person, worked out once per snapshot. */
interface RuleContext {
	conference: EmailSnapshot['conference'];
	/** Whether a reminder for `date` is due: in its window, or any time before for one sent by hand. */
	remindBefore: (args: { date: Date; days: number }) => boolean;
	studentsOf: (person: SnapshotPerson) => SnapshotPerson[];
	reviewsOf: (person: SnapshotPerson) => SnapshotReview[];
	surveys: { survey: SnapshotSurvey; answeredBy: ReadonlySet<string> }[];
	/** Holds a seat, or supervises someone who does and comes along. */
	accepted: (person: SnapshotPerson) => boolean;
	ofAge: (person: SnapshotPerson) => boolean;
	postalDone: (person: SnapshotPerson) => boolean;
}

type Rule = (ctx: RuleContext, person: SnapshotPerson) => DueEmail[];

const email = ({
	kind,
	person,
	subjectKey,
	extra = {}
}: {
	kind: AutomaticEmailKind;
	person: SnapshotPerson;
	subjectKey: string;
	extra?: Partial<DueEmail>;
}): DueEmail => ({ kind, recipient: person.user, person, subjectKey, ...extra });

const paid = (person: SnapshotPerson) => person.paymentStatus === 'DONE';

function ruleContext({
	snapshot,
	now,
	anyTimeBefore
}: {
	snapshot: EmailSnapshot;
	now: Date;
	anyTimeBefore: boolean;
}): RuleContext {
	const { conference, people, reviews, surveys } = snapshot;
	const byParticipant = new Map(people.map((person) => [person.participantId, person]));
	const reviewsByAuthor = Map.groupBy(reviews, (review) => review.authorParticipantId);
	const studentsOf = (person: SnapshotPerson) =>
		(person.supervisor?.studentIds ?? []).flatMap((id) => byParticipant.get(id) ?? []);
	const ofAge = (person: SnapshotPerson) =>
		ofAgeAtConference({
			startConference: conference.startConference,
			dateOfBirth: person.user.birthday
		});
	return {
		conference,
		remindBefore: ({ date, days }) =>
			inWindowBefore({ now, date, days: anyTimeBefore ? Infinity : days }),
		studentsOf,
		reviewsOf: (person) => reviewsByAuthor.get(person.participantId) ?? [],
		surveys: surveys.map((survey) => ({ survey, answeredBy: new Set(survey.answeredBy) })),
		ofAge,
		accepted: (person) =>
			!!seatOf(person) ||
			(!!person.supervisor?.plansOwnAttendance && studentsOf(person).some((s) => !!seatOf(s))),
		postalDone: (person) =>
			getSimplifiedPostalStatus({
				participantStatus: {
					termsAndConditions: person.termsAndConditions,
					guardianConsent: person.guardianConsent,
					mediaConsent: person.mediaConsent
				},
				ofAge: ofAge(person)
			}) === 'DONE'
	};
}

/** The seat, the seat from the waiting list, or the rejection. */
const assignmentResult: Rule = ({ conference }, person) => {
	if (!conference.assignmentReleased) return [];
	const seat = seatOf(person);
	const fromWaitingList = person.seatedFromWaitingList;
	const due: DueEmail[] = [];
	if (seat)
		due.push(
			fromWaitingList
				? email({ kind: 'WAITING_LIST_SEATED', person, subjectKey: fromWaitingList.entryId })
				: email({ kind: 'ASSIGNMENT_ACCEPTED', person, subjectKey: seat.id })
		);
	// Independent of the seat: a seated single can also have applied in a delegation that got none
	if (appliedWithoutSeat(person) && !fromWaitingList)
		due.push(email({ kind: 'ASSIGNMENT_REJECTED', person, subjectKey: 'rejected' }));
	return due;
};

const supervisorSummary: Rule = ({ conference, studentsOf }, person) => {
	if (!conference.assignmentReleased || !person.supervisor) return [];
	const students = studentsOf(person).filter(hasApplied);
	return students.length > 0
		? [
				email({
					kind: 'SUPERVISOR_ASSIGNMENT_SUMMARY',
					person,
					subjectKey: 'summary',
					extra: { students }
				})
			]
		: [];
};

/** Postal registration and payment: unlocked while open, received once done. */
const paperworkSteps: Rule = ({ conference, postalDone }, person) => {
	const postal = postalDone(person);
	return [
		...(conference.unlockPostals && !postal
			? [email({ kind: 'POSTAL_UNLOCKED', person, subjectKey: 'postal' })]
			: []),
		...(conference.unlockPayments && !paid(person)
			? [email({ kind: 'PAYMENT_UNLOCKED', person, subjectKey: 'payment' })]
			: []),
		...(postal ? [email({ kind: 'POSTAL_RECEIVED', person, subjectKey: 'postal' })] : []),
		...(paid(person) ? [email({ kind: 'PAYMENT_RECEIVED', person, subjectKey: 'payment' })] : [])
	];
};

const paperworkProblems: Rule = ({ ofAge }, person) => {
	const fields: PaperworkField[] = ['paymentStatus', 'termsAndConditions', 'mediaConsent'];
	if (!ofAge(person)) fields.push('guardianConsent');
	return fields
		.filter((field) => person[field] === 'PROBLEM')
		.map((field) =>
			email({ kind: 'PAPERWORK_PROBLEM', person, subjectKey: field, extra: { field } })
		);
};

/** The reminders before the conference: open tasks, then the phone. */
const conferenceReminders: Rule = ({ conference, remindBefore, postalDone }, person) => {
	const openIssues =
		(conference.unlockPostals && !postalDone(person)) ||
		(conference.unlockPayments && !paid(person));
	const within = (days: number) => remindBefore({ date: conference.startConference, days });
	return [
		...(openIssues && within(OPEN_ISSUES_REMINDER_DAYS)
			? [email({ kind: 'OPEN_ISSUES_REMINDER', person, subjectKey: 'open-issues' })]
			: []),
		...(within(PHONE_READY_REMINDER_DAYS)
			? [email({ kind: 'PHONE_READY_REMINDER', person, subjectKey: 'phone' })]
			: [])
	];
};

/**
 * Every survey the person has not answered, in the last days before its deadline. Only those
 * holding a seat owe an answer - the same people the results page lists as not having answered.
 */
const surveyReminders: Rule = ({ conference, remindBefore, surveys }, person) =>
	conference.assignmentReleased && seatOf(person)
		? surveys
				.filter(
					({ survey, answeredBy }) =>
						!answeredBy.has(person.participantId) &&
						remindBefore({ date: survey.deadline, days: SURVEY_REMINDER_DAYS })
				)
				// keyed by the deadline: a deadline moved later gets its own reminder
				.map(({ survey }) =>
					email({
						kind: 'SURVEY_REMINDER',
						person,
						subjectKey: `${survey.id}:${survey.deadline.toISOString().slice(0, 10)}`,
						extra: { survey }
					})
				)
		: [];

/** Everything an accepted person gets once the assignment is released. */
const acceptedEmails: Rule = (ctx, person) =>
	ctx.conference.assignmentReleased && ctx.accepted(person)
		? [paperworkSteps, paperworkProblems, conferenceReminders].flatMap((rule) => rule(ctx, person))
		: [];

const applicationReminder: Rule = ({ conference, remindBefore }, person) =>
	conference.state === 'PARTICIPANT_REGISTRATION' &&
	hasUnsentApplication(person) &&
	remindBefore({ date: conference.applicationDeadline, days: APPLICATION_REMINDER_DAYS })
		? // keyed by the deadline: a deadline moved later gets its own reminder
			[
				email({
					kind: 'APPLICATION_DEADLINE_REMINDER',
					person,
					subjectKey: conference.applicationDeadline.toISOString().slice(0, 10)
				})
			]
		: [];

const certificate: Rule = ({ conference }, person) =>
	conference.state === 'POST' && conference.certificateAvailable && person.didAttend
		? [email({ kind: 'CERTIFICATE_AVAILABLE', person, subjectKey: 'certificate' })]
		: [];

const studentsLinked: Rule = ({ studentsOf }, person) =>
	studentsOf(person).map((student) =>
		email({
			kind: 'SUPERVISOR_STUDENT_LINKED',
			person,
			subjectKey: student.participantId,
			extra: { student }
		})
	);

/** Every review of a paper the person wrote, whenever it is written. */
const paperReviewed: Rule = ({ reviewsOf }, person) =>
	reviewsOf(person).map((review) =>
		email({ kind: 'PAPER_REVIEWED', person, subjectKey: review.id, extra: { review } })
	);

/** In the order a person's mails are listed. */
const RULES: Rule[] = [
	assignmentResult,
	supervisorSummary,
	acceptedEmails,
	applicationReminder,
	surveyReminders,
	certificate,
	studentsLinked,
	paperReviewed
];

/** Everybody on the team, once per membership: someone who leaves and comes back is welcomed again. */
const teamWelcome = (member: SnapshotTeamMember): DueEmail => ({
	kind: 'TEAM_WELCOME',
	subjectKey: member.id,
	recipient: member.user,
	teamMember: member
});

/**
 * Every mail the conference owes right now, whether or not it was sent already. `anyTimeBefore`
 * owes each reminder any time before its date rather than only in its last days: what the team
 * may send by hand.
 */
export function dueEmails({
	snapshot,
	now,
	anyTimeBefore = false
}: {
	snapshot: EmailSnapshot;
	now: Date;
	anyTimeBefore?: boolean;
}): DueEmail[] {
	const ctx = ruleContext({ snapshot, now, anyTimeBefore });
	return [
		...snapshot.people.flatMap((person) => RULES.flatMap((rule) => rule(ctx, person))),
		...snapshot.team.map(teamWelcome)
	];
}

/** The log key of a mail: unique per conference, kind, person and subject. */
export const emailKey = (email: { kind: EmailKind; userId: string | null; subjectKey: string }) =>
	`${email.kind}:${email.userId}:${email.subjectKey}`;
