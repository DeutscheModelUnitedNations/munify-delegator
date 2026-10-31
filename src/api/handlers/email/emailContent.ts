import { m } from '#lib/paraglide/messages';
import { getLocale, toLocale } from '#lib/paraglide/runtime';
import formatNames from '#lib/helpers/formatNames';
import {
	translatePaperStatus,
	translatePaperType,
	translateTeamRole
} from '#lib/utils/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import type {
	DueEmail,
	EmailKind,
	EmailSnapshot,
	PaperworkField,
	SnapshotPerson,
	SnapshotReview,
	SnapshotRole,
	SnapshotUser
} from './dueEmails';
import { seatOf } from './dueEmails';
import {
	fillEmailText,
	resolveEmailText,
	type EmailPlaceholderValues,
	type EmailTextOverride
} from './emailText';

/**
 * What an automatic mail says, in the locale it is rendered in (`runWithLocale`). Every kind is the
 * same template (`NotificationEmail.svelte`) with its own text: the conference's own where it wrote
 * one (`conference_email_text`), else the default (`#lib/helpers/emailTemplates`), filled in here.
 */
export interface EmailContent {
	subject: string;
	heading: string;
	paragraphs: string[];
	items?: string[];
	closing?: string[];
	button?: { label: string; url: string };
	/** Where an answer goes, when not to the conference's own address. */
	replyTo?: string;
}

type Conference = EmailSnapshot['conference'];

const fullName = (user: SnapshotUser) =>
	formatNames({
		givenName: user.givenName,
		familyName: user.familyName,
		options: {
			givenNameUppercase: false,
			familyNameUppercase: false
		}
	});

const day = (date: Date) => date.toLocaleDateString(getLocale(), { dateStyle: 'long' });
/** A deadline down to the minute, in the conference's time zone: a survey closes at its time. */
const dateTime = ({ date, timeZone }: { date: Date; timeZone: string }) =>
	date.toLocaleString(getLocale(), {
		dateStyle: 'long',
		timeStyle: 'short',
		timeZone
	});

/** A role as the recipient reads it: the nation's name in their language, or the role's own. */
function roleName(role: SnapshotRole) {
	return role.nationAlpha3Code
		? getFullTranslatedCountryNameFromISO3Code(role.nationAlpha3Code)
		: (role.name ?? '');
}

/** The role a person holds, with the committee a delegate sits in. */
function seatDescription(person: SnapshotPerson) {
	const seat = seatOf(person);
	if (!seat) return '';
	const committee = person.delegation?.committee;
	return committee
		? m.emailAutoSeatInCommittee({ role: roleName(seat), committee })
		: roleName(seat);
}

const paperworkLabel: Record<PaperworkField, () => string> = {
	paymentStatus: () => m.emailAutoProblemPayment(),
	termsAndConditions: () => m.emailAutoProblemTerms(),
	guardianConsent: () => m.emailAutoProblemGuardian(),
	mediaConsent: () => m.emailAutoProblemMedia()
};

/** What every kind's text can draw on. */
interface ContentContext {
	email: DueEmail;
	conference: Conference;
	dashboard: { label: string; url: string };
	origin: string;
}

/** What a kind adds to its text: the values beyond name and conference, its list, its button. */
interface KindContent {
	values?: EmailPlaceholderValues;
	items?: string[];
	button?: { label: string; url: string };
	replyTo?: string;
}

type ContentBuilder = (ctx: ContentContext) => KindContent;

const withDashboard: ContentBuilder = ({ dashboard }) => ({ button: dashboard });
const seated: ContentBuilder = ({ email, dashboard }) => ({
	values: { seat: email.person ? seatDescription(email.person) : '' },
	button: dashboard
});

const supervisorSummaryItem = (student: SnapshotPerson) =>
	seatOf(student)
		? m.emailAutoSupervisorSummarySeated({
				name: fullName(student.user),
				seat: seatDescription(student)
			})
		: m.emailAutoSupervisorSummaryNoSeat({ name: fullName(student.user) });

/** What the author reads about a review: the paper, who reviewed it, the paper's new status. */
const reviewValues = (review: SnapshotReview) => ({
	paper: review.agendaItem ?? translatePaperType(review.paperType),
	reviewer: review.reviewer
		? `${review.reviewer.name} (${review.reviewer.email})`
		: m.emailAutoPaperReviewedTeam(),
	status: review.statusAfter ? translatePaperStatus(review.statusAfter) : ''
});

const CONTENT: Record<DueEmail['kind'], ContentBuilder> = {
	ASSIGNMENT_ACCEPTED: seated,
	WAITING_LIST_SEATED: seated,
	ASSIGNMENT_REJECTED: ({ conference, origin }) => ({
		button: {
			label: m.emailAutoToWaitingList(),
			url: `${origin}/registration/${conference.id}/waiting-list`
		}
	}),
	SUPERVISOR_ASSIGNMENT_SUMMARY: ({ email, dashboard }) => ({
		items: (email.students ?? []).map(supervisorSummaryItem),
		button: dashboard
	}),
	POSTAL_UNLOCKED: withDashboard,
	PAYMENT_UNLOCKED: withDashboard,
	POSTAL_RECEIVED: () => ({}),
	PAYMENT_RECEIVED: () => ({}),
	CERTIFICATE_AVAILABLE: withDashboard,
	PAPERWORK_PROBLEM: ({ email, dashboard }) => ({
		values: { item: email.field ? paperworkLabel[email.field]() : '' },
		button: dashboard
	}),
	APPLICATION_DEADLINE_REMINDER: ({ email, conference, dashboard }) => ({
		values: {
			date: day(conference.applicationDeadline),
			delegationHint: email.person?.delegation ? m.emailAutoApplicationReminderDelegation() : ''
		},
		button: dashboard
	}),
	OPEN_ISSUES_REMINDER: ({ conference, dashboard }) => ({
		values: { date: day(conference.startConference) },
		items: [
			...(conference.unlockPostals ? [m.emailAutoOpenIssuesPostal()] : []),
			...(conference.unlockPayments ? [m.emailAutoOpenIssuesPayment()] : [])
		],
		button: dashboard
	}),
	PHONE_READY_REMINDER: ({ conference, origin }) => ({
		values: { date: day(conference.startConference) },
		items: [m.emailAutoPhoneLogin(), m.emailAutoPhoneHomeScreen(), m.emailAutoPhoneBattery()],
		button: {
			label: m.emailAutoPhoneButton(),
			url: `${origin}/dashboard/${conference.id}/registration-mode`
		}
	}),
	SURVEY_REMINDER: ({ email, conference, dashboard }) => ({
		values: email.survey
			? {
					survey: email.survey.title,
					date: dateTime({ date: email.survey.deadline, timeZone: conference.timezone })
				}
			: {},
		button: dashboard
	}),
	SUPERVISOR_STUDENT_LINKED: ({ email, dashboard }) => ({
		values: { student: email.student ? fullName(email.student.user) : '' },
		button: dashboard
	}),
	PAPER_REVIEWED: ({ email, conference, origin, dashboard }) =>
		email.review
			? {
					values: reviewValues(email.review),
					button: {
						label: m.emailAutoPaperReviewedButton(),
						url: `${origin}/dashboard/${conference.id}/paperhub/${email.review.paperId}`
					},
					replyTo: email.review.reviewer?.email
				}
			: { button: dashboard },
	TEAM_WELCOME: ({ email, dashboard }) => ({
		values: email.teamMember
			? {
					role: translateTeamRole(email.teamMember.role),
					inviter: email.teamMember.inviterName ?? m.emailTeamInvitationUnknownInviter()
				}
			: {},
		button: dashboard
	})
};

/** A conference's own text for one kind and language (`conference_email_text`). */
export interface ConferenceEmailText extends EmailTextOverride {
	kind: EmailKind;
	locale: string;
}

export function emailContent({
	email,
	conference,
	origin,
	texts = []
}: {
	email: DueEmail;
	conference: Conference;
	origin: string;
	texts?: readonly ConferenceEmailText[];
}): EmailContent {
	const locale = getLocale();
	const own = texts.find((text) => text.kind === email.kind && toLocale(text.locale) === locale);
	const kind = CONTENT[email.kind]({
		email,
		conference,
		origin,
		dashboard: { label: m.emailAutoToDashboard(), url: `${origin}/dashboard/${conference.id}` }
	});
	const filled = fillEmailText({
		text: resolveEmailText({ kind: email.kind, locale, override: own }),
		values: { name: fullName(email.recipient), conference: conference.title, ...kind.values },
		items: kind.items
	});
	return {
		...filled,
		...(kind.button ? { button: kind.button } : {}),
		...(kind.replyTo ? { replyTo: kind.replyTo } : {})
	};
}

/** The paperwork as the user card names it. */
const paperworkTitle: Record<PaperworkField, () => string> = {
	paymentStatus: () => m.payment(),
	termsAndConditions: () => m.userAgreement(),
	guardianConsent: () => m.guardianAgreement(),
	mediaConsent: () => m.mediaAgreement()
};

/**
 * What tells a person's mails of one kind apart, for the team: the paperwork, the survey, the
 * paper, the student or the team role it is about. `undefined` for a kind a person gets once.
 */
export function emailDetail(email: DueEmail): string | undefined {
	if (email.field) return paperworkTitle[email.field]();
	if (email.survey) return email.survey.title;
	if (email.review) return reviewValues(email.review).paper;
	if (email.student) return fullName(email.student.user);
	if (email.teamMember) return translateTeamRole(email.teamMember.role);
	return undefined;
}

export { fullName as recipientName };
