import { db, schema } from '#api/db/db';
import { localeOfUser } from '#api/services/requestLocale';
import { m } from '#lib/paraglide/messages';
import { conferenceEmailSettingPubsub, emailLogPubsub } from '#api/pubsub';
import { sql } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import {
	dueEmails,
	emailKey,
	type DueEmail,
	type EmailKind,
	type EmailSnapshot,
	type SnapshotPerson,
	type SnapshotUser
} from './dueEmails';
import { loadEmailSnapshot } from './emailSnapshot';
import type { EmailTextOverride } from './emailText';
import { isAlwaysSent, REMINDER_KINDS } from '#lib/helpers/emailKinds';
import { renderBadgeFoundEmail } from './badgeFoundEmail';
import { renderTeamInvitationEmail } from './teamInvitationEmail';
import {
	deliver,
	loadWording,
	renderAutomaticEmail,
	wordingIn,
	type ConferenceWording
} from './emailDelivery';
import { getInvitationExpiryDate } from '#api/handlers/teamMemberInvitation/invitationToken';
import { logger } from '#lib/logger';

/**
 * Sends what `dueEmails` says a conference owes and nobody sent yet: the kinds switched to automatic
 * when the `send-emails` job asks, any kinds the team picks when it sends them by hand. Nothing else
 * sends: a mutation only changes what is owed. Each mail is claimed by writing its log row first
 * (unique per conference, kind, person and subject), so two sweeps - the team's and the job's, or
 * two instances' - never send one mail twice. A failed mail is tried
 * again by later sweeps, up to `MAX_ATTEMPTS`; a claim left behind by a process that died is free
 * again after `STALE_CLAIM_MINUTES`. A mail the team sent by hand counts as sent, unless it was a
 * reminder: that still leaves the automatic one due.
 */

const MAX_ATTEMPTS = 3;
const STALE_CLAIM_MINUTES = 15;

type LogState = {
	status: (typeof schema.emailStatus.enumValues)[number];
	attempts: number;
	updatedAt: Date;
};

/** Whether a mail with this log state (or none) is still to be sent. */
export function isOpen({ log, now }: { log: LogState | undefined; now: Date }) {
	if (!log) return true;
	if (log.status === 'FAILED') return log.attempts < MAX_ATTEMPTS;
	if (log.status === 'SENDING')
		return now.getTime() - log.updatedAt.getTime() > STALE_CLAIM_MINUTES * 60_000;
	return false;
}

export async function enabledKinds(conferenceId: string) {
	const settings = await db.query.conferenceEmailSetting.findMany({
		where: { conferenceId, enabled: true },
		columns: { kind: true }
	});
	return new Set<EmailKind>(settings.map((setting) => setting.kind));
}

/** The mails of `kinds` the conference owes and has not sent, skipped or given up on. */
async function openEmails({
	snapshot,
	kinds,
	now
}: {
	snapshot: EmailSnapshot;
	kinds: ReadonlySet<EmailKind>;
	now: Date;
}) {
	const logs = await db.query.emailLog.findMany({
		where: { conferenceId: snapshot.conference.id },
		columns: {
			kind: true,
			userId: true,
			subjectKey: true,
			trigger: true,
			status: true,
			attempts: true,
			updatedAt: true
		}
	});
	return stillOpen({ due: dueEmails({ snapshot, now }), logs, kinds, now });
}

type LogRow = LogState & {
	kind: EmailKind;
	userId: string | null;
	subjectKey: string;
	trigger: (typeof schema.emailTrigger.enumValues)[number];
};

const isReminder = (kind: EmailKind) => REMINDER_KINDS.some((reminder) => reminder === kind);

/**
 * The mails of `kinds` among `due` that are still to be sent, after the log. A mail sent by hand
 * counts as sent, except a reminder: that leaves the automatic one due.
 */
export function stillOpen({
	due,
	logs,
	kinds,
	now
}: {
	due: readonly DueEmail[];
	logs: readonly LogRow[];
	kinds: ReadonlySet<EmailKind>;
	now: Date;
}) {
	const automatic = new Map(
		logs.filter((log) => log.trigger === 'AUTOMATIC').map((log) => [emailKey(log), log])
	);
	const sentByHand = new Set(
		logs
			.filter((log) => log.trigger === 'MANUAL' && log.status === 'SENT' && !isReminder(log.kind))
			.map(emailKey)
	);
	return due.filter((email) => {
		const key = emailKey({ ...email, userId: email.recipient.id });
		return (
			kinds.has(email.kind) && !sentByHand.has(key) && isOpen({ log: automatic.get(key), now })
		);
	});
}

/** Claims the mail; `undefined` when another sweep holds or finished it. */
async function claim({ conferenceId, email }: { conferenceId: string; email: DueEmail }) {
	const now = new Date();
	const [claimed] = await db
		.insert(schema.emailLog)
		.values({
			conferenceId,
			kind: email.kind,
			userId: email.recipient.id,
			subjectKey: email.subjectKey,
			status: 'SENDING',
			attempts: 1,
			email: email.recipient.email
		})
		.onConflictDoUpdate({
			target: [
				schema.emailLog.conferenceId,
				schema.emailLog.kind,
				schema.emailLog.userId,
				schema.emailLog.subjectKey
			],
			// the unique index covers the automatic rows only
			targetWhere: sql`${schema.emailLog.trigger} = 'AUTOMATIC'`,
			set: {
				status: 'SENDING',
				attempts: sql`${schema.emailLog.attempts} + 1`,
				email: email.recipient.email,
				error: null,
				updatedAt: now
			},
			setWhere: whereRows({
				table: schema.emailLog,
				filter: {
					OR: [
						{ status: 'FAILED', attempts: { lt: MAX_ATTEMPTS } },
						{
							status: 'SENDING',
							updatedAt: { lt: new Date(now.getTime() - STALE_CLAIM_MINUTES * 60_000) }
						}
					]
				}
			})
		})
		.returning({ id: schema.emailLog.id });
	return claimed?.id;
}

/** Sends one claimed mail; whatever goes wrong is written to its log row, never thrown. */
async function send({
	email,
	snapshot,
	origin,
	wording,
	logId
}: {
	email: DueEmail;
	snapshot: EmailSnapshot;
	origin: string;
	wording: ConferenceWording;
	logId: string;
}) {
	const error = await deliver({
		logId,
		to: email.recipient.email,
		render: () => renderAutomaticEmail({ email, conference: snapshot.conference, origin, wording })
	});
	return error === undefined;
}

/** Claims and sends each mail in turn, counting what went out and what failed. */
async function sendEach({
	conferenceId,
	batch,
	send
}: {
	conferenceId: string;
	batch: DueEmail[];
	send: (email: DueEmail, logId: string) => Promise<boolean>;
}) {
	let sent = 0;
	let failed = 0;
	const logIds: string[] = [];
	for (const email of batch) {
		const logId = await claim({ conferenceId, email });
		if (!logId) continue;
		logIds.push(logId);
		if (await send(email, logId)) sent++;
		else failed++;
	}
	return { sent, failed, logIds };
}

/**
 * Sends up to `limit` of the mails the conference owes, of `kinds` (by hand), else of the kinds
 * switched to automatic. Answers how many went out, failed, and are left for the next round.
 */
export async function sendDueEmails({
	conferenceId,
	origin,
	kinds: chosen,
	limit = 200,
	now = new Date()
}: {
	conferenceId: string;
	origin: string;
	kinds?: ReadonlySet<EmailKind>;
	limit?: number;
	now?: Date;
}) {
	const kinds = chosen ?? (await enabledKinds(conferenceId));
	const snapshot = kinds.size > 0 ? await loadEmailSnapshot(conferenceId) : undefined;
	if (!snapshot) return { sent: 0, failed: 0, remaining: 0 };

	const open = await openEmails({ snapshot, kinds, now });
	const batch = open.slice(0, limit);
	const wording = await loadWording(conferenceId);
	const { logIds, ...counts } = await sendEach({
		conferenceId,
		batch,
		send: (email, logId) => send({ email, snapshot, origin, wording, logId })
	});
	// a claim either inserts the row or retries an existing one
	if (logIds.length > 0) {
		emailLogPubsub.created();
		emailLogPubsub.updated(logIds);
	}
	return { ...counts, remaining: open.length - batch.length };
}

/** How many mails of each of `kinds` the conference owes right now and has not sent. */
export async function countOpenEmails({
	conferenceId,
	kinds
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
}) {
	const snapshot = await loadEmailSnapshot(conferenceId);
	const open = snapshot
		? await openEmails({ snapshot, kinds: new Set(kinds), now: new Date() })
		: [];
	return kinds.map((kind) => ({
		kind,
		open: open.filter((email) => email.kind === kind).length
	}));
}

/**
 * Marks what the conference owes of `kinds` right now as skipped, so switching a kind on only
 * reaches what happens from then on. `asIf` overrides conference fields, to skip what a change
 * about to be written will make due before any sweep can see it.
 */
export async function skipOpenEmails({
	conferenceId,
	kinds,
	asIf = {}
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
	asIf?: Partial<EmailSnapshot['conference']>;
}) {
	const loaded = await loadEmailSnapshot(conferenceId);
	if (!loaded || kinds.length === 0) return 0;
	const snapshot = { ...loaded, conference: { ...loaded.conference, ...asIf } };
	const open = await openEmails({ snapshot, kinds: new Set(kinds), now: new Date() });
	for (let start = 0; start < open.length; start += 500) {
		await db
			.insert(schema.emailLog)
			.values(
				open.slice(start, start + 500).map((email) => ({
					conferenceId,
					kind: email.kind,
					userId: email.recipient.id,
					subjectKey: email.subjectKey,
					status: 'SKIPPED' as const,
					email: email.recipient.email
				}))
			)
			.onConflictDoNothing();
	}
	if (open.length > 0) emailLogPubsub.created();
	return open.length;
}

/** Switches kinds of automatic mail on or off for a conference. */
export async function setEmailKindsEnabled({
	conferenceId,
	kinds,
	enabled
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
	enabled: boolean;
}) {
	if (kinds.length === 0) return;
	const rows = await db
		.insert(schema.conferenceEmailSetting)
		.values(kinds.map((kind) => ({ conferenceId, kind, enabled })))
		.onConflictDoUpdate({
			target: [schema.conferenceEmailSetting.conferenceId, schema.conferenceEmailSetting.kind],
			set: { enabled, updatedAt: new Date() }
		})
		.returning({ id: schema.conferenceEmailSetting.id });
	// an upsert: new rows for the lists, changed ones by id
	conferenceEmailSettingPubsub.created();
	conferenceEmailSettingPubsub.updated(rows.map((row) => row.id));
}

/** Every conference that sends any automatic mail. */
export async function conferencesSendingEmails() {
	const settings = await db.query.conferenceEmailSetting.findMany({
		where: { enabled: true },
		columns: { conferenceId: true }
	});
	return [...new Set(settings.map((setting) => setting.conferenceId))];
}

// The sweeps the team started by hand, one per conference at a time; kinds asked for while one runs
// are sent once it is done.
const running = new Map<string, { kinds: Set<EmailKind> }>();

/**
 * Sends everything of `kinds` the conference owes, in the background; the caller does not wait.
 * Kinds that are not switched to automatic are sent too: this is the team sending them by hand.
 */
export function sendOpenEmailsInBackground({
	conferenceId,
	kinds,
	origin
}: {
	conferenceId: string;
	kinds: readonly EmailKind[];
	origin: string;
}) {
	const current = running.get(conferenceId);
	if (current) {
		for (const kind of kinds) current.kinds.add(kind);
		return;
	}
	const state = { kinds: new Set(kinds) };
	running.set(conferenceId, state);
	void (async () => {
		try {
			while (state.kinds.size > 0) {
				const batch = new Set(state.kinds);
				state.kinds.clear();
				let result = await sendDueEmails({ conferenceId, origin, kinds: batch });
				while (result.remaining > 0 && result.sent + result.failed > 0)
					result = await sendDueEmails({ conferenceId, origin, kinds: batch });
			}
		} catch (error) {
			logger.error('Sending emails failed', { conferenceId, err: error });
		} finally {
			running.delete(conferenceId);
		}
	})();
}

/** A mail of `kind` as the conference would send it, addressed to `user` with made-up details. */
export async function previewEmail({
	conferenceId,
	kind,
	user,
	origin,
	draft,
	footerDraft
}: {
	conferenceId: string;
	kind: EmailKind;
	user: SnapshotUser;
	origin: string;
	draft?: EmailTextOverride;
	footerDraft?: string;
}) {
	const snapshot = await loadEmailSnapshot(conferenceId);
	if (!snapshot) return undefined;
	const locale = localeOfUser(user.locale);
	const stored = await loadWording(conferenceId);
	const wording: ConferenceWording = {
		texts: draft ? [{ kind, locale, ...draft }] : stored.texts,
		footers: footerDraft === undefined ? stored.footers : [{ locale, text: footerDraft }]
	};
	if (kind === 'BADGE_FOUND')
		return renderBadgeFoundEmail({
			recipient: user,
			conferenceTitle: snapshot.conference.title,
			wording
		});
	if (isAlwaysSent(kind))
		return previewInvitationEmail({ conference: snapshot.conference, user, origin, wording });
	const sample = (person: Partial<SnapshotPerson> & { user: SnapshotUser }): SnapshotPerson => ({
		participantId: person.user.id,
		paymentStatus: 'PENDING',
		termsAndConditions: 'PENDING',
		guardianConsent: 'PENDING',
		mediaConsent: 'PENDING',
		didAttend: true,
		delegation: {
			applied: true,
			role: { id: 'sample', kind: 'NATION', name: null, nationAlpha3Code: 'FRA' },
			committee: 'GV'
		},
		single: null,
		supervisor: null,
		seatedFromWaitingList: null,
		...person
	});
	const student = sample({
		user: { ...user, id: 'sample-student', givenName: 'Alex', familyName: 'Beispiel' }
	});
	const rejectedStudent = sample({
		user: { ...user, id: 'sample-student-2', givenName: 'Kim', familyName: 'Muster' },
		delegation: { applied: true, role: null, committee: null }
	});
	const email: DueEmail = {
		kind,
		subjectKey: 'preview',
		recipient: user,
		person: sample({ user }),
		teamMember: {
			id: 'preview',
			role: 'PARTICIPANT_CARE',
			user,
			inviterName: `${user.givenName} ${user.familyName}`
		},
		students: [student, rejectedStudent],
		student,
		field: 'termsAndConditions',
		review: {
			id: 'preview',
			authorParticipantId: user.id,
			paperId: 'preview',
			paperType: 'POSITION_PAPER',
			agendaItem: 'GV: Klimaschutz',
			reviewer: { name: 'Robin Beispiel', email: 'reviewer@example.org' },
			statusAfter: 'CHANGES_REQUESTED'
		},
		survey: {
			id: 'preview',
			title: m.emailPreviewSurveyTitle({}, { locale }),
			deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
			answeredBy: []
		}
	};
	return renderAutomaticEmail({ email, conference: snapshot.conference, origin, wording });
}

/** The team invitation as the conference would send it, to `user` from themselves, with a made-up link. */
function previewInvitationEmail({
	conference,
	user,
	origin,
	wording
}: {
	conference: EmailSnapshot['conference'];
	user: SnapshotUser;
	origin: string;
	wording: ConferenceWording;
}) {
	const locale = localeOfUser(user.locale);
	return renderTeamInvitationEmail({
		values: {
			recipientEmail: user.email,
			conferenceTitle: conference.title,
			role: 'PARTICIPANT_CARE',
			inviterName: `${user.givenName} ${user.familyName}`,
			inviteUrl: `${origin}/auth/accept-invitation?token=preview`,
			expiresAt: getInvitationExpiryDate()
		},
		locale,
		...wordingIn({ wording, kind: 'TEAM_INVITATION', locale })
	});
}
