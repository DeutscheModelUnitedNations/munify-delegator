import { z } from 'zod';
import { and, eq, lte, sql } from 'drizzle-orm';
import { db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import {
	announcementAttachmentPubsub,
	announcementAudiencePubsub,
	announcementPubsub
} from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { downloadUrl, ensureUploadComplete } from '#api/handlers/storedFile/storedFileService';
import { m } from '#lib/paraglide/messages';
import {
	announcementTextSchema,
	audienceSchema,
	compareFeed,
	inAudience,
	isOut,
	MAX_ANNOUNCEMENT_ATTACHMENTS,
	normalizeAudiences,
	type AnnouncementImportance,
	type Audience
} from '#lib/helpers/announcements';
import { countAudience, loadAudiencePeople, type AudienceCounts } from './audienceSubjects';

export type { AudienceCounts };

/**
 * The conference's announcements: writing them, their life (draft, published or scheduled,
 * archived), the feed each reader gets and who has read what. Who an announcement is for is
 * `#lib/helpers/announcements` over the people `audienceSubjects.ts` loads.
 */

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const nullableDate = z.date().nullish();

/** A signature as stored: none for a blank one. */
const signature = announcementTextSchema.signature.nullish().transform((value) => value || null);

const audiences = z
	.array(audienceSchema)
	.min(1, { error: () => m.announcementAudienceRequired() })
	.transform(normalizeAudiences);

const attachmentFileIds = z
	.array(z.string())
	.max(MAX_ANNOUNCEMENT_ATTACHMENTS, {
		error: () => m.announcementTooManyAttachments({ max: MAX_ANNOUNCEMENT_ATTACHMENTS })
	})
	.transform((ids) => [...new Set(ids)]);

const settings = {
	importance: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).nullish(),
	pinned: z.boolean().nullish(),
	notifyByMail: z.boolean().nullish()
};

/** The arguments of `createAnnouncement`. */
export const createAnnouncementSchema = z.object({
	conferenceId: z.string(),
	...settings,
	title: announcementTextSchema.title,
	body: announcementTextSchema.body,
	signature,
	audiences,
	attachmentFileIds: attachmentFileIds.nullish(),
	visibleUntil: nullableDate
});

/** The arguments of `updateAnnouncement`: whatever is given is checked like a new one's. */
export const updateAnnouncementSchema = z.object({
	id: z.string(),
	...settings,
	title: announcementTextSchema.title.nullish(),
	body: announcementTextSchema.body.nullish(),
	signature: signature.optional(),
	audiences: audiences.nullish(),
	attachmentFileIds: attachmentFileIds.nullish(),
	visibleUntil: nullableDate
});

interface AnnouncementValues {
	title: string;
	body: string;
	signature: string | null;
	importance: AnnouncementImportance;
	pinned: boolean;
	notifyByMail: boolean;
	visibleUntil: Date | null;
}

async function writeAudiences({
	tx,
	announcementId,
	audiences: given
}: {
	tx: Transaction;
	announcementId: string;
	audiences: readonly Audience[];
}) {
	const table = schema.announcementAudience;
	await tx.delete(table).where(whereRows({ table, filter: { announcementId } }));
	await tx.insert(table).values(
		given.map((audience) => ({
			announcementId,
			kind: audience.kind,
			committeeId: audience.committeeId ?? null,
			roleId: audience.roleId ?? null,
			surveyOptionId: audience.surveyOptionId ?? null,
			teamRole: audience.teamRole ?? null
		}))
	);
}

async function writeAttachments({
	tx,
	announcementId,
	fileIds
}: {
	tx: Transaction;
	announcementId: string;
	fileIds: readonly string[];
}) {
	const table = schema.announcementAttachment;
	await tx.delete(table).where(whereRows({ table, filter: { announcementId } }));
	if (fileIds.length === 0) return;
	await tx
		.insert(table)
		.values(fileIds.map((fileId, position) => ({ announcementId, fileId, position })));
}

/** The lists of audiences and attachments changed as a whole: rows went and came. */
function announceParts({
	audiences: a,
	attachments
}: {
	audiences: boolean;
	attachments: boolean;
}) {
	if (a) {
		announcementAudiencePubsub.removed();
		announcementAudiencePubsub.created();
	}
	if (attachments) {
		announcementAttachmentPubsub.removed();
		announcementAttachmentPubsub.created();
	}
}

/** Writes a new announcement as a draft and returns its id. Its files have to have arrived in full. */
export async function createAnnouncement({
	conferenceId,
	authorId,
	values,
	audiences: given,
	attachmentFileIds: fileIds
}: {
	conferenceId: string;
	authorId: string;
	values: AnnouncementValues;
	audiences: readonly Audience[];
	attachmentFileIds: readonly string[];
}) {
	await Promise.all(fileIds.map((fileId) => ensureUploadComplete(fileId)));
	const id = await db.transaction(async (tx) => {
		const row = await tx
			.insert(schema.announcement)
			.values({ conferenceId, authorId, ...values })
			.returning({ id: schema.announcement.id })
			.then(assertFirstEntryExists);
		await writeAudiences({ tx, announcementId: row.id, audiences: given });
		await writeAttachments({ tx, announcementId: row.id, fileIds });
		return row.id;
	});
	announcementPubsub.created();
	announceParts({ audiences: true, attachments: fileIds.length > 0 });
	return id;
}

/**
 * Changes what is given of an announcement. Its audiences and its attachments are each replaced
 * as a whole when given. A change to the title or the text of an announcement that is out is
 * marked on it (`editedAt`), which its readers see.
 */
export async function updateAnnouncement({
	id,
	changes,
	audiences: given,
	attachmentFileIds: fileIds,
	now = new Date()
}: {
	id: string;
	changes: Partial<AnnouncementValues>;
	audiences?: readonly Audience[];
	attachmentFileIds?: readonly string[];
	now?: Date;
}) {
	if (fileIds) await Promise.all(fileIds.map((fileId) => ensureUploadComplete(fileId)));
	const table = schema.announcement;
	await db.transaction(async (tx) => {
		const [before] = await tx
			.select()
			.from(table)
			.where(whereRows({ table, filter: { id } }))
			.for('update');
		if (!before) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
		const textChanged =
			(changes.title !== undefined && changes.title !== before.title) ||
			(changes.body !== undefined && changes.body !== before.body);
		await tx
			.update(table)
			.set({
				...changes,
				...(textChanged && isOut({ announcement: before, now }) ? { editedAt: now } : {}),
				updatedAt: now
			})
			.where(whereRows({ table, filter: { id } }));
		if (given) await writeAudiences({ tx, announcementId: id, audiences: given });
		if (fileIds) await writeAttachments({ tx, announcementId: id, fileIds });
	});
	announcementPubsub.updated(id);
	announceParts({ audiences: !!given, attachments: !!fileIds });
}

/**
 * Publishes an announcement: right away, or from `publishAt` on when that lies ahead. The mail,
 * if it sends one, is owed from then. CONFLICT for one that is published already.
 */
export async function publishAnnouncement({
	id,
	publishAt,
	publishedById,
	now = new Date()
}: {
	id: string;
	publishAt: Date | null | undefined;
	publishedById: string;
	now?: Date;
}) {
	const scheduled = !!publishAt && publishAt.getTime() > now.getTime();
	const from = scheduled ? publishAt : now;
	const table = schema.announcement;
	const published = await db
		.update(table)
		.set({
			status: 'PUBLISHED',
			publishAt: from,
			mailSince: from,
			releaseAnnounced: !scheduled,
			editedAt: null,
			publishedById,
			updatedAt: now
		})
		.where(whereRows({ table, filter: { id, status: { ne: 'PUBLISHED' } } }))
		.returning({ id: table.id });
	if (published.length === 0)
		throw apiError({ code: 'CONFLICT', message: m.announcementAlreadyPublished() });
	announcementPubsub.updated(id);
	// it comes into its readers' feeds, which list what is out
	if (!scheduled) announcementPubsub.created();
}

/** Takes an announcement down: back to a draft, or into the archive. */
export async function withdrawAnnouncement({
	id,
	status
}: {
	id: string;
	status: 'DRAFT' | 'ARCHIVED';
}) {
	const table = schema.announcement;
	await db
		.update(table)
		.set({
			status,
			publishAt: null,
			mailSince: null,
			releaseAnnounced: false,
			updatedAt: new Date()
		})
		.where(whereRows({ table, filter: { id } }));
	announcementPubsub.updated(id);
	// it leaves its readers' feeds
	announcementPubsub.removed();
}

/**
 * Owes the announcement's mail once more, to everybody in its audience now: for one that is out
 * and sends mails (CONFLICT otherwise).
 */
export async function renotifyAnnouncement({ id, now = new Date() }: { id: string; now?: Date }) {
	const table = schema.announcement;
	const renotified = await db
		.update(table)
		.set({ mailSince: now, mailRevision: sql`${table.mailRevision} + 1`, updatedAt: now })
		.where(
			and(
				eq(table.id, id),
				eq(table.status, 'PUBLISHED'),
				eq(table.notifyByMail, true),
				lte(table.publishAt, now)
			)
		)
		.returning({ id: table.id });
	if (renotified.length === 0)
		throw apiError({ code: 'CONFLICT', message: m.announcementNotOut() });
	announcementPubsub.updated(id);
}

/** A copy of the announcement as a new draft, with its audiences and attachments. Returns its id. */
export async function duplicateAnnouncement({ id, authorId }: { id: string; authorId: string }) {
	const source = await db.query.announcement.findFirst({
		where: { id },
		with: {
			audiences: true,
			attachments: { columns: { fileId: true }, orderBy: { position: 'asc' } }
		}
	});
	if (!source) throw apiError({ code: 'NOT_FOUND', message: m.updateNotFoundOrForbidden() });
	return createAnnouncement({
		conferenceId: source.conferenceId,
		authorId,
		values: {
			title: m.announcementCopyTitle({ title: source.title }),
			body: source.body,
			signature: source.signature,
			importance: source.importance,
			pinned: source.pinned,
			notifyByMail: source.notifyByMail,
			visibleUntil: null
		},
		audiences: source.audiences,
		attachmentFileIds: source.attachments.map((attachment) => attachment.fileId)
	});
}

/** An announcement as one of its readers gets it. */
export interface FeedItem {
	id: string;
	title: string;
	body: string;
	importance: AnnouncementImportance;
	pinned: boolean;
	signature: string | null;
	publishAt: Date;
	editedAt: Date | null;
	read: boolean;
	attachments: {
		id: string;
		fileName: string | null;
		mimeType: string;
		size: number;
		url: string;
	}[];
}

/** The announcements of the conference that are out, with their audiences. */
function outAnnouncements({ conferenceId, now }: { conferenceId: string; now: Date }) {
	return db.query.announcement.findMany({
		where: {
			conferenceId,
			status: 'PUBLISHED',
			publishAt: { lte: now },
			OR: [{ visibleUntil: { isNull: true } }, { visibleUntil: { gt: now } }]
		},
		with: {
			audiences: true,
			attachments: {
				orderBy: { position: 'asc' },
				with: {
					file: { columns: { id: true, key: true, fileName: true, mimeType: true, size: true } }
				}
			}
		}
	});
}

/** The announcements that are out for this person, in the feed's order. */
export async function announcementFeed({
	conferenceId,
	userId,
	now = new Date()
}: {
	conferenceId: string;
	userId: string;
	now?: Date;
}): Promise<FeedItem[]> {
	const people = await loadAudiencePeople({ conferenceId, userId });
	if (!people || people.length === 0) return [];
	const announcements = await outAnnouncements({ conferenceId, now });
	const mine = announcements.filter((announcement) =>
		people.some(({ subject }) => inAudience({ subject, audiences: announcement.audiences }))
	);
	const reads =
		mine.length === 0
			? []
			: await db.query.announcementRead.findMany({
					where: { userId, announcementId: { in: mine.map((announcement) => announcement.id) } },
					columns: { announcementId: true }
				});
	const read = new Set(reads.map((row) => row.announcementId));
	const items = await Promise.all(
		mine.map(async (announcement) => ({
			id: announcement.id,
			title: announcement.title,
			body: announcement.body,
			importance: announcement.importance,
			pinned: announcement.pinned,
			signature: announcement.signature,
			// set by publishing
			publishAt: announcement.publishAt ?? announcement.createdAt,
			editedAt: announcement.editedAt,
			read: read.has(announcement.id),
			attachments: await Promise.all(
				announcement.attachments.map(async ({ file }) => ({
					id: file.id,
					fileName: file.fileName,
					mimeType: file.mimeType,
					size: file.size,
					url: await downloadUrl(file)
				}))
			)
		}))
	);
	return items.toSorted(compareFeed);
}

/**
 * Marks announcements as read by the person: the given ones, or every one of the conference that
 * is out for them. Only what is in their feed counts. Answers the ids now read.
 */
export async function markAnnouncementsRead({
	conferenceId,
	userId,
	announcementIds
}: {
	conferenceId: string;
	userId: string;
	announcementIds?: readonly string[];
}) {
	const feed = await announcementFeed({ conferenceId, userId });
	const ids = feed
		.filter((item) => !item.read && (!announcementIds || announcementIds.includes(item.id)))
		.map((item) => item.id);
	if (ids.length > 0) {
		await db
			.insert(schema.announcementRead)
			.values(ids.map((announcementId) => ({ announcementId, userId })))
			.onConflictDoNothing();
	}
	return ids;
}

/** Whom the audiences reach in the conference right now. */
export async function audiencePreview({
	conferenceId,
	audiences: given
}: {
	conferenceId: string;
	audiences: readonly Audience[];
}) {
	const people = (await loadAudiencePeople({ conferenceId })) ?? [];
	return countAudience({ people, audiences: given });
}

/** How many people each of the conference's announcements reaches, and how many of them read it. */
export async function announcementReach(conferenceId: string) {
	const [people, announcements] = await Promise.all([
		loadAudiencePeople({ conferenceId }),
		db.query.announcement.findMany({
			where: { conferenceId },
			columns: { id: true },
			with: { audiences: true }
		})
	]);
	const reads =
		announcements.length === 0
			? []
			: await db.query.announcementRead.findMany({
					where: { announcementId: { in: announcements.map((announcement) => announcement.id) } },
					columns: { announcementId: true, userId: true }
				});
	const readersOf = Map.groupBy(reads, (row) => row.announcementId);
	return new Map(
		announcements.map((announcement) => {
			const recipients = new Set(
				(people ?? [])
					.filter(({ subject }) => inAudience({ subject, audiences: announcement.audiences }))
					.map((person) => person.userId)
			);
			return [
				announcement.id,
				{
					recipients: recipients.size,
					read: (readersOf.get(announcement.id) ?? []).filter((row) => recipients.has(row.userId))
						.length
				}
			];
		})
	);
}
