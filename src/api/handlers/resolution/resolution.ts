import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { resolutionPubsub } from '#api/pubsub';
import {
	assertCanCreateResolution,
	assertCanUpdateResolution,
	registerResolutionAbilities
} from './resolutionPermissions';
import { createResolution, updateResolution } from './resolutionService';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerResolutionAbilities();

const ResolutionRef = object({ table: 'resolution' });
query({ table: 'resolution' });

/** The resolution with this id, as far as the caller may read it. */
const readableResolution = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.resolution.filter('read')).merge({ where: { id } }).query.single;

schemaBuilder.mutationFields((t) => ({
	createResolution: t.drizzleField({
		description:
			"Adds an adopted resolution, a PDF participants download after the conference, optionally tagged with one of its committees (INVALID_INPUT for another conference's). The PDF has to be uploaded by the caller through `requestFileUpload` (`resolution`/`content`) and have arrived in full (CONFLICT otherwise).",
		type: ResolutionRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			committeeId: t.arg.id(),
			title: t.arg.string({
				description: 'Left out or blank: the name the file was uploaded with.'
			}),
			fileId: t.arg.id({
				required: true,
				description: 'The PDF, uploaded through `requestFileUpload`.'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateResolution({ ctx, args });
			const id = await createResolution({
				conferenceId: args.conferenceId,
				committeeId: args.committeeId,
				title: args.title,
				fileId: args.fileId
			});

			return db.query.resolution
				.findFirst(query(await readableResolution({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateResolution: t.drizzleField({
		description:
			"Changes a resolution's title or committee tag (INVALID_INPUT for a committee of another conference).",
		type: ResolutionRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string({ description: 'Left out or blank keeps the old title.' }),
			committeeId: t.arg.id({
				description: 'Left out keeps the committee tag, `null` removes it.'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateResolution({ ctx, id: args.id, committeeId: args.committeeId });
			await updateResolution({
				id: args.id,
				changes: { title: args.title, committeeId: args.committeeId }
			});

			return db.query.resolution
				.findFirst(query(await readableResolution({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteResolution: t.field({
		description:
			'Deletes a resolution; its PDF is removed by the file cleanup once nothing holds it.',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'resolution', id: args.id });
			resolutionPubsub.removed();
			return true;
		}
	})
}));
