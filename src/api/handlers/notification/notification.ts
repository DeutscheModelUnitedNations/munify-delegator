import { enum_, schemaBuilder } from '#api/rumble';
import {
	conferenceSlackWorkspacePubsub,
	notificationPreferencePubsub,
	slackWorkspacePubsub,
	teamFunctionPubsub,
	teamMemberPubsub
} from '#api/pubsub';
import type { SlackConnection } from './slackUsers';
import {
	assertCanManageSlackWorkspaces,
	assertCanPickSlackWorkspace,
	assertOwnNotifications,
	assertOwnTeamMember,
	assertOwnTeamMembers
} from './notificationPermissions';
import {
	botTokenSchema,
	createSlackWorkspace,
	deleteSlackWorkspace,
	listSlackWorkspaces,
	notificationSettingsOf,
	sendSlackTestMessage,
	setAllNotificationPreferences,
	setConferenceSlackWorkspace,
	setNotificationPreference,
	slackConnectionOf,
	slackWorkspaceOfConference,
	updateSlackWorkspace,
	workspaceNameSchema,
	type ConferenceNotificationSettings
} from './notificationService';
import type { NotificationSetting } from './settingLines';
import { sendNotificationTest, type NotificationTestResult } from './notificationTest';

/**
 * How the team hears of what waits for it: each member's settings per topic and channel, and the
 * Slack workspaces the direct messages go through. See "Team notifications" in CLAUDE.md.
 */

const notificationTopicEnum = enum_({ tsName: 'notificationTopic' });
const notificationChannelEnum = enum_({ tsName: 'notificationChannel' });

const SLACK_CONNECTIONS = ['CONNECTED', 'NOT_FOUND', 'UNAVAILABLE'] as const satisfies readonly [
	SlackConnection,
	...SlackConnection[]
];
const slackConnectionEnum = schemaBuilder.enumType('SlackConnection', {
	description:
		"How somebody is known in a Slack workspace: `CONNECTED` when their account's address is a member's there, `NOT_FOUND` when it is nobody's, `UNAVAILABLE` when Slack could not be asked.",
	values: SLACK_CONNECTIONS
});

const NOTIFICATION_TEST_RESULTS = ['SENT', 'NOT_FOUND', 'UNAVAILABLE'] as const satisfies readonly [
	NotificationTestResult,
	...NotificationTestResult[]
];
const notificationTestResultEnum = schemaBuilder.enumType('NotificationTestResult', {
	description:
		"How a test notification went: `SENT`, `NOT_FOUND` when Slack knows nobody by the account's address, `UNAVAILABLE` when the mail service or Slack refused it.",
	values: NOTIFICATION_TEST_RESULTS
});

const NotificationSettingRef = schemaBuilder.objectRef<NotificationSetting>('NotificationSetting');
NotificationSettingRef.implement({
	description:
		'One thing a team member can be told about, and whether mail and Slack tell them: their choice, or the default (both on).',
	fields: (t) => ({
		id: t.id({ resolve: (setting) => setting.id }),
		topic: t.field({ type: notificationTopicEnum, resolve: (setting) => setting.topic }),
		teamFunctionId: t.id({
			nullable: true,
			description:
				"`COMMITTEE_INBOX`: the caller's function whose inbox this is, to pass to `setNotificationPreference`.",
			resolve: (setting) => setting.teamFunctionId
		}),
		functionKind: t.string({
			nullable: true,
			description: '`COMMITTEE_INBOX`: `CHAIR` or `CONSULTANT`.',
			resolve: (setting) => setting.functionKind
		}),
		committeeAbbreviation: t.string({
			nullable: true,
			resolve: (setting) => setting.committeeAbbreviation
		}),
		committeeName: t.string({ nullable: true, resolve: (setting) => setting.committeeName }),
		roleName: t.string({ nullable: true, resolve: (setting) => setting.roleName }),
		email: t.boolean({ resolve: (setting) => setting.email }),
		slack: t.boolean({ resolve: (setting) => setting.slack })
	})
});

const ConferenceNotificationSettingsRef = schemaBuilder.objectRef<ConferenceNotificationSettings>(
	'ConferenceNotificationSettings'
);
ConferenceNotificationSettingsRef.implement({
	description: "The caller's notification settings in one conference they are on the team of.",
	fields: (t) => ({
		id: t.id({
			description: "The caller's membership of that team.",
			resolve: (conference) => conference.id
		}),
		conferenceId: t.id({ resolve: (conference) => conference.conferenceId }),
		conferenceTitle: t.string({ resolve: (conference) => conference.conferenceTitle }),
		slackWorkspaceName: t.string({
			nullable: true,
			description:
				'The Slack workspace the conference picked; null while it has none, and Slack tells nobody.',
			resolve: (conference) => conference.workspaceName
		}),
		settings: t.field({
			type: [NotificationSettingRef],
			description: 'One per topic the caller can be told about there; empty when there is none.',
			resolve: (conference) => conference.settings
		})
	})
});

type Pubsub = typeof slackWorkspacePubsub;
type Subscriptions = Parameters<Pubsub['registerOnInstance']>[0]['instance'];
const ANY_CHANGE = ['created', 'removed', 'updated'] as const;

/** Makes a field hear of every change the tables announce: these lists are small and rarely change. */
function listenTo({ instance, tables }: { instance: Subscriptions; tables: readonly Pubsub[] }) {
	for (const table of tables) {
		for (const action of ANY_CHANGE) table.registerOnInstance({ instance, action });
	}
}

const SlackWorkspaceInfo = schemaBuilder.simpleObject('SlackWorkspaceInfo', {
	description: 'A Slack workspace the app can write into. Its bot token is never answered.',
	fields: (t) => ({
		id: t.id(),
		name: t.string({ description: 'What the app calls it.' }),
		slackTeamName: t.string({ description: "Slack's own name of the workspace." }),
		conferenceCount: t.int({
			nullable: true,
			description: 'How many conferences picked it; for system admins.'
		})
	})
});

schemaBuilder.queryFields((t) => ({
	myNotificationSettings: t.field({
		description:
			"The caller's notification settings: per conference they are on the team of and that is not over, what they can be told about by mail and Slack. Empty for somebody on no team; FORBIDDEN for an AI assistant.",
		type: [ConferenceNotificationSettingsRef],
		// live: a switch flipped elsewhere, a function handed out or a workspace picked shows up
		smartSubscription: true,
		subscribe: (instance) =>
			listenTo({
				instance,
				tables: [
					notificationPreferencePubsub,
					conferenceSlackWorkspacePubsub,
					slackWorkspacePubsub,
					teamFunctionPubsub,
					teamMemberPubsub
				]
			}),
		resolve: (_root, _args, ctx) => notificationSettingsOf(assertOwnNotifications(ctx))
	}),

	mySlackConnection: t.field({
		description:
			"Whether the caller's account address is known in the Slack workspace a conference picked, which is how Slack messages find them; null while it has none. NOT_FOUND when they are not on that team.",
		type: slackConnectionEnum,
		nullable: true,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const member = await assertOwnTeamMember({ ctx, conferenceId: args.conferenceId });
			return slackConnectionOf({ conferenceId: args.conferenceId, userId: member.userId });
		}
	}),

	slackWorkspaces: t.field({
		description:
			"The Slack workspaces there are. For system admins; with `conferenceId` for that conference's project management, who pick one (FORBIDDEN otherwise).",
		type: [SlackWorkspaceInfo],
		args: { conferenceId: t.arg.id() },
		smartSubscription: true,
		subscribe: (instance) =>
			listenTo({ instance, tables: [slackWorkspacePubsub, conferenceSlackWorkspacePubsub] }),
		resolve: async (_root, args, ctx) => {
			if (args.conferenceId) {
				await assertCanPickSlackWorkspace({ ctx, conferenceId: args.conferenceId });
				const workspaces = await listSlackWorkspaces();
				return workspaces.map((workspace) => ({ ...workspace, conferenceCount: null }));
			}
			assertCanManageSlackWorkspaces(ctx);
			return listSlackWorkspaces();
		}
	}),

	conferenceSlackWorkspace: t.field({
		description:
			"The Slack workspace a conference's team is told in, or null while it has none. Project management only (FORBIDDEN otherwise).",
		type: SlackWorkspaceInfo,
		nullable: true,
		args: { conferenceId: t.arg.id({ required: true }) },
		smartSubscription: true,
		subscribe: (instance) =>
			listenTo({ instance, tables: [slackWorkspacePubsub, conferenceSlackWorkspacePubsub] }),
		resolve: async (_root, args, ctx) => {
			await assertCanPickSlackWorkspace({ ctx, conferenceId: args.conferenceId });
			const workspace = await slackWorkspaceOfConference(args.conferenceId);
			return workspace ? { ...workspace, conferenceCount: null } : null;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	setNotificationPreference: t.field({
		description:
			"Switches one of the caller's notifications on or off: a topic of `myNotificationSettings` in a conference, by mail or Slack. NOT_FOUND when they are not on that team, INVALID_INPUT for a topic that is not theirs.",
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			topic: t.arg({ type: notificationTopicEnum, required: true }),
			teamFunctionId: t.arg.id({ description: 'For `COMMITTEE_INBOX`: the function.' }),
			channel: t.arg({ type: notificationChannelEnum, required: true }),
			enabled: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const member = await assertOwnTeamMember({ ctx, conferenceId: args.conferenceId });
			await setNotificationPreference({
				member,
				topic: args.topic,
				teamFunctionId: args.teamFunctionId ?? null,
				channel: args.channel,
				enabled: args.enabled
			});
			return true;
		}
	}),

	setAllNotificationPreferences: t.field({
		description:
			"Switches all of the caller's notifications on or off, by mail and Slack: those of one conference, or without `conferenceId` those of every conference `myNotificationSettings` lists. NOT_FOUND when they are not on that conference's team.",
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id(),
			enabled: t.arg.boolean({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const members = await assertOwnTeamMembers({ ctx, conferenceId: args.conferenceId ?? null });
			await setAllNotificationPreferences({ members, enabled: args.enabled });
			return true;
		}
	}),

	sendSlackTestMessage: t.field({
		description:
			"Sends the caller a direct message in the conference's Slack workspace and answers how it went. NOT_FOUND when they are not on that team, CONFLICT while the conference has no workspace.",
		type: slackConnectionEnum,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const member = await assertOwnTeamMember({ ctx, conferenceId: args.conferenceId });
			return sendSlackTestMessage({ conferenceId: args.conferenceId, userId: member.userId });
		}
	}),

	sendNotificationTest: t.field({
		description:
			'Sends the caller a test of one of their notifications (a topic of `myNotificationSettings`) by mail or Slack, as the real one reads, marked as a test and whatever its switch says. NOT_FOUND when they are not on that team, INVALID_INPUT for a topic that is not theirs, CONFLICT for Slack while the conference has no workspace.',
		type: notificationTestResultEnum,
		args: {
			conferenceId: t.arg.id({ required: true }),
			topic: t.arg({ type: notificationTopicEnum, required: true }),
			teamFunctionId: t.arg.id({ description: "For a committee's inbox or papers: the function." }),
			channel: t.arg({ type: notificationChannelEnum, required: true })
		},
		resolve: async (_root, args, ctx) => {
			const member = await assertOwnTeamMember({ ctx, conferenceId: args.conferenceId });
			return sendNotificationTest({
				member,
				conferenceId: args.conferenceId,
				key: { topic: args.topic, teamFunctionId: args.teamFunctionId ?? null },
				channel: args.channel,
				origin: ctx.requestUrl().origin
			});
		}
	}),

	createSlackWorkspace: t.field({
		description:
			"Adds a Slack workspace by its bot's token (`xoxb-…`, with the scopes `chat:write`, `users:read` and `users:read.email`), once Slack vouched for it. System admins only. INVALID_INPUT for a token Slack refuses, CONFLICT for a workspace already added.",
		type: 'ID',
		args: {
			name: t.arg.string({ required: true }).validate(workspaceNameSchema),
			botToken: t.arg.string({ required: true }).validate(botTokenSchema)
		},
		resolve: (_root, args, ctx) => {
			assertCanManageSlackWorkspaces(ctx);
			return createSlackWorkspace({ name: args.name.trim(), botToken: args.botToken.trim() });
		}
	}),

	updateSlackWorkspace: t.field({
		description:
			'Renames a Slack workspace or replaces its bot token; what is left out stays. System admins only. INVALID_INPUT for a token of another workspace.',
		type: 'Boolean',
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string().validate(workspaceNameSchema.nullish()),
			botToken: t.arg.string().validate(botTokenSchema.nullish())
		},
		resolve: async (_root, args, ctx) => {
			assertCanManageSlackWorkspaces(ctx);
			await updateSlackWorkspace({
				id: args.id,
				name: args.name?.trim() ?? undefined,
				botToken: args.botToken?.trim() ?? undefined
			});
			return true;
		}
	}),

	deleteSlackWorkspace: t.field({
		description:
			'Removes a Slack workspace; the conferences that picked it have none afterwards. System admins only.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			assertCanManageSlackWorkspaces(ctx);
			await deleteSlackWorkspace(args.id);
			return true;
		}
	}),

	setConferenceSlackWorkspace: t.field({
		description:
			"Picks the Slack workspace a conference's team is told in, or none (`null`). Project management only (FORBIDDEN otherwise); NOT_FOUND for an unknown workspace.",
		type: 'Boolean',
		args: {
			conferenceId: t.arg.id({ required: true }),
			slackWorkspaceId: t.arg.id()
		},
		resolve: async (_root, args, ctx) => {
			await assertCanPickSlackWorkspace({ ctx, conferenceId: args.conferenceId });
			await setConferenceSlackWorkspace({
				conferenceId: args.conferenceId,
				slackWorkspaceId: args.slackWorkspaceId ?? null
			});
			return true;
		}
	})
}));
