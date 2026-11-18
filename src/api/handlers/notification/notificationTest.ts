import { db } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { localeOfUser, runWithLocale } from '#api/services/requestLocale';
import { m } from '#lib/paraglide/messages';
import {
	topicsOf,
	type NotificationChannel,
	type NotificationTopic,
	type NotifiedMember,
	type TopicKey
} from '#lib/helpers/teamNotifications';
import type { DueEmail, SnapshotRole, SnapshotUser } from '#api/handlers/email/dueEmails';
import { loadEmailConference } from '#api/handlers/email/emailSnapshot';
import {
	loadWording,
	renderAutomaticEmail,
	sendByHand,
	type RenderedEmail
} from '#api/handlers/email/emailDelivery';
import { MAIL_USER } from '#api/handlers/email/announcementEmails';
import {
	renderPaperSubmittedEmail,
	type SubmittedPaper
} from '#api/handlers/email/paperSubmittedEmail';
import { workspaceOfConference } from './notificationStore';
import { sendSlackTo } from './notificationService';
import { inboxSlackText, paperSlackText, reportSlackText } from './slackNotifications';

/**
 * The test on the notification settings page: a team member sends themselves one of their topics'
 * notifications, by mail or on Slack, to see that it arrives and how it reads. It goes the way the
 * real one does: the same text, the mail rendered in their language and the conference's own words
 * and logged as sent by hand, the Slack message to the account their address is known by in the
 * conference's workspace. It is marked as a test, is sent whatever the switch says (asking for it
 * is the decision), and claims nothing: the real notifications go on as before.
 */

/** How a test went: `NOT_FOUND` when Slack does not know the address, `UNAVAILABLE` when the mail service or Slack refused. */
export type NotificationTestResult = 'SENT' | 'NOT_FOUND' | 'UNAVAILABLE';

/** The mail a topic's notification is: an inbox's unread message, a report, a submitted paper. */
export function testEmailKind(topic: NotificationTopic) {
	switch (topic) {
		case 'PARTICIPANT_CARE':
		case 'COMMITTEE_INBOX':
		case 'TRUSTED_SHARED':
		case 'TRUSTED_PERSONAL':
			return 'UNREAD_MESSAGES' as const;
		case 'CHAT_REPORT':
			return 'CHAT_REPORTED' as const;
		case 'COMMITTEE_PAPERS':
			return 'PAPER_SUBMITTED' as const;
	}
}

/** The paper a test about a committee's papers describes: its first agenda item, a role it seats. */
export function samplePaper({
	conferenceId,
	conferenceTitle,
	committee,
	agendaItem,
	role
}: {
	conferenceId: string;
	conferenceTitle: string;
	committee: { id: string; abbreviation: string };
	agendaItem: string | undefined;
	role: SnapshotRole | undefined;
}): SubmittedPaper {
	return {
		paperId: 'test',
		versionId: 'test',
		conferenceId,
		conferenceTitle,
		committeeId: committee.id,
		committeeAbbreviation: committee.abbreviation,
		agendaItem: agendaItem ?? m.notificationTestSampleAgendaItem(),
		type: 'POSITION_PAPER',
		status: 'SUBMITTED',
		version: 1,
		role: role ?? null
	};
}

/** Whether `key` is one of the member's topics. */
export const isTopicOf = ({ member, key }: { member: NotifiedMember; key: TopicKey }) =>
	topicsOf(member).some(
		(theirs) => theirs.topic === key.topic && theirs.teamFunctionId === key.teamFunctionId
	);

type TestedMember = NotifiedMember & { id: string; role: SnapshotTeamRole };
type SnapshotTeamRole = NonNullable<DueEmail['teamMember']>['role'];

/** The committee of the member's function, with what the paper sample names of it. */
async function loadCommittee(committeeId: string) {
	return db.query.committee.findFirst({
		where: { id: committeeId },
		columns: { id: true, abbreviation: true },
		with: {
			agendaItems: { columns: { title: true }, limit: 1 },
			roles: { columns: { id: true, kind: true, name: true, nationAlpha3Code: true }, limit: 1 }
		}
	});
}

/** Everything a test is made of: who it goes to, the conference, and the sample paper. */
interface TestSetting {
	member: TestedMember;
	conferenceId: string;
	key: TopicKey;
	origin: string;
	conference: NonNullable<Awaited<ReturnType<typeof loadEmailConference>>>;
	user: SnapshotUser;
	held: TestedMember['functions'][number] | undefined;
	committee: Awaited<ReturnType<typeof loadCommittee>>;
	paper: SubmittedPaper | undefined;
	/** Where the sample paper's link leads: there is no paper to open. */
	paperUrl: string;
}

/** The topic's Slack message, as `slackNotifications.ts` writes it, with a test line on top. */
async function sendSlackTest(test: TestSetting): Promise<NotificationTestResult> {
	const { conferenceId, key, origin, conference, held, committee, paper, paperUrl } = test;
	const workspace = await workspaceOfConference(conferenceId);
	if (!workspace) throw apiError({ code: 'CONFLICT', message: m.slackNoWorkspace() });
	const text = () => {
		const at = { conferenceTitle: conference.title, conferenceId, origin };
		if (key.topic === 'CHAT_REPORT') return reportSlackText(at);
		if (key.topic === 'COMMITTEE_PAPERS' && paper) return paperSlackText({ paper, url: paperUrl });
		return inboxSlackText({ ...at, key, held: held && { kind: held.kind, committee } });
	};
	const connection = await sendSlackTo({
		workspace,
		user: test.user,
		text: () => `${m.notificationTestSlackPrefix()}\n${text()}`
	});
	return connection === 'CONNECTED' ? 'SENT' : connection;
}

/** Renders the topic's mail the way the real one is rendered. */
async function renderTestEmail(test: TestSetting): Promise<RenderedEmail> {
	const { member, conferenceId, key, origin, conference, user, paper, paperUrl } = test;
	const kind = testEmailKind(key.topic);
	const wording = await loadWording(conferenceId);
	if (kind === 'PAPER_SUBMITTED') {
		if (!paper) throw new Error('A committee function without its committee');
		return renderPaperSubmittedEmail({ recipient: user, paper, origin, wording, url: paperUrl });
	}
	const email: DueEmail = {
		kind,
		subjectKey: 'test',
		recipient: user,
		teamMember: { id: member.id, role: member.role, user, inviterName: null }
	};
	return renderAutomaticEmail({ email, conference, origin, wording });
}

/** The topic's mail, marked as a test in its subject and logged as sent by hand. */
async function sendEmailTest(test: TestSetting): Promise<NotificationTestResult> {
	const { conferenceId, key, user } = test;
	const error = await sendByHand({
		conferenceId,
		kind: testEmailKind(key.topic),
		userId: user.id,
		subjectKey: `test:${key.topic}:${key.teamFunctionId ?? ''}:${new Date().toISOString()}`,
		to: user.email,
		sentById: user.id,
		render: async () => {
			const rendered = await renderTestEmail(test);
			const subject = runWithLocale({
				locale: localeOfUser(user.locale),
				fn: () => m.notificationTestSubject({ subject: rendered.subject })
			});
			return { ...rendered, subject };
		}
	});
	return error === undefined ? 'SENT' : 'UNAVAILABLE';
}

/**
 * Sends the member one test of `key` on `channel`. INVALID_INPUT for a topic that is not theirs,
 * CONFLICT for Slack while the conference has no workspace.
 */
export async function sendNotificationTest({
	member,
	conferenceId,
	key,
	channel,
	origin
}: {
	member: TestedMember;
	conferenceId: string;
	key: TopicKey;
	channel: NotificationChannel;
	origin: string;
}): Promise<NotificationTestResult> {
	if (!isTopicOf({ member, key })) {
		throw apiError({ code: 'INVALID_INPUT', message: m.notificationTopicNotYours() });
	}
	const held = member.functions.find((fn) => fn.id === key.teamFunctionId);
	const [conference, user, committee] = await Promise.all([
		loadEmailConference(conferenceId),
		db.query.user.findFirst({ where: { id: member.userId }, ...MAIL_USER }),
		held?.committeeId ? loadCommittee(held.committeeId) : undefined
	]);
	if (!conference || !user) {
		throw apiError({ code: 'NOT_FOUND', message: m.notificationsNotOnTeam() });
	}
	const paper =
		committee &&
		samplePaper({
			conferenceId,
			conferenceTitle: conference.title,
			committee,
			agendaItem: committee.agendaItems[0]?.title,
			role: committee.roles[0]
		});
	const test: TestSetting = {
		member,
		conferenceId,
		key,
		origin,
		conference,
		user,
		held,
		committee,
		paper,
		paperUrl: `${origin}/dashboard/${conferenceId}/paperhub`
	};
	return channel === 'SLACK' ? sendSlackTest(test) : sendEmailTest(test);
}
