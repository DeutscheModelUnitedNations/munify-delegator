import type { EmailkindEnum } from '#lib/api/rumbleClient/client';
import { m } from '#lib/paraglide/messages';
import type { Locale } from '#lib/paraglide/runtime';

/**
 * What an automatic mail says, as a template: subject, heading and body with `{placeholders}`.
 * Shared by the API, which fills it in for each recipient (`#api/handlers/email/emailContent`),
 * and the e-mail page, which edits it per conference (`conference_email_text`), so the editor
 * starts from the very text that would be sent. The greeting and the button are not part of it.
 */
export interface EmailText {
	subject: string;
	heading: string;
	/** Paragraphs separated by a blank line; `{list}` alone in a paragraph places the kind's list. */
	body: string;
}

const EMAIL_PLACEHOLDERS = [
	'name',
	'conference',
	'seat',
	'date',
	'student',
	'item',
	'list',
	'delegationHint',
	'paper',
	'reviewer',
	'status',
	'role',
	'inviter',
	'survey'
] as const;
export type EmailPlaceholder = (typeof EMAIL_PLACEHOLDERS)[number];

interface KindTemplate {
	/** What this kind's text can use, besides `name` and `conference`, which every kind has. */
	placeholders: readonly EmailPlaceholder[];
	/** Goes to someone without an account yet, so there is no `name` to use. */
	anonymous?: true;
	text: (locale: Locale) => EmailText;
}

/** Each message called with its placeholders as arguments, so the result keeps them. */
const P = {
	conference: '{conference}',
	seat: '{seat}',
	date: '{date}',
	student: '{student}',
	item: '{item}',
	paper: '{paper}',
	reviewer: '{reviewer}',
	status: '{status}',
	role: '{role}',
	inviter: '{inviter}',
	survey: '{survey}'
} as const;

const paragraphs = (...blocks: string[]) => blocks.join('\n\n');

const TEMPLATES: Record<EmailkindEnum, KindTemplate> = {
	ASSIGNMENT_ACCEPTED: {
		placeholders: ['seat'],
		text: (locale) => ({
			subject: m.emailAutoAcceptedSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoAcceptedHeading({}, { locale }),
			body: paragraphs(
				m.emailAutoAcceptedBody({ conference: P.conference, seat: P.seat }, { locale }),
				m.emailAutoNextSteps({}, { locale })
			)
		})
	},
	WAITING_LIST_SEATED: {
		placeholders: ['seat'],
		text: (locale) => ({
			subject: m.emailAutoWaitingListSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoWaitingListHeading({}, { locale }),
			body: paragraphs(
				m.emailAutoWaitingListBody({ conference: P.conference, seat: P.seat }, { locale }),
				m.emailAutoNextSteps({}, { locale })
			)
		})
	},
	ASSIGNMENT_REJECTED: {
		placeholders: [],
		text: (locale) => ({
			subject: m.emailAutoRejectedSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoRejectedHeading({}, { locale }),
			body: paragraphs(
				m.emailAutoRejectedBody({ conference: P.conference }, { locale }),
				m.emailAutoRejectedWaitingList({}, { locale })
			)
		})
	},
	SUPERVISOR_ASSIGNMENT_SUMMARY: {
		placeholders: ['list'],
		text: (locale) => ({
			subject: m.emailAutoSupervisorSummarySubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoSupervisorSummaryHeading({}, { locale }),
			body: paragraphs(
				m.emailAutoSupervisorSummaryBody({ conference: P.conference }, { locale }),
				'{list}',
				m.emailAutoSupervisorSummaryClosing({}, { locale })
			)
		})
	},
	POSTAL_UNLOCKED: {
		placeholders: [],
		text: (locale) => ({
			subject: m.emailAutoPostalUnlockedSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoPostalUnlockedHeading({}, { locale }),
			body: m.emailAutoPostalUnlockedBody({ conference: P.conference }, { locale })
		})
	},
	PAYMENT_UNLOCKED: {
		placeholders: [],
		text: (locale) => ({
			subject: m.emailAutoPaymentUnlockedSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoPaymentUnlockedHeading({}, { locale }),
			body: m.emailAutoPaymentUnlockedBody({ conference: P.conference }, { locale })
		})
	},
	POSTAL_RECEIVED: {
		placeholders: [],
		text: (locale) => ({
			subject: m.emailAutoPostalReceivedSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoPostalReceivedHeading({}, { locale }),
			body: m.emailAutoPostalReceivedBody({ conference: P.conference }, { locale })
		})
	},
	PAYMENT_RECEIVED: {
		placeholders: [],
		text: (locale) => ({
			subject: m.emailAutoPaymentReceivedSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoPaymentReceivedHeading({}, { locale }),
			body: m.emailAutoPaymentReceivedBody({ conference: P.conference }, { locale })
		})
	},
	CERTIFICATE_AVAILABLE: {
		placeholders: [],
		text: (locale) => ({
			subject: m.emailAutoCertificateSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoCertificateHeading({}, { locale }),
			body: m.emailAutoCertificateBody({ conference: P.conference }, { locale })
		})
	},
	PAPERWORK_PROBLEM: {
		placeholders: ['item'],
		text: (locale) => ({
			subject: m.emailAutoProblemSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoProblemHeading({}, { locale }),
			body: m.emailAutoProblemBody({ conference: P.conference, item: P.item }, { locale })
		})
	},
	APPLICATION_DEADLINE_REMINDER: {
		placeholders: ['date', 'delegationHint'],
		text: (locale) => ({
			subject: m.emailAutoApplicationReminderSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoApplicationReminderHeading({}, { locale }),
			body: paragraphs(
				m.emailAutoApplicationReminderBody({ conference: P.conference, date: P.date }, { locale }),
				'{delegationHint}'
			)
		})
	},
	OPEN_ISSUES_REMINDER: {
		placeholders: ['date', 'list'],
		text: (locale) => ({
			subject: m.emailAutoOpenIssuesSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoOpenIssuesHeading({}, { locale }),
			body: paragraphs(
				m.emailAutoOpenIssuesBody({ conference: P.conference, date: P.date }, { locale }),
				'{list}',
				m.emailAutoOpenIssuesClosing({}, { locale })
			)
		})
	},
	PHONE_READY_REMINDER: {
		placeholders: ['date', 'list'],
		text: (locale) => ({
			subject: m.emailAutoPhoneSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoPhoneHeading({}, { locale }),
			body: paragraphs(
				m.emailAutoPhoneBody({ conference: P.conference, date: P.date }, { locale }),
				'{list}'
			)
		})
	},
	SURVEY_REMINDER: {
		placeholders: ['survey', 'date'],
		text: (locale) => ({
			subject: m.emailAutoSurveyReminderSubject({ survey: P.survey }, { locale }),
			heading: m.emailAutoSurveyReminderHeading({}, { locale }),
			body: paragraphs(
				m.emailAutoSurveyReminderBody(
					{ survey: P.survey, conference: P.conference, date: P.date },
					{ locale }
				),
				m.emailAutoSurveyReminderClosing({}, { locale })
			)
		})
	},
	SUPERVISOR_STUDENT_LINKED: {
		placeholders: ['student'],
		text: (locale) => ({
			subject: m.emailAutoStudentLinkedSubject(
				{ student: P.student, conference: P.conference },
				{ locale }
			),
			heading: m.emailAutoStudentLinkedHeading({}, { locale }),
			body: m.emailAutoStudentLinkedBody(
				{ student: P.student, conference: P.conference },
				{ locale }
			)
		})
	},
	PAPER_REVIEWED: {
		placeholders: ['paper', 'reviewer', 'status'],
		text: (locale) => ({
			subject: m.emailAutoPaperReviewedSubject({ paper: P.paper }, { locale }),
			heading: m.emailAutoPaperReviewedHeading({}, { locale }),
			body: paragraphs(
				m.emailAutoPaperReviewedBody(
					{ paper: P.paper, conference: P.conference, reviewer: P.reviewer },
					{ locale }
				),
				m.emailAutoPaperReviewedStatus({ status: P.status }, { locale })
			)
		})
	},
	TEAM_INVITATION: {
		placeholders: ['role', 'inviter', 'date'],
		anonymous: true,
		text: (locale) => ({
			subject: m.emailTeamInvitationSubject({ conferenceTitle: P.conference }, { locale }),
			heading: m.emailTeamInvitationTitle({}, { locale }),
			body: paragraphs(
				m.emailTeamInvitationBody(
					{ inviterName: P.inviter, conferenceTitle: P.conference, roleName: P.role },
					{ locale }
				),
				m.emailTeamInvitationInstruction({}, { locale }),
				m.emailTeamInvitationExpiry({ expiresAt: P.date, inviterName: P.inviter }, { locale })
			)
		})
	},
	TEAM_WELCOME: {
		placeholders: ['role', 'inviter'],
		text: (locale) => ({
			subject: m.emailTeamWelcomeSubject({ conferenceTitle: P.conference }, { locale }),
			heading: m.emailTeamWelcomeTitle({}, { locale }),
			body: paragraphs(
				m.emailTeamWelcomeBody(
					{ inviterName: P.inviter, conferenceTitle: P.conference, roleName: P.role },
					{ locale }
				),
				m.emailTeamWelcomeInstruction({}, { locale })
			)
		})
	},
	BADGE_FOUND: {
		placeholders: [],
		text: (locale) => ({
			subject: m.emailAutoBadgeFoundSubject({ conference: P.conference }, { locale }),
			heading: m.emailAutoBadgeFoundHeading({}, { locale }),
			body: m.emailAutoBadgeFoundBody({ conference: P.conference }, { locale })
		})
	}
};

/** The text MUNify sends when the conference has not written its own. */
export function defaultEmailText({
	kind,
	locale
}: {
	kind: EmailkindEnum;
	locale: Locale;
}): EmailText {
	return TEMPLATES[kind].text(locale);
}

/** The placeholders a kind's text can use, in the order the editor lists them. */
export function placeholdersOf(kind: EmailkindEnum): EmailPlaceholder[] {
	const template = TEMPLATES[kind];
	return [...(template.anonymous ? [] : ['name' as const]), 'conference', ...template.placeholders];
}
