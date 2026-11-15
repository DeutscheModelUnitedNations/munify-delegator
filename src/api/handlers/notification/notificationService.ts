import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '#api/db/db';
import {
	conferenceSlackWorkspacePubsub,
	notificationPreferencePubsub,
	slackWorkspacePubsub
} from '#api/pubsub';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { runWithLocale, localeOfUser } from '#api/services/requestLocale';
import { m } from '#lib/paraglide/messages';
import {
	topicsOf,
	wantsNotification,
	type NotificationChannel,
	type NotificationTopic,
	type NotifiedMember,
	type TopicKey
} from '#lib/helpers/teamNotifications';
import {
	preferencesOfMembers,
	workspaceOfConference,
	workspacesOfConferences
} from './notificationStore';
import { SlackApiError, sendSlackDirectMessage, slackWorkspaceOf } from './slackApi';
import { decryptSlackToken, encryptSlackToken } from './slackToken';
import { forgetSlackUsers, slackUserOf, type SlackConnection } from './slackUsers';

/**
 * The notification settings and the Slack workspaces behind them. Who may call any of it is
 * `notificationPermissions.ts`'s.
 */

export const workspaceNameSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.slackWorkspaceNameMissing() })
	.max(80, { error: () => m.slackWorkspaceNameTooLong({ max: 80 }) });

/** A bot token as Slack issues them. */
export const botTokenSchema = z
	.string()
	.trim()
	.regex(/^xoxb-[A-Za-z0-9-]+$/, { error: () => m.slackBotTokenMalformed() });

/** One line of somebody's settings: a topic of theirs, and whether mail and Slack tell them. */
export interface NotificationSetting extends TopicKey {
	/** Stable per member and topic, so clients can tell the lines apart. */
	id: string;
	functionKind: string | null;
	committeeAbbreviation: string | null;
	committeeName: string | null;
	email: boolean;
	slack: boolean;
}

/** A conference's part of somebody's settings. */
export interface ConferenceNotificationSettings {
	/** The caller's membership of the team. */
	id: string;
	conferenceId: string;
	conferenceTitle: string;
	/** The workspace the conference picked; null while it has none, and Slack tells nobody. */
	workspaceName: string | null;
	settings: NotificationSetting[];
}

/**
 * The settings of `userId`: per conference they are on the team of and that is not over, a line
 * per topic they can be told about, with their choice or the default.
 */
export async function notificationSettingsOf(
	userId: string
): Promise<ConferenceNotificationSettings[]> {
	const members = await db.query.teamMember.findMany({
		where: { userId, conference: { state: { ne: 'POST' } } },
		columns: { id: true, userId: true, role: true, conferenceId: true },
		with: {
			user: { columns: { messageNotificationEmails: true } },
			conference: { columns: { title: true, startConference: true } },
			functions: {
				columns: { id: true, committeeId: true, kind: true },
				with: { committee: { columns: { abbreviation: true, name: true } } }
			}
		}
	});
	const [workspaceOf, preferences] = await Promise.all([
		workspacesOfConferences(members.map((member) => member.conferenceId)),
		preferencesOfMembers({ teamMemberIds: members.map((member) => member.id) })
	]);

	return members
		.toSorted(
			(a, b) => a.conference.startConference.getTime() - b.conference.startConference.getTime()
		)
		.map((member) => ({
			id: member.id,
			conferenceId: member.conferenceId,
			conferenceTitle: member.conference.title,
			workspaceName: workspaceOf.get(member.conferenceId)?.name ?? null,
			settings: topicsOf(member).map((key) => {
				const held = member.functions.find((fn) => fn.id === key.teamFunctionId);
				const wants = (channel: NotificationChannel) =>
					wantsNotification({
						preferences: preferences.get(member.id) ?? [],
						key,
						channel,
						mailByDefault: member.user.messageNotificationEmails
					});
				return {
					...key,
					id: `${member.id}:${key.topic}:${key.teamFunctionId ?? ''}`,
					functionKind: held?.kind ?? null,
					committeeAbbreviation: held?.committee?.abbreviation ?? null,
					committeeName: held?.committee?.name ?? null,
					email: wants('EMAIL'),
					slack: wants('SLACK')
				};
			})
		}));
}

/**
 * Stores a member's choice for one of their topics. INVALID_INPUT for a topic they cannot be
 * told about (an inbox they do not answer).
 */
export async function setNotificationPreference({
	member,
	topic,
	teamFunctionId,
	channel,
	enabled
}: {
	member: NotifiedMember & { id: string };
	topic: NotificationTopic;
	teamFunctionId: string | null;
	channel: NotificationChannel;
	enabled: boolean;
}) {
	const theirs = topicsOf(member).some(
		(key) => key.topic === topic && key.teamFunctionId === teamFunctionId
	);
	if (!theirs) throw apiError({ code: 'INVALID_INPUT', message: m.notificationTopicNotYours() });

	const table = schema.notificationPreference;
	const [row] = await db
		.insert(table)
		.values({ teamMemberId: member.id, topic, teamFunctionId, channel, enabled })
		.onConflictDoUpdate({
			target: [table.teamMemberId, table.topic, table.teamFunctionId, table.channel],
			set: { enabled, updatedAt: new Date() }
		})
		.returning({ id: table.id });
	// the settings are a list of their own (`myNotificationSettings`), which listens for any change
	if (row) notificationPreferencePubsub.updated();
}

/** The workspaces there are, without their tokens, each with how many conferences picked it. */
export async function listSlackWorkspaces() {
	const [workspaces, links] = await Promise.all([
		db.query.slackWorkspace.findMany({
			columns: { id: true, name: true, slackTeamName: true },
			orderBy: { name: 'asc' }
		}),
		db.query.conferenceSlackWorkspace.findMany({ columns: { slackWorkspaceId: true } })
	]);
	return workspaces.map((workspace) => ({
		...workspace,
		conferenceCount: links.filter((link) => link.slackWorkspaceId === workspace.id).length
	}));
}

/** What Slack says the token is; INVALID_INPUT for one it does not know. */
async function checkedToken(botToken: string) {
	try {
		return await slackWorkspaceOf(botToken);
	} catch (error) {
		if (error instanceof SlackApiError) {
			throw apiError({
				code: 'INVALID_INPUT',
				message: m.slackBotTokenRefused({ reason: error.code })
			});
		}
		throw error;
	}
}

const alreadyAdded = (error: unknown) => isUniqueViolationOn({ error, column: 'slack_team_id' });

/** Adds a workspace by its bot's token, once Slack vouched for it; CONFLICT for one already there. */
export async function createSlackWorkspace({ name, botToken }: { name: string; botToken: string }) {
	const { teamId, teamName } = await checkedToken(botToken);
	try {
		const [row] = await db
			.insert(schema.slackWorkspace)
			.values({
				name,
				slackTeamId: teamId,
				slackTeamName: teamName,
				botTokenCiphertext: await encryptSlackToken(botToken)
			})
			.returning({ id: schema.slackWorkspace.id });
		if (!row) throw new Error('createSlackWorkspace: the insert returned no row');
		slackWorkspacePubsub.created();
		return row.id;
	} catch (error) {
		if (alreadyAdded(error)) {
			throw apiError({ code: 'CONFLICT', message: m.slackWorkspaceAlreadyAdded() });
		}
		throw error;
	}
}

/**
 * What replacing a workspace's token writes, once Slack vouched for it. INVALID_INPUT for the
 * token of another workspace: the conferences that picked this one keep writing where they did.
 */
async function replacedToken({ botToken, slackTeamId }: { botToken: string; slackTeamId: string }) {
	const { teamId, teamName } = await checkedToken(botToken);
	if (teamId !== slackTeamId) {
		throw apiError({ code: 'INVALID_INPUT', message: m.slackBotTokenOtherWorkspace() });
	}
	return { slackTeamName: teamName, botTokenCiphertext: await encryptSlackToken(botToken) };
}

/** Renames a workspace or replaces its token; what is left out stays. */
export async function updateSlackWorkspace({
	id,
	name,
	botToken
}: {
	id: string;
	name?: string;
	botToken?: string;
}) {
	const workspace = await db.query.slackWorkspace.findFirst({
		where: { id },
		columns: { id: true, slackTeamId: true }
	});
	if (!workspace) throw apiError({ code: 'NOT_FOUND', message: m.slackWorkspaceNotFound() });
	if (name === undefined && botToken === undefined) return;
	const token = botToken ? await replacedToken({ botToken, ...workspace }) : {};
	await db
		.update(schema.slackWorkspace)
		.set({ name, ...token })
		.where(eq(schema.slackWorkspace.id, id));
	// a new token may see people the old one did not
	if (botToken) await forgetSlackUsers(id);
	slackWorkspacePubsub.updated();
}

/** Removes a workspace; the conferences that picked it have none afterwards. */
export async function deleteSlackWorkspace(id: string) {
	const removed = await db
		.delete(schema.slackWorkspace)
		.where(eq(schema.slackWorkspace.id, id))
		.returning({ id: schema.slackWorkspace.id });
	if (removed.length === 0) {
		throw apiError({ code: 'NOT_FOUND', message: m.slackWorkspaceNotFound() });
	}
	slackWorkspacePubsub.removed();
	conferenceSlackWorkspacePubsub.removed();
}

/** The workspace a conference picked, without its token; null while it has none. */
export async function slackWorkspaceOfConference(conferenceId: string) {
	const workspace = await workspaceOfConference(conferenceId);
	return workspace
		? { id: workspace.id, name: workspace.name, slackTeamName: workspace.slackTeamName }
		: null;
}

/** Picks the workspace a conference's team is told in, or none. NOT_FOUND for an unknown one. */
export async function setConferenceSlackWorkspace({
	conferenceId,
	slackWorkspaceId
}: {
	conferenceId: string;
	slackWorkspaceId: string | null;
}) {
	const table = schema.conferenceSlackWorkspace;
	if (slackWorkspaceId === null) {
		await db.delete(table).where(eq(table.conferenceId, conferenceId));
		conferenceSlackWorkspacePubsub.removed();
		return;
	}
	const workspace = await db.query.slackWorkspace.findFirst({
		where: { id: slackWorkspaceId },
		columns: { id: true }
	});
	if (!workspace) throw apiError({ code: 'NOT_FOUND', message: m.slackWorkspaceNotFound() });
	await db
		.insert(table)
		.values({ conferenceId, slackWorkspaceId })
		.onConflictDoUpdate({
			target: table.conferenceId,
			set: { slackWorkspaceId, updatedAt: new Date() }
		});
	conferenceSlackWorkspacePubsub.updated();
}

/**
 * How the user is known in the workspace their conference picked: found by their account's
 * address or not. Null while the conference has no workspace.
 */
export async function slackConnectionOf({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}): Promise<SlackConnection | null> {
	const [workspace, user] = await Promise.all([
		workspaceOfConference(conferenceId),
		db.query.user.findFirst({ where: { id: userId }, columns: { id: true, email: true } })
	]);
	if (!workspace || !user) return null;
	return (await slackUserOf({ workspace, user })).connection;
}

/**
 * Sends the user a direct message in their conference's workspace, so they see where the
 * notifications arrive. Answers how it went; CONFLICT while the conference has no workspace.
 */
export async function sendSlackTestMessage({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}): Promise<SlackConnection> {
	const [workspace, conference, user] = await Promise.all([
		workspaceOfConference(conferenceId),
		db.query.conference.findFirst({ where: { id: conferenceId }, columns: { title: true } }),
		db.query.user.findFirst({
			where: { id: userId },
			columns: { id: true, email: true, locale: true }
		})
	]);
	if (!workspace || !conference || !user) {
		throw apiError({ code: 'CONFLICT', message: m.slackNoWorkspace() });
	}
	const { connection, slackUserId } = await slackUserOf({ workspace, user });
	if (!slackUserId) return connection;
	try {
		await sendSlackDirectMessage({
			token: await decryptSlackToken(workspace.botTokenCiphertext),
			slackUserId,
			text: runWithLocale({
				locale: localeOfUser(user.locale),
				fn: () => m.slackTestMessage({ conference: conference.title })
			})
		});
	} catch (error) {
		if (error instanceof SlackApiError) return 'UNAVAILABLE';
		throw error;
	}
	return 'CONNECTED';
}
