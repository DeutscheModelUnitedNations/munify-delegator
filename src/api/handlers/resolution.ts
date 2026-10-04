import { db, schema } from '$api/db/db';
import { abilityBuilder, object, pubsub as rumblePubsub, query, schemaBuilder } from '$api/rumble';
import {
	PROJECT_MANAGEMENT_ROLES,
	assertTeamRole,
	isParticipantOfConference,
	isTeamMemberOfConference,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { findResolutionFileProblem } from '$lib/helpers/resolutionUpload';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { GraphQLError } from 'graphql';

abilityBuilder.resolution.allow(['read', 'update', 'delete']).when(systemAdmin);

// Everybody with a part in the conference downloads its adopted resolutions: participants,
// supervisors and the team.
abilityBuilder.resolution.allow('read').when((ctx) => where(isParticipantOfConference(ctx)));
abilityBuilder.resolution.allow('read').when((ctx) => where(isTeamMemberOfConference(ctx)));

// Project management uploads and curates them.
abilityBuilder.resolution
	.allow(['update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PROJECT_MANAGEMENT_ROLES)));

const ResolutionRef = object({ table: 'resolution' });
query({ table: 'resolution' });
const pubsub = rumblePubsub({ table: 'resolution' });

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
		throw new GraphQLError('The selected committee does not belong to this conference.');
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
			/** The PDF as a data URL. */
			content: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertTeamRole(ctx, args.conferenceId, PROJECT_MANAGEMENT_ROLES);
			await assertCommitteeInConference(args.committeeId, args.conferenceId);

			// The management page checks the same, but the mutation can be called directly.
			const problem = findResolutionFileProblem(args.fileName, args.content);
			if (problem === 'notPdf') {
				throw new GraphQLError('Only PDF files can be uploaded as resolutions.');
			}
			if (problem === 'fileTooLarge') {
				throw new GraphQLError('Resolution files must not exceed 10 MB.');
			}

			const created = await db
				.insert(schema.resolution)
				.values({
					conferenceId: args.conferenceId,
					committeeId: args.committeeId ?? undefined,
					title: args.title?.trim() || args.fileName,
					fileName: args.fileName,
					content: args.content
				})
				.returning({ id: schema.resolution.id })
				.then(assertFirstEntryExists);

			pubsub.created();

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

			pubsub.updated(args.id);

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
				throw new GraphQLError('Resolution not found, or not yours to delete');
			}
			pubsub.removed();
			return true;
		}
	})
}));
