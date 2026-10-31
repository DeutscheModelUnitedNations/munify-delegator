import { db } from '#api/db/db';
import { object, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { downloadUrl, pendingUploadUrl, requestUpload } from './storedFileService';
import { assertCanUploadFile, registerStoredFileAbilities } from './storedFilePermissions';
import { uploadArgsSchema } from './fileSources';

registerStoredFileAbilities();

// Rows reach their files through relations (`conference.logoFile`, `resolution.file`, …), and a
// file's `url` is a presigned URL of the bucket: the read rules in `storedFilePermissions.ts` decide
// who gets one. `fileSources.ts` lists every file there is.

const StoredFileRef = object({
	table: 'storedFile',
	adjust: (t) => ({
		url: t.field({
			description:
				'The file straight from the bucket; the URL stays the same for hours, so it caches.',
			type: 'String',
			resolve: (file) => downloadUrl(file)
		}),
		uploadUrl: t.field({
			description:
				'Where the browser PUTs the file, with its `Content-Type`; valid for minutes. Null once the file has arrived.',
			type: 'String',
			nullable: true,
			resolve: (file) => pendingUploadUrl(file)
		})
	})
});

schemaBuilder.mutationFields((t) => ({
	requestFileUpload: t.drizzleField({
		description:
			'Records an upload of one file for the field `field` of a `kind` row of the conference (`conference`/`logo`, `place`/`sitePlan`, `resolution`/`content`, …) and answers with the file: its `id` goes into the mutation saving the row (`logoFileId`, …), its `uploadUrl` is where the bytes go. Only who may set that field may upload (FORBIDDEN otherwise), and only an allowed type and size (INVALID_INPUT otherwise, as for a field that takes no file).',
		type: StoredFileRef,
		args: t.validate(
			{
				conferenceId: t.arg.id({ required: true }),
				kind: t.arg.string({ required: true }),
				field: t.arg.string({ required: true }),
				fileName: t.arg.string({
					required: true,
					description: 'The name downloads get; blank for none.'
				}),
				mimeType: t.arg.string({ required: true }),
				size: t.arg.int({ required: true, description: 'In bytes; the upload has to match.' })
			},
			uploadArgsSchema
		),
		resolve: async (query, _root, request, ctx) => {
			const { uploaderId } = await assertCanUploadFile({
				ctx,
				conferenceId: request.conferenceId,
				source: request.source
			});
			const id = await requestUpload({ request, uploaderId });

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
