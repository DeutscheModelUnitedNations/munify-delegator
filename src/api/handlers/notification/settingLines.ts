import {
	topicsOf,
	wantsNotification,
	type NotificationChannel,
	type NotifiedMember,
	type StoredPreference,
	type TopicKey
} from '#lib/helpers/teamNotifications';

/** One line of somebody's settings: a topic of theirs, and whether mail and Slack tell them. */
export interface NotificationSetting extends TopicKey {
	/** Stable per member and topic, so clients can tell the lines apart. */
	id: string;
	functionKind: string | null;
	committeeAbbreviation: string | null;
	committeeName: string | null;
	/** `ROLE_INBOX`, and `CHAT_GROUP` of a role: the custom role the function looks after. */
	roleName: string | null;
	email: boolean;
	slack: boolean;
}

/** A team member with what the lines show of their functions. */
export interface SettingsMember extends NotifiedMember {
	id: string;
	functions: readonly {
		id: string;
		committeeId: string | null;
		roleId?: string | null;
		kind: string;
		committee?: { abbreviation: string; name: string } | null;
		role?: { name: string | null } | null;
	}[];
}

/** What a line names of the function its topic is about. */
function functionLabels(held: SettingsMember['functions'][number] | undefined) {
	return {
		functionKind: held?.kind ?? null,
		committeeAbbreviation: held?.committee?.abbreviation ?? null,
		committeeName: held?.committee?.name ?? null,
		roleName: held?.role?.name ?? null
	};
}

/**
 * A member's settings: one line per topic they can be told about, in the order `topicsOf` lists
 * them, each with their stored choice or the default.
 */
export function settingLines({
	member,
	preferences,
	mailByDefault
}: {
	member: SettingsMember;
	preferences: readonly StoredPreference[];
	mailByDefault: boolean;
}): NotificationSetting[] {
	return topicsOf(member).map((key) => {
		const held = member.functions.find((fn) => fn.id === key.teamFunctionId);
		const wants = (channel: NotificationChannel) =>
			wantsNotification({ preferences, key, channel, mailByDefault });
		return {
			...key,
			id: `${member.id}:${key.topic}:${key.teamFunctionId ?? ''}`,
			...functionLabels(held),
			email: wants('EMAIL'),
			slack: wants('SLACK')
		};
	});
}
