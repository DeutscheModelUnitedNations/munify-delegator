import type { EmailkindEnum } from '#lib/api/rumbleClient/client';

/**
 * The automatic mails, shared by the API (`#api/handlers/email/dueEmails` decides who gets
 * which) and the e-mail page (which explains them), so the two describe the same rules.
 */

/** Days before the end of the application phase the reminder to finish an application goes out. */
export const APPLICATION_REMINDER_DAYS = 3;
/** Days before the conference the reminder of open paperwork and payment goes out. */
export const OPEN_ISSUES_REMINDER_DAYS = 14;
/** Days before the conference the reminder to get MUNify ready on the phone goes out. */
export const PHONE_READY_REMINDER_DAYS = 7;
/** Days before a survey's deadline the reminder to answer it goes out. */
export const SURVEY_REMINDER_DAYS = 3;

/**
 * The mails sent by hand where they happen, which always go out (and are logged like any mail sent
 * by hand): the invitation into the team, whose link carries a token only the inviting request
 * knows, and the note that a lost badge was found, which participant care sends from the user card.
 * Only their text is the conference's to change, so the e-mail page lists them without a switch,
 * and `dueEmails` never owes them.
 */
const ALWAYS_SENT_KINDS = [
	'TEAM_INVITATION',
	'BADGE_FOUND'
] as const satisfies readonly EmailkindEnum[];
export type AlwaysSentKind = (typeof ALWAYS_SENT_KINDS)[number];

export const isAlwaysSent = (kind: string): kind is AlwaysSentKind =>
	ALWAYS_SENT_KINDS.some((always) => always === kind);

/** The mails releasing the assignment makes due: the result to each applicant and supervisor. */
const ASSIGNMENT_RESULT_KINDS = [
	'ASSIGNMENT_ACCEPTED',
	'ASSIGNMENT_REJECTED',
	'SUPERVISOR_ASSIGNMENT_SUMMARY'
] as const satisfies readonly EmailkindEnum[];

/** The mails releasing or applying the assignment can make due: the results and seats from the waiting list. */
export const ASSIGNMENT_KINDS = [
	...ASSIGNMENT_RESULT_KINDS,
	'WAITING_LIST_SEATED'
] as const satisfies readonly EmailkindEnum[];

/** The mails changing one of these conference settings can make due. */
const SETTING_EMAIL_KINDS = {
	unlockPostals: ['POSTAL_UNLOCKED'],
	unlockPayments: ['PAYMENT_UNLOCKED'],
	state: ['CERTIFICATE_AVAILABLE'],
	certificateBasePDF: ['CERTIFICATE_AVAILABLE']
} as const satisfies Record<string, readonly EmailkindEnum[]>;

/** The mails a save of the conference settings may have made due, given the fields it changed. */
export function settingsEmailKinds(changedFields: readonly string[]): EmailkindEnum[] {
	const kinds = Object.entries(SETTING_EMAIL_KINDS).flatMap(([field, of]) =>
		changedFields.includes(field) ? of : []
	);
	return [...new Set(kinds)];
}

/**
 * The reminders, each due in its last days before a date. The team can also send one to a person
 * by hand any time before that date; a reminder sent by hand still leaves the automatic one due.
 */
export const REMINDER_KINDS = [
	'APPLICATION_DEADLINE_REMINDER',
	'OPEN_ISSUES_REMINDER',
	'PHONE_READY_REMINDER',
	'SURVEY_REMINDER'
] as const satisfies readonly EmailkindEnum[];

/** How the e-mail page groups the mails, in this order. */
export const EMAIL_GROUPS = [
	{ id: 'assignment', kinds: ASSIGNMENT_RESULT_KINDS },
	{ id: 'waitingList', kinds: ['WAITING_LIST_SEATED'] },
	{ id: 'unlocked', kinds: ['POSTAL_UNLOCKED', 'PAYMENT_UNLOCKED'] },
	{ id: 'received', kinds: ['POSTAL_RECEIVED', 'PAYMENT_RECEIVED', 'PAPERWORK_PROBLEM'] },
	{ id: 'reminders', kinds: REMINDER_KINDS },
	{ id: 'papers', kinds: ['PAPER_REVIEWED'] },
	{ id: 'onSite', kinds: ['BADGE_FOUND'] },
	{ id: 'certificate', kinds: ['CERTIFICATE_AVAILABLE'] },
	{ id: 'supervisors', kinds: ['SUPERVISOR_STUDENT_LINKED'] },
	{ id: 'team', kinds: ['TEAM_WELCOME', 'TEAM_INVITATION'] }
] as const satisfies readonly { id: string; kinds: readonly EmailkindEnum[] }[];

export type EmailGroupId = (typeof EMAIL_GROUPS)[number]['id'];
