import { sql } from 'drizzle-orm';
import { db } from '#api/db/db';
import { PARTICIPANT_CARE_ROLES } from '#lib/helpers/teamRoles';
import type { SnapshotUnreadMessage } from './dueEmails';

/**
 * For every reader of the conference's chats who wants the mail, the oldest message they have not
 * read. A person reads for themselves (`chat_read`); a team inbox reads as one (`chat.team_read_at`),
 * and its unread messages are everybody's who answers it.
 */
export async function loadUnreadMessages(conferenceId: string): Promise<SnapshotUnreadMessage[]> {
	const [people, inboxes, teamMembers] = await Promise.all([
		db.execute<{ participant_id: string; message_id: string; written: string }>(
			sql`
				with readers as (
					select c.id as chat_id, p.id as participant_id, p.user_id
					from chat c join conference_participant p on p.id = c.participant_id
					where c.conference_id = ${conferenceId} and c.kind in ('DIRECT', 'TEAM')
					union all
					select c.id, p.id, p.user_id
					from chat c join conference_participant p on p.id = c.other_participant_id
					where c.conference_id = ${conferenceId} and c.kind = 'DIRECT'
					union all
					select c.id, p.id, p.user_id
					from chat c
						join delegation_member dm on dm.delegation_id = c.delegation_id
						join conference_participant p on p.id = dm.conference_participant_id
					where c.conference_id = ${conferenceId} and c.kind = 'DELEGATION'
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
		),
		db.execute<{
			inbox: 'PARTICIPANT_CARE' | 'CHAIR' | 'CONSULTANT';
			committee_id: string | null;
			message_id: string;
			written: string;
		}>(
			sql`
				select distinct on (c.inbox, c.committee_id)
					c.inbox, c.committee_id, m.id as message_id, extract(epoch from m.created_at) as written
				from chat c
					join chat_message m on m.chat_id = c.id and not m.from_team
						and (c.team_read_at is null or m.created_at > c.team_read_at)
				where c.conference_id = ${conferenceId} and c.kind = 'TEAM'
				order by c.inbox, c.committee_id, m.created_at`,
			'objects'
		),
		db.query.teamMember.findMany({
			where: { conferenceId, user: { messageNotificationEmails: true } },
			columns: { id: true, role: true },
			with: { functions: { columns: { committeeId: true, kind: true } } }
		})
	]);

	const careRoles: readonly string[] = PARTICIPANT_CARE_ROLES;
	const oldestOfMember = new Map<string, { messageId: string; writtenAt: Date }>();
	for (const inbox of inboxes) {
		const unread = {
			messageId: inbox.message_id,
			writtenAt: new Date(Number(inbox.written) * 1000)
		};
		const answering = teamMembers.filter((member) =>
			inbox.inbox === 'PARTICIPANT_CARE'
				? careRoles.includes(member.role)
				: member.functions.some(
						(held) => held.kind === inbox.inbox && held.committeeId === inbox.committee_id
					)
		);
		for (const member of answering) {
			const known = oldestOfMember.get(member.id);
			if (!known || unread.writtenAt < known.writtenAt) oldestOfMember.set(member.id, unread);
		}
	}

	return [
		...people.map((row) => ({
			messageId: row.message_id,
			writtenAt: new Date(Number(row.written) * 1000),
			reader: { participantId: row.participant_id }
		})),
		...[...oldestOfMember].map(([teamMemberId, unread]) => ({
			...unread,
			reader: { teamMemberId }
		}))
	];
}
