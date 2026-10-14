import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	CONFERENCE_CONTENT_ROLES,
	assertTeamRole,
	isParticipantOfConference,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { fileUrl } from '$api/services/files/storage';
import { claimUploadedFile } from '$api/services/files/uploads';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { resolutionPubsub } from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

abilityBuilder.resolution.allow(['read', 'update', 'delete']).when(systemAdmin);

// Everybody with a part in the conference downloads its adopted resolutions: participants,
// supervisors and the team.
abilityBuilder.resolution.allow('read').when((ctx) => where(isParticipantOfConference(ctx)));
abilityBuilder.resolution.allow('read').when((ctx) => where(isTeamMemberOfConference(ctx)));

// Project management, participant care and the content lead upload and curate them.
abilityBuilder.resolution
	.allow(['update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, CONFERENCE_CONTENT_ROLES)));

const ResolutionRef = object({
	table: 'resolution',
	adjust: (t) => ({
		/** The PDF, straight from the bucket, named as it was uploaded. */
		contentUrl: t.field({
			type: 'String',
			resolve: async (resolution) =>
				(await fileUrl(
					'resolution',
					'content',
					resolution.conferenceId,
					resolution.fileId,
					resolution.fileName
				)) ?? ''
		})
	})
});
query({ table: 'resolution' });

/** A committee tag is optional, but one that is given has to be the resolution's conference's. */
async function assertCommitteeInConference(
	committeeId: string | null | undefined,
	conferenceId: string
) {
	if (!committeeId) return;
	const committee = await db.query.committee.findFirst({
		where: { id: committeeId, conferenceId },
		columns: { id: true }
	});
	if (!committee) {
		throw apiError('INVALID_INPUT', m.resolutionCommitteeOtherConference());
	}
}

schemaBuilder.mutationFields((t) => ({
	createResolution: t.drizzleField({
		type: ResolutionRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			committeeId: t.arg.id(),
			/** Defaults to the file name. */
			title: t.arg.string(),
			fileName: t.arg.string({ required: true }),
			/** The PDF, uploaded through `requestFileUpload`. */
			fileId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, CONFERENCE_CONTENT_ROLES);
			await assertCommitteeInConference(args.committeeId, args.conferenceId);
			// Its type and size were checked when the upload was handed out.
			const fileId = await claimUploadedFile(ctx, args.fileId, {
				kind: 'resolution',
				field: 'content',
				conferenceId: args.conferenceId
			});

			const created = await db
				.insert(schema.resolution)
				.values({
					conferenceId: args.conferenceId,
					committeeId: args.committeeId ?? undefined,
					title: args.title?.trim() || args.fileName,
					fileName: args.fileName,
					fileId
				})
				.returning({ id: schema.resolution.id })
				.then(assertFirstEntryExists);

			resolutionPubsub.created();

			return db.query.resolution
				.findFirst(
					query(
						(await ctx.abilities.resolution.filter('read')).merge({ where: { id: created.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateResolution: t.drizzleField({
		type: ResolutionRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			/** An explicit null removes the committee tag; omitting it leaves the tag alone. */
			committeeId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			const resolution = await db.query.resolution
				.findFirst({
					...(await ctx.abilities.resolution.filter('update')).merge({ where: { id: args.id } })
						.query.single,
					columns: { id: true, conferenceId: true }
				})
				.then(assertFindFirstExists);

			await assertCommitteeInConference(args.committeeId, resolution.conferenceId);

			await db
				.update(schema.resolution)
				.set({
					// A blank title would leave nothing to show, so it keeps the old one.
					title: args.title?.trim() || undefined,
					committeeId: args.committeeId
				})
				.where(
					(await ctx.abilities.resolution.filter('update')).merge({ where: { id: args.id } }).sql
						.where
				);

			resolutionPubsub.updated(args.id);

			return db.query.resolution
				.findFirst(
					query(
						(await ctx.abilities.resolution.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteResolution: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			const deleted = await db
				.delete(schema.resolution)
				.where(
					(await ctx.abilities.resolution.filter('delete')).merge({ where: { id: args.id } }).sql
						.where
				)
				.returning({ id: schema.resolution.id });
			if (deleted.length === 0) {
				throw apiError('NOT_FOUND', m.deleteNotFoundOrForbidden());
			}
			resolutionPubsub.removed();
			return true;
		}
	})
}));
