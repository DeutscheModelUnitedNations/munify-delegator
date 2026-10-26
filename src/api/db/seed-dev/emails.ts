import type * as schema from '../schema';
import type { ConferenceSeed } from './context';

type EmailKind = (typeof schema.emailKind.enumValues)[number];
type EmailStatus = (typeof schema.emailStatus.enumValues)[number];

interface LogPlan {
	kind: EmailKind;
	userId: string;
	/** As `dueEmails` keys it, so the sweep takes the row for the mail it stands for. */
	subjectKey: string;
	status: EmailStatus;
	daysAgo: number;
}

const DAY = 24 * 60 * 60 * 1000;

/** Mails the personas got while the conference prepared: every status the log shows. */
const PREPARATION_LOG: LogPlan[] = [
	{
		kind: 'ASSIGNMENT_REJECTED',
		userId: 'dev-rejected-delegate',
		subjectKey: 'rejected',
		status: 'SENT',
		daysAgo: 25
	},
	{
		kind: 'PAYMENT_UNLOCKED',
		userId: 'dev-head-delegate',
		subjectKey: 'payment',
		status: 'SENT',
		daysAgo: 20
	},
	{
		kind: 'POSTAL_UNLOCKED',
		userId: 'dev-head-delegate',
		subjectKey: 'postal',
		status: 'SENT',
		daysAgo: 20
	},
	{
		kind: 'PAYMENT_RECEIVED',
		userId: 'dev-delegate',
		subjectKey: 'payment',
		status: 'SENT',
		daysAgo: 6
	},
	{
		kind: 'PAPERWORK_PROBLEM',
		userId: 'dev-delegate-minor',
		subjectKey: 'guardianConsent',
		status: 'FAILED',
		daysAgo: 3
	},
	// Switched on without notifying those it already applied to
	{
		kind: 'POSTAL_UNLOCKED',
		userId: 'dev-single',
		subjectKey: 'postal',
		status: 'SKIPPED',
		daysAgo: 20
	},
	{
		kind: 'SUPERVISOR_ASSIGNMENT_SUMMARY',
		userId: 'dev-supervisor',
		subjectKey: 'summary',
		status: 'SENDING',
		daysAgo: 0
	}
];

/** After the conference: certificates. */
const POST_LOG: LogPlan[] = [
	{
		kind: 'CERTIFICATE_AVAILABLE',
		userId: 'dev-head-delegate',
		subjectKey: 'certificate',
		status: 'SENT',
		daysAgo: 20
	},
	{
		kind: 'CERTIFICATE_AVAILABLE',
		userId: 'dev-delegate',
		subjectKey: 'certificate',
		status: 'SENT',
		daysAgo: 20
	},
	{
		kind: 'CERTIFICATE_AVAILABLE',
		userId: 'dev-single',
		subjectKey: 'certificate',
		status: 'SKIPPED',
		daysAgo: 20
	}
];

/**
 * The automatic mails' page and log (`conferenceEmailSetting`, `emailLog`) for the personas, and
 * one text of the conference's own (`conferenceEmailText`: the acceptance's German subject and
 * body), so the editor opens on an edited text. Every kind stays switched **off**: switched on,
 * the first mutation's sweep would mail everybody it applies to, the crowd and bulk included.
 * Switching one on asks whether those get it now, which is the path worth trying out.
 */
export function addEmails(cs: ConferenceSeed) {
	if (!cs.plan.with.emails) return;

	const log = cs.plan.conference.state === 'POST' ? POST_LOG : PREPARATION_LOG;
	const emails = new Map(cs.batch.user.map((user) => [user.id, user.email]));

	for (const kind of new Set(log.map((entry) => entry.kind))) {
		cs.batch.conferenceEmailSetting.push({
			id: cs.rowId(`email-setting-${kind}`),
			conferenceId: cs.id,
			kind,
			enabled: false
		});
	}

	for (const entry of log) {
		const email = emails.get(entry.userId);
		if (email) cs.batch.emailLog.push(logRow(cs, entry, email));
	}

	cs.batch.conferenceEmailText.push({
		id: cs.rowId('email-text-accepted-de'),
		conferenceId: cs.id,
		kind: 'ASSIGNMENT_ACCEPTED',
		locale: 'de',
		subject: 'Willkommen bei {conference}!',
		heading: null,
		body: [
			'wir freuen uns sehr, dass Sie bei {conference} dabei sind. Sie vertreten: {seat}.',
			'Alles Weitere zur Vorbereitung finden Sie auf Ihrem Dashboard. Bei Fragen ist die Teilnehmendenbetreuung für Sie da.'
		].join('\n\n')
	});
}

/** How a log row of that status looks: tries, error and when it went out. */
const STATUS_DETAILS: Record<
	EmailStatus,
	(at: Date) => { attempts: number; error: string | null; sentAt: Date | null }
> = {
	SENT: (at) => ({ attempts: 1, error: null, sentAt: at }),
	FAILED: () => ({
		attempts: 3,
		error: 'Connection timeout: the mail server did not answer (seed)',
		sentAt: null
	}),
	SKIPPED: () => ({ attempts: 0, error: null, sentAt: null }),
	SENDING: () => ({ attempts: 1, error: null, sentAt: null })
};

function logRow(cs: ConferenceSeed, entry: LogPlan, email: string) {
	const at = new Date(Date.now() - entry.daysAgo * DAY);
	return {
		id: cs.rowId(`email-${entry.kind}-${entry.userId}`),
		conferenceId: cs.id,
		kind: entry.kind,
		userId: entry.userId,
		subjectKey: entry.subjectKey,
		status: entry.status,
		email,
		...STATUS_DETAILS[entry.status](at),
		createdAt: at,
		updatedAt: at
	};
}
