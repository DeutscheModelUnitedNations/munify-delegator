import type { EmailkindEnum } from '#lib/api/rumbleClient/client.js';

/**
 * The automatic mails, shared by the API (`#api/handlers/email/dueEmails.js` decides who gets
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
 * Mails the team's own actions send - inviting someone, adding them to the team. They always go
 * out: only their text is the conference's to change, so the e-mail page lists them without a
 * switch, and `dueEmails` never owes them.
 */
const ALWAYS_SENT_KINDS = [
	'TEAM_INVITATION',
	'TEAM_WELCOME'
] as const satisfies readonly EmailkindEnum[];
export type AlwaysSentKind = (typeof ALWAYS_SENT_KINDS)[number];

export const isAlwaysSent = (kind: EmailkindEnum): kind is AlwaysSentKind =>
	ALWAYS_SENT_KINDS.some((always) => always === kind);

/** How the e-mail page groups the mails, in this order. */
export const EMAIL_GROUPS = [
	{
		id: 'assignment',
		kinds: ['ASSIGNMENT_ACCEPTED', 'ASSIGNMENT_REJECTED', 'SUPERVISOR_ASSIGNMENT_SUMMARY']
	},
	{ id: 'waitingList', kinds: ['WAITING_LIST_SEATED'] },
	{ id: 'unlocked', kinds: ['POSTAL_UNLOCKED', 'PAYMENT_UNLOCKED'] },
	{ id: 'received', kinds: ['POSTAL_RECEIVED', 'PAYMENT_RECEIVED', 'PAPERWORK_PROBLEM'] },
	{
		id: 'reminders',
		kinds: [
			'APPLICATION_DEADLINE_REMINDER',
			'OPEN_ISSUES_REMINDER',
			'PHONE_READY_REMINDER',
			'SURVEY_REMINDER'
		]
	},
	{ id: 'papers', kinds: ['PAPER_REVIEWED'] },
	{ id: 'certificate', kinds: ['CERTIFICATE_AVAILABLE'] },
	{ id: 'supervisors', kinds: ['SUPERVISOR_STUDENT_LINKED'] },
	{ id: 'team', kinds: ALWAYS_SENT_KINDS }
] as const satisfies readonly { id: string; kinds: readonly EmailkindEnum[] }[];

export type EmailGroupId = (typeof EMAIL_GROUPS)[number]['id'];
