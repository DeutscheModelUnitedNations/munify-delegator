import { schemaBuilder } from '$api/rumble';
import { requestUpload } from '$api/services/files/uploads';

// `stored_file` has no object of its own: rows hand out their files as presigned bucket URLs (see
// `$api/services/files/files.ts`), and nothing but this mutation creates one.

const FileUpload = schemaBuilder.simpleObject('FileUpload', {
	fields: (t) => ({
		/** What the mutation saving the row takes in the file's field (`logoFileId`, …). */
		fileId: t.id(),
		/** Where the browser PUTs the file, with the announced `Content-Type`. Valid for minutes. */
		uploadUrl: t.string()
	})
});

schemaBuilder.mutationFields((t) => ({
	/**
	 * Hands out a URL to upload one file to, for the field `field` of a `kind` row of the
	 * conference (`conference`/`logo`, `place`/`sitePlan`, `resolution`/`content`, …). Only who may
	 * set that field gets one, and only for an allowed type and size.
	 */
	requestFileUpload: t.field({
		type: FileUpload,
		args: {
			conferenceId: t.arg.id({ required: true }),
			kind: t.arg.string({ required: true }),
			field: t.arg.string({ required: true }),
			fileName: t.arg.string({ required: true }),
			mimeType: t.arg.string({ required: true }),
			size: t.arg.int({ required: true })
		},
		resolve: (_root, args, ctx) => requestUpload(ctx, args)
	})
}));
