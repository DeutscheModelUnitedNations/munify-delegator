// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from 'vitest';

const findWorkspace = vi.fn();
const findConference = vi.fn();
const findUser = vi.fn();
const updated = vi.fn();
const workspaceOfConference = vi.fn();
const slackWorkspaceOf = vi.fn();
const sendSlackDirectMessage = vi.fn();
const slackUserOf = vi.fn();
const forgetSlackUsers = vi.fn();
const announced = vi.fn();
const inserted = vi.fn();
const preferencesAnnounced = vi.fn();

class SlackApiError extends Error {
	constructor(
		readonly method: string,
		readonly code: string
	) {
		super(`Slack ${method} failed: ${code}`);
	}
}

vi.mock('#api/db/db', () => ({
	db: {
		query: {
			slackWorkspace: { findFirst: findWorkspace },
			conference: { findFirst: findConference },
			user: { findFirst: findUser }
		},
		insert: () => ({
			values: (values: unknown) => ({
				onConflictDoUpdate: (conflict: unknown) => {
					inserted({ values, conflict });
					return Promise.resolve();
				}
			})
		}),
		update: () => ({
			set: (values: unknown) => ({
				where: () => {
					updated(values);
					return Promise.resolve();
				}
			})
		})
	},
	schema: { slackWorkspace: { id: 'id' }, notificationPreference: {} }
}));
vi.mock('#api/pubsub', () => ({
	slackWorkspacePubsub: { updated: announced },
	notificationPreferencePubsub: { updated: preferencesAnnounced }
}));
vi.mock('./notificationStore', () => ({ workspaceOfConference }));
vi.mock('./slackApi', () => ({ SlackApiError, slackWorkspaceOf, sendSlackDirectMessage }));
vi.mock('./slackToken', () => ({
	encryptSlackToken: (token: string) => Promise.resolve(`sealed:${token}`),
	decryptSlackToken: (sealed: string) => Promise.resolve(sealed.replace('sealed:', ''))
}));
vi.mock('./slackUsers', () => ({ slackUserOf, forgetSlackUsers }));

const {
	botTokenSchema,
	sendSlackTestMessage,
	setAllNotificationPreferences,
	updateSlackWorkspace,
	workspaceNameSchema
} = await import('./notificationService');

beforeEach(() => vi.clearAllMocks());

describe('the workspace argument schemas', () => {
	test('take a bot token and nothing else', () => {
		expect(botTokenSchema.parse(' xoxb-12-ab-CD ')).toBe('xoxb-12-ab-CD');
		for (const other of ['xoxp-12-ab', 'xoxb-', 'token', 'xoxb-12 34']) {
			expect(botTokenSchema.safeParse(other).success).toBe(false);
		}
	});

	test('want a name of a sensible length', () => {
		expect(workspaceNameSchema.parse('  MUN-SH ')).toBe('MUN-SH');
		expect(workspaceNameSchema.safeParse('   ').success).toBe(false);
		expect(workspaceNameSchema.safeParse('x'.repeat(81)).success).toBe(false);
	});
});

describe('updateSlackWorkspace', () => {
	const stored = { id: 'w1', slackTeamId: 'T1' };

	test('answers NOT_FOUND for a workspace there is not', async () => {
		findWorkspace.mockResolvedValue(undefined);
		await expect(updateSlackWorkspace({ id: 'nope', name: 'X' })).rejects.toMatchObject({
			extensions: { code: 'NOT_FOUND' }
		});
		expect(updated).not.toHaveBeenCalled();
	});

	test('writes nothing when nothing was given', async () => {
		findWorkspace.mockResolvedValue(stored);
		await updateSlackWorkspace({ id: 'w1' });
		expect(updated).not.toHaveBeenCalled();
		expect(announced).not.toHaveBeenCalled();
	});

	test('renames without touching the token or what is known of its people', async () => {
		findWorkspace.mockResolvedValue(stored);
		await updateSlackWorkspace({ id: 'w1', name: 'MUNBW' });
		expect(updated).toHaveBeenCalledWith({ name: 'MUNBW' });
		expect(slackWorkspaceOf).not.toHaveBeenCalled();
		expect(forgetSlackUsers).not.toHaveBeenCalled();
		expect(announced).toHaveBeenCalledOnce();
	});

	test('replaces the token once Slack vouched for it, sealed, and asks about everybody again', async () => {
		findWorkspace.mockResolvedValue(stored);
		slackWorkspaceOf.mockResolvedValue({ teamId: 'T1', teamName: 'MUN-SH e.V.' });
		await updateSlackWorkspace({ id: 'w1', botToken: 'xoxb-new' });
		expect(updated).toHaveBeenCalledWith({
			name: undefined,
			slackTeamName: 'MUN-SH e.V.',
			botTokenCiphertext: 'sealed:xoxb-new'
		});
		expect(forgetSlackUsers).toHaveBeenCalledWith('w1');
	});

	test('refuses the token of another workspace', async () => {
		findWorkspace.mockResolvedValue(stored);
		slackWorkspaceOf.mockResolvedValue({ teamId: 'T2', teamName: 'Elsewhere' });
		await expect(updateSlackWorkspace({ id: 'w1', botToken: 'xoxb-other' })).rejects.toMatchObject({
			extensions: { code: 'INVALID_INPUT' }
		});
		expect(updated).not.toHaveBeenCalled();
	});

	test('refuses a token Slack does not know, and lets other failures through', async () => {
		findWorkspace.mockResolvedValue(stored);
		slackWorkspaceOf.mockRejectedValue(new SlackApiError('auth.test', 'invalid_auth'));
		await expect(updateSlackWorkspace({ id: 'w1', botToken: 'xoxb-bad' })).rejects.toMatchObject({
			extensions: { code: 'INVALID_INPUT' }
		});
		slackWorkspaceOf.mockRejectedValue(new Error('network down'));
		await expect(updateSlackWorkspace({ id: 'w1', botToken: 'xoxb-bad' })).rejects.toThrow(
			'network down'
		);
	});
});

describe('sendSlackTestMessage', () => {
	const send = () => sendSlackTestMessage({ conferenceId: 'c1', userId: 'u1' });

	beforeEach(() => {
		workspaceOfConference.mockResolvedValue({ id: 'w1', botTokenCiphertext: 'sealed:xoxb-1' });
		findConference.mockResolvedValue({ title: 'MUN-SH 2027' });
		findUser.mockResolvedValue({ id: 'u1', email: 'care@example.org', locale: 'en' });
		slackUserOf.mockResolvedValue({ connection: 'CONNECTED', slackUserId: 'U1' });
		sendSlackDirectMessage.mockResolvedValue(undefined);
	});

	test('sends the caller a message naming the conference', async () => {
		expect(await send()).toBe('CONNECTED');
		expect(sendSlackDirectMessage).toHaveBeenCalledWith({
			token: 'xoxb-1',
			slackUserId: 'U1',
			text: expect.stringContaining('MUN-SH 2027')
		});
	});

	test('answers CONFLICT while the conference has no workspace', async () => {
		workspaceOfConference.mockResolvedValue(undefined);
		await expect(send()).rejects.toMatchObject({ extensions: { code: 'CONFLICT' } });
		expect(sendSlackDirectMessage).not.toHaveBeenCalled();
	});

	test('sends nothing to somebody Slack does not know, and says which way', async () => {
		slackUserOf.mockResolvedValue({ connection: 'NOT_FOUND', slackUserId: null });
		expect(await send()).toBe('NOT_FOUND');
		slackUserOf.mockResolvedValue({ connection: 'UNAVAILABLE', slackUserId: null });
		expect(await send()).toBe('UNAVAILABLE');
		expect(sendSlackDirectMessage).not.toHaveBeenCalled();
	});

	test('answers UNAVAILABLE when Slack refuses the message, and lets other failures through', async () => {
		sendSlackDirectMessage.mockRejectedValue(
			new SlackApiError('chat.postMessage', 'not_in_channel')
		);
		expect(await send()).toBe('UNAVAILABLE');
		sendSlackDirectMessage.mockRejectedValue(new Error('boom'));
		await expect(send()).rejects.toThrow('boom');
	});
});

describe('setAllNotificationPreferences', () => {
	const care = { id: 'm1', userId: 'u1', role: 'PARTICIPANT_CARE', functions: [] };
	const chair = {
		id: 'm2',
		userId: 'u1',
		role: 'MEMBER',
		functions: [{ id: 'f1', committeeId: 'c1', kind: 'CHAIR' }]
	};

	test('writes every topic of every member, by mail and Slack, and announces it once', async () => {
		await setAllNotificationPreferences({ members: [care, chair], enabled: false });
		expect(inserted).toHaveBeenCalledOnce();
		const { values } = inserted.mock.calls[0][0];
		expect(values).toEqual(
			[
				['m1', 'PARTICIPANT_CARE', null],
				['m1', 'CHAT_REPORT', null],
				['m1', 'SCAN_PROBLEM', null],
				['m2', 'COMMITTEE_INBOX', 'f1'],
				['m2', 'CHAT_GROUP', 'f1']
			].flatMap(([teamMemberId, topic, teamFunctionId]) =>
				['EMAIL', 'SLACK'].map((channel) => ({
					teamMemberId,
					topic,
					teamFunctionId,
					channel,
					enabled: false
				}))
			)
		);
		expect(preferencesAnnounced).toHaveBeenCalledOnce();
	});

	test('writes nothing for members without a topic', async () => {
		await setAllNotificationPreferences({
			members: [{ ...care, role: 'MEMBER' }],
			enabled: true
		});
		expect(inserted).not.toHaveBeenCalled();
		expect(preferencesAnnounced).not.toHaveBeenCalled();
	});
});
