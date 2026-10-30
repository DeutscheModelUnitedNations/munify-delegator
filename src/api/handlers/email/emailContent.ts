import { m } from '#lib/paraglide/messages';
import { getLocale, toLocale } from '#lib/paraglide/runtime';
import formatNames from '#lib/helpers/formatNames';
import { translatePaperStatus, translatePaperType } from '#lib/utils/enumTranslations';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import type {
	DueEmail,
	EmailKind,
	EmailSnapshot,
	PaperworkField,
	SnapshotPerson,
	SnapshotReview,
	SnapshotRole
} from './dueEmails';
import { seatOf } from './dueEmails';
import {
	fillEmailText,
	resolveEmailText,
	type EmailPlaceholderValues,
	type EmailTextOverride
} from '#lib/helpers/emailTemplates';

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

const fullName = (person: SnapshotPerson) =>
	formatNames(person.user.givenName, person.user.familyName, {
		givenNameUppercase: false,
		familyNameUppercase: false
	});

const day = (date: Date) => date.toLocaleDateString(getLocale(), { dateStyle: 'long' });
/** A deadline down to the minute, in the conference's time zone: a survey closes at its time. */
const dateTime = (date: Date, timeZone: string) =>
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
	values: { seat: seatDescription(email.person) },
	button: dashboard
});

const supervisorSummaryItem = (student: SnapshotPerson) =>
	seatOf(student)
		? m.emailAutoSupervisorSummarySeated({
				name: fullName(student),
				seat: seatDescription(student)
			})
		: m.emailAutoSupervisorSummaryNoSeat({ name: fullName(student) });

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
			delegationHint: email.person.delegation ? m.emailAutoApplicationReminderDelegation() : ''
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
					date: dateTime(email.survey.deadline, conference.timezone)
				}
			: {},
		button: dashboard
	}),
	SUPERVISOR_STUDENT_LINKED: ({ email, dashboard }) => ({
		values: { student: email.student ? fullName(email.student) : '' },
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
			: { button: dashboard }
};

/** A conference's own text for one kind and language (`conference_email_text`). */
export interface ConferenceEmailText extends EmailTextOverride {
	kind: EmailKind;
	locale: string;
}

export function emailContent(
	email: DueEmail,
	conference: Conference,
	origin: string,
	texts: readonly ConferenceEmailText[] = []
): EmailContent {
	const locale = getLocale();
	const own = texts.find((text) => text.kind === email.kind && toLocale(text.locale) === locale);
	const kind = CONTENT[email.kind]({
		email,
		conference,
		origin,
		dashboard: { label: m.emailAutoToDashboard(), url: `${origin}/dashboard/${conference.id}` }
	});
	const filled = fillEmailText(
		resolveEmailText(email.kind, locale, own),
		{ name: fullName(email.person), conference: conference.title, ...kind.values },
		kind.items
	);
	return {
		...filled,
		...(kind.button ? { button: kind.button } : {}),
		...(kind.replyTo ? { replyTo: kind.replyTo } : {})
	};
}

export { fullName as recipientName };
