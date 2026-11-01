import { m } from '#lib/paraglide/messages';
import type { EmailkindEnum, EmailstatusEnum } from '#lib/api/rumbleClient/client';
import {
	APPLICATION_REMINDER_DAYS,
	OPEN_ISSUES_REMINDER_DAYS,
	PHONE_READY_REMINDER_DAYS,
	SURVEY_REMINDER_DAYS,
	type EmailGroupId
} from '#lib/helpers/emailKinds';

/** What the e-mail page says about each automatic mail: when it goes, to whom, with what. */
export interface EmailKindTexts {
	title: string;
	trigger: string;
	recipients: string;
	content: string;
}

const TEXTS: Record<EmailkindEnum, () => EmailKindTexts> = {
	ASSIGNMENT_ACCEPTED: () => ({
		title: m.emailKindAcceptedTitle(),
		trigger: m.emailKindAcceptedTrigger(),
		recipients: m.emailKindAcceptedRecipients(),
		content: m.emailKindAcceptedContent()
	}),
	ASSIGNMENT_REJECTED: () => ({
		title: m.emailKindRejectedTitle(),
		trigger: m.emailKindRejectedTrigger(),
		recipients: m.emailKindRejectedRecipients(),
		content: m.emailKindRejectedContent()
	}),
	SUPERVISOR_ASSIGNMENT_SUMMARY: () => ({
		title: m.emailKindSupervisorSummaryTitle(),
		trigger: m.emailKindSupervisorSummaryTrigger(),
		recipients: m.emailKindSupervisorSummaryRecipients(),
		content: m.emailKindSupervisorSummaryContent()
	}),
	WAITING_LIST_SEATED: () => ({
		title: m.emailKindWaitingListTitle(),
		trigger: m.emailKindWaitingListTrigger(),
		recipients: m.emailKindWaitingListRecipients(),
		content: m.emailKindWaitingListContent()
	}),
	POSTAL_UNLOCKED: () => ({
		title: m.emailKindPostalUnlockedTitle(),
		trigger: m.emailKindPostalUnlockedTrigger(),
		recipients: m.emailKindPostalUnlockedRecipients(),
		content: m.emailKindPostalUnlockedContent()
	}),
	PAYMENT_UNLOCKED: () => ({
		title: m.emailKindPaymentUnlockedTitle(),
		trigger: m.emailKindPaymentUnlockedTrigger(),
		recipients: m.emailKindPaymentUnlockedRecipients(),
		content: m.emailKindPaymentUnlockedContent()
	}),
	POSTAL_RECEIVED: () => ({
		title: m.emailKindPostalReceivedTitle(),
		trigger: m.emailKindPostalReceivedTrigger(),
		recipients: m.emailKindPostalReceivedRecipients(),
		content: m.emailKindPostalReceivedContent()
	}),
	PAYMENT_RECEIVED: () => ({
		title: m.emailKindPaymentReceivedTitle(),
		trigger: m.emailKindPaymentReceivedTrigger(),
		recipients: m.emailKindPaymentReceivedRecipients(),
		content: m.emailKindPaymentReceivedContent()
	}),
	PAPERWORK_PROBLEM: () => ({
		title: m.emailKindProblemTitle(),
		trigger: m.emailKindProblemTrigger(),
		recipients: m.emailKindProblemRecipients(),
		content: m.emailKindProblemContent()
	}),
	APPLICATION_DEADLINE_REMINDER: () => ({
		title: m.emailKindApplicationReminderTitle(),
		trigger: m.emailKindApplicationReminderTrigger({ days: APPLICATION_REMINDER_DAYS }),
		recipients: m.emailKindApplicationReminderRecipients(),
		content: m.emailKindApplicationReminderContent()
	}),
	OPEN_ISSUES_REMINDER: () => ({
		title: m.emailKindOpenIssuesTitle(),
		trigger: m.emailKindOpenIssuesTrigger({ days: OPEN_ISSUES_REMINDER_DAYS }),
		recipients: m.emailKindOpenIssuesRecipients(),
		content: m.emailKindOpenIssuesContent()
	}),
	PHONE_READY_REMINDER: () => ({
		title: m.emailKindPhoneTitle(),
		trigger: m.emailKindPhoneTrigger({ days: PHONE_READY_REMINDER_DAYS }),
		recipients: m.emailKindPhoneRecipients(),
		content: m.emailKindPhoneContent()
	}),
	SURVEY_REMINDER: () => ({
		title: m.emailKindSurveyReminderTitle(),
		trigger: m.emailKindSurveyReminderTrigger({ days: SURVEY_REMINDER_DAYS }),
		recipients: m.emailKindSurveyReminderRecipients(),
		content: m.emailKindSurveyReminderContent()
	}),
	CERTIFICATE_AVAILABLE: () => ({
		title: m.emailKindCertificateTitle(),
		trigger: m.emailKindCertificateTrigger(),
		recipients: m.emailKindCertificateRecipients(),
		content: m.emailKindCertificateContent()
	}),
	SUPERVISOR_STUDENT_LINKED: () => ({
		title: m.emailKindStudentLinkedTitle(),
		trigger: m.emailKindStudentLinkedTrigger(),
		recipients: m.emailKindStudentLinkedRecipients(),
		content: m.emailKindStudentLinkedContent()
	}),
	PAPER_REVIEWED: () => ({
		title: m.emailKindPaperReviewedTitle(),
		trigger: m.emailKindPaperReviewedTrigger(),
		recipients: m.emailKindPaperReviewedRecipients(),
		content: m.emailKindPaperReviewedContent()
	}),
	TEAM_INVITATION: () => ({
		title: m.emailKindTeamInvitationTitle(),
		trigger: m.emailKindTeamInvitationTrigger(),
		recipients: m.emailKindTeamInvitationRecipients(),
		content: m.emailKindTeamInvitationContent()
	}),
	TEAM_WELCOME: () => ({
		title: m.emailKindTeamWelcomeTitle(),
		trigger: m.emailKindTeamWelcomeTrigger(),
		recipients: m.emailKindTeamWelcomeRecipients(),
		content: m.emailKindTeamWelcomeContent()
	}),
	BADGE_FOUND: () => ({
		title: m.emailKindBadgeFoundTitle(),
		trigger: m.emailKindBadgeFoundTrigger(),
		recipients: m.emailKindBadgeFoundRecipients(),
		content: m.emailKindBadgeFoundContent()
	})
};

export const emailKindTexts = (kind: EmailkindEnum): EmailKindTexts => TEXTS[kind]();

export const emailGroupTitle: Record<EmailGroupId, () => string> = {
	assignment: () => m.emailGroupAssignment(),
	waitingList: () => m.emailGroupWaitingList(),
	unlocked: () => m.emailGroupUnlocked(),
	received: () => m.emailGroupReceived(),
	reminders: () => m.emailGroupReminders(),
	papers: () => m.emailGroupPapers(),
	onSite: () => m.emailGroupOnSite(),
	certificate: () => m.emailGroupCertificate(),
	supervisors: () => m.emailGroupSupervisors(),
	team: () => m.emailGroupTeam()
};

export const emailStatusLabel: Record<EmailstatusEnum, () => string> = {
	SENT: () => m.emailStatusSent(),
	FAILED: () => m.emailStatusFailed(),
	SKIPPED: () => m.emailStatusSkipped(),
	SENDING: () => m.emailStatusSending()
};
