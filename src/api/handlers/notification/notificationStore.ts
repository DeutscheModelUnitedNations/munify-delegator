import { eq, inArray } from 'drizzle-orm';
import { db, schema } from '#api/db/db';
import type { NotificationChannel, StoredPreference } from '#lib/helpers/teamNotifications';

/**
 * Reading the notification tables. They have no relations on purpose: rumble exposes every table
 * a relation names, and neither the choices nor the workspaces (with their bot tokens) belong in
 * the GraphQL schema. So the mails, the Slack messages and the settings read them here.
 */

/** The stored choices of some team members, per member; `channel` narrows them to one. */
export async function preferencesOfMembers({
	teamMemberIds,
	channel
}: {
	teamMemberIds: readonly string[];
	channel?: NotificationChannel;
}): Promise<Map<string, StoredPreference[]>> {
	const byMember = new Map<string, StoredPreference[]>();
	if (teamMemberIds.length === 0) return byMember;
	const rows = await db.query.notificationPreference.findMany({
		where: { teamMemberId: { in: [...teamMemberIds] }, ...(channel ? { channel } : {}) },
		columns: { teamMemberId: true, topic: true, teamFunctionId: true, channel: true, enabled: true }
	});
	for (const { teamMemberId, ...preference } of rows) {
		byMember.set(teamMemberId, [...(byMember.get(teamMemberId) ?? []), preference]);
	}
	return byMember;
}

/** The workspace each of the conferences picked; a conference without one is not in the map. */
export async function workspacesOfConferences(conferenceIds: readonly string[]) {
	if (conferenceIds.length === 0) return new Map<string, StoredWorkspace>();
	const rows = await db
		.select({
			conferenceId: schema.conferenceSlackWorkspace.conferenceId,
			id: schema.slackWorkspace.id,
			name: schema.slackWorkspace.name,
			slackTeamName: schema.slackWorkspace.slackTeamName,
			botTokenCiphertext: schema.slackWorkspace.botTokenCiphertext
		})
		.from(schema.conferenceSlackWorkspace)
		.innerJoin(
			schema.slackWorkspace,
			eq(schema.slackWorkspace.id, schema.conferenceSlackWorkspace.slackWorkspaceId)
		)
		.where(inArray(schema.conferenceSlackWorkspace.conferenceId, [...conferenceIds]));
	return new Map(rows.map(({ conferenceId, ...workspace }) => [conferenceId, workspace]));
}

/** A workspace with its (encrypted) token: never answered to a client as it is. */
interface StoredWorkspace {
	id: string;
	name: string;
	slackTeamName: string;
	botTokenCiphertext: string;
}

/** The workspace a conference picked, or undefined while it has none. */
export async function workspaceOfConference(conferenceId: string) {
	return (await workspacesOfConferences([conferenceId])).get(conferenceId);
}
