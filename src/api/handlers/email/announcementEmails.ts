import { and, eq, gt, lte } from 'drizzle-orm';
import { db, schema } from '#api/db/db';
import { ANNOUNCEMENT_MAIL_HOURS, inAudience, owesMail } from '#lib/helpers/announcements';
import { loadAudiencePeople } from '#api/handlers/announcement/audienceSubjects';
import type { SnapshotAnnouncement, SnapshotAnnouncementMail } from './dueEmails';

/**
 * The mails of the announcements (`ANNOUNCEMENT`): an announcement that notifies by mail owes one
 * to everybody in its audience while it is fresh (`owesMail`), keyed by the announcement and its
 * `mailRevision`, so "notify again" sends once more. Unlike the other automatic mails it needs no
 * switch: ticking "notify by mail" on the announcement is the decision.
 */

export const MAIL_USER = {
	columns: {
		id: true,
		email: true,
		givenName: true,
		familyName: true,
		locale: true,
		birthday: true
	}
} as const;

const MAIL_WINDOW = ANNOUNCEMENT_MAIL_HOURS * 60 * 60 * 1000;

export function mailedAnnouncement(row: {
	id: string;
	title: string;
	body: string;
	signature: string | null;
	mailRevision: number;
	attachments: { file: { fileName: string | null } }[];
}): SnapshotAnnouncement {
	return {
		id: row.id,
		title: row.title,
		body: row.body,
		signature: row.signature,
		mailRevision: row.mailRevision,
		attachmentNames: row.attachments.flatMap(({ file }) => (file.fileName ? [file.fileName] : []))
	};
}

export const WITH_ATTACHMENTS = {
	attachments: {
		orderBy: { position: 'asc' },
		with: { file: { columns: { fileName: true } } }
	}
} as const;

/** The announcement mails the conference owes right now, one per announcement and person. */
export async function loadAnnouncementMails({
	conferenceId,
	userId,
	now = new Date()
}: {
	conferenceId: string;
	/** Only this person's mails. */
	userId?: string;
	now?: Date;
}): Promise<SnapshotAnnouncementMail[]> {
	const candidates = await db.query.announcement.findMany({
		where: { conferenceId, status: 'PUBLISHED', notifyByMail: true },
		with: { audiences: true, ...WITH_ATTACHMENTS }
	});
	const owing = candidates.filter((announcement) => owesMail({ announcement, now }));
	if (owing.length === 0) return [];
	const people = (await loadAudiencePeople({ conferenceId, userId })) ?? [];
	const users = await db.query.user.findMany({
		where: { id: { in: [...new Set(people.map((person) => person.userId))] } },
		...MAIL_USER
	});
	const userOf = new Map(users.map((user) => [user.id, user]));
	return owing.flatMap((row) => {
		const announcement = mailedAnnouncement(row);
		const recipients = new Set(
			people
				.filter(({ subject }) => inAudience({ subject, audiences: row.audiences }))
				.map((person) => person.userId)
		);
		return [...recipients].flatMap((userId) => {
			const recipient = userOf.get(userId);
			return recipient ? [{ announcement, recipient }] : [];
		});
	});
}

/** The conferences with an announcement whose mail may still be owed. */
export async function conferencesOwingAnnouncementMails(now = new Date()) {
	const table = schema.announcement;
	const rows = await db
		.selectDistinct({ conferenceId: table.conferenceId })
		.from(table)
		.where(
			and(
				eq(table.status, 'PUBLISHED'),
				eq(table.notifyByMail, true),
				lte(table.mailSince, now),
				gt(table.mailSince, new Date(now.getTime() - MAIL_WINDOW))
			)
		);
	return rows.map((row) => row.conferenceId);
}
