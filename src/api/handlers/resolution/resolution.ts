import { db, schema } from '#api/db/db.js';
import { object, query, schemaBuilder } from '#api/rumble.js';
import { ensureUploadComplete } from '#api/handlers/storedFile/storedFileService.js';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import { resolutionPubsub } from '#api/pubsub.js';
import {
	assertCanCreateResolution,
	assertCanDeleteResolution,
	assertCanUpdateResolution,
	registerResolutionAbilities
} from './resolutionPermissions';

registerResolutionAbilities();

const ResolutionRef = object({ table: 'resolution' });
query({ table: 'resolution' });

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
			await assertCanCreateResolution(ctx, args);
			// Its type and size were checked when the upload was handed out.
			const fileId = await ensureUploadComplete(args.fileId);

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
			await assertCanUpdateResolution(ctx, args.id, args.committeeId);

			await db
				.update(schema.resolution)
				.set({
					// A blank title would leave nothing to show, so it keeps the old one.
					title: args.title?.trim() || undefined,
					committeeId: args.committeeId
				})
				.where(eq(schema.resolution.id, args.id));

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
			await assertCanDeleteResolution(ctx, args.id);
			await db.delete(schema.resolution).where(eq(schema.resolution.id, args.id));
			resolutionPubsub.removed();
			return true;
		}
	})
}));
