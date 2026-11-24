import { devEmail, type DevAccountSub } from '../seed-data/devAccounts';
import { inboxKey } from '#lib/helpers/teamNotifications';
import type { SeedBatch } from './batch';
import type { ConferenceSeed } from './context';
import { chatMessageId, teamFunctionId } from './messages';
import { teamMemberId } from './team';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const LINKED_WORKSPACE = 'seed-slack-workspace-linked';

/**
 * Two Slack workspaces (see "Team notifications" in CLAUDE.md) on the system admins' page, and
 * who the linked one knows: `dev-team-care`, `dev-team-member` and `dev-team-content-lead` are in
 * it, `dev-team-reviewer` is not (the settings page says so), and `dev-team-pm` was never looked
 * up. The tokens are placeholders that decrypt to nothing, so a message the team is told about
 * logs a failed Slack call instead of writing anywhere; enter a real bot token on the page to try
 * it.
 */
export function addSlackWorkspaces(batch: SeedBatch) {
	batch.slackWorkspace.push(
		{
			id: LINKED_WORKSPACE,
			name: 'DMUN (Seed)',
			slackTeamId: 'T0SEEDDMUN',
			slackTeamName: 'Deutsche Model United Nations',
			botTokenCiphertext: 'seed-placeholder'
		},
		{
			id: 'seed-slack-workspace-unused',
			name: 'MUN-SH (Seed)',
			slackTeamId: 'T0SEEDMUNSH',
			slackTeamName: 'MUN Schleswig-Holstein',
			botTokenCiphertext: 'seed-placeholder'
		}
	);
	const now = Date.now();
	for (const [userId, slackUserId] of [
		['dev-team-care', 'U0SEEDCARE'],
		['dev-team-member', 'U0SEEDMEMBER'],
		['dev-team-content-lead', 'U0SEEDCONTENT'],
		['dev-team-reviewer', null]
	] as const) {
		batch.slackUserLookup.push({
			slackWorkspaceId: LINKED_WORKSPACE,
			userId,
			lookedUpEmail: devEmail(userId),
			slackUserId,
			checkedAt: new Date(now - (slackUserId ? 24 * HOUR : 0))
		});
	}
}

/**
 * The team's notification choices where there are inboxes to answer: participant care hears of
 * its inbox on Slack only, of reports by mail only and of scans nobody was found for by mail only, the chair (`dev-team-member`) gets no mails
 * about their committee and no Slack about the trusted persons' shared chat, the consultant
 * (`dev-team-reviewer`) no Slack about the second committee. Everything else is the default.
 * `dev-team-content-lead` switched the old unread-messages mail off (`addMessagingAccountSettings`),
 * so their mails start off.
 *
 * The running conference tells its team in the seeded workspace and has already told participant
 * care and the trusted persons of the chats waiting for them on Slack.
 */
export function addNotifications(cs: ConferenceSeed) {
	if (!cs.conference.messagingEnabled || !cs.plan.assigned) return;
	const [first, second] = cs.committees;
	if (!first || !second) return;

	const choice = ({
		userId,
		topic,
		channel,
		enabled,
		teamFunctionId = null
	}: {
		userId: DevAccountSub;
		topic: (typeof cs.batch.notificationPreference)[number]['topic'];
		channel: 'EMAIL' | 'SLACK';
		enabled: boolean;
		teamFunctionId?: string | null;
	}) =>
		cs.batch.notificationPreference.push({
			teamMemberId: teamMemberId({ cs, userId }),
			topic,
			channel,
			enabled,
			teamFunctionId
		});
	choice({ userId: 'dev-team-care', topic: 'PARTICIPANT_CARE', channel: 'EMAIL', enabled: false });
	choice({ userId: 'dev-team-care', topic: 'CHAT_REPORT', channel: 'SLACK', enabled: false });
	choice({ userId: 'dev-team-care', topic: 'SCAN_PROBLEM', channel: 'SLACK', enabled: false });
	choice({
		userId: 'dev-team-member',
		topic: 'COMMITTEE_INBOX',
		channel: 'EMAIL',
		enabled: false,
		teamFunctionId: teamFunctionId({
			cs,
			userId: 'dev-team-member',
			kind: 'CHAIR',
			committeeId: first.id
		})
	});
	choice({ userId: 'dev-team-member', topic: 'TRUSTED_SHARED', channel: 'SLACK', enabled: false });
	choice({
		userId: 'dev-team-reviewer',
		topic: 'COMMITTEE_INBOX',
		channel: 'SLACK',
		enabled: false,
		teamFunctionId: teamFunctionId({
			cs,
			userId: 'dev-team-reviewer',
			kind: 'CONSULTANT',
			committeeId: second.id
		})
	});

	if (cs.plan.key !== 'active') return;
	cs.batch.conferenceSlackWorkspace.push({
		conferenceId: cs.id,
		slackWorkspaceId: LINKED_WORKSPACE
	});
	// told of the first message of each, which still waits unread
	const told = ({
		userId,
		inbox,
		chat
	}: {
		userId: DevAccountSub;
		inbox: 'PARTICIPANT_CARE' | 'TRUSTED_PERSON';
		chat: string;
	}) =>
		cs.batch.slackNotification.push({
			teamMemberId: teamMemberId({ cs, userId }),
			inboxKey: inboxKey({ inbox, committeeId: null, trustedUserId: null }),
			subjectId: chatMessageId({ chatId: cs.rowId(`chat-${chat}`), index: 0 }),
			createdAt: new Date(Date.now() - 40 * MINUTE)
		});
	told({ userId: 'dev-team-care', inbox: 'PARTICIPANT_CARE', chat: 'care-waiting' });
	told({ userId: 'dev-team-content-lead', inbox: 'TRUSTED_PERSON', chat: 'trusted-shared' });
}
