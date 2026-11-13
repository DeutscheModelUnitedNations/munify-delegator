import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { deleteIfAllowed } from '#api/services/authHelper/utils';
import { assertTeamPermission } from '#api/services/authHelper/rules';
import { announcementPubsub } from '#api/pubsub';
import { announcementState, audienceSchema, normalizeAudiences } from '#lib/helpers/announcements';
import { z } from 'zod';
import {
	assertCanCreateAnnouncement,
	assertCanEditAnnouncement,
	feedReader,
	registerAnnouncementAbilities
} from './announcementPermissions';
import {
	announcementFeed,
	announcementReach,
	audiencePreview,
	createAnnouncement,
	createAnnouncementSchema,
	duplicateAnnouncement,
	markAnnouncementsRead,
	publishAnnouncement,
	renotifyAnnouncement,
	updateAnnouncement,
	updateAnnouncementSchema,
	withdrawAnnouncement,
	type AudienceCounts,
	type FeedItem
} from './announcementService';
import { sendOpenEmailsInBackground } from '#api/handlers/email/emailSweep';
import { sendAnnouncementTestMail } from '#api/handlers/email/announcementTestEmail';

registerAnnouncementAbilities();

const importanceEnum = enum_({ tsName: 'announcementImportance' });
const audienceKindEnum = enum_({ tsName: 'announcementAudienceKind' });
const teamRoleEnum = enum_({ tsName: 'teamRole' });
enum_({ tsName: 'announcementStatus' });

/** How many people an announcement reaches and how many of them read it, once per request and conference. */
const reachOfRequest = new WeakMap<object, Map<string, ReturnType<typeof announcementReach>>>();

function reachOf({ ctx, conferenceId }: { ctx: ApiContext; conferenceId: string }) {
	const byConference = reachOfRequest.get(ctx) ?? new Map();
	reachOfRequest.set(ctx, byConference);
	const known = byConference.get(conferenceId);
	if (known) return known;
	const loading = announcementReach(conferenceId);
	byConference.set(conferenceId, loading);
	return loading;
}

const AnnouncementRef = object({
	table: 'announcement',
	adjust: (t) => ({
		state: t.string({
			description:
				'Where the announcement is in its life right now: `DRAFT`, `SCHEDULED` (published, its time not yet come), `PUBLISHED` (out), `EXPIRED` (past `visibleUntil`) or `ARCHIVED`.',
			resolve: (announcement) => announcementState({ announcement, now: new Date() })
		}),
		recipientCount: t.int({
			description: 'How many people its audience holds right now.',
			resolve: async (announcement, _args, ctx) =>
				(await reachOf({ ctx, conferenceId: announcement.conferenceId })).get(announcement.id)
					?.recipients ?? 0
		}),
		readCount: t.int({
			description: 'How many of them marked it as read.',
			resolve: async (announcement, _args, ctx) =>
				(await reachOf({ ctx, conferenceId: announcement.conferenceId })).get(announcement.id)
					?.read ?? 0
		})
	})
});
object({ table: 'announcementAudience' });
object({ table: 'announcementAttachment' });
query({ table: 'announcement' });

const AudienceInput = schemaBuilder.inputType('AnnouncementAudienceInput', {
	description:
		'One block of an audience; whoever matches any block of an announcement reads it. `COMMITTEE`, `ROLE` and `SURVEY_OPTION` name what they are about, `TEAM` optionally one team role.',
	fields: (t) => ({
		kind: t.field({ type: audienceKindEnum, required: true }),
		committeeId: t.id(),
		roleId: t.id(),
		surveyOptionId: t.id(),
		teamRole: t.field({ type: teamRoleEnum })
	})
});

const Attachment = schemaBuilder.simpleObject('AnnouncementFeedAttachment', {
	fields: (t) => ({
		id: t.id(),
		fileName: t.string({ nullable: true }),
		mimeType: t.string(),
		size: t.int(),
		url: t.string({ description: 'The file straight from the bucket.' })
	})
});

const FeedItemRef = schemaBuilder.objectRef<FeedItem>('AnnouncementFeedItem');
FeedItemRef.implement({
	description: 'An announcement as one of its readers gets it.',
	// what the announcement says changes with the row
	subscribe: (subscriptions, item) =>
		announcementPubsub.registerOnInstance({
			instance: subscriptions,
			action: 'updated',
			primaryKeyValue: item.id
		}),
	fields: (t) => ({
		id: t.exposeID('id'),
		title: t.exposeString('title'),
		body: t.exposeString('body', { description: 'Markdown.' }),
		importance: t.field({ type: importanceEnum, resolve: (item) => item.importance }),
		pinned: t.exposeBoolean('pinned'),
		signature: t.exposeString('signature', { nullable: true }),
		publishAt: t.field({ type: 'DateTime', resolve: (item) => item.publishAt }),
		editedAt: t.field({
			type: 'DateTime',
			nullable: true,
			description: 'When its title or text last changed since it came out.',
			resolve: (item) => item.editedAt
		}),
		read: t.exposeBoolean('read', { description: 'Whether the caller marked it as read.' }),
		attachments: t.field({ type: [Attachment], resolve: (item) => item.attachments })
	})
});

const AudienceCountsRef = schemaBuilder.objectRef<AudienceCounts>('AnnouncementAudienceCounts');
AudienceCountsRef.implement({
	description: 'How many people an audience reaches, each counted once, by how they take part.',
	fields: (t) => ({
		total: t.exposeInt('total'),
		delegates: t.exposeInt('delegates'),
		singleParticipants: t.exposeInt('singleParticipants'),
		supervisors: t.exposeInt('supervisors'),
		waitingList: t.exposeInt('waitingList'),
		team: t.exposeInt('team')
	})
});

/**
 * Starts sending the announcement mails the conference owes, in the background: what a
 * publication or a "notify again" just made due goes out right away rather than with the job's
 * next run. A scheduled announcement owes nothing yet and is the job's.
 */
function sendAnnouncementMails({ ctx, conferenceId }: { ctx: ApiContext; conferenceId: string }) {
	sendOpenEmailsInBackground({
		conferenceId,
		kinds: ['ANNOUNCEMENT'],
		origin: ctx.requestUrl().origin
	});
}

const readable = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.announcement.filter('read')).merge({ where: { id } }).query.single;

const previewAudiences = z.array(audienceSchema).transform(normalizeAudiences);

schemaBuilder.queryFields((t) => ({
	announcementFeed: t.field({
		description:
			"The conference's announcements that are out for the caller: published, their time come and not over, with the caller in their audience. Pinned ones first, then the urgent, then the newest. Empty for somebody without a part in the conference, a visitor included.",
		type: [FeedItemRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		// live: open pages hear of announcements coming out and being taken down; a change to one
		// is that row's
		smartSubscription: true,
		subscribe: (subscriptions) => {
			announcementPubsub.registerOnInstance({ instance: subscriptions, action: 'created' });
			announcementPubsub.registerOnInstance({ instance: subscriptions, action: 'removed' });
		},
		resolve: async (_root, args, ctx) => {
			const userId = feedReader(ctx);
			return userId ? announcementFeed({ conferenceId: args.conferenceId, userId }) : [];
		}
	}),

	announcementAudiencePreview: t.field({
		description:
			"How many people of the conference the audience reaches right now, for the editor (the conference's content roles; FORBIDDEN otherwise).",
		type: AudienceCountsRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			audiences: t.arg({ type: [AudienceInput], required: true }).validate(previewAudiences)
		},
		resolve: async (_root, args, ctx) => {
			await assertTeamPermission({
				ctx,
				conferenceId: args.conferenceId,
				permission: 'editConferenceContent'
			});
			return audiencePreview({ conferenceId: args.conferenceId, audiences: args.audiences });
		}
	})
}));

const textArgs = {
	title: 'The headline.',
	body: 'Markdown.',
	signature: 'The line under the text saying who speaks; blank for none.'
} as const;

schemaBuilder.mutationFields((t) => ({
	createAnnouncement: t.drizzleField({
		description:
			"Writes a new announcement as a draft (the conference's content roles: project management, participant care, content lead; FORBIDDEN otherwise). It needs at least one audience block; a committee, role or survey option of another conference is refused with INVALID_INPUT. Attachments are uploaded through `requestFileUpload` (`announcement`/`attachment`) first.",
		type: AnnouncementRef,
		args: t.validate(
			{
				conferenceId: t.arg.id({ required: true }),
				title: t.arg.string({ required: true, description: textArgs.title }),
				body: t.arg.string({ required: true, description: textArgs.body }),
				signature: t.arg.string({ description: textArgs.signature }),
				importance: t.arg({ type: importanceEnum }),
				pinned: t.arg.boolean(),
				notifyByMail: t.arg.boolean({
					description: 'Whether its audience is told by mail once it is out.'
				}),
				visibleUntil: t.arg({ type: 'DateTime' }),
				audiences: t.arg({ type: [AudienceInput], required: true }),
				attachmentFileIds: t.arg.idList()
			},
			createAnnouncementSchema
		),
		resolve: async (select, _root, args, ctx) => {
			const { userId } = await assertCanCreateAnnouncement({
				ctx,
				conferenceId: args.conferenceId,
				attachmentFileIds: args.attachmentFileIds
			});
			const id = await createAnnouncement({
				conferenceId: args.conferenceId,
				authorId: userId,
				values: {
					title: args.title,
					body: args.body,
					signature: args.signature ?? null,
					importance: args.importance ?? 'NORMAL',
					pinned: args.pinned ?? false,
					notifyByMail: args.notifyByMail ?? false,
					visibleUntil: args.visibleUntil ?? null
				},
				audiences: args.audiences,
				attachmentFileIds: args.attachmentFileIds ?? []
			});
			return db.query.announcement
				.findFirst(select(await readable({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateAnnouncement: t.drizzleField({
		description:
			'Changes the given fields of an announcement; left out keeps a field, `null` clears `signature` and `visibleUntil`. `audiences` and `attachmentFileIds` each replace the whole list. Changing the title or text of an announcement that is out marks it as edited for its readers.',
		type: AnnouncementRef,
		args: t.validate(
			{
				id: t.arg.id({ required: true }),
				title: t.arg.string({ description: textArgs.title }),
				body: t.arg.string({ description: textArgs.body }),
				signature: t.arg.string({ description: textArgs.signature }),
				importance: t.arg({ type: importanceEnum }),
				pinned: t.arg.boolean(),
				notifyByMail: t.arg.boolean(),
				visibleUntil: t.arg({ type: 'DateTime' }),
				audiences: t.arg({ type: [AudienceInput] }),
				attachmentFileIds: t.arg.idList()
			},
			updateAnnouncementSchema
		),
		resolve: async (select, _root, args, ctx) => {
			await assertCanEditAnnouncement({
				ctx,
				id: args.id,
				attachmentFileIds: args.attachmentFileIds
			});
			await updateAnnouncement({
				id: args.id,
				changes: {
					title: args.title ?? undefined,
					body: args.body ?? undefined,
					signature: args.signature,
					importance: args.importance ?? undefined,
					pinned: args.pinned ?? undefined,
					notifyByMail: args.notifyByMail ?? undefined,
					visibleUntil: args.visibleUntil
				},
				audiences: args.audiences ?? undefined,
				attachmentFileIds: args.attachmentFileIds ?? undefined
			});
			return db.query.announcement
				.findFirst(select(await readable({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	publishAnnouncement: t.drizzleField({
		description:
			'Publishes an announcement to its audience: right away, or from `publishAt` on when that lies ahead (a scheduled one). With `notifyByMail` its audience is mailed once it is out. CONFLICT for one that is published already.',
		type: AnnouncementRef,
		args: {
			id: t.arg.id({ required: true }),
			publishAt: t.arg({ type: 'DateTime', description: 'Left out or past: now.' })
		},
		resolve: async (select, _root, args, ctx) => {
			const { userId, conferenceId } = await assertCanEditAnnouncement({ ctx, id: args.id });
			await publishAnnouncement({ id: args.id, publishAt: args.publishAt, publishedById: userId });
			sendAnnouncementMails({ ctx, conferenceId });
			return db.query.announcement
				.findFirst(select(await readable({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	withdrawAnnouncement: t.drizzleField({
		description:
			'Takes an announcement away from its audience: back to a draft, or with `archive` into the archive, which only its editors see.',
		type: AnnouncementRef,
		args: { id: t.arg.id({ required: true }), archive: t.arg.boolean() },
		resolve: async (select, _root, args, ctx) => {
			await assertCanEditAnnouncement({ ctx, id: args.id });
			await withdrawAnnouncement({ id: args.id, status: args.archive ? 'ARCHIVED' : 'DRAFT' });
			return db.query.announcement
				.findFirst(select(await readable({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	duplicateAnnouncement: t.drizzleField({
		description: 'Copies an announcement, with its audience and attachments, as a new draft.',
		type: AnnouncementRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (select, _root, args, ctx) => {
			const { userId } = await assertCanEditAnnouncement({ ctx, id: args.id });
			const id = await duplicateAnnouncement({ id: args.id, authorId: userId });
			return db.query.announcement
				.findFirst(select(await readable({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	renotifyAnnouncement: t.field({
		description:
			'Mails an announcement that is out to its audience once more, as it reads now (after a correction). CONFLICT unless it is out and notifies by mail.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const { conferenceId } = await assertCanEditAnnouncement({ ctx, id: args.id });
			await renotifyAnnouncement({ id: args.id });
			sendAnnouncementMails({ ctx, conferenceId });
			return true;
		}
	}),

	sendAnnouncementTestMail: t.field({
		description:
			"Sends the announcement's mail to the caller alone, as its audience would get it, whatever its state.",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const { userId } = await assertCanEditAnnouncement({ ctx, id: args.id });
			await sendAnnouncementTestMail({
				announcementId: args.id,
				userId,
				origin: ctx.requestUrl().origin
			});
			return true;
		}
	}),

	deleteAnnouncement: t.field({
		description: 'Deletes an announcement for good.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'announcement', id: args.id });
			announcementPubsub.removed();
			return true;
		}
	}),

	markAnnouncementsRead: t.field({
		description:
			"Marks announcements of the conference as read by the caller: the given ones, or without `ids` every one in their feed. Answers the caller's feed.",
		type: [FeedItemRef],
		args: {
			conferenceId: t.arg.id({ required: true }),
			ids: t.arg.idList()
		},
		resolve: async (_root, args, ctx) => {
			const userId = feedReader(ctx);
			if (!userId) return [];
			await markAnnouncementsRead({
				conferenceId: args.conferenceId,
				userId,
				announcementIds: args.ids ?? undefined
			});
			return announcementFeed({ conferenceId: args.conferenceId, userId });
		}
	})
}));
