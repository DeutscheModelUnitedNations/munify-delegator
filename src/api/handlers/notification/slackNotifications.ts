import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '#api/db/db';
import { localeOfUser, runWithLocale } from '#api/services/requestLocale';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import {
	groupKey,
	groupTopicsOf,
	hearsOfReports,
	inboxKey,
	topicOfInbox,
	wantsNotification,
	wantsPaperNotification,
	type NotifiedGroup,
	type NotifiedInbox,
	type TopicKey
} from '#lib/helpers/teamNotifications';
import { notificationTopicLabel } from '#lib/helpers/teamNotificationLabels';
import { preferencesOfMembers, workspaceOfConference } from './notificationStore';
import { sendSlackDirectMessage, slackEscape } from './slackApi';
import { decryptSlackToken } from './slackToken';
import { slackUserOf } from './slackUsers';
import { nanoid } from '#lib/helpers/nanoid';
import { scanPageUrl, type ScanProblemNotice } from '#api/handlers/email/scanProblemEmail';
import {
	paperSubmissionValues,
	submittedPaperUrl,
	type SubmittedPaper
} from '#api/handlers/email/paperSubmittedEmail';

/**
 * The direct messages Slack carries to the team, right when something arrives: a participant's
 * message in an inbox, to everybody answering it, a report, to participant care, and a submitted
 * paper, to its committee's chairs and consultants on the paper team. Each goes
 * to whoever left Slack on for that topic (`notificationPreference`), in the workspace their
 * conference picked, found there by their account's address. Like the mails they notify and do
 * not relay: which inbox, and a link, never a word of the message or who wrote it; for a paper
 * where it was submitted and by which role, never its author or text.
 *
 * An inbox tells a member once until it is read: the next message there is silent while the one
 * they were told about still waits (`slackNotification`).
 */

/** The log key of the reports: each report tells once. */
const REPORT_KEY = 'report';

async function loadRecipients(conferenceId: string) {
	const workspace = await workspaceOfConference(conferenceId);
	if (!workspace) return undefined;
	const [conference, members] = await Promise.all([
		db.query.conference.findFirst({ where: { id: conferenceId }, columns: { title: true } }),
		db.query.teamMember.findMany({
			where: { conferenceId },
			columns: { id: true, userId: true, role: true },
			with: {
				user: { columns: { id: true, email: true, locale: true } },
				functions: {
					columns: { id: true, committeeId: true, roleId: true, kind: true },
					with: {
						committee: { columns: { abbreviation: true } },
						role: { columns: { name: true } }
					}
				}
			}
		})
	]);
	if (!conference) return undefined;
	const preferences = await preferencesOfMembers({
		teamMemberIds: members.map((member) => member.id),
		channel: 'SLACK'
	});
	return {
		workspace,
		conferenceTitle: conference.title,
		members: members.map((member) => ({
			...member,
			preferences: preferences.get(member.id) ?? []
		}))
	};
}

type Recipients = NonNullable<Awaited<ReturnType<typeof loadRecipients>>>;
type Member = Recipients['members'][number];

const wantsSlack = ({ member, key }: { member: Member; key: TopicKey }) =>
	wantsNotification({
		preferences: member.preferences,
		key,
		channel: 'SLACK',
		mailByDefault: true
	});

/**
 * Whether the message a log row told about still waits unread in its chat; then the member is
 * not told again. A report never waits: each is told once, by its own id.
 */
const stillWaiting = sql`exists (
	select 1 from chat_message m join chat c on c.id = m.chat_id
	where m.id = ${schema.slackNotification.subjectId}
		and (c.team_read_at is null or m.created_at > c.team_read_at))`;

/** `stillWaiting` for a group, which each of its people reads for themselves. */
const stillUnreadBy = (userId: string) => sql`exists (
	select 1 from chat_message m
		left join chat_read r on r.chat_id = m.chat_id and r.user_id = ${userId}
	where m.id = ${schema.slackNotification.subjectId}
		and (r.read_at is null or m.created_at > r.read_at))`;

/**
 * Writes down that the member is told about `subjectId` under `key`, unless they were already:
 * about this very subject, or, for an inbox, about a message that still waits. Under a lock per
 * member and key, so two messages arriving together tell once.
 */
async function claim({
	teamMemberId,
	key,
	subjectId,
	oncePerSubject,
	waiting = stillWaiting
}: {
	teamMemberId: string;
	key: string;
	subjectId: string;
	oncePerSubject: boolean;
	/** What makes the message told about before still wait (`stillWaiting`). */
	waiting?: typeof stillWaiting;
}) {
	return db.transaction(async (tx) => {
		await tx.execute(
			sql`select pg_advisory_xact_lock(hashtextextended(${`slack:${teamMemberId}:${key}`}, 0))`
		);
		const log = schema.slackNotification;
		const mine = and(eq(log.teamMemberId, teamMemberId), eq(log.inboxKey, key));
		const [told] = await tx
			.select({ id: log.id })
			.from(log)
			.where(and(mine, oncePerSubject ? eq(log.subjectId, subjectId) : waiting))
			.orderBy(desc(log.createdAt))
			.limit(1);
		if (told) return undefined;
		const [row] = await tx
			.insert(log)
			.values({ teamMemberId, inboxKey: key, subjectId })
			.returning({ id: log.id });
		return row?.id;
	});
}

/** Tells one member, and takes the claim back when the message did not reach them; whether it did. */
async function tell({
	recipients,
	member,
	key,
	subjectId,
	oncePerSubject,
	waiting,
	text
}: {
	recipients: Recipients;
	member: Member;
	key: string;
	subjectId: string;
	oncePerSubject: boolean;
	waiting?: typeof stillWaiting;
	text: () => string;
}): Promise<boolean> {
	const claimed = await claim({ teamMemberId: member.id, key, subjectId, oncePerSubject, waiting });
	if (!claimed) return false;
	const unclaim = async () => {
		await db.delete(schema.slackNotification).where(eq(schema.slackNotification.id, claimed));
	};
	try {
		const { slackUserId } = await slackUserOf({
			workspace: recipients.workspace,
			user: member.user
		});
		// not in the workspace (or Slack did not answer): told once they are, with the next message
		if (!slackUserId) {
			await unclaim();
			return false;
		}
		await sendSlackDirectMessage({
			token: await decryptSlackToken(recipients.workspace.botTokenCiphertext),
			slackUserId,
			text: runWithLocale({ locale: localeOfUser(member.user.locale), fn: text })
		});
		return true;
	} catch (error) {
		await unclaim();
		logger.error('Sending a Slack notification failed', { error, teamMemberId: member.id });
		return false;
	}
}

const slackLink = ({ url, label }: { url: string; label: string }) => `<${url}|${label}>`;

/**
 * The texts of the messages, asked for in the recipient's locale. The notification test on the
 * settings page sends them too, so a test reads exactly like the real thing.
 */

/** A participant wrote in an inbox the member answers under `key`. */
export const inboxSlackText = ({
	key,
	held,
	conferenceTitle,
	conferenceId,
	origin
}: {
	key: TopicKey;
	/** The member's function the inbox is answered by, for a committee's or custom role's inbox. */
	held?: {
		kind: string;
		committee?: { abbreviation: string } | null;
		role?: { name: string | null } | null;
	};
	conferenceTitle: string;
	conferenceId: string;
	origin: string;
}) =>
	`${m.slackInboxMessage({
		inbox: notificationTopicLabel({
			topic: key.topic,
			functionKind: held?.kind,
			committeeAbbreviation: held?.committee?.abbreviation,
			roleName: held?.role?.name
		}),
		conference: conferenceTitle
	})}\n${slackLink({ url: `${origin}/dashboard/${conferenceId}/team/messages`, label: m.slackOpenMessages() })}`;

/** A participant wrote in a group the member is in by `held`. */
export const groupSlackText = ({
	held,
	conferenceTitle,
	conferenceId,
	origin
}: {
	held?: {
		kind: string;
		committee?: { abbreviation: string } | null;
		role?: { name: string | null } | null;
	};
	conferenceTitle: string;
	conferenceId: string;
	origin: string;
}) =>
	`${m.slackGroupMessage({
		group: (held?.kind === 'ROLE_SUPPORT' ? held.role?.name : held?.committee?.abbreviation) ?? '',
		conference: conferenceTitle
	})}\n${slackLink({ url: `${origin}/dashboard/${conferenceId}/team/messages`, label: m.slackOpenMessages() })}`;

/** A chat was reported. */
export const reportSlackText = ({
	conferenceTitle,
	conferenceId,
	origin
}: {
	conferenceTitle: string;
	conferenceId: string;
	origin: string;
}) =>
	`${m.slackReportMessage({ conference: conferenceTitle })}\n${slackLink({ url: `${origin}/dashboard/${conferenceId}/team/messages?view=reports`, label: m.slackOpenReports() })}`;

/** A version of a paper was submitted; `url` is where it opens. */
export const paperSlackText = ({ paper, url }: { paper: SubmittedPaper; url: string }) =>
	`${m.slackPaperSubmitted(paperSubmissionValues({ paper, escape: slackEscape }))}\n${slackLink({ url, label: m.slackOpenPaper() })}`;

/** Pages of the member's own scanner came to nothing. */
export const scanProblemSlackText = ({
	notice,
	origin
}: {
	notice: ScanProblemNotice;
	origin: string | undefined;
}) =>
	[
		m.slackScanProblem({ scanner: slackEscape(notice.scanner) }),
		...notice.problems().map((line) => `• ${slackEscape(line)}`),
		...(origin
			? [
					slackLink({
						url: scanPageUrl({ origin, conferenceId: notice.conferenceId }),
						label: m.slackOpenScanPage()
					})
				]
			: [])
	].join('\n');

/** Tells everybody answering the inbox of `chat` that a participant wrote there. */
async function tellInbox({
	chat,
	messageId,
	origin
}: {
	chat: NotifiedInbox & { conferenceId: string };
	messageId: string;
	origin: string;
}) {
	const recipients = await loadRecipients(chat.conferenceId);
	if (!recipients) return;
	await Promise.all(
		recipients.members.map(async (member) => {
			const key = topicOfInbox({ member, inbox: chat });
			if (!key || !wantsSlack({ member, key })) return;
			const held = member.functions.find((fn) => fn.id === key.teamFunctionId);
			await tell({
				recipients,
				member,
				key: inboxKey(chat),
				subjectId: messageId,
				oncePerSubject: false,
				text: () =>
					inboxSlackText({
						key,
						held,
						conferenceTitle: recipients.conferenceTitle,
						conferenceId: chat.conferenceId,
						origin
					})
			});
		})
	);
}

/**
 * Tells the team members of a group (`groupTopicsOf`) that a participant wrote there, unless they
 * muted it. Once until they read it, like an inbox, but each by their own reading.
 */
async function tellGroup({
	chat,
	messageId,
	origin
}: {
	chat: NotifiedGroup & { id: string; conferenceId: string };
	messageId: string;
	origin: string;
}) {
	const recipients = await loadRecipients(chat.conferenceId);
	if (!recipients) return;
	const muted = new Set(
		(
			await db.query.chatMute.findMany({
				where: { chatId: chat.id },
				columns: { userId: true }
			})
		).map((row) => row.userId)
	);
	await Promise.all(
		recipients.members.map(async (member) => {
			if (muted.has(member.userId)) return;
			const keys = groupTopicsOf({ member, group: chat });
			const key = keys.find((one) => wantsSlack({ member, key: one }));
			if (!key) return;
			const held = member.functions.find((fn) => fn.id === key.teamFunctionId);
			await tell({
				recipients,
				member,
				key: groupKey(chat.id),
				subjectId: messageId,
				oncePerSubject: false,
				waiting: stillUnreadBy(member.userId),
				text: () =>
					groupSlackText({
						held,
						conferenceTitle: recipients.conferenceTitle,
						conferenceId: chat.conferenceId,
						origin
					})
			});
		})
	);
}

/** Tells participant care that a chat was reported. */
async function tellReport({
	conferenceId,
	reportId,
	origin
}: {
	conferenceId: string;
	reportId: string;
	origin: string;
}) {
	const recipients = await loadRecipients(conferenceId);
	if (!recipients) return;
	const key: TopicKey = { topic: 'CHAT_REPORT', teamFunctionId: null };
	await Promise.all(
		recipients.members
			.filter((member) => hearsOfReports(member) && wantsSlack({ member, key }))
			.map((member) =>
				tell({
					recipients,
					member,
					key: REPORT_KEY,
					subjectId: reportId,
					oncePerSubject: true,
					text: () =>
						reportSlackText({ conferenceTitle: recipients.conferenceTitle, conferenceId, origin })
				})
			)
	);
}

/**
 * Tells the committee's chairs and consultants on the paper team of a submitted version of a
 * paper. Each version tells once (`paper:<id>`, by the version).
 */
async function tellPaper({ paper, origin }: { paper: SubmittedPaper; origin: string }) {
	const recipients = await loadRecipients(paper.conferenceId);
	if (!recipients) return;
	const url = submittedPaperUrl({ origin, paper });
	await Promise.all(
		recipients.members
			.filter((member) =>
				wantsPaperNotification({
					member,
					committeeId: paper.committeeId,
					preferences: member.preferences,
					channel: 'SLACK',
					mailByDefault: true
				})
			)
			.map((member) =>
				tell({
					recipients,
					member,
					key: `paper:${paper.paperId}`,
					subjectId: paper.versionId,
					oncePerSubject: true,
					text: () => paperSlackText({ paper, url })
				})
			)
	);
}

/** Tells a scanner's owner of pages that came to nothing; each delivery tells once. Answers whether it reached them. */
export async function tellScanProblemOnSlack({
	teamMemberId,
	notice,
	origin
}: {
	teamMemberId: string;
	notice: ScanProblemNotice;
	origin: string | undefined;
}): Promise<boolean> {
	const recipients = await loadRecipients(notice.conferenceId);
	const member = recipients?.members.find(({ id }) => id === teamMemberId);
	if (!recipients || !member) return false;
	if (!wantsSlack({ member, key: { topic: 'SCAN_PROBLEM', teamFunctionId: null } })) return false;
	return tell({
		recipients,
		member,
		key: 'scan',
		subjectId: nanoid(),
		oncePerSubject: true,
		text: () => scanProblemSlackText({ notice, origin })
	});
}

/** Runs in the background: what was written is written, whether or not Slack hears of it. */
function inBackground({ work, failure }: { work: Promise<void>; failure: string }) {
	void work.catch((error: unknown) => logger.error(failure, error));
}

/** A chat as far as telling its inbox asks: only a team chat has one. */
interface ToldChat {
	id: string;
	conferenceId: string;
	kind: string;
	inbox: NotifiedInbox['inbox'] | null;
	committeeId: string | null;
	roleId: string | null;
	trustedUserId: string | null;
}

/** Tells the team of a group that a participant wrote there; nothing for any other chat. */
export function tellGroupOnSlack({
	chat,
	messageId,
	origin
}: {
	chat: ToldChat;
	messageId: string;
	origin: string;
}) {
	const { kind } = chat;
	if (kind !== 'COMMITTEE' && kind !== 'ROLE') return;
	inBackground({
		work: tellGroup({ chat: { ...chat, kind }, messageId, origin }),
		failure: 'Telling a group on Slack failed'
	});
}

/** Tells the inbox of a team chat that a participant wrote there; nothing for any other chat. */
export function tellInboxOnSlack({
	chat,
	messageId,
	origin
}: {
	chat: ToldChat;
	messageId: string;
	origin: string;
}) {
	if (chat.kind !== 'TEAM' || !chat.inbox) return;
	inBackground({
		work: tellInbox({ chat: { ...chat, inbox: chat.inbox }, messageId, origin }),
		failure: 'Telling an inbox on Slack failed'
	});
}

export function tellReportOnSlack(args: Parameters<typeof tellReport>[0]) {
	inBackground({ work: tellReport(args), failure: 'Telling a report on Slack failed' });
}

export function tellPaperOnSlack(args: Parameters<typeof tellPaper>[0]) {
	inBackground({ work: tellPaper(args), failure: 'Telling a submitted paper on Slack failed' });
}
