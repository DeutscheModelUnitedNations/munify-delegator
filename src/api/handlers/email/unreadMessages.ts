import { sql } from 'drizzle-orm';
import { db } from '#api/db/db';
import { oldestUnreadPerMember } from './unreadInboxes';
import type { ChatInbox } from '#lib/helpers/chat';
import type { SnapshotUnreadMessage } from './dueEmails';

/**
 * The oldest chat message each reader has not read, for the readers of one page of the mail
 * snapshot (`emailSnapshot.ts`) who want the mail. A person reads for themselves (`chat_read`); a
 * team inbox reads as one (`chat.team_read_at`), and its unread messages are everybody's who
 * answers it.
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
 * answer that the inbox has not read.
 */
export async function loadUnreadOfTeam({
	conferenceId,
	teamMemberIds
}: {
	conferenceId: string;
	teamMemberIds: string[];
}): Promise<SnapshotUnreadMessage[]> {
	if (teamMemberIds.length === 0) return [];
	const [inboxes, members] = await Promise.all([
		db.execute<{
			inbox: ChatInbox;
			committee_id: string | null;
			trusted_user_id: string | null;
			message_id: string;
			written: string;
		}>(
			sql`
				select distinct on (c.inbox, c.committee_id, c.trusted_user_id)
					c.inbox, c.committee_id, c.trusted_user_id, m.id as message_id, extract(epoch from m.created_at) as written
				from chat c
					join chat_message m on m.chat_id = c.id and not m.from_team
						and (c.team_read_at is null or m.created_at > c.team_read_at)
				where c.conference_id = ${conferenceId} and c.kind = 'TEAM'
				order by c.inbox, c.committee_id, c.trusted_user_id, m.created_at`,
			'objects'
		),
		db.query.teamMember.findMany({
			where: {
				conferenceId,
				id: { in: teamMemberIds },
				user: { messageNotificationEmails: true }
			},
			columns: { id: true, userId: true, role: true },
			with: { functions: { columns: { committeeId: true, kind: true } } }
		})
	]);

	return oldestUnreadPerMember({
		inboxes: inboxes.map((inbox) => ({
			inbox: inbox.inbox,
			committeeId: inbox.committee_id,
			trustedUserId: inbox.trusted_user_id,
			messageId: inbox.message_id,
			writtenAt: written(inbox.written)
		})),
		members
	});
}
