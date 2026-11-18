import { and, desc, eq, sql } from 'drizzle-orm';
import { db, schema } from '#api/db/db';
import { localeOfUser, runWithLocale } from '#api/services/requestLocale';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import {
	hearsOfReports,
	inboxKey,
	topicOfInbox,
	wantsNotification,
	wantsPaperNotification,
	type NotifiedInbox,
	type TopicKey
} from '#lib/helpers/teamNotifications';
import { notificationTopicLabel } from '#lib/helpers/teamNotificationLabels';
import { preferencesOfMembers, workspaceOfConference } from './notificationStore';
import { sendSlackDirectMessage } from './slackApi';
import { decryptSlackToken } from './slackToken';
import { slackUserOf } from './slackUsers';
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
					columns: { id: true, committeeId: true, kind: true },
					with: { committee: { columns: { abbreviation: true } } }
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

/**
 * Writes down that the member is told about `subjectId` under `key`, unless they were already:
 * about this very subject, or, for an inbox, about a message that still waits. Under a lock per
 * member and key, so two messages arriving together tell once.
 */
async function claim({
	teamMemberId,
	key,
	subjectId,
	oncePerSubject
}: {
	teamMemberId: string;
	key: string;
	subjectId: string;
	oncePerSubject: boolean;
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
			.where(and(mine, oncePerSubject ? eq(log.subjectId, subjectId) : stillWaiting))
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

/** Tells one member, and takes the claim back when the message did not reach them. */
async function tell({
	recipients,
	member,
	key,
	subjectId,
	oncePerSubject,
	text
}: {
	recipients: Recipients;
	member: Member;
	key: string;
	subjectId: string;
	oncePerSubject: boolean;
	text: () => string;
}) {
	const claimed = await claim({ teamMemberId: member.id, key, subjectId, oncePerSubject });
	if (!claimed) return;
	const unclaim = async () => {
		await db.delete(schema.slackNotification).where(eq(schema.slackNotification.id, claimed));
	};
	try {
		const { slackUserId } = await slackUserOf({
			workspace: recipients.workspace,
			user: member.user
		});
		// not in the workspace (or Slack did not answer): told once they are, with the next message
		if (!slackUserId) return await unclaim();
		await sendSlackDirectMessage({
			token: await decryptSlackToken(recipients.workspace.botTokenCiphertext),
			slackUserId,
			text: runWithLocale({ locale: localeOfUser(member.user.locale), fn: text })
		});
	} catch (error) {
		await unclaim();
		logger.error('Sending a Slack notification failed', { error, teamMemberId: member.id });
	}
}

const slackLink = ({ url, label }: { url: string; label: string }) => `<${url}|${label}>`;

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
	const url = `${origin}/dashboard/${chat.conferenceId}/team/messages`;
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
					`${m.slackInboxMessage({
						inbox: notificationTopicLabel({
							topic: key.topic,
							functionKind: held?.kind,
							committeeAbbreviation: held?.committee?.abbreviation
						}),
						conference: recipients.conferenceTitle
					})}\n${slackLink({ url, label: m.slackOpenMessages() })}`
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
	const url = `${origin}/dashboard/${conferenceId}/team/messages?view=reports`;
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
						`${m.slackReportMessage({ conference: recipients.conferenceTitle })}\n${slackLink({ url, label: m.slackOpenReports() })}`
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
					text: () =>
						`${m.slackPaperSubmitted(paperSubmissionValues(paper))}\n${slackLink({ url, label: m.slackOpenPaper() })}`
				})
			)
	);
}

/** Runs in the background: what was written is written, whether or not Slack hears of it. */
function inBackground({ work, failure }: { work: Promise<void>; failure: string }) {
	void work.catch((error: unknown) => logger.error(failure, error));
}

/** A chat as far as telling its inbox asks: only a team chat has one. */
interface ToldChat {
	conferenceId: string;
	kind: string;
	inbox: NotifiedInbox['inbox'] | null;
	committeeId: string | null;
	trustedUserId: string | null;
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
