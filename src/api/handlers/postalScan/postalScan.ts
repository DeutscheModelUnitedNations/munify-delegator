import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { keptOutcomeSchema } from '#lib/paperScan/intake/rescan';
import { PaperReadingInput } from '#api/handlers/agreementDetail/agreementDetail';
import { knownReadings } from '#api/handlers/agreementDetail/agreementDetailService';
import { ensureUploadComplete } from '#api/handlers/storedFile/storedFileService';
import {
	assertCanDeletePostalScan,
	assertCanImportPostalScan,
	registerPostalScanAbilities
} from './postalScanPermissions';
import { deletePostalScan, importArgsSchema, printedPage } from './postalScanService';
import { takeInPage } from './takeInPage';

registerPostalScanAbilities();

object({ table: 'postalScan' });
query({ table: 'postalScan' });

const postalScanSourceEnum = enum_({ tsName: 'postalScanSource' });

/** What became of a page (`KeptOutcome`). */
const PostalScanOutcome = schemaBuilder.enumType('PostalScanOutcome', {
	description:
		'`stored`: kept. `replaced`: kept in place of an earlier scan of the page, which said less. `known`: that one says as much already. `differs`: something there before is missing now; the earlier scan stays.',
	values: keptOutcomeSchema.options
});

schemaBuilder.mutationFields((t) => ({
	importPostalScan: t.field({
		description:
			"Keeps an uploaded file (`postalScan`/`scan`) as the scan of one page of a person's application documents (participant care) and takes in what was read off it, unattended (`recordPaperReadings` without `confirm`). `code` is the code printed on the page, which says which page it is: the same paper scanned again is kept only if it says more. It has to be one of this person's documents in this conference (INVALID_INPUT otherwise); without one the page is named by its file (`contentKey`, the file's SHA-256 and the page's number). `readings` is null when the fields were not readable; `source` is UPLOAD, FOLDER or CAMERA. Asked without `fileId` first, so nothing is uploaded in vain: null then means that the file is needed, and nothing was changed. Somebody without a part in the conference answers NOT_FOUND.",
		type: PostalScanOutcome,
		nullable: true,
		validate: importArgsSchema,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true }),
			fileId: t.arg.id(),
			source: t.arg({ type: postalScanSourceEnum, required: true }),
			code: t.arg.string(),
			contentKey: t.arg.string({ required: true }),
			readings: t.arg({ type: [PaperReadingInput] })
		},
		resolve: async (_root, args, ctx) => {
			const { fileId } = args;
			const { participantId, uploaderId } = await assertCanImportPostalScan({
				...args,
				ctx,
				fileId
			});
			if (fileId) await ensureUploadComplete(fileId);
			return takeInPage({
				participantId,
				storeFile: async () => fileId,
				source: args.source,
				page: await printedPage(args),
				readings: args.readings ? knownReadings(args.readings) : null,
				uploadedById: uploaderId
			});
		}
	}),

	deletePostalScan: t.field({
		description: 'Deletes a scan of somebody’s application documents (participant care).',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, { id }, ctx) => {
			await assertCanDeletePostalScan({ ctx, id });
			await deletePostalScan(id);
			return true;
		}
	})
}));
