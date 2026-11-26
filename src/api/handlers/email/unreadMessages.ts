import { sql } from 'drizzle-orm';
import { db } from '#api/db/db';
import { oldestPerReader, oldestUnreadPerMember } from './unreadInboxes';
import { preferencesOfMembers } from '#api/handlers/notification/notificationStore';
import {
	hearsOfReports,
	wantsGroupNotification,
	wantsNotification
} from '#lib/helpers/teamNotifications';
import type { ChatInbox } from '#lib/helpers/chat';
import type { SnapshotOpenReport, SnapshotUnreadMessage } from './dueEmails';

/**
 * The oldest chat message each reader has not read, for the readers of one page of the mail
 * snapshot (`emailSnapshot.ts`) who want the mail. A person reads for themselves (`chat_read`); a
 * team inbox reads as one (`chat.team_read_at`), and its unread messages are everybody's who
 * answers it. A group of a committee or custom role is read by each of its people, the team's
 * too; somebody who muted it, or turned off the mails about groups, hears nothing of it.
 */

const written = (epoch: string) => new Date(Number(epoch) * 1000);

/** Per participant of `participantIds`, the oldest message of their chats they have not read. */
export async function loadUnreadOfParticipants({
	conferenceId,
	participantIds
}: {
	conferenceId: string;
	participantIds: string[];
}): Promise<SnapshotUnreadMessage[]> {
	if (participantIds.length === 0) return [];
	const ids = sql.join(
		participantIds.map((id) => sql`${id}`),
		sql`, `
	);
	const rows = await db.execute<{ participant_id: string; message_id: string; written: string }>(
		sql`
			with readers as (
				select c.id as chat_id, p.id as participant_id, p.user_id
				from chat c join conference_participant p on p.id = c.participant_id
				where c.conference_id = ${conferenceId} and c.kind in ('DIRECT', 'TEAM')
					and p.id in (${ids})
				union all
				select c.id, p.id, p.user_id
				from chat c join conference_participant p on p.id = c.other_participant_id
				where c.conference_id = ${conferenceId} and c.kind = 'DIRECT' and p.id in (${ids})
				union all
				select c.id, p.id, p.user_id
				from chat c
					join delegation_member dm on dm.delegation_id = c.delegation_id
					join conference_participant p on p.id = dm.conference_participant_id
				where c.conference_id = ${conferenceId} and c.kind = 'DELEGATION' and p.id in (${ids})
				union all
				select c.id, p.id, p.user_id
				from chat c
					join conference cf on cf.id = c.conference_id
						and cf.assignment_released and cf.group_chats_enabled
					join delegation_member dm on dm.assigned_committee_id = c.committee_id
					join delegation d on d.id = dm.delegation_id and d.assigned_role_id is not null
					join conference_participant p on p.id = dm.conference_participant_id
					join "user" gu on gu.id = p.user_id and gu.group_message_notification_emails
				where c.conference_id = ${conferenceId} and c.kind = 'COMMITTEE' and p.id in (${ids})
					and not exists (select 1 from chat_mute mu where mu.chat_id = c.id and mu.user_id = p.user_id)
				union all
				select c.id, p.id, p.user_id
				from chat c
					join conference cf on cf.id = c.conference_id
						and cf.assignment_released and cf.group_chats_enabled
					join single_participant sp on sp.assigned_role_id = c.role_id
					join conference_participant p on p.id = sp.conference_participant_id
					join "user" gu on gu.id = p.user_id and gu.group_message_notification_emails
				where c.conference_id = ${conferenceId} and c.kind = 'ROLE' and p.id in (${ids})
					and not exists (select 1 from chat_mute mu where mu.chat_id = c.id and mu.user_id = p.user_id)
			)
			select distinct on (r.participant_id)
				r.participant_id, m.id as message_id, extract(epoch from m.created_at) as written
			from readers r
				join "user" u on u.id = r.user_id and u.message_notification_emails
				left join chat_read cr on cr.chat_id = r.chat_id and cr.user_id = r.user_id
				join chat_message m on m.chat_id = r.chat_id
					and (cr.read_at is null or m.created_at > cr.read_at)
					and m.author_participant_id is distinct from r.participant_id
			order by r.participant_id, m.created_at`,
		'objects'
	);
	return rows.map((row) => ({
		messageId: row.message_id,
		writtenAt: written(row.written),
		reader: { participantId: row.participant_id }
	}));
}

/**
 * Per team member of `teamMemberIds`, the oldest message a participant wrote to an inbox they
 * answer, or into a group they are in and did not mute, and want mail about
 * (`notificationPreference`), that the inbox (or, in a group, they) have not read.
 */
export async function loadUnreadOfTeam({
	conferenceId,
	teamMemberIds
}: {
	conferenceId: string;
	teamMemberIds: string[];
}): Promise<SnapshotUnreadMessage[]> {
	if (teamMemberIds.length === 0) return [];
	const [inboxes, groups, members, preferences] = await Promise.all([
		db.execute<{
			inbox: ChatInbox;
			committee_id: string | null;
			role_id: string | null;
			trusted_user_id: string | null;
			message_id: string;
			written: string;
		}>(
			sql`
				select distinct on (c.inbox, c.committee_id, c.role_id, c.trusted_user_id)
					c.inbox, c.committee_id, c.role_id, c.trusted_user_id, m.id as message_id, extract(epoch from m.created_at) as written
				from chat c
					join chat_message m on m.chat_id = c.id and not m.from_team
						and (c.team_read_at is null or m.created_at > c.team_read_at)
				where c.conference_id = ${conferenceId} and c.kind = 'TEAM'
				order by c.inbox, c.committee_id, c.role_id, c.trusted_user_id, m.created_at`,
			'objects'
		),
		loadGroupUnreadOfTeam({ conferenceId, teamMemberIds }),
		db.query.teamMember.findMany({
			where: { conferenceId, id: { in: teamMemberIds } },
			columns: { id: true, userId: true, role: true },
			with: {
				user: { columns: { messageNotificationEmails: true } },
				functions: { columns: { id: true, committeeId: true, roleId: true, kind: true } }
			}
		}),
		preferencesOfMembers({ teamMemberIds, channel: 'EMAIL' })
	]);

	const inboxMembers = members.map((member) => ({
		id: member.id,
		userId: member.userId,
		role: member.role,
		functions: member.functions,
		preferences: preferences.get(member.id) ?? [],
		mailByDefault: member.user.messageNotificationEmails
	}));
	return oldestPerReader([
		...oldestUnreadPerMember({
			inboxes: inboxes.map((inbox) => ({
				inbox: inbox.inbox,
				committeeId: inbox.committee_id,
				roleId: inbox.role_id,
				trustedUserId: inbox.trusted_user_id,
				messageId: inbox.message_id,
				writtenAt: written(inbox.written)
			})),
			members: inboxMembers
		}),
		...groups.flatMap((group) => {
			const member = inboxMembers.find((one) => one.id === group.teamMemberId);
			const wants =
				member &&
				wantsGroupNotification({
					member,
					group,
					preferences: member.preferences,
					channel: 'EMAIL',
					mailByDefault: member.mailByDefault
				});
			return wants
				? [
						{
							messageId: group.messageId,
							writtenAt: group.writtenAt,
							reader: { teamMemberId: group.teamMemberId }
						}
					]
				: [];
		})
	]);
}

/**
 * Per team member of `teamMemberIds` and group they are in by a function (a committee's chairs
 * and consultants, a custom role's support) and did not mute, the oldest message a participant
 * wrote there that they have not read themselves.
 */
async function loadGroupUnreadOfTeam({
	conferenceId,
	teamMemberIds
}: {
	conferenceId: string;
	teamMemberIds: string[];
}) {
	const ids = sql.join(
		teamMemberIds.map((id) => sql`${id}`),
		sql`, `
	);
	const rows = await db.execute<{
		team_member_id: string;
		kind: 'COMMITTEE' | 'ROLE';
		committee_id: string | null;
		role_id: string | null;
		message_id: string;
		written: string;
	}>(
		sql`
			select distinct on (tm.id, c.id)
				tm.id as team_member_id, c.kind, c.committee_id, c.role_id, m.id as message_id,
				extract(epoch from m.created_at) as written
			from team_member tm
				join team_function f on f.team_member_id = tm.id
				join chat c on c.conference_id = tm.conference_id and (
					(c.kind = 'COMMITTEE' and f.kind in ('CHAIR', 'CONSULTANT') and c.committee_id = f.committee_id)
					or (c.kind = 'ROLE' and f.kind = 'ROLE_SUPPORT' and c.role_id = f.role_id))
				left join chat_read cr on cr.chat_id = c.id and cr.user_id = tm.user_id
				join chat_message m on m.chat_id = c.id and not m.from_team
					and (cr.read_at is null or m.created_at > cr.read_at)
			where tm.conference_id = ${conferenceId} and tm.id in (${ids})
				and not exists (select 1 from chat_mute mu where mu.chat_id = c.id and mu.user_id = tm.user_id)
			order by tm.id, c.id, m.created_at`,
		'objects'
	);
	return rows.map((row) => ({
		teamMemberId: row.team_member_id,
		kind: row.kind,
		committeeId: row.committee_id,
		roleId: row.role_id,
		messageId: row.message_id,
		writtenAt: written(row.written)
	}));
}

/**
 * The conference's open reports, for each member of participant care among `teamMemberIds` who
 * wants a mail about them.
 */
export async function loadOpenReportsOfTeam({
	conferenceId,
	teamMemberIds
}: {
	conferenceId: string;
	teamMemberIds: string[];
}): Promise<SnapshotOpenReport[]> {
	if (teamMemberIds.length === 0) return [];
	const [reports, members, preferences] = await Promise.all([
		db.query.chatReport.findMany({
			where: { conferenceId, status: 'OPEN' },
			columns: { id: true }
		}),
		db.query.teamMember.findMany({
			where: { conferenceId, id: { in: teamMemberIds } },
			columns: { id: true, role: true },
			with: { user: { columns: { messageNotificationEmails: true } } }
		}),
		preferencesOfMembers({ teamMemberIds, channel: 'EMAIL' })
	]);
	const told = members.filter(
		(member) =>
			hearsOfReports(member) &&
			wantsNotification({
				preferences: preferences.get(member.id) ?? [],
				key: { topic: 'CHAT_REPORT', teamFunctionId: null },
				channel: 'EMAIL',
				mailByDefault: member.user.messageNotificationEmails
			})
	);
	return reports.flatMap((report) =>
		told.map((member) => ({ reportId: report.id, teamMemberId: member.id }))
	);
}
