import { db } from '#api/db/db.js';
import { object, schemaBuilder } from '#api/rumble.js';
import { storedFilePubsub } from '#api/pubsub.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import { downloadUrl, pendingUploadUrl, requestUpload } from './storedFileService';
import { assertCanUploadFile } from './storedFilePermissions';

// Rows reach their files through relations (`conference.logoFile`, `resolution.file`, …); see
// `storedFilePermissions.ts` for who sees what, and `fileSources.ts` for every file there is.

const StoredFileRef = object({
	table: 'storedFile',
	adjust: (t) => ({
		/** The file straight from the bucket; the URL stays the same for hours, so it caches. */
		url: t.field({
			type: 'String',
			resolve: (file) => downloadUrl(file)
		}),
		/**
		 * Where the browser PUTs the file, with its `Content-Type`; valid for minutes. Null once
		 * the file has arrived.
		 */
		uploadUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (file) => pendingUploadUrl(file)
		})
	})
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * Records an upload of one file for the field `field` of a `kind` row of the conference
	 * (`conference`/`logo`, `place`/`sitePlan`, `resolution`/`content`, …) and answers with the
	 * file: its `id` goes into the mutation saving the row (`logoFileId`, …), its `uploadUrl` is
	 * where the bytes go. Only who may set that field may upload, and only an allowed type and size.
	 */
	requestFileUpload: t.drizzleField({
		type: StoredFileRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg.string({ required: true }),
			field: t.arg.string({ required: true }),
			fileName: t.arg.string({ required: true }),
			mimeType: t.arg.string({ required: true }),
			size: t.arg.int({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			const source = await assertCanUploadFile(ctx, args);
			const id = await requestUpload(source, ctx.mustBeLoggedIn().sub, args);
			storedFilePubsub.created();

			return db.query.storedFile
				.findFirst(
					query(
						(await ctx.abilities.storedFile.filter('read')).merge({ where: { id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
