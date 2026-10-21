import { m } from '#lib/paraglide/messages.js';
import { getLocale } from '#lib/paraglide/runtime.js';
import formatNames from '#lib/helpers/formatNames.js';
import { getFullTranslatedCountryNameFromISO3Code } from '#lib/utils/nationTranslationHelper.svelte.js';
import type {
	DueEmail,
	EmailSnapshot,
	PaperworkField,
	SnapshotPerson,
	SnapshotRole
} from './dueEmails';
import { seatOf } from './dueEmails';

/**
 * What an automatic mail says, in the locale it is rendered in (`runWithLocale`). Every kind is the
 * same template (`NotificationEmail.svelte`) with its own text.
 */
export interface EmailContent {
	subject: string;
	heading: string;
	paragraphs: string[];
	items?: string[];
	closing?: string[];
	button?: { label: string; url: string };
}

type Conference = EmailSnapshot['conference'];

const fullName = (person: SnapshotPerson) =>
	formatNames(person.user.givenName, person.user.familyName, {
		givenNameUppercase: false,
		familyNameUppercase: false
	});

const day = (date: Date) => date.toLocaleDateString(getLocale(), { dateStyle: 'long' });

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
	title: string;
	dashboard: { label: string; url: string };
	origin: string;
}

type ContentBuilder = (ctx: ContentContext) => EmailContent;

/** For a mail that hands out a seat: where it is, and what to do next. */
const seated =
	(texts: {
		subject: (args: { conference: string }) => string;
		heading: () => string;
		body: (args: { conference: string; seat: string }) => string;
	}): ContentBuilder =>
	({ email, title, dashboard }) => ({
		subject: texts.subject({ conference: title }),
		heading: texts.heading(),
		paragraphs: [
			texts.body({ conference: title, seat: seatDescription(email.person) }),
			m.emailAutoNextSteps()
		],
		button: dashboard
	});

/** For a mail that only confirms something, with no step to take. */
const notice =
	(
		texts: {
			subject: (args: { conference: string }) => string;
			heading: () => string;
			body: (args: { conference: string }) => string;
		},
		withButton: boolean
	): ContentBuilder =>
	({ title, dashboard }) => ({
		subject: texts.subject({ conference: title }),
		heading: texts.heading(),
		paragraphs: [texts.body({ conference: title })],
		...(withButton ? { button: dashboard } : {})
	});

const supervisorSummaryItem = (student: SnapshotPerson) =>
	seatOf(student)
		? m.emailAutoSupervisorSummarySeated({
				name: fullName(student),
				seat: seatDescription(student)
			})
		: m.emailAutoSupervisorSummaryNoSeat({ name: fullName(student) });

const CONTENT: Record<DueEmail['kind'], ContentBuilder> = {
	ASSIGNMENT_ACCEPTED: seated({
		subject: m.emailAutoAcceptedSubject,
		heading: m.emailAutoAcceptedHeading,
		body: m.emailAutoAcceptedBody
	}),
	WAITING_LIST_SEATED: seated({
		subject: m.emailAutoWaitingListSubject,
		heading: m.emailAutoWaitingListHeading,
		body: m.emailAutoWaitingListBody
	}),
	ASSIGNMENT_REJECTED: ({ conference, title, origin }) => ({
		subject: m.emailAutoRejectedSubject({ conference: title }),
		heading: m.emailAutoRejectedHeading(),
		paragraphs: [m.emailAutoRejectedBody({ conference: title }), m.emailAutoRejectedWaitingList()],
		button: {
			label: m.emailAutoToWaitingList(),
			url: `${origin}/registration/${conference.id}/waiting-list`
		}
	}),
	SUPERVISOR_ASSIGNMENT_SUMMARY: ({ email, title, dashboard }) => ({
		subject: m.emailAutoSupervisorSummarySubject({ conference: title }),
		heading: m.emailAutoSupervisorSummaryHeading(),
		paragraphs: [m.emailAutoSupervisorSummaryBody({ conference: title })],
		items: (email.students ?? []).map(supervisorSummaryItem),
		closing: [m.emailAutoSupervisorSummaryClosing()],
		button: dashboard
	}),
	POSTAL_UNLOCKED: notice(
		{
			subject: m.emailAutoPostalUnlockedSubject,
			heading: m.emailAutoPostalUnlockedHeading,
			body: m.emailAutoPostalUnlockedBody
		},
		true
	),
	PAYMENT_UNLOCKED: notice(
		{
			subject: m.emailAutoPaymentUnlockedSubject,
			heading: m.emailAutoPaymentUnlockedHeading,
			body: m.emailAutoPaymentUnlockedBody
		},
		true
	),
	POSTAL_RECEIVED: notice(
		{
			subject: m.emailAutoPostalReceivedSubject,
			heading: m.emailAutoPostalReceivedHeading,
			body: m.emailAutoPostalReceivedBody
		},
		false
	),
	PAYMENT_RECEIVED: notice(
		{
			subject: m.emailAutoPaymentReceivedSubject,
			heading: m.emailAutoPaymentReceivedHeading,
			body: m.emailAutoPaymentReceivedBody
		},
		false
	),
	CERTIFICATE_AVAILABLE: notice(
		{
			subject: m.emailAutoCertificateSubject,
			heading: m.emailAutoCertificateHeading,
			body: m.emailAutoCertificateBody
		},
		true
	),
	PAPERWORK_PROBLEM: ({ email, title, dashboard }) => ({
		subject: m.emailAutoProblemSubject({ conference: title }),
		heading: m.emailAutoProblemHeading(),
		paragraphs: [
			m.emailAutoProblemBody({
				conference: title,
				item: email.field ? paperworkLabel[email.field]() : ''
			})
		],
		button: dashboard
	}),
	APPLICATION_DEADLINE_REMINDER: ({ email, conference, title, dashboard }) => ({
		subject: m.emailAutoApplicationReminderSubject({ conference: title }),
		heading: m.emailAutoApplicationReminderHeading(),
		paragraphs: [
			m.emailAutoApplicationReminderBody({
				conference: title,
				date: day(conference.startAssignment)
			}),
			...(email.person.delegation ? [m.emailAutoApplicationReminderDelegation()] : [])
		],
		button: dashboard
	}),
	OPEN_ISSUES_REMINDER: ({ conference, title, dashboard }) => ({
		subject: m.emailAutoOpenIssuesSubject({ conference: title }),
		heading: m.emailAutoOpenIssuesHeading(),
		paragraphs: [
			m.emailAutoOpenIssuesBody({ conference: title, date: day(conference.startConference) })
		],
		items: [
			...(conference.unlockPostals ? [m.emailAutoOpenIssuesPostal()] : []),
			...(conference.unlockPayments ? [m.emailAutoOpenIssuesPayment()] : [])
		],
		closing: [m.emailAutoOpenIssuesClosing()],
		button: dashboard
	}),
	PHONE_READY_REMINDER: ({ conference, title, origin }) => ({
		subject: m.emailAutoPhoneSubject({ conference: title }),
		heading: m.emailAutoPhoneHeading(),
		paragraphs: [
			m.emailAutoPhoneBody({ conference: title, date: day(conference.startConference) })
		],
		items: [m.emailAutoPhoneLogin(), m.emailAutoPhoneHomeScreen(), m.emailAutoPhoneBattery()],
		button: {
			label: m.emailAutoPhoneButton(),
			url: `${origin}/dashboard/${conference.id}/registration-mode`
		}
	}),
	SUPERVISOR_STUDENT_LINKED: ({ email, title, dashboard }) => {
		const student = email.student ? fullName(email.student) : '';
		return {
			subject: m.emailAutoStudentLinkedSubject({ student, conference: title }),
			heading: m.emailAutoStudentLinkedHeading(),
			paragraphs: [m.emailAutoStudentLinkedBody({ student, conference: title })],
			button: dashboard
		};
	}
};

export function emailContent(
	email: DueEmail,
	conference: Conference,
	origin: string
): EmailContent {
	return CONTENT[email.kind]({
		email,
		conference,
		title: conference.title,
		origin,
		dashboard: { label: m.emailAutoToDashboard(), url: `${origin}/dashboard/${conference.id}` }
	});
}

export { fullName as recipientName };
