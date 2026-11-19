// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { NotificationChannel, NotificationTopic } from '#lib/helpers/teamNotifications';

const findUser = vi.fn();
const findCommittee = vi.fn();
const loadEmailConference = vi.fn();
const loadWording = vi.fn();
const renderAutomaticEmail = vi.fn();
const renderPaperSubmittedEmail = vi.fn();
const sendByHand = vi.fn();
const workspaceOfConference = vi.fn();
const sendSlackTo = vi.fn();

vi.mock('#api/db/db', () => ({
	db: { query: { user: { findFirst: findUser }, committee: { findFirst: findCommittee } } },
	schema: { slackNotification: { subjectId: 'subject_id' } }
}));
vi.mock('#api/services/requestLocale', () => ({
	localeOfUser: () => 'en',
	runWithLocale: ({ fn }: { fn: () => unknown }) => fn()
}));
vi.mock('#api/handlers/email/emailSnapshot', () => ({ loadEmailConference }));
vi.mock('#api/handlers/email/emailDelivery', () => ({
	loadWording,
	renderAutomaticEmail,
	sendByHand
}));
vi.mock('#api/handlers/email/paperSubmittedEmail', () => ({ renderPaperSubmittedEmail }));
vi.mock('./notificationStore', () => ({ workspaceOfConference }));
vi.mock('#api/handlers/email/announcementEmails', () => ({ MAIL_USER: {} }));
vi.mock('./notificationService', () => ({ sendSlackTo }));
// the texts are the real ones; what they would send with is not needed
vi.mock('./slackApi', () => ({
	sendSlackDirectMessage: vi.fn(),
	slackEscape: (text: string) => text
}));
vi.mock('./slackToken', () => ({ decryptSlackToken: vi.fn() }));
vi.mock('./slackUsers', () => ({ slackUserOf: vi.fn() }));

const { isTopicOf, samplePaper, sendNotificationTest, testEmailKind } =
	await import('./notificationTest');

const chair = { id: 'f1', committeeId: 'k1', kind: 'CHAIR' };
const member = {
	id: 'tm1',
	userId: 'u1',
	role: 'REVIEWER' as const,
	functions: [chair]
};
const user = {
	id: 'u1',
	email: 'chair@example.org',
	givenName: 'Ada',
	familyName: 'Lovelace',
	locale: 'en',
	birthday: null
};
const committee = {
	id: 'k1',
	abbreviation: 'GA',
	agendaItems: [{ title: 'Climate' }],
	roles: [{ id: 'r1', kind: 'NATION' as const, name: null, nationAlpha3Code: 'DEU' }]
};
const conference = { id: 'c1', title: 'MUN-SH 2027' };

const send = ({
	topic,
	teamFunctionId,
	channel
}: {
	topic: NotificationTopic;
	teamFunctionId: string | null;
	channel: NotificationChannel;
}) =>
	sendNotificationTest({
		member,
		conferenceId: 'c1',
		key: { topic, teamFunctionId },
		channel,
		origin: 'https://app.example'
	});

beforeEach(() => {
	vi.clearAllMocks();
	findUser.mockResolvedValue(user);
	findCommittee.mockResolvedValue(committee);
	loadEmailConference.mockResolvedValue(conference);
	loadWording.mockResolvedValue({ texts: [], footers: [] });
	renderAutomaticEmail.mockResolvedValue({ subject: 'Unread', html: '', text: '' });
	renderPaperSubmittedEmail.mockResolvedValue({ subject: 'Paper', html: '', text: '' });
	sendByHand.mockImplementation(async ({ render }: { render: () => Promise<unknown> }) => {
		await render();
		return undefined;
	});
	workspaceOfConference.mockResolvedValue({ id: 'w1', botTokenCiphertext: 'sealed' });
	sendSlackTo.mockResolvedValue('CONNECTED');
});

describe('testEmailKind', () => {
	test('is the mail the topic is told by', () => {
		for (const topic of [
			'PARTICIPANT_CARE',
			'COMMITTEE_INBOX',
			'TRUSTED_SHARED',
			'TRUSTED_PERSONAL'
		] as const) {
			expect(testEmailKind(topic)).toBe('UNREAD_MESSAGES');
		}
		expect(testEmailKind('CHAT_REPORT')).toBe('CHAT_REPORTED');
		expect(testEmailKind('COMMITTEE_PAPERS')).toBe('PAPER_SUBMITTED');
	});
});

describe('samplePaper', () => {
	test('names the committee, its first agenda item and a role it seats', () => {
		const paper = samplePaper({
			conferenceId: 'c1',
			conferenceTitle: 'MUN-SH 2027',
			committee,
			agendaItem: 'Climate',
			role: committee.roles[0]
		});
		expect(paper).toMatchObject({
			committeeId: 'k1',
			committeeAbbreviation: 'GA',
			agendaItem: 'Climate',
			role: { nationAlpha3Code: 'DEU' },
			version: 1,
			status: 'SUBMITTED'
		});
	});

	test('falls back to a placeholder without agenda items or roles', () => {
		const paper = samplePaper({
			conferenceId: 'c1',
			conferenceTitle: 'MUN-SH 2027',
			committee,
			agendaItem: undefined,
			role: undefined
		});
		expect(paper.agendaItem).not.toBe('');
		expect(paper.role).toBeNull();
	});
});

describe('isTopicOf', () => {
	test('takes only the topics the member has', () => {
		expect(isTopicOf({ member, key: { topic: 'COMMITTEE_INBOX', teamFunctionId: 'f1' } })).toBe(
			true
		);
		expect(isTopicOf({ member, key: { topic: 'COMMITTEE_INBOX', teamFunctionId: 'f2' } })).toBe(
			false
		);
		expect(isTopicOf({ member, key: { topic: 'CHAT_REPORT', teamFunctionId: null } })).toBe(false);
	});
});

describe('sendNotificationTest', () => {
	test('refuses a topic that is not the member’s', async () => {
		await expect(
			send({ topic: 'CHAT_REPORT', teamFunctionId: null, channel: 'EMAIL' })
		).rejects.toMatchObject({ extensions: { code: 'INVALID_INPUT' } });
		expect(sendByHand).not.toHaveBeenCalled();
		expect(sendSlackTo).not.toHaveBeenCalled();
	});

	test('mails an inbox topic as the unread messages mail, marked as a test and logged by hand', async () => {
		expect(await send({ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f1', channel: 'EMAIL' })).toBe(
			'SENT'
		);
		expect(renderAutomaticEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				email: expect.objectContaining({
					kind: 'UNREAD_MESSAGES',
					teamMember: expect.objectContaining({ id: 'tm1' })
				}),
				origin: 'https://app.example'
			})
		);
		const call = sendByHand.mock.calls[0]?.[0];
		expect(call).toMatchObject({
			conferenceId: 'c1',
			kind: 'UNREAD_MESSAGES',
			userId: 'u1',
			sentById: 'u1',
			to: 'chair@example.org',
			subjectKey: expect.stringMatching(/^test:COMMITTEE_INBOX:f1:/)
		});
		const rendered = await call.render();
		expect(rendered.subject).toContain('Unread');
		expect(rendered.subject).not.toBe('Unread');
	});

	test('mails the committee papers as a submitted paper of that committee', async () => {
		expect(await send({ topic: 'COMMITTEE_PAPERS', teamFunctionId: 'f1', channel: 'EMAIL' })).toBe(
			'SENT'
		);
		expect(renderPaperSubmittedEmail).toHaveBeenCalledWith(
			expect.objectContaining({
				paper: expect.objectContaining({ committeeAbbreviation: 'GA', agendaItem: 'Climate' }),
				url: 'https://app.example/dashboard/c1/paperhub'
			})
		);
		expect(sendByHand).toHaveBeenCalledWith(expect.objectContaining({ kind: 'PAPER_SUBMITTED' }));
	});

	test('answers UNAVAILABLE when the mail service refuses', async () => {
		sendByHand.mockResolvedValue('smtp down');
		expect(await send({ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f1', channel: 'EMAIL' })).toBe(
			'UNAVAILABLE'
		);
	});

	test('sends the Slack message of the topic, marked as a test', async () => {
		expect(await send({ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f1', channel: 'SLACK' })).toBe(
			'SENT'
		);
		const text: string = sendSlackTo.mock.calls[0]?.[0].text();
		// the test line, then the real message and its link
		expect(text.split('\n').length).toBeGreaterThan(2);
		expect(text).toContain('MUN-SH 2027');
		expect(text).toContain('GA');
		expect(text).toContain('https://app.example/dashboard/c1/team/messages');
	});

	test('passes on how Slack knows the member', async () => {
		sendSlackTo.mockResolvedValue('NOT_FOUND');
		expect(await send({ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f1', channel: 'SLACK' })).toBe(
			'NOT_FOUND'
		);
	});

	test('answers CONFLICT on Slack while the conference has no workspace', async () => {
		workspaceOfConference.mockResolvedValue(undefined);
		await expect(
			send({ topic: 'COMMITTEE_INBOX', teamFunctionId: 'f1', channel: 'SLACK' })
		).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		expect(sendSlackTo).not.toHaveBeenCalled();
	});
});
