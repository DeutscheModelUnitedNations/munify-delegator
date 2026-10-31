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
 * The invitation into the team. It carries a token only the inviting request knows, so it is sent
 * by hand there (and logged like any mail sent by hand) and always goes out: only its text is the
 * conference's to change, so the e-mail page lists it without a switch, and `dueEmails` never owes
 * it.
 */
const ALWAYS_SENT_KINDS = ['TEAM_INVITATION'] as const satisfies readonly EmailkindEnum[];
export type AlwaysSentKind = (typeof ALWAYS_SENT_KINDS)[number];

export const isAlwaysSent = (kind: EmailkindEnum): kind is AlwaysSentKind =>
	ALWAYS_SENT_KINDS.some((always) => always === kind);

/** The mails releasing the assignment makes due: the result to each applicant and supervisor. */
export const ASSIGNMENT_RESULT_KINDS = [
	'ASSIGNMENT_ACCEPTED',
	'ASSIGNMENT_REJECTED',
	'SUPERVISOR_ASSIGNMENT_SUMMARY'
] as const satisfies readonly EmailkindEnum[];

/**
 * The reminders, each due in its last days before a date. The team can also send one to a person
 * by hand any time before that date; a reminder sent by hand still leaves the automatic one due.
 */
const REMINDER_KINDS = [
	'APPLICATION_DEADLINE_REMINDER',
	'OPEN_ISSUES_REMINDER',
	'PHONE_READY_REMINDER',
	'SURVEY_REMINDER'
] as const satisfies readonly EmailkindEnum[];

export const isReminder = (kind: EmailkindEnum) =>
	REMINDER_KINDS.some((reminder) => reminder === kind);

/** How the e-mail page groups the mails, in this order. */
export const EMAIL_GROUPS = [
	{ id: 'assignment', kinds: ASSIGNMENT_RESULT_KINDS },
	{ id: 'waitingList', kinds: ['WAITING_LIST_SEATED'] },
	{ id: 'unlocked', kinds: ['POSTAL_UNLOCKED', 'PAYMENT_UNLOCKED'] },
	{ id: 'received', kinds: ['POSTAL_RECEIVED', 'PAYMENT_RECEIVED', 'PAPERWORK_PROBLEM'] },
	{ id: 'reminders', kinds: REMINDER_KINDS },
	{ id: 'papers', kinds: ['PAPER_REVIEWED'] },
	{ id: 'certificate', kinds: ['CERTIFICATE_AVAILABLE'] },
	{ id: 'supervisors', kinds: ['SUPERVISOR_STUDENT_LINKED'] },
	{ id: 'team', kinds: ['TEAM_WELCOME', ...ALWAYS_SENT_KINDS] }
] as const satisfies readonly { id: string; kinds: readonly EmailkindEnum[] }[];

export type EmailGroupId = (typeof EMAIL_GROUPS)[number]['id'];
